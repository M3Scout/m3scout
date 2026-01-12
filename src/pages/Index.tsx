import { HeaderHero } from "@/components/home/HeaderHero";
import { FeaturedPlayers } from "@/components/home/FeaturedPlayers";
import { AboutSection } from "@/components/home/AboutSection";
import { InstagramFeedSection } from "@/components/home/InstagramFeedSection";

const Index = () => {
  return (
    <>
      <HeaderHero />
      <FeaturedPlayers />
      <AboutSection />
      <InstagramFeedSection />
    </>
  );
};

export default Index;
