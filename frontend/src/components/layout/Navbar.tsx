import React from "react";
import { Mic, ArrowRight, Home, ArrowLeft } from "lucide-react";

interface NavbarProps {
  currentStep: "landing" | "onboarding" | "interview";
  onResetSession?: () => void;
  onNavigateLanding?: () => void;
  onOpenTerms?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentStep, 
  onResetSession,
  onNavigateLanding,
  onOpenTerms
}) => {
  const isLanding = currentStep === "landing";
  const isInterview = currentStep === "interview";
  const isOnboarding = currentStep === "onboarding";

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo with trailing transparent 'e' */}
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={onNavigateLanding}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-baseline">
              <span className="font-extrabold text-2xl tracking-tight text-white">Talk</span>
              <span className="font-extrabold text-2xl tracking-tight gradient-text-primary">
                Hir<span className="opacity-75 text-white/90">e</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Live AI
              </span>
            </div>
          </div>
        </div>

        {/* Center Nav Links (ONLY visible on public Landing page, hidden on Onboarding & Interview) */}
        {isLanding && (
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#services" className="hover:text-white transition">Services</a>
            <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
            <a href="#founder" className="hover:text-white transition">Meet Founder</a>
            <button 
              onClick={onOpenTerms}
              className="hover:text-white transition cursor-pointer"
            >
              Terms & Legal
            </button>
          </nav>
        )}

        {/* Right Action */}
        <div className="flex items-center gap-3">
          {isLanding ? (
            <button
              onClick={onResetSession}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
            >
              <span>Start Interview</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : isInterview ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Interview Session Active</span>
            </div>
          ) : (
            <button
              onClick={onNavigateLanding}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit to Home</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
