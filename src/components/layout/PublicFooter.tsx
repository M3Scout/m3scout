import { Link } from "react-router-dom";
import logoM3 from "@/assets/logo-m3.png";

// Social media configuration
const socialConfig = {
  instagram: {
    url: "https://instagram.com/_m3agency",
    label: "Instagram",
  },
  youtube: {
    url: "https://youtube.com/@m3agency",
    label: "YouTube",
  },
  tiktok: {
    url: "https://tiktok.com/@m3agency",
    label: "TikTok",
  },
};

// Custom Instagram icon
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

// Custom YouTube icon
function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

// Custom TikTok icon
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

const socialLinks = [
  { icon: InstagramIcon, href: socialConfig.instagram.url, label: socialConfig.instagram.label },
  { icon: YoutubeIcon, href: socialConfig.youtube.url, label: socialConfig.youtube.label },
  { icon: TikTokIcon, href: socialConfig.tiktok.url, label: socialConfig.tiktok.label },
];

export function PublicFooter() {
  return (
    <footer className="bg-zinc-950">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="flex items-center justify-between h-20 md:h-24">
          {/* Left: Logo */}
          <Link 
            to="/" 
            className="flex items-center hover:opacity-80 transition-opacity duration-200"
          >
            <img 
              src={logoM3} 
              alt="M3 Agency" 
              className="h-6 md:h-7 w-auto"
            />
          </Link>

          {/* Right: Social Icons */}
          <div className="flex items-center gap-5 md:gap-6">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="text-zinc-500 hover:text-white transition-colors duration-200"
              >
                <social.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
