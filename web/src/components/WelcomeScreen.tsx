'use client';

import React from 'react';
import { Shield, ChevronRight, Radio, Zap } from 'lucide-react';
import { UserRole } from '@/types';
import { usePowerMode } from '@/lib/powerMode';

interface WelcomeScreenProps {
  onSelectRole: (role: UserRole) => void;
}

export default function WelcomeScreen({ onSelectRole }: WelcomeScreenProps) {
  const { isPowerSaving, togglePowerSaving } = usePowerMode();

  return (
    <main className={`flex h-full flex-col transition-colors ${
      isPowerSaving ? 'bg-black text-[#00ff41]' : 'bg-transparent text-white'
    }`}>
      {/* Top Bar with Power Mode quick toggle */}
      <div className="flex h-11 items-center justify-between px-6 pt-3 text-[11px] font-semibold">
        <button
          type="button"
          onClick={togglePowerSaving}
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-widest transition-all ${
            isPowerSaving
              ? 'bg-[#00ff41] text-black border border-[#00ff41] shadow-[0_0_8px_#00ff41]'
              : 'bg-white/5 text-stone-400 border border-white/10 hover:text-white'
          }`}
        >
          <Zap className="w-2.5 h-2.5" />
          {isPowerSaving ? 'ECO ON' : 'ECO'}
        </button>

        <span className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider ${
          isPowerSaving ? 'text-[#00ff41]' : 'text-stone-300'
        }`}>
          <Radio className={`w-3.5 h-3.5 ${isPowerSaving ? 'text-[#00ff41]' : 'text-red-500'}`} />
          BLE MESH
        </span>
      </div>

      {/* Main Body */}
      <section className="flex flex-1 flex-col items-center px-7 pb-8 pt-10 text-center">
        {/* Concentric Shield Hero Icon */}
        <div className={`relative grid size-36 place-items-center rounded-full border transition-all ${
          isPowerSaving
            ? 'border-[#00ff41]/50 bg-black text-[#00ff41] shadow-[0_0_35px_#00ff41]'
            : 'border-red-500/20 bg-[radial-gradient(circle,rgba(255,55,55,.25),transparent_66%)] text-red-400 shadow-[0_0_60px_rgba(242,37,53,.28)]'
        }`}>
          <span className={`absolute size-28 rounded-full border-t-2 ${
            isPowerSaving ? 'border-[#00ff41]' : 'border-red-400'
          }`} />
          <span className={`absolute size-20 rounded-full border-t-2 ${
            isPowerSaving ? 'border-[#15803d]' : 'border-orange-400'
          }`} />
          <Shield className="w-14 h-14" />
        </div>

        {/* Title */}
        <div className="mt-7 text-[32px] font-extrabold uppercase leading-[1.06] tracking-wide">
          <span className="block">Disaster</span>
          <strong className={isPowerSaving ? 'text-[#00ff41]' : 'text-red-500'}>
            Relief
          </strong>{' '}
          Mesh
        </div>

        <p className={`mt-4 text-[8px] font-semibold uppercase tracking-[.18em] ${
          isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
        }`}>
          Connected people · safer tomorrows
        </p>

        {/* Slogan */}
        <div className="mt-10">
          <h1 className="text-lg font-extrabold uppercase tracking-wide">
            Help can travel
          </h1>
          <p className={`mt-1 text-xs ${
            isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
          }`}>
            even when the network cannot.
          </p>
        </div>

        {/* Role Selection Buttons */}
        <div className="mt-9 grid w-full gap-3">
          <button
            type="button"
            onClick={() => onSelectRole('citizen')}
            className={`w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-wider transition-all ${
              isPowerSaving
                ? 'border-2 border-[#00ff41] bg-black text-[#00ff41] shadow-[0_0_15px_#00ff41]'
                : 'bg-gradient-to-r from-[#ff6754] via-[#ff263d] to-[#bd1230] text-white shadow-[0_12px_30px_rgba(207,20,45,0.35)] hover:brightness-110'
            }`}
          >
            Continue as citizen
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectRole('responder')}
            className={`w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-wider border transition-all ${
              isPowerSaving
                ? 'border border-[#0d3815] bg-black text-[#00ff41] hover:border-[#00ff41]'
                : 'border-[#60342f] bg-[#151111d1] text-white hover:bg-white/10'
            }`}
          >
            <Shield className="w-4 h-4" />
            I’m a responder
          </button>
        </div>

        {/* Bottom Badge */}
        <div className={`mt-auto flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-[9px] font-bold uppercase tracking-widest ${
          isPowerSaving
            ? 'bg-black border-[#0d3815] text-[#15803d]'
            : 'border-red-950 bg-black/20 text-stone-400'
        }`}>
          <Radio className="w-3.5 h-3.5" />
          Offline-first · mesh ready
        </div>
      </section>
    </main>
  );
}

