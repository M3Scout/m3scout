import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedPlayers } from "@/components/home/FeaturedPlayers";
import { AboutSection } from "@/components/home/AboutSection";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <>
      <HeroSection />
      <FeaturedPlayers />
      <AboutSection />
      <CTASection />
    </>
  );
};

export default Index;
