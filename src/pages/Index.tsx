import { useEffect } from "react";
import { LandingHero } from "@/components/home/LandingHero";
import { AthletesHorizontal } from "@/components/home/AthletesHorizontal";
import { FeaturedPlayers } from "@/components/home/FeaturedPlayers";
import { AboutSection } from "@/components/home/AboutSection";
import { FeedAndCta } from "@/components/home/FeedAndCta";
import { LandingFooter } from "@/components/home/LandingFooter";
import { ParallaxTransition } from "@/components/home/ParallaxTransition";

const Index = () => {
  useEffect(() => {
    if (import.meta.env.DEV) {
      const appStart = (window as any).__APP_MOUNT_START ?? performance.now();
      console.log("[TIMING] Index page mounted", {
        sinceAppMount: `${Math.round(performance.now() - appStart)}ms`
      });
    }
  }, []);

  if (import.meta.env.DEV) console.log("[MOUNT] Index (Home/Landing)");

  return (
    <>
      <LandingHero />
      <AthletesHorizontal />
      <ParallaxTransition>
        <FeaturedPlayers />
      </ParallaxTransition>
      <ParallaxTransition>
        <AboutSection />
      </ParallaxTransition>
      <FeedAndCta />
      <LandingFooter />
    </>
  );
};

export default Index;
