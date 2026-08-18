import React, { useState } from "react";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { Onboarding } from "./components/home/Onboarding";
import { CandidateMonitor } from "./components/CandidateMonitor";

export const App: React.FC = () => {
  const [activeStep, setActiveStep] = useState<"onboarding" | "interview">("onboarding");
  const [sessionConfig, setSessionConfig] = useState<{
    roomName: string;
    participantName: string;
    livekitUrl: string;
    accessToken: string;
  } | null>(null);

  const handleStartSession = async (config: {
    displayName: string;
    jobRole: string;
    trackPreset: string;
    difficulty: string;
    topicHint: string;
    resumeText: string;
  }) => {
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
      });
      setActiveStep("interview");
    } catch (err) {
      console.warn("Using offline mock mode for UI session:", err);
      setSessionConfig({
        roomName: "talkhire-session-demo",
        participantName: config.displayName || "Candidate",
        livekitUrl: "wss://demo.livekit.cloud",
        accessToken: "demo-token",
      });
      setActiveStep("interview");
    }
  };

  const handleEndSession = () => {
    setActiveStep("onboarding");
    setSessionConfig(null);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      <Navbar 
        activeSession={activeStep === "interview"} 
        onResetSession={handleEndSession}
      />

      <main className="flex-grow">
        {activeStep === "onboarding" ? (
          <Onboarding onStartSession={handleStartSession} />
        ) : (
          sessionConfig && (
            <CandidateMonitor
              roomName={sessionConfig.roomName}
              participantName={sessionConfig.participantName}
              livekitUrl={sessionConfig.livekitUrl}
              accessToken={sessionConfig.accessToken}
              onEndSession={handleEndSession}
            />
          )
        )}
      </main>

      <Footer />
    </div>
  );
};

export default App;