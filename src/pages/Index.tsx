import { PremiumHero } from "@/components/home/PremiumHero";
import { FeaturedPlayers } from "@/components/home/FeaturedPlayers";
import { AboutSection } from "@/components/home/AboutSection";
import { InstagramFeedSection } from "@/components/home/InstagramFeedSection";

const Index = () => {
  return (
    <>
      <PremiumHero />
      <FeaturedPlayers />
      <AboutSection />
      <InstagramFeedSection />
    </>
  );
};

export default Index;
