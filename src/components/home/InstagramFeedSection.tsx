import { useState, useRef, useEffect } from "react";
import { Instagram, Youtube, Linkedin, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Fallback mock posts - replace with real Instagram feed when API is configured
const mockPosts = [
  {
    id: "1",
    imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=400&fit=crop",
    permalink: "https://instagram.com/m3agency",
  },
  {
    id: "2",
    imageUrl: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=400&h=400&fit=crop",
    permalink: "https://instagram.com/m3agency",
  },
  {
    id: "3",
    imageUrl: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=400&fit=crop",
    permalink: "https://instagram.com/m3agency",
  },
  {
    id: "4",
    imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&h=400&fit=crop",
    permalink: "https://instagram.com/m3agency",
  },
  {
    id: "5",
    imageUrl: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=400&fit=crop",
    permalink: "https://instagram.com/m3agency",
  },
  {
    id: "6",
    imageUrl: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400&h=400&fit=crop",
    permalink: "https://instagram.com/m3agency",
  },
  {
    id: "7",
    imageUrl: "https://images.unsplash.com/photo-1600679472829-3044539ce8ed?w=400&h=400&fit=crop",
    permalink: "https://instagram.com/m3agency",
  },
  {
    id: "8",
    imageUrl: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=400&fit=crop",
    permalink: "https://instagram.com/m3agency",
  },
];

interface InstagramPost {
  id: string;
  imageUrl: string;
  permalink: string;
}

export function InstagramFeedSection() {
  const [posts] = useState<InstagramPost[]>(mockPosts);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

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
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = carouselRef.current.clientWidth * 0.8;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const socialLinks = [
    { icon: Instagram, href: "https://instagram.com/m3agency", label: "Instagram" },
    { icon: Youtube, href: "https://youtube.com/@m3agency", label: "YouTube" },
    { icon: Linkedin, href: "https://linkedin.com/company/m3agency", label: "LinkedIn" },
  ];

  return (
    <section className="py-16 md:py-24 bg-[#f8f7f4]">
      {/* Header */}
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10 mb-10">
        <div className="flex items-center justify-between">
          {/* Left: Title */}
          <div className="flex items-center gap-4">
            <h2 className="text-sm md:text-base font-medium uppercase tracking-[0.2em] text-neutral-900">
              Siga a M3 Agency
            </h2>
            <a
              href="https://instagram.com/m3agency"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs md:text-sm font-normal uppercase tracking-[0.15em] text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              @m3agency
            </a>
          </div>

          {/* Right: Social Icons */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors"
                aria-label={social.label}
              >
                <social.icon size={20} />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          className={cn(
            "absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-10",
            "w-12 h-12 flex items-center justify-center",
            "bg-white border border-neutral-200 text-neutral-700",
            "hover:bg-neutral-100 transition-all duration-200",
            !canScrollLeft && "opacity-0 pointer-events-none"
          )}
          aria-label="Scroll left"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => scroll("right")}
          className={cn(
            "absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-10",
            "w-12 h-12 flex items-center justify-center",
            "bg-white border border-neutral-200 text-neutral-700",
            "hover:bg-neutral-100 transition-all duration-200",
            !canScrollRight && "opacity-0 pointer-events-none"
          )}
          aria-label="Scroll right"
        >
          <ChevronRight size={20} />
        </button>

        {/* Carousel */}
        <div
          ref={carouselRef}
          className="flex gap-1 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth px-6 md:px-10"
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
              <div className="relative w-[160px] h-[160px] sm:w-[180px] sm:h-[180px] md:w-[200px] md:h-[200px] lg:w-[220px] lg:h-[220px] overflow-hidden">
                {/* Image */}
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
