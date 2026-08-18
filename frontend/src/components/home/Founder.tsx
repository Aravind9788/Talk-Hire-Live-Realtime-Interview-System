import React from "react";
import { Sparkles, Quote, Award, Target, Rocket, Heart, CheckCircle2 } from "lucide-react";

export const Founder: React.FC = () => {
  return (
    <section id="founder" className="py-20 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Leadership & Vision</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Meet the <span className="gradient-text-primary">Founder</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Empowering software engineers globally with accessible, realistic, and high-caliber interview preparation.
          </p>
        </div>

        {/* Founder Card Container */}
        <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-slate-800 relative shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left: Founder Photo */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="relative group">
                {/* Photo Frame with Ambient Border */}
                <div className="w-64 h-80 sm:w-72 sm:h-96 rounded-2xl overflow-hidden border-2 border-indigo-500/30 shadow-xl shadow-indigo-900/20 relative">
                  <img
                    src="/founder.jpg"
                    alt="Aravind — Founder of TalkHire"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      // Fallback if direct public path resolves differently
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes("WhatsApp")) {
                        target.src = "/WhatsApp Image 2025-10-01 at 08.19.27_dac6478a.jpg";
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                </div>

                {/* Verified Badge */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-indigo-600 border border-indigo-400/50 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Founder & Chief Architect</span>
                </div>
              </div>
            </div>

            {/* Right: Founder Bio & Vision Statement */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Aravind
                </h3>
                <p className="text-indigo-400 font-medium text-sm">
                  Founder & Creator of TalkHir<span className="opacity-45">e</span>
                </p>
              </div>

              {/* Quote Box */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative">
                <Quote className="w-8 h-8 text-indigo-500/20 absolute top-3 right-3" />
                <p className="text-slate-200 text-sm sm:text-base leading-relaxed italic">
                  "Most candidates fail technical interviews not because they lack coding intelligence, but because they haven't practiced articulating complex architectural decisions under real-time conversational pressure. I built TalkHire to give every engineer a realistic, 24/7 AI interview partner that builds authentic confidence and bridges every skill gap."
                </p>
              </div>

              {/* Mission Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 shrink-0">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Targeted Preparation</h4>
                    <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                      Tailored to exact resume claims and job description requirements.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 shrink-0">
                    <Rocket className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Democratizing Coaching</h4>
                    <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                      Top-tier mock interviews accessible to everyone, anywhere, anytime.
                    </p>
                  </div>
                </div>
              </div>

              {/* Founder Sign-off */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-xs text-slate-400">
                <span>TalkHir<span className="opacity-45">e</span> Engineering Platform</span>
                <span className="text-indigo-400 font-semibold flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-400 inline" /> Built for ambitious engineers
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
