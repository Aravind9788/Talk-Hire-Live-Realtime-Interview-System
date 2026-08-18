import React from "react";
import { Mic, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Zap, Layers, Play } from "lucide-react";

interface HeroProps {
  onStartInterview: () => void;
  onExploreServices: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStartInterview, onExploreServices }) => {
  return (
    <section className="relative pt-16 pb-20 overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
        
        {/* Top Feature Pill */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] sm:text-xs font-semibold text-slate-300 shadow-xl max-w-full">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Next-Gen Real-Time Conversational AI</span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="hidden sm:inline text-indigo-400 font-bold">Sub-Second Speech Latency</span>
        </div>

        {/* Main Title */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight">
            Master High-Stakes Tech Interviews with{" "}
            <span className="gradient-text-primary">Real-Time Voice AI</span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Practice coding, system design, and behavioral rounds with an intelligent voice interviewer. Get instant Google-caliber scorecards, gap detection, and personalized study roadmaps.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={onStartInterview}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-indigo-600/30 transition transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <Mic className="w-5 h-5 text-indigo-200" />
            <span>Start Free Mock Interview</span>
            <ArrowRight className="w-4 h-4 text-indigo-200" />
          </button>

          <button
            onClick={onExploreServices}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-sm sm:text-base transition flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 text-indigo-400" />
            <span>Explore All Services</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="pt-8 border-t border-slate-800/60 max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-400">
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Resume + JD Gap Engine</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Live Coding Whiteboard</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Speech & Articulation Score</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>100% Private & In-Memory</span>
          </div>
        </div>

      </div>
    </section>
  );
};
