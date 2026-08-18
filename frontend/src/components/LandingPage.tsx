import React, { useState } from "react";
import { Hero } from "./home/Hero";
import { Services } from "./home/Services";
import { HowItWorks } from "./home/HowItWorks";
import { Founder } from "./home/Founder";
import { TermsModal } from "./home/TermsModal";

interface LandingPageProps {
  onStartInterview: () => void;
  isTermsOpen: boolean;
  onCloseTerms: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onStartInterview,
  isTermsOpen,
  onCloseTerms
}) => {
  const scrollToServices = () => {
    const el = document.getElementById("services");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Hero Section */}
      <Hero 
        onStartInterview={onStartInterview} 
        onExploreServices={scrollToServices} 
      />

      {/* Services Grid (All 6 core offerings) */}
      <Services onStartInterview={onStartInterview} />

      {/* How It Works (3 Steps) */}
      <HowItWorks onStartInterview={onStartInterview} />

      {/* Meet the Founder Section */}
      <Founder />

      {/* Terms & Privacy Modal */}
      <TermsModal isOpen={isTermsOpen} onClose={onCloseTerms} />
    </div>
  );
};
