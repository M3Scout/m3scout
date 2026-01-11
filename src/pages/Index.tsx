import { HeaderHero } from "@/components/home/HeaderHero";
import { FeaturedPlayers } from "@/components/home/FeaturedPlayers";
import { AboutSection } from "@/components/home/AboutSection";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <>
      <HeaderHero />
      <FeaturedPlayers />
      <AboutSection />
      <CTASection />
    </>
  );
};

export default Index;
