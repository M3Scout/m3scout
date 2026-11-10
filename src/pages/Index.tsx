import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "@/components/site/m3site.css";
import { HomeHero } from "@/components/home2/HomeHero";
import { HomeTalents } from "@/components/home2/HomeTalents";
import { HomePenalty } from "@/components/home2/HomePenalty";
import { HomeFeed } from "@/components/home2/HomeFeed";
import { useHomePlayers } from "@/components/home2/useHomePlayers";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const Index = () => {
  const players = useHomePlayers();
  const navigate = useNavigate();
  const { hash } = useLocation();

  // vindo de outra página com #talentos / #sobre / #imprensa: rola até a seção
  useEffect(() => {
    if (!hash) return;
    const t = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 350);
    return () => window.clearTimeout(t);
  }, [hash]);

  // Clique num atleta da jogada do hero: abre o perfil se o encontrarmos, senão vai para Talentos
  const onAthlete = useCallback(
    (_id: string, name: string) => {
      const n = norm(name);
      const p = players.find((pl) => norm(pl.full_name).startsWith(n) || norm(pl.slug ?? "").startsWith(n.replace(/\s+/g, "-")));
      if (p) navigate(`/atleta/${p.slug}`);
      else document.getElementById("talentos")?.scrollIntoView({ behavior: "smooth" });
    },
    [players, navigate]
  );

  return (
    <div className="m3s m3s-home">
      <HomeHero onAthlete={onAthlete} />
      <HomeTalents players={players} />
      <HomePenalty />
      <HomeFeed />
    </div>
  );
};

export default Index;
