import { Link } from "react-router-dom";
import "./AboutSection.css";

export function AboutSection() {
  return (
    <section className="sobre">
      <div className="sobre__inner">
        <header className="sobre__head">
          <span className="sobre__eyebrow">Sobre a M3</span>
          <span className="sobre__index">/ 01 — 03</span>
        </header>

        <div className="sobre__main">
          <h2 className="sobre__quote">
            Uma nova forma de <em>pensar</em> a carreira de jogadores de futebol.
          </h2>

          <div className="sobre__col-right">
            <p className="sobre__body">
              Na M3 Agency, combinamos scouting, dados e gestão de carreira com uma visão moderna de mercado — acompanhando de perto cada atleta para acelerar sua evolução.
            </p>
            <Link to="/sobre" className="sobre__link">
              Conheça a agência <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="sobre__meta">
          <div className="sobre__meta-item">
            <span className="sobre__meta-label">Sede</span>
            <span className="sobre__meta-val">Campo Grande · BR</span>
          </div>
          <div className="sobre__meta-item">
            <span className="sobre__meta-label">Atuação</span>
            <span className="sobre__meta-val">Brasil & Internacional</span>
          </div>
          <div className="sobre__meta-item">
            <span className="sobre__meta-label">Desde</span>
            <span className="sobre__meta-val">2024</span>
          </div>
        </div>
      </div>
    </section>
  );
}
