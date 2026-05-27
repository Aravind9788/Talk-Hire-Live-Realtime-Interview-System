import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, AlertTriangle, ChevronUp, ChevronDown, Video, RefreshCw, GripVertical } from 'lucide-react';

declare global {
  interface Window {
    FaceMesh: any;
  }
}

interface CandidateMonitorProps {
  isEmbedded?: boolean;
  candidateName?: string;
  jobRole?: string;
}

export function CandidateMonitor({ isEmbedded = false, candidateName, jobRole }: CandidateMonitorProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [proctorStatus, setProctorStatus] = useState<'loading' | 'requesting' | 'active' | 'error' | 'stopped'>('loading');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [violationLogs, setViolationLogs] = useState<string[]>([]);

  const [alertState, setAlertState] = useState<{
    noFace: boolean;
    multipleFaces: boolean;
    lookingAway: boolean;
  }>({
    noFace: false,
    multipleFaces: false,
    lookingAway: false,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const faceMeshRef = useRef<any>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Dynamic loading of MediaPipe FaceMesh from jsDelivr CDN
  useEffect(() => {
    if (window.FaceMesh) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = (err) => {
      console.error('Failed to load MediaPipe FaceMesh script', err);
      setProctorStatus('error');
    };
    document.head.appendChild(script);
  }, []);

  // Frame processing and FaceMesh logic
  useEffect(() => {
    if (!scriptLoaded || !window.FaceMesh) return;

    setProctorStatus('requesting');

    // 1. Initialize FaceMesh
    const faceMesh = new window.FaceMesh({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 2,
      refineLandmarks: false, // Disable landmark refinement for maximum speed and lower CPU load
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    // Heuristics analyzer callback
    const onResults = (results: any) => {
      const alerts = {
        noFace: false,
        multipleFaces: false,
        lookingAway: false,
      };

      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        alerts.noFace = true;
      } else if (results.multiFaceLandmarks.length > 1) {
        alerts.multipleFaces = true;
      } else {
        // Single face in frame - analyze yaw and pitch looking away
        const landmarks = results.multiFaceLandmarks[0];

        const nose = landmarks[4];
        const leftCheek = landmarks[234];
        const rightCheek = landmarks[454];
        const forehead = landmarks[10];
        const chin = landmarks[152];

        if (nose && leftCheek && rightCheek && forehead && chin) {
          const yawDenom = rightCheek.x - leftCheek.x;
          const yawRatio = yawDenom !== 0 ? (nose.x - leftCheek.x) / yawDenom : 0.5;

          const pitchDenom = chin.y - forehead.y;
          const pitchRatio = pitchDenom !== 0 ? (nose.y - forehead.y) / pitchDenom : 0.5;

          if (yawRatio < 0.35 || yawRatio > 0.65) {
            alerts.lookingAway = true;
          } else if (pitchRatio < 0.40 || pitchRatio > 0.62) {
            alerts.lookingAway = true;
          }
        }
      }

      setAlertState(prev => {
        // Capture new violations and log them
        let logMessage = '';
        if (alerts.noFace && !prev.noFace) {
          logMessage = 'Face not detected in frame';
        } else if (alerts.multipleFaces && !prev.multipleFaces) {
          logMessage = 'Multiple people detected in frame';
        } else if (alerts.lookingAway && !prev.lookingAway) {
          logMessage = 'Candidate looking away from screen';
        }

        if (logMessage) {
          setViolationCount(c => c + 1);
          setViolationLogs(logs => [
            `[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] ${logMessage}`,
            ...logs.slice(0, 3) // Keep the last 4 logs
          ]);
        }

        return alerts;
      });
    };

    faceMesh.onResults(onResults);
    faceMeshRef.current = faceMesh;

    // 2. Set up the camera stream and processing loop
    let active = true;
    let lastProcessedTime = 0;
    const fpsLimit = 10;
    const frameInterval = 1000 / fpsLimit;

    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
            frameRate: { max: 15 }
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        activeStreamRef.current = stream;

        // FIX: Status-ah active nu maathidunga. Appo thaan UI-la video tag render aagum.
        setProctorStatus('active');

        // Render aagura varai oru chinna delay kuduthu stream-ah attach pandrom
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = async () => {
              if (videoRef.current && active) {
                try {
                  await videoRef.current.play();
                  lastProcessedTime = performance.now();
                  tick(); // Start FaceMesh processing
                } catch (playErr) {
                  console.error("Error playing video:", playErr);
                }
              }
            };
            videoRef.current.srcObject = stream;
          }
        }, 100);

      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          console.error('User denied camera access:', err);
        } else if (err.name === 'NotFoundError') {
          console.error('No camera device found:', err);
        } else {
          console.error('Camera access failed for proctoring:', err);
        }
        setProctorStatus('error');
      }
    };

    const tick = async () => {
      if (!active) return;

      const video = videoRef.current;
      if (video && !video.paused && !video.ended) {
        const now = performance.now();
        if (now - lastProcessedTime >= frameInterval) {
          lastProcessedTime = now;
          try {
            await faceMesh.send({ image: video });
          } catch (err) {
            console.warn("FaceMesh processing skipped frame:", err);
          }
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(tick);
    };

    startCamera();

    // 3. Clean up all camera tracks, frames, and FaceMesh resources
    return () => {
      active = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
        activeStreamRef.current = null;
      }
      try {
        if (faceMeshRef.current) {
          faceMeshRef.current.close();
        }
      } catch (e) {
        console.warn("Error closing FaceMesh:", e);
      }
      setProctorStatus('stopped');
    };
  }, [scriptLoaded]);

  // Determine indicator color and alert messages
  const hasAlert = alertState.noFace || alertState.multipleFaces || alertState.lookingAway;

  let borderColorClass = 'border-emerald-500/30 shadow-emerald-500/5';
  let glowColorClass = 'bg-emerald-500';
  let alertBanner = null;

  if (alertState.noFace) {
    borderColorClass = 'border-rose-500/50 shadow-rose-500/10 animate-pulse';
    glowColorClass = 'bg-rose-500';
    alertBanner = 'FACE NOT DETECTED';
  } else if (alertState.multipleFaces) {
    borderColorClass = 'border-rose-500/50 shadow-rose-500/10 animate-pulse';
    glowColorClass = 'bg-rose-500';
    alertBanner = 'MULTIPLE PEOPLE';
  } else if (alertState.lookingAway) {
    borderColorClass = 'border-amber-500/50 shadow-amber-500/10 animate-pulse';
    glowColorClass = 'bg-amber-500';
    alertBanner = 'LOOKING AWAY';
  }

  // Render initial loading states
  if (proctorStatus === 'loading') {
    return isEmbedded ? (
      <div className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-sm text-zinc-400 backdrop-blur-sm shadow-xl aspect-[4/3]">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
        <span>Loading proctoring modules...</span>
      </div>
    ) : (
      <div className="fixed bottom-4 right-4 z-50 bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 flex items-center gap-3 text-xs text-zinc-400 backdrop-blur-md shadow-lg">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
        <span>Loading proctoring modules...</span>
      </div>
    );
  }

  if (proctorStatus === 'requesting') {
    return isEmbedded ? (
      <div className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-sm text-zinc-400 backdrop-blur-sm shadow-xl aspect-[4/3]">
        <Video className="w-6 h-6 animate-pulse text-indigo-400" />
        <span>Requesting camera access...</span>
      </div>
    ) : (
      <div className="fixed bottom-4 right-4 z-50 bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 flex items-center gap-3 text-xs text-zinc-400 backdrop-blur-md shadow-lg">
        <Video className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
        <span>Requesting camera access...</span>
      </div>
    );
  }

  if (proctorStatus === 'error') {
    return isEmbedded ? (
      <div className="w-full bg-zinc-900/40 border border-rose-500/20 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-sm text-rose-400 backdrop-blur-sm shadow-xl aspect-[4/3] text-center">
        <ShieldAlert className="w-6 h-6 text-rose-400" />
        <span>Proctoring unavailable. Please verify webcam permissions.</span>
      </div>
    ) : (
      <div className="fixed bottom-4 right-4 z-50 bg-zinc-900/95 border border-rose-500/20 rounded-xl p-3 flex items-center gap-3 text-xs text-rose-400 backdrop-blur-md shadow-lg max-w-xs">
        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
        <span>Proctoring unavailable. Please verify webcam permissions.</span>
      </div>
    );
  }

  if (isEmbedded) {
    return (
      <div className="w-full flex flex-col gap-5">
        {/* Candidate Profile Info Box */}
        <div className="glass rounded-2xl p-4 flex flex-col gap-3 border border-zinc-800/80 bg-zinc-900/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-semibold text-base font-mono">
              {(candidateName || 'C').charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white truncate">{candidateName || 'Candidate'}</span>
              <span className="text-[11px] text-zinc-400 truncate">{jobRole || 'Software Engineer'}</span>
            </div>
          </div>
          <div className="h-px bg-zinc-800/60 w-full" />
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-zinc-500 uppercase tracking-wider">Verification</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Verified Session
            </span>
          </div>
        </div>

        {/* Video Monitor Box */}
        <div className={`relative w-full aspect-[4/3] bg-zinc-950 rounded-2xl overflow-hidden border ${borderColorClass} shadow-2xl transition-all duration-300`}>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            className="transform -scale-x-100"
          />

          {/* Status Overlay */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm">
            <div className={`w-1.5 h-1.5 rounded-full ${glowColorClass} ${!hasAlert ? 'animate-pulse' : ''}`} />
            <span className="text-[9px] font-mono font-medium text-zinc-200 uppercase tracking-wider">
              {alertBanner || 'Secure Preview'}
            </span>
          </div>

          <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm">
            <Video className="w-3 h-3 text-indigo-400" />
            <span className="text-[9px] font-mono font-medium text-zinc-400">FPS: 10</span>
          </div>

          {/* Warning Banner Overlay */}
          <AnimatePresence>
            {alertBanner && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center"
              >
                <div className="p-2.5 rounded-full bg-black/70 border border-rose-500/30 mb-2">
                  <AlertTriangle className={`w-6 h-6 ${alertState.lookingAway ? 'text-amber-500 animate-pulse' : 'text-rose-500 animate-bounce'}`} />
                </div>
                <span className={`text-xs font-bold font-mono tracking-widest uppercase ${alertState.lookingAway ? 'text-amber-400' : 'text-rose-400'}`}>
                  {alertBanner}
                </span>
                <span className="text-[10px] text-zinc-300 mt-1.5 bg-black/40 px-2 py-0.5 rounded border border-white/5 font-mono">
                  Violation logged on system feed
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI Proctor Auditing Console */}
        <div className="glass rounded-2xl p-4 border border-zinc-800/80 bg-zinc-900/10 flex flex-col gap-3 flex-1 min-h-[180px]">
          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-bold text-white tracking-wide uppercase font-mono">AI Proctor Logs</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[10px] font-mono">
              <span className="text-zinc-500 font-normal">Violations:</span>
              <span className={`font-bold ${violationCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {violationCount}
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-start gap-2 overflow-y-auto font-mono text-[10px] text-zinc-400 leading-relaxed pr-1 max-h-[140px] scrollbar-thin">
            {violationLogs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-1 italic py-6">
                <span className="text-[11px] font-semibold text-zinc-400">Proctor Shield Enabled</span>
                <span className="text-[9px] text-zinc-600">Monitoring candidate focus & yaw stability</span>
              </div>
            ) : (
              violationLogs.map((log, index) => (
                <div
                  key={index}
                  className="p-1.5 rounded bg-zinc-950/40 border border-zinc-800/40 flex items-start gap-2"
                >
                  <span className="text-rose-500/80 font-bold shrink-0">[ALERT]</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-200">{log.slice(12)}</span>
                    <span className="text-[8px] text-zinc-500">{log.slice(1, 9)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      className="fixed bottom-4 right-4 z-50 select-none"
    >
      <AnimatePresence mode="wait">
        {isCollapsed ? (
          // Compact visual pill
          <motion.button
            key="collapsed-pill"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            onClick={() => setIsCollapsed(false)}
            className={`px-3 py-1.5 rounded-full bg-zinc-900/95 backdrop-blur-xl border ${borderColorClass} shadow-lg flex items-center gap-2 cursor-pointer transition-all duration-300 hover:bg-zinc-800/95`}
          >
            <div className={`w-2 h-2 rounded-full ${glowColorClass} animate-ping`} />
            <span className="text-[10px] font-mono font-medium text-zinc-300 tracking-wide uppercase">
              {alertBanner || 'Proctoring Active'}
            </span>
            <ChevronUp className="w-3.5 h-3.5 text-zinc-500 ml-1" />
          </motion.button>
        ) : (
          // Expanded dashboard
          <motion.div
            key="expanded-card"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className={`w-64 bg-zinc-900/90 backdrop-blur-xl border ${borderColorClass} rounded-2xl shadow-2xl overflow-hidden transition-colors duration-300`}
          >
            {/* Header Control */}
            <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between bg-black/20 cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-1.5 pointer-events-none">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-mono font-medium text-zinc-400 uppercase tracking-wider">AI Proctor</span>
                <GripVertical className="w-3.5 h-3.5 text-zinc-600" />
              </div>
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Collapse Monitor"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>


            {/* Webcam viewport */}
            <div className="relative w-full aspect-[4/3] bg-zinc-950 overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                // Explicitly set width and height to ensure it takes up the container
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                className="transform -scale-x-100" // Maintains the mirror effect
              />

              {/* Status indicators overlaid on webcam */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm">
                <div className={`w-1.5 h-1.5 rounded-full ${glowColorClass} ${!hasAlert ? 'animate-pulse' : ''}`} />
                <span className="text-[9px] font-mono text-zinc-300 uppercase tracking-wide">
                  {alertBanner || 'Secure'}
                </span>
              </div>

              {/* Alert Overlays */}
              <AnimatePresence>
                {alertBanner && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-3 text-center"
                  >
                    <div className="p-2 rounded-full bg-black/60 border border-rose-500/25 mb-1.5">
                      <AlertTriangle className={`w-5 h-5 ${alertState.lookingAway ? 'text-amber-500' : 'text-rose-500'} animate-bounce`} />
                    </div>
                    <span className={`text-xs font-bold font-mono tracking-wider ${alertState.lookingAway ? 'text-amber-400' : 'text-rose-400'}`}>
                      {alertBanner}
                    </span>
                    <span className="text-[9px] text-zinc-400 mt-1">Suspicious behavior logged</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Metrics and Log console */}
            <div className="p-3 space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 border-b border-white/5 pb-2">
                <span>Violations detected:</span>
                <span className={`font-semibold ${violationCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {violationCount}
                </span>
              </div>

              {/* Live console logs */}
              <div className="space-y-1">
                <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider">Activity Feed</div>
                <div className="h-16 flex flex-col justify-start gap-1 overflow-hidden">
                  {violationLogs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[9px] text-zinc-600 font-mono italic">
                      No violations recorded
                    </div>
                  ) : (
                    violationLogs.slice(0, 3).map((log, index) => (
                      <div
                        key={index}
                        className="text-[9px] font-mono text-zinc-400 whitespace-nowrap overflow-hidden text-overflow-ellipsis flex gap-1"
                      >
                        <span className="text-zinc-600 font-normal">[Log]</span>
                        <span>{log.slice(12)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}