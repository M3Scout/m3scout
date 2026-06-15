import { useEffect, useRef, useState } from "react";
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

// Verified football-related Unsplash photos (stable IDs)
const FALLBACK_PHOTOS = [
  "photo-1574629810360-7efbbe195018", // stadium
  "photo-1551958219-acbc608c6377",    // soccer ball field
  "photo-1517649763962-0c623066013b", // football match
  "photo-1508098682722-e99c43a406b2", // player kicking
  "photo-1526232761682-d26e03ac148e", // boots
  "photo-1543351611-58f69d7c1781",    // training
  "photo-1571019613454-1cb2f99b2d8b", // ball closeup
  "photo-1517466787929-bc90951d0974", // crowd
  "photo-1555169062-013468b47731",    // night stadium
  "photo-1606925797300-0b35e9d1794e", // player silhouette
  "photo-1487466365202-1afdb86c764e", // grass
  "photo-1530549387789-4c1017266635", // goalkeeper
];

const buildUnsplash = (id: string) =>
  `https://images.unsplash.com/${id}?w=1080&h=1080&fit=crop&q=85&auto=format`;

const FALLBACK_POSTS: IGPost[] = FALLBACK_PHOTOS.map((id, i) => ({
  id: `fb-${i}`,
  media_url: buildUnsplash(id),
  permalink: "https://instagram.com/m3agency",
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

const INITIAL_BATCH = 6;
const BATCH_STEP = 6;
const MAX_POSTS = 12;

export function FeedAndCta() {
  const [posts, setPosts] = useState<IGPost[] | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Show fallback quickly so the page isn't empty, then try to upgrade with real posts.
    const fallbackTimer = setTimeout(() => {
      if (!cancelled) setPosts((p) => p ?? FALLBACK_POSTS);
    }, 600);

    const t = setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke("instagram-feed", {
          body: {},
        });
        if (cancelled || !data?.posts?.length) return;

        const normalized: IGPost[] = data.posts
          .slice(0, MAX_POSTS)
          .map((p: any, i: number) => ({
            id: p.id ?? `ig-${i}`,
            media_url: p.imageUrl || p.media_url || buildUnsplash(FALLBACK_PHOTOS[i % FALLBACK_PHOTOS.length]),
            permalink: p.permalink || "https://instagram.com/m3agency",
            caption: p.caption || "M3 Agency",
            media_type: p.mediaType || p.media_type,
            thumbnail_url: p.thumbnail_url,
          }))
          .filter((p: IGPost) => !!p.media_url);

        if (normalized.length) setPosts(normalized);
        else setPosts((p) => p ?? FALLBACK_POSTS);
      } catch {
        setPosts((p) => p ?? FALLBACK_POSTS);
      }
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(t);
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Infinite scroll: reveal more posts as user scrolls
  useEffect(() => {
    if (!posts || visibleCount >= Math.min(posts.length, MAX_POSTS)) return;
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + BATCH_STEP, MAX_POSTS));
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [posts, visibleCount]);

  const isLoading = posts === null;
  const visiblePosts = (posts ?? []).slice(0, visibleCount);
  const skeletonCount = isLoading ? INITIAL_BATCH : 0;

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
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const el = e.currentTarget;
                        const fallback = buildUnsplash(
                          FALLBACK_PHOTOS[i % FALLBACK_PHOTOS.length]
                        );
                        // Avoid infinite loop if fallback also fails
                        if (el.src !== fallback) {
                          el.src = fallback;
                        } else {
                          el.style.display = "none";
                          el.parentElement?.classList.add("post--broken");
                        }
                      }}
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
