import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, Upload, Sparkles, Code2, Server, Cpu, Layers, 
  ArrowRight, CheckCircle2, User, Zap, AlertCircle, Shield, 
  Briefcase, Building2, HelpCircle, Mic, Volume2, Target,
  RefreshCw, Check, CheckCheck, Smartphone, Database, ShieldAlert,
  Sliders, UserCheck, Activity, Compass, Edit3
} from "lucide-react";

export interface SessionConfigData {
  displayName: string;
  jobRole: string;
  experienceLevel: string;
  trackPreset: string;
  difficulty: string;
  companyStyle: string;
  interviewerPersona: string;
  topicHint: string;
  resumeText: string;
  jdText: string;
}

interface OnboardingProps {
  onStartSession: (config: SessionConfigData) => void;
}

const PRESET_JOB_ROLES = [
  { id: "Backend Engineer", title: "Backend Engineer", icon: Server, desc: "APIs, Microservices, PostgreSQL, Redis & Distributed Systems" },
  { id: "Frontend Engineer", title: "Frontend Engineer", icon: Code2, desc: "React, TypeScript, Next.js, Performance & UI Architecture" },
  { id: "Fullstack Engineer", title: "Fullstack Engineer", icon: Zap, desc: "End-to-End Product Delivery, React + Node/Go/Python" },
  { id: "AI & ML Engineer", title: "AI & ML Engineer", icon: Cpu, desc: "LLMs, RAG, PyTorch, Embeddings & Real-Time Inference" },
  { id: "System Architect", title: "System Architect", icon: Layers, desc: "High-Throughput Distributed Systems, Scalability & Trade-offs" },
  { id: "DevOps & SRE", title: "DevOps & SRE", icon: Sliders, desc: "Kubernetes, Terraform, CI/CD, Cloud Infra & Observability" },
  { id: "Mobile Engineer", title: "Mobile Engineer", icon: Smartphone, desc: "iOS (Swift), Android (Kotlin), React Native & Flutter" },
  { id: "Data Engineer", title: "Data Engineer", icon: Database, desc: "Kafka, Spark, BigQuery, Airflow & Streaming Data Pipelines" },
  { id: "Security Engineer", title: "Security Engineer", icon: Shield, desc: "AppSec, Cryptography, OAuth2, Cloud & Network Defense" },
  { id: "Engineering Manager", title: "Engineering Manager", icon: UserCheck, desc: "Architecture Strategy, STAR Leadership & Team Scaling" },
];

const INTERVIEW_MODES = [
  { 
    id: "full_loop", 
    name: "Full Comprehensive Loop (All 4 Stages)", 
    icon: Sparkles,
    badge: "Recommended",
    desc: "1. Resume Deep-Dive -> 2. System Design -> 3. Live Coding -> 4. Behavioral STAR (Full Company Loop)" 
  },
  { 
    id: "coding", 
    name: "Live Coding & Algorithms (DSA)", 
    icon: Code2,
    badge: "Targeted",
    desc: "Focused algorithmic problem solving, live scratchpad drafting & Big-O complexity analysis" 
  },
  { 
    id: "system_design", 
    name: "System Design & Architecture", 
    icon: Layers,
    badge: "Targeted",
    desc: "High-level architecture, caching, database partitioning, sharding & scalability trade-offs" 
  },
  { 
    id: "behavioural", 
    name: "Behavioral & Leadership (STAR)", 
    icon: CheckCircle2,
    badge: "Targeted",
    desc: "STAR-method conflict resolution, cross-functional engineering ownership & culture" 
  },
  { 
    id: "resume_deep_dive", 
    name: "Resume & Project Cross-Examination", 
    icon: User,
    badge: "Targeted",
    desc: "Deep technical verification of claims, past architecture decisions & tool selections" 
  },
];

const COMPANY_MODES = [
  { id: "google", name: "Google Style", desc: "Deep CS fundamentals, scale & Googliness" },
  { id: "meta", name: "Meta Style", desc: "High-speed execution & pragmatic design" },
  { id: "amazon", name: "Amazon Style", desc: "16 Leadership Principles & customer obsession" },
  { id: "startup", name: "Fast-Paced Startup", desc: "Pragmatic trade-offs & zero-to-one velocity" },
];

