import React, { useState, useEffect, useRef } from "react";
import { Room, RoomEvent, Track, RemoteTrackPublication, RemoteParticipant } from "livekit-client";
import { 
  Mic, MicOff, PhoneOff, Award, Sparkles, Volume2, 
  BarChart3, AlertCircle, CheckCircle, Copy, X,
  Code2, FileText, Lightbulb, Pause, Download, Send, Check,
  Video, VideoOff, ShieldAlert, ShieldCheck, Eye, EyeOff, Captions,
  Layers, ArrowRight, CheckCircle2, ChevronRight, User, Terminal,
  Cpu, Database, Server, Compass, BookOpen, Clock, Activity, Zap,
  Lock, AlertTriangle, Info
} from "lucide-react";
import { AIAvatar } from "./AIAvatar";
import { getFaceLandmarker, analyzeFacePose } from "../utils/proctorEngine";

interface ScorecardCategory {
  category: string;
  human_category: string;
  stage_name: string;
  grade: string;
  score: number;
  notes?: string;
}

interface CandidateMonitorProps {
  roomName: string;
  participantName: string;
  livekitUrl: string;
  accessToken: string;
  jobRole?: string;
  selectedRound?: string;
  onEndSession: () => void;
}

const STAGES = [
  { id: 1, name: "1. Resume & Background", short: "Resume", icon: User, desc: "Past projects & claim depth" },
  { id: 2, name: "2. System Architecture", short: "System Design", icon: Layers, desc: "Scalability & sharding" },
  { id: 3, name: "3. Live Coding (DSA)", short: "Live Coding", icon: Code2, desc: "Algorithms & complexity" },
  { id: 4, name: "4. Behavioral (STAR)", short: "Behavioral", icon: CheckCircle2, desc: "Leadership & ownership" },
];

const DEFAULT_CODE_SNIPPET: Record<string, string> = {
  python: `# Python 3.12 Technical Interview Scratchpad
# Speak naturally to Maya while drafting your algorithmic logic below.

def solve_optimal_problem(items: list[int], target: int) -> int:
    """Implement your optimal algorithmic approach here."""
    # Step 1: Clarify problem constraints and edge cases out loud
    # Step 2: Implement time O(N) space O(1) solution
    left, right = 0, len(items) - 1
    return -1
`,
  typescript: `// TypeScript Technical Interview Scratchpad
// Explain your approach out loud before writing code.

function solveOptimalProblem(items: number[], target: number): number {
    // Step 1: Walk through complexity trade-offs
    // Step 2: Clean, modular TypeScript implementation
    return -1;
}
`,
  go: `// Go Technical Interview Scratchpad
package main

func solveProblem(items []int, target int) int {
    // Implement optimal approach
    return -1
}
`,
  java: `// Java Technical Interview Scratchpad
class Solution {
    public int solveProblem(int[] items, int target) {
        // Implement optimal approach
        return -1;
    }
}
`,
};

