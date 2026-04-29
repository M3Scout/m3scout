import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// ---- Mocks ----------------------------------------------------------------

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

const createdChannels: MockChannel[] = [];
let nowCounter = 0;

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
      this.lastOnCalledAt = ++nowCounter;
      this.onCalls.push({ event, filter });
      return this;
    },
    subscribe(cb) {
      this.subscribed = true;
      this.subscribeCalledAt = ++nowCounter;
      cb?.("SUBSCRIBED");
      return this;
    },
    async unsubscribe() {
      this.subscribed = false;
      return "ok";
    },
  };
  createdChannels.push(ch);
  return ch;
}

const removeChannel = vi.fn();

const supabaseMock = {
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

vi.mock("@/integrations/supabase/client", () => ({
  supabase: supabaseMock,
}));

// Auth mock — controlado por variável module-level
let mockUser: { id: string } | null = { id: "user-1" };
vi.mock("./useAuth", () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}));

// ---- Tests ----------------------------------------------------------------

import { useNotifications } from "./useNotifications";

describe("useNotifications — Realtime channel lifecycle", () => {
  beforeEach(() => {
    createdChannels.length = 0;
    nowCounter = 0;
    removeChannel.mockClear();
    supabaseMock.channel.mockClear();
    mockUser = { id: "user-1" };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registra .on() ANTES de chamar .subscribe()", async () => {
    renderHook(() => useNotifications());

    await waitFor(() => expect(createdChannels.length).toBeGreaterThan(0));

    const ch = createdChannels[0];
    expect(ch.onCalls.length).toBe(1);
    expect(ch.subscribed).toBe(true);
    expect(ch.lastOnCalledAt).not.toBeNull();
    expect(ch.subscribeCalledAt).not.toBeNull();
    // Ordem temporal: on() < subscribe()
    expect(ch.lastOnCalledAt!).toBeLessThan(ch.subscribeCalledAt!);
  });

  it("usa nome de canal isolado por usuário", async () => {
    const { unmount: unmount1 } = renderHook(() => useNotifications());
    await waitFor(() => expect(createdChannels.length).toBe(1));
    expect(createdChannels[0].name).toMatch(/notifications-realtime-user-1-/);
    unmount1();

    mockUser = { id: "user-2" };
    renderHook(() => useNotifications());
    await waitFor(() => expect(createdChannels.length).toBe(2));
    expect(createdChannels[1].name).toMatch(/notifications-realtime-user-2-/);
    expect(createdChannels[1].name).not.toBe(createdChannels[0].name);
  });

  it("não cria canal duplicado quando duas instâncias montam para o mesmo usuário", async () => {
    renderHook(() => useNotifications());
    renderHook(() => useNotifications());

    await waitFor(() => expect(createdChannels.length).toBeGreaterThan(0));
    // Apenas a primeira instância deve assinar — dedupe por user.id
    expect(createdChannels.length).toBe(1);
  });

  it("faz cleanup (unsubscribe + removeChannel) ao desmontar e libera o slot do user", async () => {
    const { unmount } = renderHook(() => useNotifications());
    await waitFor(() => expect(createdChannels.length).toBe(1));

    unmount();
    await waitFor(() => expect(removeChannel).toHaveBeenCalledTimes(1));
    expect(createdChannels[0].subscribed).toBe(false);

    // Após o cleanup, uma nova instância para o mesmo user deve poder assinar de novo
    renderHook(() => useNotifications());
    await waitFor(() => expect(createdChannels.length).toBe(2));
  });
});
