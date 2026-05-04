import { lazy, Suspense } from "react";
import { LandingHero } from "@/components/home/LandingHero";
import { AthletesHorizontal } from "@/components/home/AthletesHorizontal";

// Below-the-fold: lazy load to reduce initial JS payload
const AboutSection = lazy(() => import("@/components/home/AboutSection").then(m => ({ default: m.AboutSection })));
const FeedAndCta = lazy(() => import("@/components/home/FeedAndCta").then(m => ({ default: m.FeedAndCta })));
const ParallaxTransition = lazy(() => import("@/components/home/ParallaxTransition").then(m => ({ default: m.ParallaxTransition })));

const Index = () => {
  return (
    <>
      <LandingHero />
      <AthletesHorizontal />
      <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
        <ParallaxTransition>
          <AboutSection />
        </ParallaxTransition>
        <FeedAndCta />
      </Suspense>
    </>
  );
};

export default Index;
