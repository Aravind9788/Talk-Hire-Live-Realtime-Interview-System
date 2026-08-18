import React from "react";
import { Mic, Shield, Heart } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/60 py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
            <Mic className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-slate-300">TalkHire Real-Time Interview Platform</span>
        </div>

        <p>© {new Date().getFullYear()} TalkHire. Built for high-performance voice AI practice.</p>

        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-indigo-400" /> WebRTC Audio Secured
          </span>
        </div>
      </div>
    </footer>
  );
};
