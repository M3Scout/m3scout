import { Link } from "react-router-dom";
import { Instagram, Youtube } from "lucide-react";

// Social media configuration
const socialConfig = {
  instagram: {
    url: "https://instagram.com/_m3agency",
    label: "Instagram",
  },
  youtube: {
    url: "https://youtube.com/@m3agency", // TODO: Update with actual URL
    label: "YouTube",
  },
  tiktok: {
    url: "https://tiktok.com/@m3agency", // TODO: Update with actual URL
    label: "TikTok",
  },
};

// Custom TikTok icon (not available in Lucide)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
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
}

export function PublicFooter() {
  return (
    <footer className="bg-zinc-950 text-white">
      <div className="container mx-auto px-6 py-16">
        {/* Main footer content */}
        <div className="grid gap-12 md:grid-cols-12">
          {/* Brand section */}
          <div className="md:col-span-5">
            <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
              <div className="flex h-10 w-10 items-center justify-center bg-white text-zinc-950 font-bold text-sm tracking-tight">
                M3
              </div>
              <span className="text-lg font-medium tracking-tight">M3 Agency</span>
            </Link>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
              Agência especializada em scouting e gestão de atletas de futebol. 
              Conectamos talentos aos melhores clubes do mundo.
            </p>
          </div>

          {/* Navigation */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-6">
              Navegação
            </h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/" 
                  className="text-sm text-zinc-300 hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  to="/players" 
                  className="text-sm text-zinc-300 hover:text-white transition-colors"
                >
                  Atletas
                </Link>
              </li>
              <li>
                <Link 
                  to="/sobre" 
                  className="text-sm text-zinc-300 hover:text-white transition-colors"
                >
                  Sobre
                </Link>
              </li>
              <li>
                <Link 
                  to="/contact" 
                  className="text-sm text-zinc-300 hover:text-white transition-colors"
                >
                  Contato
                </Link>
              </li>
            </ul>
          </div>

          {/* Social & Contact */}
          <div className="md:col-span-4">
            <h4 className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-6">
              Redes Sociais
            </h4>
            <div className="flex items-center gap-4 mb-8">
              <a
                href={socialConfig.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={socialConfig.instagram.label}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href={socialConfig.youtube.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={socialConfig.youtube.label}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <Youtube className="w-5 h-5" />
              </a>
              <a
                href={socialConfig.tiktok.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={socialConfig.tiktok.label}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <TikTokIcon className="w-5 h-5" />
              </a>
            </div>
            <div className="text-sm text-zinc-400">
              <p>contato@m3agency.com</p>
              <p className="mt-1">São Paulo, Brasil</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-zinc-500">
            © {new Date().getFullYear()} M3 Agency. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-6">
            <Link 
              to="/privacy" 
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Privacidade
            </Link>
            <Link 
              to="/terms" 
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Termos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
