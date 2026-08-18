import React from "react";
import { Mic, Sparkles, Shield, Activity } from "lucide-react";

interface NavbarProps {
  activeSession: bool;
  onResetSession?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeSession, onResetSession }) => {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={onResetSession}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-white">Talk</span>
              <span className="font-extrabold text-xl tracking-tight gradient-text-primary">Hire</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Live AI
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {activeSession ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Interview Session Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-medium">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>System Ready</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Encrypted WebRTC</span>
          </div>
        </div>
      </div>
    </header>
  );
};
