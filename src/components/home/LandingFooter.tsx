import { Link } from "react-router-dom";
import "./LandingFooter.css";

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer__inner">
        <div className="lp-footer__top">
          {/* Brand */}
          <div>
            <h3 className="lp-footer__brand">
              M3<span className="accent">.</span>
            </h3>
            <p className="lp-footer__tagline">
              Inteligência aplicada ao futebol. Scouting, gestão de carreira e
              relacionamento com clubes — em escala humana.
            </p>
          </div>

          {/* Navegação */}
          <div>
            <p className="lp-footer__col-title">Navegação</p>
            <ul className="lp-footer__col-list">
              <li><Link to="/about">Sobre</Link></li>
              <li><Link to="/talents">Talentos</Link></li>
              <li><Link to="/clubs">Clubes</Link></li>
              <li><Link to="/news">Imprensa</Link></li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <p className="lp-footer__col-title">Contato</p>
            <ul className="lp-footer__col-list">
              <li><a href="mailto:contato@m3agency.com">contato@m3agency.com</a></li>
              <li><a href="tel:+5567991106060">+55 67 99110-6060</a></li>
              <li><span>Campo Grande · BR</span></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <p className="lp-footer__col-title">Social</p>
            <ul className="lp-footer__col-list">
              <li>
                <a href="https://instagram.com/_m3agency" target="_blank" rel="noreferrer">
                  @m3agency
                </a>
              </li>
              <li>
                <a href="https://www.youtube.com/@AgencyM3" target="_blank" rel="noreferrer">
                  YouTube
                </a>
              </li>
              <li>
                <a href="https://tiktok.com/@m3agency" target="_blank" rel="noreferrer">
                  TikTok
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="lp-footer__bottom">
          <span>© 2026 M3 Agency · Todos os direitos reservados</span>
          <span>
            <i className="lp-footer__status-dot" aria-hidden="true" />
            Sistema ativo · v2.6
          </span>
        </div>
      </div>
    </footer>
  );
}
