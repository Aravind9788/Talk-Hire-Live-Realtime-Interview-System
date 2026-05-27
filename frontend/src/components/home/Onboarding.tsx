import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ChevronRight, Briefcase, User, FileText, AlertCircle, Loader2, Sparkles, Zap, ShieldCheck } from 'lucide-react';

interface OnboardingProps {
  onStart: (name: string, jobRole: string, resumeContext: string) => void;
  onBack: () => void;
}

const JOB_ROLES = [
  "GenAI Developer",
  "AI Engineer",
  "ML Engineer",
  "Deep Learning Engineer",
  "Data Scientist",
  "Backend Developer",
  "Frontend Developer",
  "Full Stack Developer",
  "MLOps Engineer",
  "Computer Vision Engineer"
];

interface DemoProfile {
  name: string;
  role: string;
  skill_gaps: string[];
  weak_areas: string[];
  interview_focus: string;
}

const DEMO_PROFILES: Record<string, DemoProfile> = {
  "GenAI Developer": {
    name: "Jane Doe",
    role: "GenAI Developer",
    skill_gaps: [
      "Vector Databases (Pinecone/Milvus) indexing strategies",
      "RAG Evaluation frameworks (Ragas/TruLens)",
      "Prompt latency optimization at scale"
    ],
    weak_areas: [
      "Semantic cache eviction policies",
      "Agentic loops convergence guardrails"
    ],
    interview_focus: "Hands-on experience with LLM orchestration (LangChain/LlamaIndex) and prompt engineering optimization."
  },
  "AI Engineer": {
    name: "Alex Rivera",
    role: "AI Engineer",
    skill_gaps: [
      "PyTorch distributed data parallel (DDP) training",
      "Model quantization techniques (GGUF, GPTQ, AWQ)",
      "CUDA kernel performance tuning"
    ],
    weak_areas: [
      "Parameter-Efficient Fine-Tuning (PEFT/LoRA) configuration",
      "RLAIF (Reinforcement Learning from AI Feedback) workflows"
    ],
    interview_focus: "Fine-tuning foundational models, designing low-latency inference pipelines, and distributed training setups."
  },
  "Full Stack Developer": {
    name: "Sam Taylor",
    role: "Full Stack Developer",
    skill_gaps: [
      "WebSocket connection scaling and session persistence",
      "Redis cluster replication & caching patterns",
      "PostgreSQL query execution planner optimization"
    ],
    weak_areas: [
      "React concurrent rendering and custom hook profiling",
      "Complex CSS layout performance and Tailwind optimization"
    ],
    interview_focus: "Building robust, end-to-end full stack web architectures, focusing on state management, databases, and network latency."
  }
};

