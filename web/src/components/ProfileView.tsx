'use client';

import React, { useState, useEffect } from 'react';
import { User, Shield, Zap, Lock, Radio, LogOut, CheckCircle2, Server } from 'lucide-react';
import { UserRole } from '@/types';
import { usePowerMode } from '@/lib/powerMode';
import { checkBackendHealth } from '@/lib/api';

interface ProfileViewProps {
  role: UserRole;
  onLogout: () => void;
  onSwitchRole: (newRole: UserRole) => void;
}

export default function ProfileView({ role, onLogout, onSwitchRole }: ProfileViewProps) {
  const { isPowerSaving, togglePowerSaving } = usePowerMode();
  const [backendStatus, setBackendStatus] = useState<{ ok: boolean; message: string }>({
    ok: false,
    message: 'Testing connection…',
  });

  useEffect(() => {
    checkBackendHealth().then(setBackendStatus);
  }, []);

  return (
    <div className="pb-24">
      {/* Header */}
      <header className="px-6 pb-3 pt-2">
        <p className={`text-[8px] font-extrabold uppercase tracking-[0.2em] ${
          isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
        }`}>
          {role === 'responder' ? 'Verified responder' : 'Citizen profile'}
        </p>
        <h1 className={`mt-1 text-[23px] font-extrabold tracking-tight ${
          isPowerSaving ? 'text-[#00ff41]' : 'text-white'
        }`}>
          Your profile
        </h1>
        <p className={`mt-1 text-[11px] ${
          isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
        }`}>
          Stored locally and available offline
        </p>
      </header>

      {/* Profile Card */}
      <section className={`mx-6 mt-2 flex flex-col items-center rounded-3xl border p-6 text-center transition-colors ${
        isPowerSaving
          ? 'bg-black border-[#0d3815]'
          : 'bg-white/5 border-red-950/80'
      }`}>
        <span className={`grid size-20 place-items-center rounded-full ${
          isPowerSaving ? 'bg-[#0d3815] text-[#00ff41]' : 'bg-red-500/15 text-red-400'
        }`}>
          {role === 'responder' ? <Shield className="w-10 h-10" /> : <User className="w-10 h-10" />}
        </span>

        <h2 className={`mt-4 text-lg font-extrabold ${isPowerSaving ? 'text-[#00ff41]' : 'text-white'}`}>
          {role === 'responder' ? 'Relief Control · Unit 7' : 'Aarya Mehta'}
        </h2>
        <p className={`text-xs ${isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'}`}>
          {role === 'responder' ? 'Certified Disaster Responder' : 'Andheri East Community Member'}
        </p>

        <div className={`mt-4 flex items-center gap-2 rounded-full px-3 py-1 text-[8px] font-bold uppercase tracking-wider ${
          isPowerSaving
            ? 'bg-[#031505] border border-[#00ff41] text-[#00ff41]'
            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
        }`}>
          <CheckCircle2 className="w-3 h-3" />
          {role === 'responder' ? 'Official Incident Command' : 'Verified Local Resident'}
        </div>
      </section>

      {/* POWER SAVING MODE FEATURE (Direct User Requirement) */}
      <div className="mx-6 mt-4">
        <div className={`p-4 rounded-2xl border transition-all ${
          isPowerSaving
            ? 'bg-black border-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.15)]'
            : 'bg-[#181111] border-red-950 hover:border-red-900'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`p-2.5 rounded-xl ${
                isPowerSaving ? 'bg-[#00ff41] text-black' : 'bg-white/5 text-stone-400'
              }`}>
                <Zap className="w-5 h-5" />
              </span>
              <div>
                <b className={`text-xs block ${isPowerSaving ? 'text-[#00ff41]' : 'text-white'}`}>
                  Ultra Power Saving Mode
                </b>
                <span className={`text-[9px] block ${isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'}`}>
                  Black background + Green text (OLED)
                </span>
              </div>
            </div>

            {/* Custom Toggle Switch */}
            <button
              type="button"
              onClick={togglePowerSaving}
              aria-label="Toggle Power Saving Mode"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isPowerSaving ? 'bg-[#00ff41]' : 'bg-stone-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                  isPowerSaving ? 'translate-x-6' : 'translate-x-1 bg-white'
                }`}
              />
            </button>
          </div>

          <p className={`mt-3 text-[9px] leading-relaxed border-t pt-2.5 ${
            isPowerSaving ? 'border-[#0d3815] text-[#15803d]' : 'border-white/5 text-stone-500'
          }`}>
            Optimized for disaster situations where charging is unavailable. Turns off individual AMOLED display pixels using pure #000000 and displays high-contrast green text.
          </p>
        </div>
      </div>

      {/* Backend & Mesh Diagnostics */}
      <div className={`mx-6 mt-4 p-4 rounded-2xl border space-y-2.5 ${
        isPowerSaving ? 'bg-black border-[#0d3815] text-[#00ff41]' : 'bg-black/30 border-white/5 text-stone-300'
      }`}>
        <b className={`text-[9px] uppercase tracking-widest block ${
          isPowerSaving ? 'text-[#15803d]' : 'text-stone-500'
        }`}>
          System & Radio Status
        </b>

        {/* Backend Connection */}
        <div className="flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5" />
            Rust Axum Backend (Port 3001)
          </span>
          <span className={`font-bold ${
            backendStatus.ok
              ? isPowerSaving ? 'text-[#00ff41]' : 'text-emerald-400'
              : isPowerSaving ? 'text-[#15803d]' : 'text-orange-400'
          }`}>
            {backendStatus.ok ? '● Online' : '○ Standalone Mesh'}
          </span>
        </div>

        {/* Protocol Spec */}
        <div className="flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" />
            Mesh Protocol V1
          </span>
          <span className={isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'}>
            CBOR / Ed25519
          </span>
        </div>

        {/* Mesh Identity */}
        <div className="flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5" />
            Ephemeral Origin Key
          </span>
          <span className={`font-mono text-[9px] ${
            isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
          }`}>
            7f9a...3b21
          </span>
        </div>
      </div>

      {/* Switch Role / Logout */}
      <div className="mx-6 mt-4 space-y-2">
        <button
          type="button"
          onClick={() => onSwitchRole(role === 'citizen' ? 'responder' : 'citizen')}
          className={`w-full py-2.5 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
            isPowerSaving
              ? 'border-[#0d3815] text-[#00ff41] hover:bg-[#0d3815]'
              : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
          }`}
        >
          Switch to {role === 'citizen' ? 'Responder Mode' : 'Citizen Mode'}
        </button>

        <button
          type="button"
          onClick={onLogout}
          className={`w-full py-2.5 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            isPowerSaving
              ? 'text-red-400 hover:bg-red-950/20'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          <LogOut className="w-3.5 h-3.5" />
          Exit to Welcome Screen
        </button>
      </div>
    </div>
  );
}

