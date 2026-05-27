import React, { useState } from 'react';
import { Onboarding } from './components/home/Onboarding';
import { CandidateMonitor } from './components/CandidateMonitor';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Sparkles, Cpu, Activity, Server } from 'lucide-react';

export default function App() {
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [resumeContext, setResumeContext] = useState('');

  const handleStartInterview = (name: string, role: string, context: string) => {
    setCandidateName(name);
    setJobRole(role);
    setResumeContext(context);
    setIsInterviewing(true);
  };

  const handleExitSession = () => {
    setIsInterviewing(false);
    setCandidateName('');
    setJobRole('');
    setResumeContext('');
  };

  const iframeSrc = `/demo.html?name=${encodeURIComponent(candidateName)}&job_role=${encodeURIComponent(jobRole)}&resume_context=${encodeURIComponent(resumeContext)}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative grid-bg">
      <AnimatePresence mode="wait">
        {!isInterviewing ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col min-h-screen relative z-10"
          >
            {/* Minimal Navigation */}
            <header className="fixed top-0 w-full z-50 bg-zinc-950/70 backdrop-blur-md border-b border-zinc-900/50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <Mic className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-base font-semibold tracking-tight text-zinc-50">TalkHire</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">Demo Sandbox Mode</span>
                </div>
              </div>
            </header>

            {/* Main Interactive Workspace */}
            <main className="flex-grow flex items-center pt-24 pb-12 relative">
              {/* Background glows */}
              <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-[500px] h-[350px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none animate-pulse-glow" />
              <div className="absolute bottom-10 right-1/4 w-[400px] h-[280px] bg-violet-500/5 blur-[100px] rounded-full pointer-events-none" />

              <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                  
                  {/* Left Column: Premium Pitch & visualizer */}
                  <div className="lg:col-span-6 space-y-8">
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/25 bg-indigo-500/10 text-indigo-300 text-xs font-semibold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Interactive Voice Agent</span>
                      </div>
                      
                      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
                        Simulate Real Tech Interviews with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-300 to-violet-400">TalkHire</span>
                      </h1>
                      
                      <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl">
                        Experience low-latency, conversational AI technical rounds. Choose an instant preset developer profile or upload your resume for real-time tailored questioning, face proctoring, and instant rubric evaluations.
                      </p>
                    </div>

                    {/* Recruiter Console Panel (Interactive Diagram) */}
                    <div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/10 backdrop-blur-sm overflow-hidden max-w-xl shadow-xl">
                      {/* Header */}
                      <div className="bg-zinc-950/60 border-b border-zinc-800/50 px-4 py-3 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-semibold text-zinc-200">System Architecture Flow</span>
                      </div>

                      {/* Diagram Body */}
                      <div className="p-5 min-h-[190px] flex items-center justify-center bg-zinc-950/10">
                        <div className="w-full space-y-4">
                          {/* Horizontal SVG architecture diagram */}
                          <div className="relative flex items-center justify-between px-2 py-4">
                            
                            {/* Pipeline nodes */}
                            <div className="flex flex-col items-center gap-1.5 z-10 w-1/3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-lg animate-float">
                                <Mic className="w-4 h-4 text-indigo-400" />
                              </div>
                              <span className="text-[10px] font-semibold text-zinc-300">1. Client Device</span>
                              <span className="text-[8px] text-zinc-500 text-center px-1">WebRTC Audio & local Face proctoring</span>
                            </div>

                            <div className="flex flex-col items-center gap-1.5 z-10 w-1/3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-lg animate-float" style={{ animationDelay: '1.5s' }}>
                                <Server className="w-4 h-4 text-indigo-400" />
                              </div>
                              <span className="text-[10px] font-semibold text-zinc-300">2. LiveKit Gateway</span>
                              <span className="text-[8px] text-zinc-500 text-center px-1">Silero VAD (Latency &lt;50ms)</span>
                            </div>

                            <div className="flex flex-col items-center gap-1.5 z-10 w-1/3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-lg animate-float" style={{ animationDelay: '3s' }}>
                                <Cpu className="w-4 h-4 text-indigo-400" />
                              </div>
                              <span className="text-[10px] font-semibold text-zinc-300">3. OpenAI Realtime</span>
                              <span className="text-[8px] text-zinc-500 text-center px-1">OpenAI Realtime model & Rubric generator</span>
                            </div>

                            {/* Flow paths (Background lines with running dash) */}
                            <div className="absolute inset-x-0 top-9 px-12 pointer-events-none">
                              <svg className="w-full h-2 overflow-visible" fill="none">
                                <path
                                  d="M 10 4 L 300 4"
                                  stroke="rgba(99, 102, 241, 0.15)"
                                  strokeWidth="2"
                                  className="w-full"
                                />
                                <path
                                  d="M 10 4 L 300 4"
                                  stroke="#6366f1"
                                  strokeWidth="2"
                                  className="animate-flow"
                                />
                              </svg>
                            </div>

                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Onboarding Form */}
                  <div className="lg:col-span-6 xl:col-span-5 xl:col-start-8">
                    <div className="glass rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden bg-zinc-900/30 border border-zinc-800/80">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent pointer-events-none" />
                      
                      <div className="mb-6">
                        <h2 className="text-lg font-bold text-white">Setup Sandbox Session</h2>
                        <p className="text-xs text-zinc-500 mt-1">Configure your mock round profile parameters below to launch.</p>
                      </div>

                      <Onboarding 
                        onStart={handleStartInterview} 
                        onBack={() => {}} 
                      />
                    </div>
                  </div>

                </div>
              </div>
            </main>

            {/* Minimal Footer */}
            <footer className="border-t border-zinc-900/50 bg-zinc-950/30 py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-[10px] text-zinc-600 font-mono">TalkHire Interactive Sandbox v1.0.0</span>
                <span className="text-[10px] text-zinc-600 font-mono">WebRTC (LiveKit) &bull; local face-proctoring active</span>
              </div>
            </footer>
          </motion.div>
        ) : (
          <motion.div
            key="interview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 bg-zinc-950 flex flex-col animate-pulse-glow"
          >
            {/* Minimal Dashboard Header */}
            <header className="h-14 border-b border-zinc-800/50 flex items-center justify-between px-4 sm:px-6 bg-zinc-950/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-zinc-50">TalkHire</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400">Session Active</span>
                {jobRole && (
                  <span className="hidden sm:inline px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300">{jobRole}</span>
                )}
              </div>
              <button 
                onClick={handleExitSession}
                className="text-xs font-medium px-3 py-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-50 transition-colors cursor-pointer"
              >
                Exit Session
              </button>
            </header>
            {/* Split Screen Workspace */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Column: Live Candidate Preview & Proctor Status */}
              <div className="w-full md:w-[320px] lg:w-[360px] border-b md:border-b-0 md:border-r border-zinc-900 bg-zinc-950 flex flex-col overflow-y-auto p-4 lg:p-5 shrink-0">
                <CandidateMonitor isEmbedded={true} candidateName={candidateName} jobRole={jobRole} />
              </div>

              {/* Right Column: WebRTC / OpenAI Realtime Session & Transcript */}
              <div className="flex-1 relative bg-zinc-950">
                <iframe
                  allow="microphone; camera; autoplay"
                  src={iframeSrc}
                  className="absolute inset-0 w-full h-full border-0 bg-transparent"
                  title="TalkHire Interview Session"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}