import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// ---- Hoisted mocks (necessário porque vi.mock é içado para o topo) -------

const h = vi.hoisted(() => {
  type Listener = (payload: unknown) => void;
  interface MockChannel {
    name: string;
    onCalls: Array<{ event: string; filter: unknown }>;
    subscribed: boolean;
    subscribeCalledAt: number | null;
    lastOnCalledAt: number | null;
    on: (event: string, filter: unknown, cb: Listener) => MockChannel;
    subscribe: (cb?: (status: string) => void) => MockChannel;
    unsubscribe: () => Promise<"ok">;
  }

  const state = {
    now: 0,
    user: { id: "user-1" } as { id: string } | null,
    channels: [] as MockChannel[],
  };

  const removeChannel = vi.fn();

  function makeChannel(name: string): MockChannel {
    const ch: MockChannel = {
      name,
      onCalls: [],
      subscribed: false,
      subscribeCalledAt: null,
      lastOnCalledAt: null,
      on(event, filter, _cb) {
        if (this.subscribed) {
          throw new Error(
            `cannot add \`${event}\` callbacks for ${this.name} after \`subscribe()\`.`,
          );
        }
        this.lastOnCalledAt = ++state.now;
        this.onCalls.push({ event, filter });
        return this;
      },
      subscribe(cb) {
        this.subscribed = true;
        this.subscribeCalledAt = ++state.now;
        cb?.("SUBSCRIBED");
        return this;
      },
      async unsubscribe() {
        this.subscribed = false;
        return "ok";
      },
    };
    state.channels.push(ch);
    return ch;
  }

  const supabase = {
    channel: vi.fn((name: string) => makeChannel(name)),
    removeChannel,
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }),
    })),
  };

  return { state, supabase, removeChannel };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: h.supabase }));
vi.mock("./useAuth", () => ({
  useAuth: () => ({ user: h.state.user, loading: false }),
}));

// ---- Tests ----------------------------------------------------------------

import { useNotifications } from "./useNotifications";

describe("useNotifications — Realtime channel lifecycle", () => {
  beforeEach(() => {
    h.state.channels.length = 0;
    h.state.now = 0;
    h.state.user = { id: "user-1" };
    h.removeChannel.mockClear();
    (h.supabase.channel as ReturnType<typeof vi.fn>).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registra .on() ANTES de chamar .subscribe()", async () => {
    renderHook(() => useNotifications());

    await waitFor(() => expect(h.state.channels.length).toBeGreaterThan(0));

    const ch = h.state.channels[0];
    expect(ch.onCalls.length).toBe(1);
    expect(ch.subscribed).toBe(true);
    expect(ch.lastOnCalledAt).not.toBeNull();
    expect(ch.subscribeCalledAt).not.toBeNull();
    // Ordem temporal: on() < subscribe()
    expect(ch.lastOnCalledAt!).toBeLessThan(ch.subscribeCalledAt!);
  });

  it("usa nome de canal isolado por usuário", async () => {
    const { unmount: unmount1 } = renderHook(() => useNotifications());
    await waitFor(() => expect(h.state.channels.length).toBe(1));
    expect(h.state.channels[0].name).toMatch(/notifications-realtime-user-1-/);
    unmount1();

    h.state.user = { id: "user-2" };
    renderHook(() => useNotifications());
    await waitFor(() => expect(h.state.channels.length).toBe(2));
    expect(h.state.channels[1].name).toMatch(/notifications-realtime-user-2-/);
    expect(h.state.channels[1].name).not.toBe(h.state.channels[0].name);
  });

  it("não cria canal duplicado quando duas instâncias montam para o mesmo usuário", async () => {
    renderHook(() => useNotifications());
    renderHook(() => useNotifications());

    await waitFor(() => expect(h.state.channels.length).toBeGreaterThan(0));
    // Apenas a primeira instância deve assinar — dedupe por user.id
    expect(h.state.channels.length).toBe(1);
  });

  it("faz cleanup (unsubscribe + removeChannel) ao desmontar e libera o slot do user", async () => {
    const { unmount } = renderHook(() => useNotifications());
    await waitFor(() => expect(h.state.channels.length).toBe(1));

    unmount();
    await waitFor(() => expect(h.removeChannel).toHaveBeenCalledTimes(1));
    expect(h.state.channels[0].subscribed).toBe(false);

    // Após o cleanup, uma nova instância para o mesmo user deve poder assinar de novo
    renderHook(() => useNotifications());
    await waitFor(() => expect(h.state.channels.length).toBe(2));
  });
});
