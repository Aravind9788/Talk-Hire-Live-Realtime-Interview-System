import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Mic } from 'lucide-react';

interface HeroProps {
  onStart: () => void;
}

export function Hero({ onStart }: HeroProps) {
  return (
    <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-violet-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>Introducing Real-Time Voice VAD</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-tight"
          >
            Ace Your Next Technical Interview with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">AI</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto"
          >
            Experience ultra-low latency, real-time voice interviews. Practice System Design and Coding rounds with instant, rubric-based grading.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStart}
              className="relative group px-8 py-4 rounded-full bg-zinc-50 text-zinc-950 font-semibold text-lg overflow-hidden w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <div className="absolute inset-0 bg-white/20 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-out" />
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </motion.button>
            <button className="px-8 py-4 rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-300 font-semibold text-lg hover:bg-zinc-800 transition-colors w-full sm:w-auto">
              View Demo
            </button>
          </motion.div>
        </div>

        {/* Abstract UI Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-20 mx-auto max-w-5xl"
        >
          <div className="rounded-2xl glow-border glass p-2 overflow-hidden bg-zinc-900/80">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/80 bg-zinc-950/50">
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
            </div>
            <div className="p-8 aspect-video flex flex-col items-center justify-center gap-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
              
              <div className="relative w-32 h-32 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full border border-indigo-500/30 bg-indigo-500/10"
                />
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                  className="absolute inset-0 rounded-full border border-indigo-500/20"
                />
                <Mic className="w-10 h-10 text-indigo-400 relative z-10" />
              </div>
              
              <div className="flex items-center gap-2">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [16, Math.random() * 40 + 20, 16] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse", delay: i * 0.1 }}
                    className="w-1.5 bg-indigo-500/80 rounded-full"
                  />
                ))}
              </div>
              <div className="text-zinc-400 font-medium font-mono text-sm">TalkHire is listening...</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
