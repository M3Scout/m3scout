import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KickTitle } from "@/components/site/KickTitle";
import { SoccerStrip } from "@/components/site/SoccerStrip";
import { clamp } from "@/components/site/shared";

const IG_URL = "https://instagram.com/m3agency";
const MAX_POSTS = 10;
const ROT = [-4, 3, -2, 5, -3, 2, -5, 3, -1, 4, -3, 2];

interface Post {
  id: string;
  img: string;
  href: string;
}

// Fotos de reserva caso o feed do Instagram não responda (mesmas da home anterior)
const FALLBACK: Post[] = [
  "photo-1574629810360-7efbbe195018", "photo-1551958219-acbc608c6377", "photo-1517649763962-0c623066013b",
  "photo-1508098682722-e99c43a406b2", "photo-1526232761682-d26e03ac148e", "photo-1543351611-58f69d7c1781",
  "photo-1571019613454-1cb2f99b2d8b", "photo-1517466787929-bc90951d0974", "photo-1555169062-013468b47731",
  "photo-1606925797300-0b35e9d1794e", "photo-1487466365202-1afdb86c764e", "photo-1530549387789-4c1017266635",
].map((id, i) => ({ id: `fb-${i}`, img: `https://images.unsplash.com/${id}?w=800&h=1000&fit=crop&q=80&auto=format`, href: IG_URL }));

function useInstagramPosts() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("instagram-feed", { body: {} });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const list: Post[] = ((data?.posts as any[]) ?? [])
          .slice(0, MAX_POSTS)
          .map((p, i) => ({
            id: p.id ?? `ig-${i}`,
            img: p.imageUrl || p.thumbnail_url || p.media_url,
            href: p.permalink || IG_URL,
          }))
          .filter((p) => !!p.img);
        if (!cancelled) setPosts(list.length ? list : FALLBACK);
      } catch {
        if (!cancelled) setPosts(FALLBACK);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return posts ?? [];
}

/** 03 · Imprensa — baralho de posts que voa com a rolagem. */
export function HomeFeed() {
  const posts = useInstagramPosts();
  const deckRef = useRef<HTMLElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const deck = deckRef.current, stack = stackRef.current, b = countRef.current;
    if (!deck || !stack || !b || !posts.length) return;
    const els = [...stack.children] as HTMLElement[];
    let shown = -1;
    let timer = 0;

    const run = () => {
      ticking = false;
      const vh = window.innerHeight;
      const r = deck.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - vh), 0, 1);
      const N = els.length, f = p * (N - 1);
      els.forEach((el, k) => {
        const l = f - k;
        if (l >= 1) { el.style.opacity = "0"; el.style.transform = "translate3d(0,-120vh,0)"; el.style.pointerEvents = "none"; return; }
        el.style.pointerEvents = l > -0.5 ? "auto" : "none";
        if (l >= 0) {
          const e = l * l * (3 - 2 * l);
          el.style.opacity = "1";
          el.style.filter = "";
          el.style.transform = `translate3d(${e * -14}vw,${e * -112}vh,0) rotate(${ROT[k] + e * -26}deg)`;
        } else {
          const d = Math.min(-l, 5);
          el.style.opacity = d > 4 ? "0" : "1";
          el.style.filter = `brightness(${1 - d * 0.16})`;
          el.style.transform = `translate3d(0,${d * 18}px,0) scale(${1 - d * 0.05}) rotate(${ROT[k] * (1 - Math.min(d, 1) * 0.3)}deg)`;
        }
      });
      const idx = clamp(Math.floor(f + 0.5), 0, N - 1);
      if (idx !== shown) {
        const first = shown === -1;
        shown = idx;
        if (first) { b.textContent = String(idx + 1).padStart(2, "0"); return; }
        b.style.transform = "translateY(-100%)";
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          b.textContent = String(idx + 1).padStart(2, "0");
          b.style.transition = "none";
          b.style.transform = "translateY(100%)";
          void b.offsetWidth;
          b.style.transition = "";
          b.style.transform = "";
        }, 180);
      }
    };
    let ticking = false;
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    run();
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [posts]);

  return (
    <>
      <div className="wrap"><SoccerStrip kind="goal" /></div>
      <section className="deck" id="imprensa" aria-labelledby="d-h" ref={deckRef}>
        <div className="d-sticky">
          <div className="d-left">
            <div className="d-top">
              <KickTitle text="Siga a @m3agency" id="d-h" red={[2]} className="kt-deck" />
            </div>
            <div className="d-bottom">
              <div className="d-count" aria-hidden="true">
                <span className="roll"><b ref={countRef}>01</b></span>
                <small>/ {String(posts.length || MAX_POSTS).padStart(2, "0")}</small>
              </div>
              <div className="d-social">
                <a className="pill ghost" href={IG_URL} target="_blank" rel="noopener noreferrer">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" />
                  </svg>
                  Seguir no Instagram
                </a>
              </div>
            </div>
          </div>
          <div className="d-stack" ref={stackRef}>
            {posts.map((p, k) => (
              <a
                key={p.id}
                className="post"
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Publicação ${k + 1} da M3 Agency no Instagram`}
                style={{ zIndex: 100 - k }}
              >
                <img src={p.img} alt="" decoding="async" loading={k < 3 ? "eager" : "lazy"} />
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
