import { useState, useRef, useEffect } from "react";
import { Instagram, Youtube, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// TikTok icon component (not available in lucide-react)
const TikTokIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

// Social media configuration
// TODO: Update YouTube and TikTok URLs when available
const socialConfig = {
  instagram: {
    handle: "@_m3agency",
    url: "https://instagram.com/_m3agency",
  },
  youtube: {
    // TODO: Replace with actual M3 Agency YouTube channel URL
    url: "https://youtube.com/@m3agency",
  },
  tiktok: {
    // TODO: Replace with actual M3 Agency TikTok profile URL
    url: "https://tiktok.com/@m3agency",
  },
};

// Fallback mock posts - used when API is not configured or fails
const fallbackPosts = [
  {
    id: "1",
    imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=400&fit=crop",
    permalink: socialConfig.instagram.url,
  },
  {
    id: "2",
    imageUrl: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=400&h=400&fit=crop",
    permalink: socialConfig.instagram.url,
  },
  {
    id: "3",
    imageUrl: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=400&fit=crop",
    permalink: socialConfig.instagram.url,
  },
  {
    id: "4",
    imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&h=400&fit=crop",
    permalink: socialConfig.instagram.url,
  },
  {
    id: "5",
    imageUrl: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=400&fit=crop",
    permalink: socialConfig.instagram.url,
  },
  {
    id: "6",
    imageUrl: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400&h=400&fit=crop",
    permalink: socialConfig.instagram.url,
  },
  {
    id: "7",
    imageUrl: "https://images.unsplash.com/photo-1600679472829-3044539ce8ed?w=400&h=400&fit=crop",
    permalink: socialConfig.instagram.url,
  },
  {
    id: "8",
    imageUrl: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=400&fit=crop",
    permalink: socialConfig.instagram.url,
  },
];

interface InstagramPost {
  id: string;
  imageUrl: string;
  permalink: string;
}

export function InstagramFeedSection() {
  const [posts, setPosts] = useState<InstagramPost[]>(fallbackPosts);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Fetch Instagram posts from edge function
  useEffect(() => {
    const fetchInstagramPosts = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('instagram-feed');
        
        if (error) {
          console.error('Error fetching Instagram feed:', error);
          return;
        }

        if (data?.posts && data.posts.length > 0) {
          setPosts(data.posts);
        }
      } catch (err) {
        console.error('Failed to fetch Instagram feed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInstagramPosts();
  }, []);

  const checkScrollButtons = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScrollButtons();
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener("scroll", checkScrollButtons);
      return () => carousel.removeEventListener("scroll", checkScrollButtons);
    }
  }, [posts]);

  const scroll = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = carouselRef.current.clientWidth * 0.8;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const socialLinks = [
    { icon: Instagram, href: socialConfig.instagram.url, label: "Instagram" },
    { icon: Youtube, href: socialConfig.youtube.url, label: "YouTube" },
    { icon: TikTokIcon, href: socialConfig.tiktok.url, label: "TikTok" },
  ];

  return (
    // iPad-specific: Ensure no dark overlay or border-top inherited, match desktop appearance
    <section 
      className="py-20 md:py-28 bg-[#f8f7f4] tablet:bg-[#f8f7f4] tablet:border-t-0 tablet:opacity-100 tablet:filter-none" 
      style={{ isolation: 'isolate' }}
    >
      {/* Single container for entire section - consistent alignment */}
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          {/* Left: Title + Handle */}
          <div className="flex items-baseline gap-3 md:gap-4">
            <h2 className="text-xs sm:text-sm md:text-base font-medium uppercase tracking-[0.25em] text-neutral-900">
              Siga a M3 Agency
            </h2>
            <a
              href={socialConfig.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm font-normal text-neutral-400 hover:text-neutral-700 transition-colors duration-200"
            >
              {socialConfig.instagram.handle}
            </a>
          </div>

          {/* Right: Social Icons */}
          <div className="flex items-center gap-2 md:gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-all duration-200"
                aria-label={social.label}
              >
                <social.icon size={18} className="md:w-5 md:h-5" />
              </a>
            ))}
          </div>
        </div>

        {/* Carousel Container - within same padding context */}
        <div className="relative">
          {/* Loading State */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#f8f7f4]/80 z-20">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
          )}

          {/* Navigation Arrows */}
          <button
            onClick={() => scroll("left")}
            className={cn(
              "absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 z-10",
              "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center",
              "bg-white border border-neutral-200 text-neutral-700 rounded-full shadow-sm",
              "hover:bg-neutral-100 transition-all duration-200",
              !canScrollLeft && "opacity-0 pointer-events-none"
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={() => scroll("right")}
            className={cn(
              "absolute -right-4 md:-right-6 top-1/2 -translate-y-1/2 z-10",
              "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center",
              "bg-white border border-neutral-200 text-neutral-700 rounded-full shadow-sm",
              "hover:bg-neutral-100 transition-all duration-200",
              !canScrollRight && "opacity-0 pointer-events-none"
            )}
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>

          {/* Carousel Track - aligned with header */}
          <div
            ref={carouselRef}
            className="flex gap-2 md:gap-3 overflow-x-auto overflow-y-visible scrollbar-hide snap-x snap-mandatory scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {posts.map((post) => (
              <a
                key={post.id}
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex-shrink-0 snap-start"
              >
                {/* Square Card */}
                <div className="relative w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] md:w-[180px] md:h-[180px] lg:w-[200px] lg:h-[200px] overflow-hidden">
                  <img
                    src={post.imageUrl}
                    alt="Instagram post"
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Instagram Icon - Top Right */}
                  <div className="absolute top-3 right-3 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Instagram size={18} />
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="text-white text-xs uppercase tracking-[0.15em] font-medium">
                      Ver no Instagram
                    </span>
                  </div>
                </div>
              </a>
            ))}
            {/* End spacer - ensures last post is fully visible */}
            <div className="flex-shrink-0 w-1" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Hide scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
