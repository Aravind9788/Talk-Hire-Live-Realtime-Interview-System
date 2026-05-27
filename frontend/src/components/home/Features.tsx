import React from 'react';
import { motion } from 'framer-motion';
import { AudioWaveform, Code2, LineChart, Trophy } from 'lucide-react';

const features = [
  {
    title: 'Real-time Voice VAD',
    description: 'Experience ultra-low latency conversational AI with advanced voice activity detection that understands interruptions naturally.',
    icon: AudioWaveform,
    className: 'md:col-span-2 md:row-span-2',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10'
  },
  {
    title: 'System Design & Coding',
    description: 'From LC-style algorithms to designing distributed systems, practice the full spectrum of technical rounds.',
    icon: Code2,
    className: 'md:col-span-1 md:row-span-1',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10'
  },
  {
    title: 'Instant Rubric Grading',
    description: 'Get evaluated against industry-standard rubrics instantly after your session.',
    icon: Trophy,
    className: 'md:col-span-1 md:row-span-1',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10'
  },
  {
    title: 'Post-call Analytics',
    description: 'Deep dive into your performance with detailed transcripts, time-to-speak metrics, and actionable feedback.',
    icon: LineChart,
    className: 'md:col-span-2 md:row-span-1',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10'
  }
];

export function Features() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-50 mb-4">
            Everything you need to <span className="text-zinc-400">succeed</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            A complete platform designed to simulate the exact environment and pressure of a top-tier tech interview.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className={`glass rounded-2xl p-8 relative overflow-hidden group hover:border-zinc-700 transition-colors ${feature.className}`}
            >
              {/* Hover Spotlight Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 border border-zinc-800 ${feature.bg}`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-zinc-50 mb-3">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed mt-auto">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