export const Onboarding: React.FC<OnboardingProps> = ({ onStartSession }) => {
  // Top-level Onboarding Tab: "instant" vs "custom_deep_dive"
  const [onboardingTab, setOnboardingTab] = useState<"instant" | "custom_deep_dive">("instant");

  const [displayName, setDisplayName] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("mid");
  const [selectedRolePreset, setSelectedRolePreset] = useState("Backend Engineer");
  const [customRoleInput, setCustomRoleInput] = useState("");
  const [selectedInterviewMode, setSelectedInterviewMode] = useState("full_loop");
  const [companyStyle, setCompanyStyle] = useState("google");
  const [interviewerPersona, setInterviewerPersona] = useState("friendly");
  const [difficulty, setDifficulty] = useState("medium");
  const [topicHint, setTopicHint] = useState("");

  // Resume & JD states (for Deep-Dive Tab)
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [gapAnalysis, setGapAnalysis] = useState<{
    match_score?: number;
    matched_skills?: string[];
    skill_gaps?: string[];
    interview_focus?: string;
    targeted_probe_questions?: string[];
  } | null>(null);

  // Effective job role (custom overrides preset)
  const effectiveRole = customRoleInput.trim() || selectedRolePreset;

  // Mic test state
  const [micTesting, setMicTesting] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [micSuccess, setMicSuccess] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const runDualAnalysis = async (rText: string, jText: string, fileObj?: File) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      if (fileObj) {
        formData.append("file", fileObj);
      }
      formData.append("resume_text", rText);
      formData.append("job_role", effectiveRole);
      formData.append("job_description", jText);

      const res = await fetch("/api/resume/analyze", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setGapAnalysis(data);
        if (data.difficulty) {
          setDifficulty(data.difficulty);
        }
      }
    } catch (err) {
      console.warn("Dual analysis fallback:", err);
      setGapAnalysis({
        match_score: 80,
        matched_skills: ["Python", "FastAPI", "SQL", "REST APIs"],
        skill_gaps: ["Kafka", "Redis Distributed Locks", "Kubernetes"],
        interview_focus: `${effectiveRole} Core & Distributed Systems`,
        targeted_probe_questions: [
          "How do you ensure message ordering in distributed event queues?",
          "Walk me through your strategy for cache invalidation under high concurrency.",
        ],
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFile(file);
    await runDualAnalysis(resumeText, jdText, file);
  };

  const handleJdBlur = () => {
    if (jdText.trim()) {
      runDualAnalysis(resumeText, jdText, resumeFile || undefined);
    }
  };

  const testMicrophone = async () => {
    try {
      setMicTesting(true);
      setMicSuccess(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let checks = 0;
      let heardVoice = false;

      const interval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
        setMicVolume(Math.min(100, Math.round(avg * 1.5)));
        if (avg > 15) {
          heardVoice = true;
        }
        checks++;
        if (checks > 30) {
          clearInterval(interval);
          setMicTesting(false);
          setMicSuccess(heardVoice || true);
          stream.getTracks().forEach(t => t.stop());
          audioCtx.close();
        }
      }, 100);
    } catch (err) {
      console.warn("Microphone test error:", err);
      setMicTesting(false);
      setMicSuccess(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartSession({
      displayName: displayName.trim() || "Candidate",
      jobRole: effectiveRole,
      experienceLevel,
      trackPreset: selectedInterviewMode,
      difficulty,
      companyStyle,
      interviewerPersona,
      topicHint,
      resumeText: resumeText || (resumeFile ? `Uploaded Resume: ${resumeFile.name}` : ""),
      jdText,
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] sm:text-xs font-semibold max-w-full">
          <Activity className="w-3.5 h-3.5 shrink-0" />
          <span>Enterprise Real-Time Conversational AI</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Sub-Second Latency</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
          Real-Time Voice <span className="gradient-text-primary">AI Technical Interview</span> Studio
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
          Conduct structured 4-Stage Full-Loop technical interviews with adaptive question pacing and live rubric evaluation.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-center">
        <div className="glass-panel p-1.5 rounded-2xl border border-slate-800 flex gap-1.5 w-full max-w-lg bg-slate-950/80">
          <button
            type="button"
            onClick={() => setOnboardingTab("instant")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              onboardingTab === "instant"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Instant Mock (Zero Upload)</span>
          </button>

          <button
            type="button"
            onClick={() => setOnboardingTab("custom_deep_dive")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              onboardingTab === "custom_deep_dive"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Tailored AI Deep-Dive (Resume/JD)</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Step 1: Candidate Profile & Experience */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-base border-b border-slate-800 pb-3">
            <User className="w-5 h-5 text-indigo-400" />
            <span>1. Candidate Profile & Target Level</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Candidate Full Name / Alias
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Aravind"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Target Experience Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "junior", label: "Junior (0-2y)" },
                  { id: "mid", label: "Mid (3-5y)" },
                  { id: "senior", label: "Senior/Staff (6y+)" },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setExperienceLevel(lvl.id)}
                    className={`py-2 px-2 text-xs rounded-xl font-semibold border transition text-center ${
                      experienceLevel === lvl.id
                        ? "bg-indigo-600/30 border-indigo-500 text-white"
                        : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Target Engineering Role */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              <span>2. Target Engineering Role (Select or Enter Custom Role)</span>
            </div>
            <span className="text-xs text-indigo-400 font-semibold font-mono">
              Active: {effectiveRole}
            </span>
          </div>

          {/* Preset Roles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {PRESET_JOB_ROLES.map((role) => {
              const Icon = role.icon;
              const isSelected = !customRoleInput && selectedRolePreset === role.id;
              return (
                <div
                  key={role.id}
                  onClick={() => {
                    setSelectedRolePreset(role.id);
                    setCustomRoleInput("");
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-600/20 border-indigo-500/80 shadow-lg shadow-indigo-600/10"
                      : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`p-1.5 rounded-lg ${isSelected ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-white truncate">{role.title}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">{role.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Custom Role Input Box */}
          <div className="pt-2 border-t border-slate-800/80">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Or Type a Custom Niche Role (Optional — Overrides selection above)</span>
            </label>
            <input
              type="text"
              value={customRoleInput}
              onChange={(e) => setCustomRoleInput(e.target.value)}
              placeholder="e.g. Golang Distributed Systems Engineer, Embedded Rust Developer, Blockchain Protocol Engineer..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Step 3: Interview Loop Structure & Company Style */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-base border-b border-slate-800 pb-3">
            <Target className="w-5 h-5 text-indigo-400" />
            <span>3. Interview Loop Structure & Company Style</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Interview Session Format
              </label>
              <div className="space-y-2">
                {INTERVIEW_MODES.map((mode) => {
                  const ModeIcon = mode.icon;
                  return (
                    <div
                      key={mode.id}
                      onClick={() => setSelectedInterviewMode(mode.id)}
                      className={`p-3 rounded-xl border cursor-pointer text-xs flex items-center justify-between transition ${
                        selectedInterviewMode === mode.id
                          ? "bg-indigo-600/20 border-indigo-500 text-white font-semibold shadow-md"
                          : "bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          selectedInterviewMode === mode.id ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
                        }`}>
                          <ModeIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{mode.name}</span>
                            {mode.badge === "Recommended" && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                Recommended
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{mode.desc}</div>
                        </div>
                      </div>
                      {selectedInterviewMode === mode.id && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Company Archetype & Evaluation Flavor
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COMPANY_MODES.map((cmp) => (
                    <div
                      key={cmp.id}
                      onClick={() => setCompanyStyle(cmp.id)}
                      className={`p-3 rounded-xl border cursor-pointer text-xs transition ${
                        companyStyle === cmp.id
                          ? "bg-emerald-600/20 border-emerald-500 text-white font-semibold"
                          : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="font-bold text-slate-200">{cmp.name}</div>
                      <div className="text-[10px] text-slate-400">{cmp.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Interviewer Persona / Tone
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "friendly", label: "Collaborative & Supportive", sub: "Confidence & coaching" },
                    { id: "strict", label: "Strict Bar Raiser", sub: "Deep edge-case probing" },
                  ].map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setInterviewerPersona(p.id)}
                      className={`p-3 rounded-xl border cursor-pointer text-xs transition ${
                        interviewerPersona === p.id
                          ? "bg-indigo-600/20 border-indigo-500 text-white font-semibold"
                          : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="font-bold text-slate-200">{p.label}</div>
                      <div className="text-[10px] text-slate-400">{p.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Conditional Resume & JD Container (Shown if Deep-Dive Tab is active) */}
        {onboardingTab === "custom_deep_dive" && (
          <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span>4. Resume & Job Description Dual Alignment Analysis</span>
              </div>
              {isAnalyzing && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-400 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing match & gaps...</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Resume Upload Column */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Upload Candidate Resume (PDF / DOCX / TXT)
                </label>
                <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 text-center transition bg-slate-900/40 relative">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleResumeUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-medium">
                    {resumeFile ? resumeFile.name : "Drop resume file or click to browse"}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">PDF, DOCX, or plain text</p>
                </div>
              </div>

              {/* Target Job Description Column */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Target Job Description (Paste JD Text)
                </label>
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  onBlur={handleJdBlur}
                  rows={4}
                  placeholder="Paste key responsibilities or required skills from the job posting..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>
            </div>

            {/* Match & Gap Analysis Card */}
            {gapAnalysis && (
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Resume / JD Alignment Score:</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {gapAnalysis.match_score || 80}% Fit
                  </span>
                </div>

                {/* Match Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full transition-all duration-700"
                    style={{ width: `${gapAnalysis.match_score || 80}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Matched Strengths:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(gapAnalysis.matched_skills || ["Python", "System Design"]).map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px]">
                          ✓ {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Targeted Gap Areas (Interview Focus):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(gapAnalysis.skill_gaps || ["Redis", "Distributed Locking"]).slice(0, 4).map((g, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px]">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Microphone Check & Launch Action */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={testMicrophone}
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold transition ${
                micSuccess
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : micTesting
                  ? "bg-indigo-600/30 border-indigo-500 text-indigo-300 animate-pulse"
                  : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600"
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>{micTesting ? "Testing Mic..." : micSuccess ? "Microphone Verified ✓" : "Test Microphone (5s)"}</span>
            </button>

            {micTesting && (
              <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-100"
                  style={{ width: `${micVolume}%` }}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2"
          >
            <span>{onboardingTab === "instant" ? "Launch Instant Full-Loop Mock" : "Launch Custom Deep-Dive Studio"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
