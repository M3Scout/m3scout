import { CinematicHero } from "@/components/home/CinematicHero";
import { FeaturedPlayers } from "@/components/home/FeaturedPlayers";
import { AboutSection } from "@/components/home/AboutSection";
import { InstagramFeedSection } from "@/components/home/InstagramFeedSection";

const Index = () => {
  return (
    <>
      <CinematicHero />
      <FeaturedPlayers />
      <AboutSection />
      <InstagramFeedSection />
    </>
  );
};

export default Index;
