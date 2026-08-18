import React from "react";
import { Mic, Sparkles, Shield, ArrowRight, Activity, CheckCircle2 } from "lucide-react";

interface HeroProps {
  onStartClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStartClick }) => {
  return (
    <div className="relative overflow-hidden py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-wide">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Real-Time Voice AI Interview Simulator</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Practice Technical Interviews with <span className="gradient-text-primary">Human-like Voice AI</span>
        </h1>

        <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          Simulate Google, Meta, and Amazon style coding, system design, and behavioral interviews with sub-second real-time voice conversations and instant rubric evaluation.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={onStartClick}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 text-white font-bold text-base shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <span>Start Practice Interview</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="pt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-xs font-semibold text-slate-400">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Sub-Second Latency</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Resume Aware</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Google-Style Rubric</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Adaptive Difficulty</span>
          </div>
        </div>
      </div>
    </div>
  );
};
