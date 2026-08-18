import React, { useState } from "react";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { LandingPage } from "./components/LandingPage";
import { Onboarding, SessionConfigData } from "./components/home/Onboarding";
import { CandidateMonitor } from "./components/CandidateMonitor";
import { TermsModal } from "./components/home/TermsModal";

export const App: React.FC = () => {
  const [activeStep, setActiveStep] = useState<"landing" | "onboarding" | "interview">("landing");
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [sessionConfig, setSessionConfig] = useState<{
    roomName: string;
    participantName: string;
    livekitUrl: string;
    accessToken: string;
    jobRole: string;
    selectedRound: string;
  } | null>(null);

  const handleStartSession = async (config: SessionConfigData) => {
    try {
      const res = await fetch("/api/livekit/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: config.displayName,
          job_role: config.jobRole,
          track_preset: config.trackPreset,
          difficulty_hint: config.difficulty,
          topic_hint: config.topicHint,
          resume_context: config.resumeText,
          jd_context: config.jdText,
          company_style: config.companyStyle,
          interviewer_persona: config.interviewerPersona,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to bootstrap livekit session");
      }

      const data = await res.json();
      setSessionConfig({
        roomName: data.room_name,
        participantName: data.participant_name,
        livekitUrl: data.livekit_url,
        accessToken: data.access_token,
        jobRole: config.jobRole,
        selectedRound: config.trackPreset,
      });
      setActiveStep("interview");
    } catch (err) {
      console.warn("Using offline mock mode for UI session:", err);
      setSessionConfig({
        roomName: "talkhire-session-demo",
        participantName: config.displayName || "Candidate",
        livekitUrl: "wss://talkhire-demo.livekit.cloud",
        accessToken: "demo-token",
        jobRole: config.jobRole,
        selectedRound: config.trackPreset,
      });
      setActiveStep("interview");
    }
  };

  const handleEndSession = () => {
    setActiveStep("landing");
    setSessionConfig(null);
  };

  const handleGoToOnboarding = () => {
    setActiveStep("onboarding");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoToLanding = () => {
    setActiveStep("landing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      <Navbar 
        currentStep={activeStep} 
        onResetSession={handleGoToOnboarding}
        onNavigateLanding={handleGoToLanding}
        onOpenTerms={() => setIsTermsOpen(true)}
      />

      <main className="flex-grow">
        {activeStep === "landing" ? (
          <LandingPage 
            onStartInterview={handleGoToOnboarding} 
            isTermsOpen={isTermsOpen}
            onCloseTerms={() => setIsTermsOpen(false)}
          />
        ) : activeStep === "onboarding" ? (
          <div className="py-6">
            <Onboarding onStartSession={handleStartSession} />
          </div>
        ) : (
          sessionConfig && (
            <CandidateMonitor
              roomName={sessionConfig.roomName}
              participantName={sessionConfig.participantName}
              livekitUrl={sessionConfig.livekitUrl}
              accessToken={sessionConfig.accessToken}
              jobRole={sessionConfig.jobRole}
              selectedRound={sessionConfig.selectedRound}
              onEndSession={handleEndSession}
            />
          )
        )}
      </main>

      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />

      {activeStep === "landing" && (
        <Footer 
          onOpenTerms={() => setIsTermsOpen(true)} 
          onNavigateHome={handleGoToLanding}
        />
      )}
    </div>
  );
};

export default App;