export function Onboarding({ onStart, onBack }: OnboardingProps) {
  const [mode, setMode] = useState<'instant' | 'custom'>('instant');
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof DEMO_PROFILES>("GenAI Developer");
  
  // Custom upload state
  const [name, setName] = useState('');
  const [jobRole, setJobRole] = useState(JOB_ROLES[0]);
  const [file, setFile] = useState<File | null>(null);
  
  // Shared states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{skill_gaps: string[], weak_areas: string[], interview_focus: string} | null>(null);
  const [error, setError] = useState('');

  // Update name/role when changing preset
  useEffect(() => {
    if (mode === 'instant') {
      const profile = DEMO_PROFILES[selectedPreset];
      setName(profile.name);
      setJobRole(profile.role);
    }
  }, [selectedPreset, mode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!name.trim()) {
      setError("Please enter candidate name.");
      return;
    }

    setError('');
    setIsAnalyzing(true);

    if (mode === 'instant') {
      // Simulate quick premium analysis for instant profile
      setTimeout(() => {
        setAnalysisResult(DEMO_PROFILES[selectedPreset]);
        setIsAnalyzing(false);
      }, 1000);
      return;
    }

    if (!file) {
      setError("Please upload your resume.");
      setIsAnalyzing(false);
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('job_role', jobRole);
      
      const response = await fetch('/api/resume/analyze', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze resume');
      }
      
      const data = await response.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error(err); 
      setError("An error occurred while analyzing your resume. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStart = () => {
    const resumeContext = analysisResult ? JSON.stringify(analysisResult) : "";
    onStart(name, jobRole, resumeContext);
  };

  const resetAnalysis = () => {
    setAnalysisResult(null);
    if (mode === 'custom') {
      setName('');
      setFile(null);
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!analysisResult ? (
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Mode Switcher */}
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800/80">
              <button
                type="button"
                onClick={() => { setMode('instant'); resetAnalysis(); }}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                  mode === 'instant' 
                    ? 'bg-zinc-800 text-zinc-100 shadow-md border border-zinc-700/30' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Instant Demo Profile
              </button>
              <button
                type="button"
                onClick={() => { setMode('custom'); resetAnalysis(); }}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                  mode === 'custom' 
                    ? 'bg-zinc-800 text-zinc-100 shadow-md border border-zinc-700/30' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Custom Resume Upload
              </button>
            </div>

            {/* Form Fields */}
            {mode === 'instant' ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2.5">
                    Select Preset Candidate Profile
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(Object.keys(DEMO_PROFILES) as Array<keyof typeof DEMO_PROFILES>).map((profileKey) => {
                      const isActive = selectedPreset === profileKey;
                      return (
                        <button
                          key={profileKey}
                          type="button"
                          onClick={() => setSelectedPreset(profileKey)}
                          className={`p-4 rounded-xl text-left border transition-all duration-200 cursor-pointer ${
                            isActive 
                              ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/5' 
                              : 'border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/50 hover:border-zinc-700'
                          }`}
                        >
                          <span className={`block text-xs font-semibold ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`}>
                            {profileKey}
                          </span>
                          <span className="block text-[11px] text-zinc-500 mt-1">
                            {DEMO_PROFILES[profileKey].name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                    Candidate Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 w-4 h-4 text-zinc-600" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-zinc-950/40 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/80 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                    Candidate Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 w-4 h-4 text-zinc-600" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-zinc-950/40 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/80 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                    Target Job Role
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3.5 w-4 h-4 text-zinc-600" />
                    <select
                      value={jobRole}
                      onChange={(e) => setJobRole(e.target.value)}
                      className="w-full bg-zinc-950/40 border border-zinc-800 rounded-xl pl-10 pr-8 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/80 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                    >
                      {JOB_ROLES.map(role => (
                        <option key={role} value={role} className="bg-zinc-900">{role}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500">
                      <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                    Upload Resume (PDF/DOCX)
                  </label>
                  <div className="flex justify-center px-6 pt-6 pb-7 border border-zinc-800 border-dashed rounded-xl bg-zinc-950/20 hover:bg-zinc-900/30 transition-colors">
                    <div className="space-y-1.5 text-center">
                      <Upload className="mx-auto h-8 w-8 text-zinc-500" />
                      <div className="flex text-xs text-zinc-400 justify-center">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-transparent rounded-md font-semibold text-indigo-400 hover:text-indigo-300 focus-within:outline-none">
                          <span>Upload a file</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf,.docx" onChange={handleFileChange} />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-[10px] text-zinc-600">{file ? file.name : "PDF, DOCX up to 10MB"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2.5 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-indigo-600/10"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Preparing Demo Profile...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Initialize Interview</>
              )}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 shadow-inner">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-800/50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Profile Prepared
                  </h3>
                </div>
                <button
                  onClick={resetAnalysis}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 font-medium transition-colors cursor-pointer"
                >
                  Change Profile
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
                  <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-indigo-400" /> {name}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                  <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-indigo-400" /> {jobRole}</span>
                </div>

                <div className="space-y-3 pt-2">
                  {analysisResult.skill_gaps && analysisResult.skill_gaps.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Focus Gaps to Probe</h4>
                      <ul className="text-xs text-zinc-300 space-y-1.5">
                        {analysisResult.skill_gaps.map((gap, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-indigo-400 font-mono select-none">▪</span>
                            <span>{gap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {analysisResult.weak_areas && analysisResult.weak_areas.length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Target Weak Areas</h4>
                      <ul className="text-xs text-zinc-300 space-y-1.5">
                        {analysisResult.weak_areas.map((area, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-indigo-400 font-mono select-none">▪</span>
                            <span>{area}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysisResult.interview_focus && (
                    <div className="pt-2">
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Round Objective</h4>
                      <p className="text-xs text-zinc-300 leading-relaxed italic border-l-2 border-indigo-500/40 pl-2">
                        {analysisResult.interview_focus}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-zinc-500 justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400/80" />
              <span>Face monitoring proctoring active upon launch</span>
            </div>

            <button
              onClick={handleStart}
              className="w-full py-4 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl hover:scale-[1.01]"
            >
              Start Adaptive Interview <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
