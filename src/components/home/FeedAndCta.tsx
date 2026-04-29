import { useEffect, useState } from "react";
import { Instagram, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import "./FeedAndCta.css";

const TAGS = ["BTS", "NEW", "JOGO", "FIELD", "CAMP", "M3"];

interface IGPost {
  id: string;
  media_url: string;
  permalink?: string;
  caption?: string;
  thumbnail_url?: string;
  media_type?: string;
}

// Verified football-related Unsplash photo IDs
const UNSPLASH_IDS = [
  "1centi3vGEA", // estadio
  "TY4DI9F8z6Y", // chuteira
  "wYz3Z6F4ESI", // bola no campo
  "6ToVtVRE2Hk", // jogador
  "1uxV98ennpc", // estadio iluminado
  "RnBNwJVayxg", // treino
  "ZdaC1ElyD80", // gramado
  "F6Wf8KbVdK8", // jogador silhueta
  "PWG4u3X5gzg", // estadio aereo
  "Tnf1MSQs0NQ", // bola
  "OByGGettWCU", // pernas correndo
  "QkQX0VJgCzQ", // multidao
];

const FALLBACK_POSTS: IGPost[] = UNSPLASH_IDS.map((id, i) => ({
  id: `fb-${i}`,
  media_url: `https://images.unsplash.com/photo-${id}?w=600&h=600&fit=crop&q=80&auto=format`,
  permalink: "https://instagram.com/_m3agency",
  caption: "M3 Agency · Inteligência em Futebol",
}));

// TikTok icon (lucide does not include it)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width="18"
      height="18"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.94a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1.84-.31z" />
    </svg>
  );
}

export function FeedAndCta() {
  const [posts, setPosts] = useState<IGPost[]>(FALLBACK_POSTS);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke("instagram-feed", {
          body: {},
        });
        if (!cancelled && data?.posts?.length) {
          setPosts(data.posts.slice(0, 12));
        }
      } catch {
        // keep fallback
      }
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  return (
    <>
      {/* ============ FEED (light) ============ */}
      <section className="lp-section-light">
        <div className="feed">
          <div className="feed__inner">
            <header className="feed__head">
              <div className="feed__title">
                <span>Siga a M3 Agency</span>
                <a
                  href="https://instagram.com/m3agency"
                  target="_blank"
                  rel="noreferrer"
                  className="feed__handle"
                >
                  @m3agency
                </a>
              </div>
              <div className="feed__socials">
                <a
                  href="https://instagram.com/m3agency"
                  target="_blank"
                  rel="noreferrer"
                  className="social-btn"
                  aria-label="Instagram"
                >
                  <Instagram size={18} strokeWidth={1.5} />
                </a>
                <a
                  href="https://youtube.com/@m3agency"
                  target="_blank"
                  rel="noreferrer"
                  className="social-btn"
                  aria-label="Youtube"
                >
                  <Youtube size={18} strokeWidth={1.5} />
                </a>
                <a
                  href="https://tiktok.com/@m3agency"
                  target="_blank"
                  rel="noreferrer"
                  className="social-btn"
                  aria-label="TikTok"
                >
                  <TikTokIcon />
                </a>
              </div>
            </header>

            <div className="feed__grid">
              {posts.slice(0, 12).map((p, i) => {
                const tag = TAGS[i % TAGS.length];
                const img =
                  p.media_type === "VIDEO" && p.thumbnail_url
                    ? p.thumbnail_url
                    : p.media_url;
                const caption =
                  p.caption?.split("\n")[0] || "M3 Agency";
                return (
                  <a
                    key={p.id}
                    href={p.permalink || "https://instagram.com/m3agency"}
                    target="_blank"
                    rel="noreferrer"
                    className="post"
                  >
                    <span className="post__tag">{tag}</span>
                    <img
                      src={img}
                      alt={caption}
                      className="post__media"
                      loading="lazy"
                    />
                    <div className="post__overlay">
                      <p className="post__caption">{caption}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
