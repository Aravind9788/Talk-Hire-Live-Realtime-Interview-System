import React from "react";
import { Mic, Shield, Heart } from "lucide-react";

interface FooterProps {
  onOpenTerms?: () => void;
  onNavigateHome?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenTerms, onNavigateHome }) => {
  return (
    <footer className="glass-panel border-t border-slate-800/80 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-2">
            <div 
              className="flex items-center gap-2 cursor-pointer inline-flex"
              onClick={onNavigateHome}
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Mic className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">Talk</span>
              <span className="font-extrabold text-xl tracking-tight gradient-text-primary">
                Hir<span className="opacity-75 text-white/90">e</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              The next-generation real-time conversational AI interview platform. Practice high-stakes coding, system design, and behavioral interviews with sub-second speech feedback.
            </p>
          </div>

          {/* Platform Links */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Platform</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li><a href="#services" className="hover:text-white transition">Services & Features</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition">How It Works</a></li>
              <li><a href="#founder" className="hover:text-white transition">Meet the Founder</a></li>
            </ul>
          </div>

          {/* Legal & Security */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Legal & Trust</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>
                <button onClick={onOpenTerms} className="hover:text-white transition text-left cursor-pointer">
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button onClick={onOpenTerms} className="hover:text-white transition text-left cursor-pointer">
                  Privacy Policy
                </button>
              </li>
              <li className="flex items-center gap-1 text-slate-500 pt-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% In-Memory Private</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} TalkHir<span className="opacity-45">e</span> Platform. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Crafted with <Heart className="w-3.5 h-3.5 text-rose-500" /> by Aravind & Team
          </p>
        </div>
      </div>
    </footer>
  );
};
