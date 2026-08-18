import React, { useState, useEffect, useRef } from "react";
import { 
  Mic, MicOff, PhoneOff, Award, Sparkles, Volume2, 
  MessageSquare, BarChart3, AlertCircle, CheckCircle, Copy, X
} from "lucide-react";

interface TranscriptMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
  isFinal?: boolean;
}

interface ScorecardCategory {
  category: string;
  grade: string;
  score: number;
}

interface CandidateMonitorProps {
  roomName: string;
  participantName: string;
  livekitUrl: string;
  accessToken: string;
  onEndSession: () => void;
}

export const CandidateMonitor: React.FC<CandidateMonitorProps> = ({
  roomName,
  participantName,
  onEndSession,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [botSpeaking, setBotSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([
    {
      id: "1",
      role: "model",
      content: `Hello ${participantName}, welcome to your TalkHire live technical interview session. I am your Google SDE interview coach. Are you ready to begin?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [scores, setScores] = useState<ScorecardCategory[]>([
    { category: "Problem Solving", grade: "Pending", score: 0 },
    { category: "Code Fluency", grade: "Pending", score: 0 },
    { category: "System Design", grade: "Pending", score: 0 },
    { category: "Communication", grade: "Pending", score: 0 },
  ]);

  const [showDebriefModal, setShowDebriefModal] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  const toggleMic = () => {
    setIsMuted(!isMuted);
  };

  const handleEndCall = () => {
    setShowDebriefModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Studio Header Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Mic className="w-6 h-6" />
            </div>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Candidate: {participantName}</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                {roomName}
              </span>
            </h2>
            <p className="text-xs text-slate-400">Live Voice Stream • OpenAI Realtime + LiveKit</p>
          </div>
        </div>

        {/* Audio Speaker Status Pills */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all ${
            botSpeaking 
              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 glow-primary" 
              : "bg-slate-900 text-slate-500 border border-slate-800"
          }`}>
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span>AI Interviewer {botSpeaking ? "Speaking..." : "Idle"}</span>
          </div>

          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all ${
            userSpeaking 
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" 
              : "bg-slate-900 text-slate-500 border border-slate-800"
          }`}>
            <Mic className="w-4 h-4" />
            <span>Candidate {userSpeaking ? "Speaking..." : "Silent"}</span>
          </div>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Audio Wave & Transcript Stream */}
        <div className="lg:col-span-2 space-y-6">
          {/* Animated Audio Waveform Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 text-center relative overflow-hidden">
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Realtime VAD Active</span>
            </div>

            <div className="h-28 flex items-center justify-center gap-1.5 py-4">
              {[...Array(24)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 rounded-full bg-gradient-to-t from-indigo-600 to-violet-400 transition-all ${
                    botSpeaking || userSpeaking ? "animate-wave-bar" : "h-3 opacity-30"
                  }`}
                  style={{
                    height: botSpeaking || userSpeaking ? `${Math.sin(i * 0.5) * 40 + 50}px` : "12px",
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              ))}
            </div>

            <p className="text-xs text-slate-400 font-medium">
              {botSpeaking ? "AI Interviewer is speaking..." : userSpeaking ? "Listening to your answer..." : "Speak naturally — the AI listens and responds in sub-second latency."}
            </p>
          </div>

          {/* Real-time Live Transcript Feed */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span>Live Audio Transcript</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono">{transcripts.length} Utterances</span>
            </div>

            <div className="h-[360px] overflow-y-auto pr-2 space-y-4">
              {transcripts.map((item) => (
                <div
                  key={item.id}
                  className={`flex gap-3 ${item.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    item.role === "user" ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"
                  }`}>
                    {item.role === "user" ? "You" : "AI"}
                  </div>

                  <div className={`max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    item.role === "user"
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-100 rounded-tr-none"
                      : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none"
                  }`}>
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span className="font-semibold text-[11px] text-slate-400">
                        {item.role === "user" ? participantName : "TalkHire AI Coach"}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{item.timestamp}</span>
                    </div>
                    <p>{item.content}</p>
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>

        {/* Right Column: Live Rubric Evaluation Cards */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span>Live Evaluation Rubric</span>
            </h3>

            <div className="space-y-4">
              {scores.map((sc, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">{sc.category}</span>
                    <span className="font-mono text-indigo-400 font-bold">{sc.score > 0 ? `${sc.score} / 4` : "Pending"}</span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${(sc.score / 4) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audio Controls Panel */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 text-center space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Session Controls</h4>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={toggleMic}
                className={`p-4 rounded-2xl border transition-all ${
                  isMuted
                    ? "bg-rose-500/20 border-rose-500/50 text-rose-400"
                    : "bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-600"
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button
                onClick={handleEndCall}
                className="px-6 py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition flex items-center gap-2"
              >
                <PhoneOff className="w-5 h-5" />
                <span>End Interview</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Debrief Summary Modal */}
      {showDebriefModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-xl w-full p-6 rounded-2xl border border-slate-800 space-y-6 relative animate-in fade-in">
            <button
              onClick={() => setShowDebriefModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">Interview Debrief Report</h3>
              <p className="text-xs text-slate-400">Target Role: Senior Software Engineer • Scorecard Summary</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-white">Overall Hire Recommendation:</span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Hire (3.4 / 4.0)
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Candidate demonstrated strong problem-solving skills and structured system design thinking. Communication was articulate and concise.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onEndSession}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition"
              >
                Close & Exit Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};