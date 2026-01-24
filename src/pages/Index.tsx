import { CinematicHero } from "@/components/home/CinematicHero";
import { FeaturedPlayers } from "@/components/home/FeaturedPlayers";
import { AboutSection } from "@/components/home/AboutSection";
import { InstagramFeedSection } from "@/components/home/InstagramFeedSection";
import { ParallaxTransition } from "@/components/home/ParallaxTransition";

const Index = () => {
  if (import.meta.env.DEV) console.log("[MOUNT] Index (Home/Landing)");

  return (
    <>
      <CinematicHero />
      <ParallaxTransition>
        <FeaturedPlayers />
      </ParallaxTransition>
      <ParallaxTransition>
        <AboutSection />
      </ParallaxTransition>
      <ParallaxTransition>
        <InstagramFeedSection />
      </ParallaxTransition>
    </>
  );
};

export default Index;