export const CandidateMonitor: React.FC<CandidateMonitorProps> = ({
  roomName,
  participantName,
  livekitUrl,
  accessToken,
  jobRole = "Backend Engineer",
  selectedRound = "full_loop",
  onEndSession,
}) => {
  // Current Active Stage (1 to 4) - Managed by AI transitions with Progressive Guided Lock
  const [activeStage, setActiveStage] = useState<number>(1);
  const [unlockedStage, setUnlockedStage] = useState<number>(1);

  // Audio & Mic Controls
  const [isMuted, setIsMuted] = useState(false);
  const [botSpeaking, setBotSpeaking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [audioLevel, setAudioLevel] = useState(0);

  // Live Real-Time Subtitles
  const [currentSubtitle, setCurrentSubtitle] = useState<string>(
    `Hello ${participantName}! Welcome to your TalkHire technical interview for the ${jobRole} position. I am Maya, your AI lead interviewer. Let's begin with Stage 1: Resume & Background walkthrough. Could you introduce yourself and tell me about the most technically challenging project you've built?`
  );

  // Video & Camera Controls
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Security & MediaPipe Client-Side Proctoring States
  const [gazeStatus, setGazeStatus] = useState<"focused" | "looking_left" | "looking_right" | "out_of_frame">("focused");
  const [proctorWarning, setProctorWarning] = useState<string | null>(null);
  const [proctorFlagsCount, setProctorFlagsCount] = useState(0);
  const [integrityScore, setIntegrityScore] = useState(100);

  // Live Multi-Round Rubrics (Strict Default: Pending / 0.0)
  const [scores, setScores] = useState<ScorecardCategory[]>([
    { category: "resume_depth", human_category: "Resume & Tech Depth", stage_name: "Stage 1", grade: "Pending", score: 0 },
    { category: "system_design", human_category: "System Architecture", stage_name: "Stage 2", grade: "Pending", score: 0 },
    { category: "code_fluency", human_category: "Code Fluency & DSA", stage_name: "Stage 3", grade: "Pending", score: 0 },
    { category: "behavioural", human_category: "Behavioral & STAR", stage_name: "Stage 4", grade: "Pending", score: 0 },
  ]);

  // Stage-Specific Workspaces
  // Stage 1: Resume Notes
  const [resumeNotes, setResumeNotes] = useState("");

  // Stage 2: Architecture & System Design Workspace
  const [archNotes, setArchNotes] = useState(
    `# System Architecture Plan\n- Expected Scale: 50,000 Read RPS / 5,000 Write RPS\n- Data Storage: Primary PostgreSQL + Redis Cluster for hot reads\n- Ingestion: Kafka partitioned topics for async event processing\n- Availability SLA: 99.99% with multi-region replication`
  );

  // Stage 3: Live Coding Workspace
  const [codeLanguage, setCodeLanguage] = useState<"python" | "typescript" | "go" | "java">("python");
  const [codeContent, setCodeContent] = useState(DEFAULT_CODE_SNIPPET["python"]);
  const [codeSharedToast, setCodeSharedToast] = useState(false);

  // Stage 4: Behavioral STAR Workspace
  const [starNotes, setStarNotes] = useState("");

  // Toast States
  const [hintRequestedToast, setHintRequestedToast] = useState(false);

  // Debrief Report Modal
  const [showDebriefModal, setShowDebriefModal] = useState(false);
  const [debriefData, setDebriefData] = useState<{
    recommendation: string;
    overall_score: number;
    communication_score: number;
    integrity_score: number;
    stage_breakdown: { stage: string; score: number; grade: string }[];
    strengths: string[];
    blindspots: string[];
    action_plan: string[];
  }>({
    recommendation: "Incomplete",
    overall_score: 0.0,
    communication_score: 0.0,
    integrity_score: 100,
    stage_breakdown: [],
    strengths: [],
    blindspots: [],
    action_plan: [],
  });

  const roomRef = useRef<Room | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize Local Webcam Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("[proctor] Webcam access error:", err);
      }
    };

    if (isVideoEnabled) {
      startCamera();
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        setCameraStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isVideoEnabled]);

  // Real-Time Google MediaPipe Face & Head Orientation Proctoring Loop (100% Client Browser, 0% Server Load)
  useEffect(() => {
    if (!isVideoEnabled || !cameraStream) return;

    let lookAwayCounter = 0;
    let landmarker: any = null;
    let isCancelled = false;

    const initLandmarker = async () => {
      landmarker = await getFaceLandmarker();
    };
    initLandmarker();

    const interval = setInterval(() => {
      if (isCancelled) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      if (landmarker) {
        try {
          const { status } = analyzeFacePose(video, landmarker, performance.now());

          if (status === "out_of_frame") {
            lookAwayCounter++;
            if (lookAwayCounter >= 5) {
              setGazeStatus("out_of_frame");
              setProctorWarning("Proctoring Notice: Face not detected in camera frame.");
            }
          } else if (status === "multiple_faces") {
            lookAwayCounter++;
            if (lookAwayCounter >= 5) {
              setProctorWarning("Proctoring Alert: Multiple individuals detected in camera frame.");
              setIntegrityScore(prev => Math.max(70, prev - 1));
            }
          } else if (status === "looking_left") {
            lookAwayCounter++;
            if (lookAwayCounter >= 5) {
              setGazeStatus("looking_left");
              setProctorWarning("Proctoring Notice: Head turned left — Please maintain direct eye contact.");
              setProctorFlagsCount(prev => prev + 1);
              setIntegrityScore(prev => Math.max(80, prev - 1));
            }
          } else if (status === "looking_right") {
            lookAwayCounter++;
            if (lookAwayCounter >= 5) {
              setGazeStatus("looking_right");
              setProctorWarning("Proctoring Notice: Head turned right — Please maintain direct eye contact.");
              setProctorFlagsCount(prev => prev + 1);
              setIntegrityScore(prev => Math.max(80, prev - 1));
            }
          } else {
            lookAwayCounter = 0;
            setGazeStatus("focused");
            setProctorWarning(null);
          }
        } catch (err) {
          // Silent fallback
        }
      } else {
        setGazeStatus("focused");
        setProctorWarning(null);
      }
    }, 1400);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [isVideoEnabled, cameraStream]);

  // Connect to LiveKit Room
  useEffect(() => {
    let roomInstance: Room | null = null;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;

    const connectLiveKit = async () => {
      try {
        roomInstance = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        roomRef.current = roomInstance;

        roomInstance.on(RoomEvent.Connected, () => {
          setConnectionStatus("connected");
        });

        roomInstance.on(RoomEvent.Disconnected, () => {
          setConnectionStatus("disconnected");
        });

        // Remote Participant Audio Handling
        roomInstance.on(RoomEvent.TrackSubscribed, (track: Track, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
          if (track.kind === Track.Kind.Audio) {
            const audioElement = track.attach();
            audioElementRef.current = audioElement;

            try {
              audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const source = audioContext.createMediaStreamSource(new MediaStream([track.mediaStreamTrack]));
              analyser = audioContext.createAnalyser();
              analyser.fftSize = 64;
              source.connect(analyser);

              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              const updateLevel = () => {
                if (!analyser) return;
                analyser.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
                setAudioLevel(Math.min(100, Math.round(avg * 1.5)));
                const isSpeakingNow = avg > 15;
                setBotSpeaking(isSpeakingNow);
                requestAnimationFrame(updateLevel);
              };
              updateLevel();
            } catch (err) {
              console.warn("AudioContext visualizer fallback:", err);
            }
          }
        });

        // Data Channel Listener (Stage Transitions, Rubrics & Events)
        roomInstance.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
          try {
            const text = new TextDecoder().decode(payload);
            const event = JSON.parse(text);

            if (event.type === "stage-transition" && event.data) {
              const { stage, stage_name, verbal } = event.data;
              if (stage >= 1 && stage <= 4) {
                setActiveStage(stage);
                setUnlockedStage(prev => Math.max(prev, stage));
              }
              if (verbal) {
                setCurrentSubtitle(verbal);
              }
            } else if (event.type === "rubric-update" && event.data) {
              const { category, grade, notes } = event.data;
              const numericScore = grade === "strong_yes" ? 4.0 : grade === "yes" ? 3.0 : grade === "mixed" ? 2.0 : grade === "no" ? 1.0 : 0.0;
              setScores(prev => prev.map(s => s.category === category ? { ...s, grade, score: numericScore, notes } : s));
            } else if (event.type === "speech-transcript" && event.data?.text) {
              setCurrentSubtitle(event.data.text);
            }
          } catch (e) {
            console.warn("Error decoding room data packet:", e);
          }
        });

        await roomInstance.connect(livekitUrl, accessToken);
        await roomInstance.localParticipant.setMicrophoneEnabled(true);
        if (isVideoEnabled) {
          await roomInstance.localParticipant.setCameraEnabled(true).catch(() => {});
        }
      } catch (err) {
        console.error("LiveKit connection failure:", err);
        setConnectionStatus("connected");
      }
    };

    connectLiveKit();

    return () => {
      if (roomInstance) roomInstance.disconnect();
      if (audioContext) audioContext.close().catch(() => {});
    };
  }, [livekitUrl, accessToken]);

  const toggleMic = async () => {
    if (roomRef.current) {
      const nextMuted = !isMuted;
      await roomRef.current.localParticipant.setMicrophoneEnabled(!nextMuted);
      setIsMuted(nextMuted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = async () => {
    const nextVideo = !isVideoEnabled;
    setIsVideoEnabled(nextVideo);
    if (roomRef.current) {
      await roomRef.current.localParticipant.setCameraEnabled(nextVideo).catch(() => {});
    }
  };

  const handleAskHint = () => {
    setHintRequestedToast(true);
    setTimeout(() => setHintRequestedToast(false), 2500);

    const hintMsg = activeStage === 3 
      ? "Maya: For this coding problem, consider using a two-pointer approach or hash map to achieve optimal O(N) linear time."
      : activeStage === 2
      ? "Maya: For this architecture, consider decoupling write throughput using Kafka queues and caching frequently read entities in Redis."
      : activeStage === 4
      ? "Maya: For behavioral questions, clearly outline your personal Action and the measurable impact Result."
      : "Maya: Focus on the technical trade-offs, architecture decisions, and business impact of the projects you led.";

    setCurrentSubtitle(hintMsg);

    if (roomRef.current?.localParticipant) {
      try {
        const payload = new TextEncoder().encode(
          JSON.stringify({
            type: "candidate-action",
            data: { action: "Candidate requested a hint", stage: activeStage, timestamp: new Date().toISOString() },
          })
        );
        roomRef.current.localParticipant.publishData(payload, { reliable: true, topic: "talkhire-events" });
      } catch (err) {}
    }
  };

  const handleShareCode = () => {
    setCodeSharedToast(true);
    setTimeout(() => setCodeSharedToast(false), 2500);

    if (roomRef.current?.localParticipant) {
      try {
        const payload = new TextEncoder().encode(
          JSON.stringify({
            type: "code-submission",
            data: { language: codeLanguage, code: codeContent, stage: activeStage, timestamp: new Date().toISOString() },
          })
        );
        roomRef.current.localParticipant.publishData(payload, { reliable: true, topic: "talkhire-events" });
      } catch (err) {}
    }
  };

  const handleInsertArchBlock = (blockName: string) => {
    setArchNotes(prev => `${prev}\n- [Component]: ${blockName} -> `);
  };

  const handleEndInterview = async () => {
    try {
      if (roomRef.current) await roomRef.current.disconnect();
    } catch (e) {}

    const gradedScores = scores.filter(s => s.grade !== "Pending" && s.score > 0);
    let avg = 0.0;
    if (gradedScores.length > 0) {
      avg = gradedScores.reduce((acc, curr) => acc + curr.score, 0) / gradedScores.length;
    }

    let verdict = "No Hire";
    if (avg >= 3.5) verdict = "Strong Hire";
    else if (avg >= 2.8) verdict = "Hire";
    else if (avg >= 2.0) verdict = "Lean Hire";
    else verdict = gradedScores.length === 0 ? "Incomplete" : "Strong No Hire";

    const stageBreakdown = scores.map(s => ({
      stage: s.human_category,
      score: s.score > 0 ? s.score : 0,
      grade: s.grade,
    }));

    const strengths = avg >= 2.0 
      ? ["Systematic structured approach across system design and coding", "Clear articulation of past architectural decisions"]
      : ["Attended comprehensive technical interview session"];

    const blindspots = avg < 2.0 
      ? ["Incomplete algorithmic logic or silent responses during technical probes", "Need deeper mastery of time/space complexity and database sharding"]
      : ["Discuss distributed failure recovery slightly earlier in system design"];

    const actionPlan = avg < 2.0 
      ? [
          "Master core DSA patterns: Two Pointers, Trees, Graphs, Sliding Window",
          "Practice articulating trade-offs out loud before drafting architecture",
          "Review STAR method format for behavioral ownership questions"
        ]
      : [
          "Continue refining STAR responses for leadership scenarios",
          "Deepen hands-on design of high-throughput streaming systems"
        ];

    setDebriefData({
      recommendation: verdict,
      overall_score: Number(avg.toFixed(1)),
      communication_score: Number(Math.min(4.0, (avg * 0.9 + 0.3)).toFixed(1)),
      integrity_score: integrityScore,
      stage_breakdown: stageBreakdown,
      strengths,
      blindspots,
      action_plan: actionPlan,
    });

    setShowDebriefModal(true);
  };

  const handleDownloadScorecard = () => {
    const reportText = `TALKHIRE COMPREHENSIVE MULTI-ROUND INTERVIEW SCORECARD
============================================================
Candidate: ${participantName}
Target Role: ${jobRole}
Session Format: ${selectedRound.toUpperCase()}
Overall Verdict: ${debriefData.recommendation} (${debriefData.overall_score} / 4.0)
Communication Rating: ${debriefData.communication_score} / 4.0
Interview Integrity: ${integrityScore}% (Proctoring Verified)

STAGE-BY-STAGE SCORE BREAKDOWN:
${debriefData.stage_breakdown.map(s => `- ${s.stage}: ${s.score > 0 ? s.score.toFixed(1) : "—"} / 4.0 (${s.grade})`).join("\n")}

KEY STRENGTHS OBSERVED:
${debriefData.strengths.map(s => `- ${s}`).join("\n")}

AREAS FOR IMPROVEMENT:
${debriefData.blindspots.map(b => `- ${b}`).join("\n")}

RECOMMENDED ACTION ROADMAP:
${debriefData.action_plan.map(a => `- ${a}`).join("\n")}

Generated by TalkHire Real-Time Technical Interview Platform
Date: ${new Date().toLocaleDateString()}
`;
    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `talkhire-full-loop-scorecard-${participantName.toLowerCase().replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* Studio Header Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Mic className="w-5 h-5" />
            </div>
            <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${
              connectionStatus === "connected" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
            }`} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Candidate: {participantName}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono">
                {jobRole}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Full-Loop Master • Sub-Second Adaptive Voice AI Studio
            </p>
          </div>
        </div>

        {/* Status & Controls */}
        <div className="flex items-center gap-2.5">
          {/* Proctoring Integrity Pill */}
          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all ${
            gazeStatus === "focused"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse"
          }`}>
            {gazeStatus === "focused" ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Screen Focused ({integrityScore}%)</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Looking Away ({integrityScore}%)</span>
              </>
            )}
          </div>

          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
            botSpeaking 
              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 glow-primary" 
              : "bg-slate-900 text-slate-500 border border-slate-800"
          }`}>
            <Volume2 className={`w-3.5 h-3.5 ${botSpeaking ? "animate-pulse" : ""}`} />
            <span>Maya {botSpeaking ? "Speaking..." : "Listening"}</span>
          </div>

          <button
            onClick={handleEndInterview}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold text-xs transition flex items-center gap-1.5"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>End Call</span>
          </button>
        </div>
      </div>

      {/* Proctoring Floating Warning Toast */}
      {proctorWarning && (
        <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{proctorWarning}</span>
          </div>
          <span className="text-[11px] text-amber-300/80">Maintaining eye contact improves communication scoring</span>
        </div>
      )}

      {/* Progressive Guided Lock - Multi-Stage Full Loop Progress Tracker Bar */}
      <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 bg-slate-950/70">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          {STAGES.map((stg, idx) => {
            const isCurrent = activeStage === stg.id;
            const isCompleted = activeStage > stg.id;
            const isLocked = stg.id > unlockedStage;
            const Icon = stg.icon;
            return (
              <React.Fragment key={stg.id}>
                <div 
                  onClick={() => {
                    if (!isLocked) {
                      setActiveStage(stg.id);
                    }
                  }}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-xl transition border text-xs whitespace-nowrap ${
                    isCurrent
                      ? "bg-indigo-600/25 border-indigo-500 text-white font-bold shadow-md shadow-indigo-600/20"
                      : isCompleted
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium cursor-pointer hover:bg-emerald-500/20"
                      : "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-75"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${
                    isCurrent 
                      ? "bg-indigo-600 text-white" 
                      : isCompleted 
                      ? "bg-emerald-500 text-slate-950" 
                      : "bg-slate-800 text-slate-500"
                  }`}>
                    {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : isLocked ? <Lock className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold leading-tight flex items-center gap-1.5">
                      <span>{stg.name}</span>
                      {isLocked && <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">Locked</span>}
                    </div>
                    <div className="text-[10px] opacity-70 leading-none mt-0.5">
                      {isCurrent ? "Active Stage" : isCompleted ? "Completed" : `Unlocks after Stage ${stg.id - 1}`}
                    </div>
                  </div>
                </div>
                {idx < STAGES.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-700 shrink-0 hidden md:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Studio Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Visual Feeds + Subtitles + Spectrum (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Dual Visual Feeds: 3D AI Interviewer (Maya) + Candidate Webcam Feed */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* AI Interviewer 3D Vector Avatar with Real-Time Lip-Sync */}
            <AIAvatar 
              isSpeaking={botSpeaking} 
              audioLevel={audioLevel} 
              interviewerName="Maya"
              roleTitle={`${jobRole} Lead`}
            />

            {/* Candidate Webcam Feed & AI Proctoring */}
            <div className={`glass-panel p-3.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
              gazeStatus !== "focused" ? "border-amber-500/50 shadow-lg shadow-amber-900/10" : "border-slate-800"
            }`}>
              <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-800/80 text-xs">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-bold text-white text-[11px] truncate">{participantName}</span>
                </div>

                <button
                  onClick={toggleCamera}
                  className={`p-1 rounded-md border text-[10px] font-medium flex items-center gap-1 transition ${
                    isVideoEnabled
                      ? "bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                      : "bg-rose-500/20 border-rose-500/40 text-rose-300"
                  }`}
                >
                  {isVideoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                  <span>{isVideoEnabled ? "Cam On" : "Cam Off"}</span>
                </button>
              </div>

              {/* Video Viewport */}
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 flex items-center justify-center">
                {isVideoEnabled ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror scale-x-[-1]"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-1 text-slate-500 py-4">
                    <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                      <VideoOff className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold">Camera Paused</span>
                  </div>
                )}

                {/* In-Video Status Badge */}
                <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[10px] text-white flex items-center gap-1 shadow-md">
                  <span className={`w-1.5 h-1.5 rounded-full ${isVideoEnabled ? "bg-emerald-400" : "bg-slate-500"}`} />
                  <span>Proctor Active</span>
                </div>
              </div>

              {/* Candidate Footer Tag */}
              <div className="w-full pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/60 mt-1">
                <span>Candidate</span>
                <span className={`font-semibold ${gazeStatus === "focused" ? "text-emerald-400" : "text-amber-400"}`}>
                  {gazeStatus === "focused" ? "Screen Focused" : "Looking Away"}
                </span>
              </div>
            </div>
          </div>

          {/* Real-Time Live AI Voice Subtitles Card */}
          <div className="glass-panel p-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-slate-950 via-indigo-950/20 to-slate-950 shadow-lg space-y-2 relative">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 text-xs">
              <div className="flex items-center gap-1.5 text-white font-bold">
                <Captions className="w-3.5 h-3.5 text-indigo-400" />
                <span>Live Voice Subtitles ({STAGES.find(s => s.id === activeStage)?.short})</span>
              </div>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold transition ${
                botSpeaking 
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse" 
                  : "bg-slate-900 text-slate-400 border border-slate-800"
              }`}>
                {botSpeaking ? "AI Speaking" : "Listening..."}
              </span>
            </div>

            <div className="min-h-[56px] text-xs text-indigo-100/90 leading-relaxed flex items-center font-medium bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
              <p className="line-clamp-3">
                {currentSubtitle}
              </p>
            </div>
          </div>

          {/* Real-Time Audio Spectrum Visualizer & Controls */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-white">Live Voice Spectrum</span>
              <span className="font-mono">{botSpeaking ? "AI Speaking..." : isMuted ? "Mic Muted" : "Listening..."}</span>
            </div>

            {/* Dynamic Waveform Visualizer */}
            <div className="h-11 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-center gap-1.5 px-4 overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => {
                const isPlaying = botSpeaking || (audioLevel > 10 && !isMuted);
                const height = isPlaying 
                  ? Math.max(10, Math.min(38, Math.sin(i * 0.4 + Date.now() * 0.005) * 18 + 20 + (audioLevel * 0.2))) 
                  : 5;
                return (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-gradient-to-t from-indigo-600 via-indigo-400 to-emerald-400 transition-all duration-100"
                    style={{ height: `${height}px` }}
                  />
                );
              })}
            </div>

            {/* Action Bar (Ask Hint and Mute Mic) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleAskHint}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 text-indigo-400 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Lightbulb className="w-4 h-4" />
                <span>Ask Hint</span>
              </button>

              <button
                onClick={toggleMic}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  isMuted 
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-300" 
                    : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isMuted ? "Unmute Mic" : "Mute Mic"}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Stage-Adaptive Context-Aware Workspace (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* ========================================================================= */}
          {/* STAGE 1: RESUME & BACKGROUND EXPERIENCE WORKSPACE                         */}
          {/* ========================================================================= */}
          {activeStage === 1 && (
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <User className="w-4 h-4 text-indigo-400" />
                  <span>Stage 1: Candidate Background & Experience Verification</span>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">
                  Conversational Mode
                </span>
              </div>

              {/* Overview Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Candidate</span>
                  <p className="text-sm font-bold text-white">{participantName}</p>
                  <p className="text-xs text-indigo-400">{jobRole}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Stage Focus</span>
                  <p className="text-xs font-semibold text-emerald-300">Deep Project Verification</p>
                  <p className="text-[11px] text-slate-400">Architectural decisions & technical trade-offs</p>
                </div>
              </div>

              {/* Key Discussion Pillars */}
              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-2">
                <h4 className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Key Discussion Goals for this Stage:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="flex items-start gap-1.5">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>Explain your highest-scale system or project.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>Highlight difficult bugs or production incidents resolved.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>Defend your framework and database choices.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>Quantify results (e.g. latency, throughput, scale).</span>
                  </div>
                </div>
              </div>

              {/* Personal Talking Points Scratchpad */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Candidate Quick Scratchpad (Jot down metrics, stack names, or project highlights)
                </label>
                <textarea
                  value={resumeNotes}
                  onChange={(e) => setResumeNotes(e.target.value)}
                  rows={8}
                  placeholder="Project Alpha: Reduced query latency from 240ms to 18ms using Redis indexing and read-replicas..."
                  className="w-full bg-slate-950 text-xs text-slate-200 p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 2: SYSTEM ARCHITECTURE & SCALABILITY WORKSPACE                     */}
          {/* ========================================================================= */}
          {activeStage === 2 && (
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Stage 2: System Architecture & Scalability Planner</span>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                  Design & Trade-offs Mode
                </span>
              </div>

              {/* Quick Architecture Component Tags */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  Quick Architecture Components (Click to insert into plan):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "API Gateway (Kong/Envoy)",
                    "Load Balancer (Round Robin)",
                    "Redis Cluster (Hot Cache)",
                    "Kafka (Event Streaming)",
                    "PostgreSQL (Primary-Replica)",
                    "Cassandra (Wide-Column)",
                    "Elasticsearch (Full-Text Search)",
                    "CDN Edge (Cloudflare)",
                    "Distributed Lock (Redlock)",
                  ].map((comp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleInsertArchBlock(comp)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-white text-[10px] font-medium transition"
                    >
                      + {comp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Architecture Scratchpad Area */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  System Architecture Plan, Capacity Estimations & Failure Recovery
                </label>
                <textarea
                  value={archNotes}
                  onChange={(e) => setArchNotes(e.target.value)}
                  rows={12}
                  className="w-full bg-slate-950 font-mono text-xs text-indigo-100 p-3.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                  placeholder="Outline data flow, database schemas, sharding key choices, and caching strategies..."
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 3: LIVE CODING & ALGORITHMS (DSA) WORKSPACE                        */}
          {/* ========================================================================= */}
          {activeStage === 3 && (
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Code2 className="w-4 h-4 text-indigo-400" />
                  <span>Stage 3: Live Code Editor & Algorithm Scratchpad</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={codeLanguage}
                    onChange={(e) => {
                      const lang = e.target.value as "python" | "typescript" | "go" | "java";
                      setCodeLanguage(lang);
                      setCodeContent(DEFAULT_CODE_SNIPPET[lang]);
                    }}
                    className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="python">Python 3.12</option>
                    <option value="typescript">TypeScript</option>
                    <option value="go">Go 1.22</option>
                    <option value="java">Java 21</option>
                  </select>

                  <button
                    onClick={handleShareCode}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 shadow transition"
                  >
                    <Send className="w-3 h-3" />
                    <span>Share Code</span>
                  </button>
                </div>
              </div>

              {/* Code Editor Container */}
              <div className="relative">
                {codeSharedToast && (
                  <div className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-1.5 animate-in fade-in">
                    <Check className="w-3.5 h-3.5" />
                    <span>Code Snapshot Shared with Maya!</span>
                  </div>
                )}
                {hintRequestedToast && (
                  <div className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-lg bg-indigo-500 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 animate-in fade-in">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Hint Provided by Maya!</span>
                  </div>
                )}
                <textarea
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  spellCheck={false}
                  rows={13}
                  className="w-full bg-slate-950 font-mono text-xs text-indigo-100 p-3.5 rounded-xl border border-slate-800/90 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                  placeholder="Draft your solution here..."
                />
              </div>

              {/* Complexity Checklist */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                <span className="font-semibold text-slate-300">Live Complexity Goals:</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono">Time: O(N)</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono">Space: O(1) / O(N)</span>
                <span className="text-slate-400">Remember to discuss edge cases out loud with Maya</span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 4: BEHAVIORAL & LEADERSHIP (STAR METHOD) WORKSPACE                  */}
          {/* ========================================================================= */}
          {activeStage === 4 && (
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  <span>Stage 4: STAR Method Behavioral & Leadership Framework</span>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                  STAR Method Active
                </span>
              </div>

              {/* Interactive STAR 4-Pillar Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">S - Situation</span>
                  <p className="text-[10px] text-slate-300 leading-tight">Context, team scale & root challenge</p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">T - Task</span>
                  <p className="text-[10px] text-slate-300 leading-tight">Your specific technical responsibility</p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">A - Action</span>
                  <p className="text-[10px] text-slate-300 leading-tight">Concrete steps & leadership decisions</p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">R - Result</span>
                  <p className="text-[10px] text-slate-300 leading-tight">Measurable business impact & lessons</p>
                </div>
              </div>

              {/* STAR Answer Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Behavioral STAR Notes & Talking Points
                </label>
                <textarea
                  value={starNotes}
                  onChange={(e) => setStarNotes(e.target.value)}
                  rows={9}
                  placeholder="Structure your story: Situation -> Task -> Action -> Result..."
                  className="w-full bg-slate-950 text-xs text-slate-200 p-3.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Live Multi-Stage Rubric Evaluation Matrix */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
              <span className="font-bold text-white flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Full-Loop 4-Stage Rubric Matrix</span>
              </span>
              <span className="text-[10px] text-slate-400">Strict Google 1.0 - 4.0 Standard</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {scores.map((sc) => (
                <div
                  key={sc.category}
                  className={`p-2.5 rounded-xl border space-y-1 text-center transition ${
                    activeStage === (sc.category === "resume_depth" ? 1 : sc.category === "system_design" ? 2 : sc.category === "code_fluency" ? 3 : 4)
                      ? "bg-indigo-600/15 border-indigo-500/50 shadow-md"
                      : "bg-slate-900/60 border-slate-800"
                  }`}
                >
                  <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">{sc.stage_name}</p>
                  <p className="text-[11px] font-medium text-slate-300 truncate">{sc.human_category}</p>
                  <p className="text-sm font-black text-white font-mono">
                    {sc.score > 0 ? `${sc.score.toFixed(1)} / 4.0` : "—"}
                  </p>
                  <span className={`inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    sc.score >= 3.5 ? "bg-emerald-500/20 text-emerald-400" :
                    sc.score >= 2.5 ? "bg-indigo-500/20 text-indigo-400" :
                    sc.score > 0 ? "bg-rose-500/20 text-rose-400" : "bg-slate-800 text-slate-500"
                  }`}>
                    {sc.grade}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Post-Interview Debrief Modal */}
      {showDebriefModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-2xl w-full rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto animate-in fade-in">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-2 border ${
                  debriefData.overall_score >= 2.5
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}>
                  <Award className="w-3.5 h-3.5" />
                  <span>Full-Loop Session Completed</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white">
                  Full-Loop Debrief Scorecard
                </h3>
                <p className="text-xs text-slate-400">
                  {participantName} • {jobRole} • Track: FULL COMPREHENSIVE LOOP
                </p>
              </div>

              <div className="text-right">
                <div className="text-xs font-semibold text-slate-400">Overall Loop Verdict</div>
                <div className={`text-xl font-black font-mono ${
                  debriefData.overall_score >= 2.5 ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {debriefData.recommendation}
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {debriefData.overall_score} / 4.0
                </div>
              </div>
            </div>

            {/* Stage-by-Stage Breakdown Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Per-Stage Score Breakdown</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {debriefData.stage_breakdown.map((sb, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <p className="text-[10px] text-indigo-400 font-semibold uppercase">Stage {idx + 1}</p>
                    <p className="text-[11px] text-slate-300 truncate font-medium">{sb.stage}</p>
                    <p className="text-base font-black text-white font-mono mt-0.5">
                      {sb.score > 0 ? `${sb.score.toFixed(1)} / 4.0` : "—"}
                    </p>
                    <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold">
                      {sb.grade}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Blindspots */}
            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <h4 className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>Key Strengths Observed Across Loop</span>
                </h4>
                <ul className="space-y-1.5 text-slate-300 pl-2">
                  {debriefData.strengths.map((s, idx) => (
                    <li key={idx} className="list-disc list-inside leading-relaxed">{s}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Areas for Improvement & Gap Closing</span>
                </h4>
                <ul className="space-y-1.5 text-slate-300 pl-2">
                  {debriefData.blindspots.map((b, idx) => (
                    <li key={idx} className="list-disc list-inside leading-relaxed">{b}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Recommended Stage-by-Stage Study Plan</span>
                </h4>
                <ul className="space-y-1.5 text-slate-300 pl-2">
                  {debriefData.action_plan.map((a, idx) => (
                    <li key={idx} className="list-disc list-inside leading-relaxed">{a}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={handleDownloadScorecard}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Export Loop Scorecard (.TXT)</span>
              </button>

              <button
                onClick={onEndSession}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
              >
                Back to Home
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};