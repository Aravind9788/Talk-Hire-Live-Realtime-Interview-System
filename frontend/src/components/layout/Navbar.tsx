import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Menu } from 'lucide-react';

interface NavbarProps {
  onStart: () => void;
}

export function Navbar({ onStart }: NavbarProps) {
  return (
    <nav className="fixed top-0 w-full z-50 glass border-b border-zinc-800/50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <Mic className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-zinc-50">TalkHire</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">Pricing</a>
            <div className="flex items-center gap-4">
              <button className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
                Log In
              </button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onStart}
                className="px-4 py-2 text-sm font-medium rounded-full bg-zinc-50 text-zinc-950 hover:bg-zinc-200 transition-colors"
              >
                Start Free Trial
              </motion.button>
            </div>
          </div>

          <div className="md:hidden flex items-center">
            <button className="text-zinc-400 hover:text-zinc-50">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
