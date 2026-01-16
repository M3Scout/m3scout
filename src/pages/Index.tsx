import { CinematicHero } from "@/components/home/CinematicHero";
import { FeaturedPlayers } from "@/components/home/FeaturedPlayers";
import { AboutSection } from "@/components/home/AboutSection";
import { InstagramFeedSection } from "@/components/home/InstagramFeedSection";
import { ParallaxTransition } from "@/components/home/ParallaxTransition";

const Index = () => {
  return (
    <>
      <CinematicHero />
      <ParallaxTransition>
        <FeaturedPlayers />
      </ParallaxTransition>
      <AboutSection />
      <InstagramFeedSection />
    </>
  );
};

export default Index;
