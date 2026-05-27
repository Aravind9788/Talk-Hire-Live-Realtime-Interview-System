import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    description: 'Perfect for getting comfortable with AI voice interviews.',
    priceMonthly: 0,
    priceAnnually: 0,
    features: ['3 Mock Interviews per month', 'Basic text transcripts', 'General feedback rubric', 'Community support'],
    cta: 'Start for free',
    popular: false,
  },
  {
    name: 'Pro',
    description: 'The ultimate toolkit for serious job seekers.',
    priceMonthly: 29,
    priceAnnually: 24,
    features: ['Unlimited Mock Interviews', 'System Design & Coding rounds', 'Detailed AI analytics & scoring', 'Priority low-latency voice models'],
    cta: 'Upgrade to Pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    description: 'For teams and bootcamp cohorts.',
    priceMonthly: 99,
    priceAnnually: 79,
    features: ['Everything in Pro', 'Custom rubrics', 'Team dashboard & analytics', 'API access'],
    cta: 'Contact Sales',
    popular: false,
  }
];

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-50 mb-4">
            Simple, transparent <span className="text-zinc-400">pricing</span>
          </h2>
          
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-sm ${!isAnnual ? 'text-zinc-50 font-medium' : 'text-zinc-400'}`}>Monthly</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-14 h-7 bg-zinc-800 rounded-full p-1 transition-colors hover:bg-zinc-700"
            >
              <motion.div 
                className="w-5 h-5 bg-zinc-50 rounded-full"
                animate={{ x: isAnnual ? 28 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-sm flex items-center gap-2 ${isAnnual ? 'text-zinc-50 font-medium' : 'text-zinc-400'}`}>
              Annually
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs border border-indigo-500/20">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-3xl p-8 flex flex-col ${
                plan.popular 
                  ? 'glow-border glass scale-100 md:scale-105 z-10 bg-zinc-900/90' 
                  : 'glass border-zinc-800/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-semibold uppercase tracking-wide">
                  Most Popular
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-zinc-50 mb-2">{plan.name}</h3>
                <p className="text-zinc-400 text-sm h-10">{plan.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-zinc-50">
                    ${isAnnual ? plan.priceAnnually : plan.priceMonthly}
                  </span>
                  <span className="text-zinc-400 text-sm">/month</span>
                </div>
                {isAnnual && plan.priceAnnually > 0 && (
                  <p className="text-zinc-500 text-sm mt-1">Billed ${plan.priceAnnually * 12} yearly</p>
                )}
              </div>

              <ul className="flex-1 space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 shrink-0 ${plan.popular ? 'text-indigo-400' : 'text-zinc-500'}`} />
                    <span className="text-sm text-zinc-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button 
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                  plan.popular
                    ? 'bg-zinc-50 text-zinc-950 hover:bg-zinc-200 hover:scale-[1.02]'
                    : 'bg-zinc-800/50 text-zinc-300 border border-zinc-700 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
