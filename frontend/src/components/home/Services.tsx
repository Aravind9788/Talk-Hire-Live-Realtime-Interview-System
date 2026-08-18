import React from "react";
import { 
  Mic, FileText, Code2, Server, MessageSquare, BarChart3, 
  Sparkles, ArrowRight, Shield, CheckCircle2, Zap, Layers,
  Terminal, Lightbulb, Compass
} from "lucide-react";

interface ServicesProps {
  onStartInterview: () => void;
}

const SERVICES_LIST = [
  {
    id: "realtime_voice",
    title: "Real-Time Conversational Voice AI",
    icon: Mic,
    badge: "Sub-Second Latency",
    description: "Experience ultra-responsive, natural voice interviews with live voice activity detection and spontaneous candidate interruption handling.",
    highlights: ["Sub-second turn-taking", "Natural speech interruption", "Noise & echo cancellation"],
  },
  {
    id: "resume_jd_gap",
    title: "Dual Resume ↔ Job Description Gap Engine",
    icon: FileText,
    badge: "Targeted Matching",
    description: "Upload your resume and paste your target Job Description. The system computes alignment, finds missing tech stack gaps, and asks targeted probe questions.",
    highlights: ["Match Score % calculation", "Automated skill gap discovery", "Targeted probe questions"],
  },
  {
    id: "multiround_simulator",
    title: "Comprehensive Multi-Round Simulator",
    icon: Layers,
    badge: "6 Interview Tracks",
    description: "Prepare across all real-world interview formats: Coding (DSA), System Design, Live Code Review, STAR Behavioral, and Domain Specialization.",
    highlights: ["Coding & Algorithms", "System Architecture", "Behavioral STAR method"],
  },
  {
    id: "live_code_workspace",
    title: "In-Call Interactive Code Workspace",
    icon: Code2,
    badge: "Live Whiteboard",
    description: "Draft code in Python or TypeScript, write architecture notes, and share code snapshots with the AI interviewer while speaking seamlessly.",
    highlights: ["Syntax-highlighted editor", "Architecture scratchpad", "One-click share with AI"],
  },
  {
    id: "communication_eval",
    title: "Communication & Articulation Scoring",
    icon: MessageSquare,
    badge: "Speech Intelligence",
    description: "Get evaluated on structured thinking, thinking aloud under pressure, handling interviewer hints, and CS terminology precision.",
    highlights: ["STAR structure evaluation", "Thinking out loud tracking", "Hint receptiveness score"],
  },
  {
    id: "debrief_scorecards",
    title: "Enterprise Debrief Scorecards & Roadmap",
    icon: BarChart3,
    badge: "1.0 - 4.0 Rating",
    description: "Receive a Google-caliber post-interview scorecard with overall hiring verdict, detailed strengths, blindspots, and a tailored study roadmap.",
    highlights: ["Hire / No-Hire verdict", "Specific blindspots review", "Personalized study roadmap"],
  },
];

export const Services: React.FC<ServicesProps> = ({ onStartInterview }) => {
  return (
    <section id="services" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center space-y-3 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Comprehensive Interview Suite</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Services & Features <span className="gradient-text-primary">We Provide</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Everything software engineers need to master technical interviews, close skill gaps, and land offers at top-tier tech companies.
          </p>
        </div>

        {/* Services 3x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES_LIST.map((srv) => {
            const Icon = srv.icon;
            return (
              <div
                key={srv.id}
                className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800/90 hover:border-indigo-500/40 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-900/10"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-indigo-300">
                      {srv.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
                      {srv.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {srv.description}
                    </p>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-800/80 space-y-2">
                  {srv.highlights.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive CTA Banner */}
        <div className="mt-14 glass-panel p-8 rounded-3xl border border-indigo-500/30 text-center relative overflow-hidden bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40">
          <div className="max-w-2xl mx-auto space-y-4">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Ready to practice your target interview?
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm">
              Select your target role, upload your resume & JD, and start your real-time voice simulation in under 30 seconds.
            </p>
            <button
              onClick={onStartInterview}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition transform hover:scale-105"
            >
              <span>Launch Mock Interview Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};
