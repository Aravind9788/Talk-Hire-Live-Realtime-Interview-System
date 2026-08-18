import React, { useEffect, useState } from "react";
import { Sparkles, Volume2, Mic, Headphones } from "lucide-react";

interface AIAvatarProps {
  isSpeaking: boolean;
  audioLevel?: number;
  interviewerName?: string;
  roleTitle?: string;
}

export const AIAvatar: React.FC<AIAvatarProps> = ({
  isSpeaking,
  audioLevel = 0,
  interviewerName = "Maya",
  roleTitle = "AI Technical Interviewer",
}) => {
  const [mouthState, setMouthState] = useState<number>(0);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);

  // Natural Blinking Loop (every 3.5 - 5 seconds)
  useEffect(() => {
    let blinkTimeout: NodeJS.Timeout;
    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 180);
      const nextInterval = 3000 + Math.random() * 2500;
      blinkTimeout = setTimeout(triggerBlink, nextInterval);
    };

    blinkTimeout = setTimeout(triggerBlink, 3000);
    return () => clearTimeout(blinkTimeout);
  }, []);

  // Lip-Sync Speaking Animation Loop (Runs only when AI is actively speaking)
  useEffect(() => {
    if (!isSpeaking) {
      setMouthState(0);
      return;
    }

    const interval = setInterval(() => {
      // Cycle through 4 natural phoneme mouth heights
      setMouthState((prev) => (prev + 1) % 4);
    }, 110);

    return () => clearInterval(interval);
  }, [isSpeaking]);

  // Compute mouth open height based on audio activity
  const mouthOpenHeight = isSpeaking ? [8, 14, 18, 11][mouthState] : 3;
  const mouthWidth = isSpeaking ? [22, 26, 24, 20][mouthState] : 18;

  return (
    <div className="glass-panel p-4 rounded-2xl border border-indigo-500/30 relative overflow-hidden flex flex-col items-center justify-between bg-gradient-to-b from-slate-900/90 via-indigo-950/20 to-slate-950/90 shadow-xl">
      
      {/* Background Ambient Glow when speaking */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-opacity duration-300 ${
          isSpeaking ? "bg-indigo-500/25 opacity-100" : "bg-indigo-600/10 opacity-40"
        }`} 
      />

      {/* Top Header Pill */}
      <div className="w-full flex items-center justify-between pb-2 mb-1 border-b border-slate-800/80 text-xs relative z-10">
        <div className="flex items-center gap-1.5 text-white font-bold">
          <Headphones className="w-3.5 h-3.5 text-indigo-400" />
          <span>{interviewerName}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-semibold">
            AI Interviewer
          </span>
        </div>

        <div className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-all ${
          isSpeaking 
            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse" 
            : "bg-slate-900 text-slate-400 border border-slate-800"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? "bg-indigo-400 animate-ping" : "bg-emerald-400"}`} />
          <span>{isSpeaking ? "Speaking..." : "Listening"}</span>
        </div>
      </div>

      {/* 3D-Feel Stylized Vector Avatar (Ultra-Lightweight SVG, 0% GPU load) */}
      <div className="relative my-2 flex items-center justify-center">
        
        {/* Pulsing Soundwave Rings when speaking */}
        {isSpeaking && (
          <>
            <div className="absolute w-36 h-36 rounded-full border border-indigo-500/30 animate-ping opacity-60 pointer-events-none" />
            <div className="absolute w-44 h-44 rounded-full border border-violet-500/20 animate-pulse opacity-40 pointer-events-none" />
          </>
        )}

        {/* Main Avatar SVG */}
        <div className={`relative transition-transform duration-300 ${isSpeaking ? "scale-105" : "scale-100"}`}>
          <svg
            viewBox="0 0 200 200"
            className="w-32 h-32 sm:w-36 sm:h-36 drop-shadow-2xl select-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* 3D Gradients */}
              <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2D1B4E" />
                <stop offset="60%" stopColor="#1E1435" />
                <stop offset="100%" stopColor="#120A21" />
              </linearGradient>

              <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFDFC4" />
                <stop offset="60%" stopColor="#F5CBA7" />
                <stop offset="100%" stopColor="#E5B287" />
              </linearGradient>

              <linearGradient id="blushGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF7B90" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#FF5E7E" stopOpacity="0" />
              </linearGradient>

              <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="50%" stopColor="#3730A3" />
                <stop offset="100%" stopColor="#1E1B4B" />
              </linearGradient>

              <linearGradient id="headsetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#312E81" />
              </linearGradient>

              <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Back Hair Volume */}
            <path
              d="M 60 70 C 40 90, 35 150, 45 180 C 65 190, 135 190, 155 180 C 165 150, 160 90, 140 70 Z"
              fill="url(#hairGrad)"
            />

            {/* Professional Suit / Shoulders */}
            <path
              d="M 45 175 C 50 145, 80 140, 100 140 C 120 140, 150 145, 155 175 L 170 200 L 30 200 Z"
              fill="url(#suitGrad)"
            />
            {/* Shirt Collar */}
            <polygon points="100,165 85,140 115,140" fill="#FFFFFF" opacity="0.9" />
            <polygon points="100,168 92,140 108,140" fill="#E0E7FF" />

            {/* Neck */}
            <rect x="88" y="120" width="24" height="25" rx="5" fill="#E5B287" />

            {/* Head / Face Base */}
            <ellipse cx="100" cy="95" rx="38" ry="46" fill="url(#skinGrad)" />

            {/* Cheeks / Soft Blush */}
            <ellipse cx="78" cy="104" rx="8" ry="5" fill="url(#blushGrad)" />
            <ellipse cx="122" cy="104" rx="8" ry="5" fill="url(#blushGrad)" />

            {/* Eyebrows */}
            <path
              d="M 72 75 Q 82 72 90 77"
              stroke="#2D1B4E"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 128 75 Q 118 72 110 77"
              stroke="#2D1B4E"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Eyes (With Dynamic Blinking) */}
            {isBlinking ? (
              // Blink State (Closed Curved Line)
              <>
                <path d="M 74 87 Q 82 92 90 87" stroke="#2D1B4E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M 110 87 Q 118 92 126 87" stroke="#2D1B4E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </>
            ) : (
              // Open Eyes with 3D Iris & Highlights
              <>
                {/* Left Eye */}
                <ellipse cx="82" cy="86" rx="6" ry="6" fill="#FFFFFF" />
                <ellipse cx="82" cy="86" rx="4.5" ry="4.5" fill="#4F46E5" />
                <circle cx="82" cy="86" r="2.5" fill="#0F172A" />
                <circle cx="80.5" cy="84.5" r="1.5" fill="#FFFFFF" />

                {/* Right Eye */}
                <ellipse cx="118" cy="86" rx="6" ry="6" fill="#FFFFFF" />
                <ellipse cx="118" cy="86" rx="4.5" ry="4.5" fill="#4F46E5" />
                <circle cx="118" cy="86" r="2.5" fill="#0F172A" />
                <circle cx="116.5" cy="84.5" r="1.5" fill="#FFFFFF" />
              </>
            )}

            {/* Nose */}
            <path
              d="M 100 92 Q 102 101 97 103 Q 100 104 103 103"
              stroke="#D49A70"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />

            {/* Animated Mouth (Speaking Lip-Sync Morph) */}
            {isSpeaking ? (
              <g>
                {/* Open Mouth with Teeth/Tongue Depth */}
                <rect
                  x={100 - mouthWidth / 2}
                  y={116 - mouthOpenHeight / 2}
                  width={mouthWidth}
                  height={mouthOpenHeight}
                  rx={mouthOpenHeight / 2}
                  fill="#581C28"
                  stroke="#BE185D"
                  strokeWidth="1.5"
                />
                {/* Upper Teeth Highlight */}
                {mouthOpenHeight > 8 && (
                  <rect
                    x={100 - mouthWidth / 2 + 3}
                    y={116 - mouthOpenHeight / 2 + 1}
                    width={mouthWidth - 6}
                    height="3"
                    rx="1.5"
                    fill="#FFFFFF"
                    opacity="0.9"
                  />
                )}
              </g>
            ) : (
              // Friendly Idle Smile
              <path
                d="M 91 115 Q 100 121 109 115"
                stroke="#BE185D"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            )}

            {/* Front Styled Hair Bangs */}
            <path
              d="M 62 70 C 60 40, 100 35, 140 45 C 145 60, 140 85, 132 85 C 120 85, 115 65, 100 65 C 85 65, 78 85, 68 85 C 63 85, 62 78, 62 70 Z"
              fill="url(#hairGrad)"
            />

            {/* Professional Tech Headset */}
            <path
              d="M 60 92 C 55 50, 145 50, 140 92"
              stroke="url(#headsetGrad)"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Left Ear Cushion */}
            <ellipse cx="61" cy="94" rx="5" ry="10" fill="#312E81" stroke="#6366F1" strokeWidth="1.5" />
            {/* Right Ear Cushion */}
            <ellipse cx="139" cy="94" rx="5" ry="10" fill="#312E81" stroke="#6366F1" strokeWidth="1.5" />

            {/* Headset Mic Boom & Glowing LED */}
            <path
              d="M 61 98 Q 65 115 88 116"
              stroke="#4338CA"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="89" cy="116" r="3" fill="#10B981" filter="url(#softGlow)" />
            <circle cx="89" cy="116" r="1.5" fill="#FFFFFF" />
          </svg>
        </div>
      </div>

      {/* Role & Dynamic Speech Indicator */}
      <div className="w-full pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 relative z-10">
        <span className="truncate">{roleTitle}</span>
        <span className="font-mono text-indigo-400 font-semibold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-400 inline" /> Sub-Second Live
        </span>
      </div>

    </div>
  );
};
