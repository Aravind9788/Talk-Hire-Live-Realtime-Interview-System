import React from 'react';
import { Mic, MessageCircle, Code, Briefcase } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/50 bg-zinc-950 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <Mic className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="text-xl font-semibold tracking-tight text-zinc-50">TalkHire</span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              The AI interview platform that helps you ace your technical rounds with real-time conversational intelligence.
            </p>
            <div className="flex items-center gap-4 text-zinc-400">
              <a href="#" className="hover:text-zinc-50 transition-colors"><MessageCircle className="w-5 h-5" /></a>
              <a href="#" className="hover:text-zinc-50 transition-colors"><Code className="w-5 h-5" /></a>
              <a href="#" className="hover:text-zinc-50 transition-colors"><Briefcase className="w-5 h-5" /></a>
            </div>
          </div>
          
          <div>
            <h4 className="text-zinc-50 font-medium mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li><a href="#" className="hover:text-zinc-50 transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-zinc-50 transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-zinc-50 transition-colors">Interview Prep</a></li>
              <li><a href="#" className="hover:text-zinc-50 transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-zinc-50 font-medium mb-4">Resources</h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li><a href="#" className="hover:text-zinc-50 transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-zinc-50 transition-colors">System Design Guide</a></li>
              <li><a href="#" className="hover:text-zinc-50 transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-zinc-50 transition-colors">API Docs</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-zinc-50 font-medium mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li><a href="#" className="hover:text-zinc-50 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-zinc-50 transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-zinc-50 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-zinc-50 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-zinc-500 text-sm">
            © {new Date().getFullYear()} TalkHire. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <span>Status: All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
