import React from "react";
import { UploadCloud, Mic2, FileCheck2, ArrowRight, Sparkles } from "lucide-react";

interface HowItWorksProps {
  onStartInterview: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onStartInterview }) => {
  const steps = [
    {
      step: "01",
      title: "Set Your Target Role & Upload Resume + JD",
      desc: "Choose from 6 engineering tracks, upload your PDF resume, and paste the job description you're interviewing for. Our engine analyzes skill overlap and prepares custom probe questions.",
      icon: UploadCloud,
      tag: "Dual Ingestion",
    },
    {
      step: "02",
      title: "Experience the Real-Time Voice Interview",
      desc: "Speak naturally into your microphone. The AI interviewer asks questions, challenges assumptions, and handles spontaneous interruptions with sub-second response times.",
      icon: Mic2,
      tag: "Live Audio & Code",
    },
    {
      step: "03",
      title: "Receive Detailed Debrief & Study Roadmap",
      desc: "Get an instant Google-caliber scorecard rating your technical depth, coding fluency, and communication skills, complete with a personalized action plan to close gaps.",
      icon: FileCheck2,
      tag: "Actionable Feedback",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 relative bg-slate-950/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center space-y-3 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Seamless 3-Step Process</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            How <span className="gradient-text-primary">TalkHir<span className="opacity-45">e</span></span> Works
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            From setup to post-interview debrief in 3 frictionless steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="glass-panel p-8 rounded-2xl border border-slate-800 relative flex flex-col justify-between group hover:border-indigo-500/40 transition-all duration-300"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-3xl font-black text-slate-700 group-hover:text-indigo-400 transition-colors">
                      {item.step}
                    </span>
                    <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-emerald-400">
                    {item.tag}
                  </span>

                  <h3 className="text-base font-bold text-white leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
