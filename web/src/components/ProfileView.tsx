'use client';

import React, { useState, useEffect } from 'react';
import { User, Shield, Zap, Radio, Server, Lock, LogOut, CheckCircle2 } from 'lucide-react';
import { UserRole } from '@/types';
import { usePowerMode } from '@/lib/powerMode';
import { checkBackendHealth } from '@/lib/api';

interface ProfileViewProps {
  role: UserRole;
  onSwitchRole: (newRole: UserRole) => void;
  onLogout: () => void;
}

export default function ProfileView({ role, onSwitchRole, onLogout }: ProfileViewProps) {
  const { isPowerSaving, togglePowerSaving } = usePowerMode();
  const [backendStatus, setBackendStatus] = useState<{ ok: boolean; message: string }>({
    ok: false,
    message: 'Checking backend...',
  });

  useEffect(() => {
    checkBackendHealth().then(setBackendStatus);
  }, []);

  return (
    <div className="pb-28">
      {/* Header */}
      <header className="px-6 pb-2 pt-3">
        <p
          className={`text-xs font-extrabold uppercase tracking-widest ${
            isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
          }`}
        >
          Identity & Device
        </p>
        <h1
          className={`mt-1 text-2xl font-extrabold tracking-tight ${
            isPowerSaving ? 'text-[#00ff41]' : 'text-white'
          }`}
        >
          Settings
        </h1>
        <p
          className={`mt-0.5 text-xs ${
            isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-300'
          }`}
        >
          Manage your mesh node and battery power mode
        </p>
      </header>

      {/* Profile Card */}
      <div
        className={`mx-5 mt-3 p-5 rounded-3xl border transition-colors ${
          isPowerSaving
            ? 'bg-black border-neutral-800 text-[#00ff41]'
            : 'bg-[#181111] border-red-950 text-white'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl ${
              isPowerSaving
                ? 'border border-[#00ff41] bg-black text-[#00ff41]'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {role === 'citizen' ? <User className="w-7 h-7" /> : <Shield className="w-7 h-7" />}
          </div>

          <div className="flex-1 min-w-0">
            <b
              className={`text-base block truncate font-bold ${
                isPowerSaving ? 'text-[#00ff41]' : 'text-white'
              }`}
            >
              {role === 'citizen' ? 'Aarya Mehta' : 'Responder Squad #4'}
            </b>
            <p
              className={`text-xs mt-0.5 capitalize ${
                isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-400'
              }`}
            >
              Role: <span className="font-semibold text-white">{role}</span>
            </p>
            <p
              className={`text-xs mt-0.5 font-mono ${
                isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-400'
              }`}
            >
              Unique Mesh ID: <span className="font-bold text-red-400">MESH-8492</span>
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div
          className={`mt-4 flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider ${
            isPowerSaving
              ? 'border border-neutral-800 bg-black text-[#00ff41]'
              : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Active BLE Node · Mumbai Operational Zone
        </div>
      </div>

      {/* Battery / Power Saving Mode Section */}
      <div
        className={`mx-5 mt-4 p-5 rounded-3xl border transition-colors ${
          isPowerSaving
            ? 'bg-black border-neutral-800 text-[#00ff41]'
            : 'bg-[#181111] border-red-950 text-white'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`p-3 rounded-2xl ${
                isPowerSaving
                  ? 'border border-[#00ff41] bg-black text-[#00ff41]'
                  : 'bg-yellow-500/15 text-yellow-400'
              }`}
            >
              <Zap className="w-6 h-6" />
            </span>
            <div>
              <b
                className={`text-sm block font-bold ${
                  isPowerSaving ? 'text-[#00ff41]' : 'text-white'
                }`}
              >
                Ultra Power Saving Mode
              </b>
              <span
                className={`text-xs block mt-0.5 ${
                  isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-400'
                }`}
              >
                Pure black (#000000) for OLED conservation
              </span>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            onClick={togglePowerSaving}
            aria-label="Toggle Power Saving Mode"
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              isPowerSaving ? 'bg-[#00ff41]' : 'bg-stone-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-black transition-transform ${
                isPowerSaving ? 'translate-x-6' : 'translate-x-1 bg-white'
              }`}
            />
          </button>
        </div>

        <p
          className={`mt-3 text-xs leading-relaxed border-t pt-3 ${
            isPowerSaving
              ? 'border-neutral-800 text-[#00ff41]/70'
              : 'border-white/5 text-stone-400'
          }`}
        >
          Engineered for prolonged blackouts. Turns off AMOLED screen pixels completely with crisp high-contrast green text and zero battery drain.
        </p>
      </div>

      {/* Backend & Mesh Diagnostics */}
      <div
        className={`mx-5 mt-4 p-5 rounded-3xl border space-y-3 ${
          isPowerSaving
            ? 'bg-black border-neutral-800 text-[#00ff41]'
            : 'bg-black/40 border-white/5 text-stone-300'
        }`}
      >
        <b
          className={`text-xs uppercase tracking-wider block font-bold ${
            isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-400'
          }`}
        >
          Network & Protocol Diagnostics
        </b>

        {/* Backend Connection */}
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 font-medium">
            <Server className="w-4 h-4 text-stone-400" />
            Rust Axum Gateway (Port 3001)
          </span>
          <span
            className={`font-bold flex items-center gap-1 ${
              backendStatus.ok
                ? isPowerSaving
                  ? 'text-[#00ff41]'
                  : 'text-emerald-400'
                : isPowerSaving
                ? 'text-[#00ff41]/70'
                : 'text-orange-400'
            }`}
          >
            {backendStatus.ok ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Online
              </>
            ) : (
              'Standalone Mesh'
            )}
          </span>
        </div>

        {/* Protocol Spec */}
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 font-medium">
            <Lock className="w-4 h-4 text-stone-400" />
            Protocol Envelope
          </span>
          <span className="font-mono text-stone-400">CBOR / Ed25519</span>
        </div>

        {/* Sector Lock */}
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 font-medium">
            <Radio className="w-4 h-4 text-stone-400" />
            City Sector Lock
          </span>
          <span className="font-semibold text-emerald-400">Mumbai Active</span>
        </div>
      </div>

      {/* Role Actions */}
      <div className="mx-5 mt-5 space-y-2.5">
        {/* Only responders have the option to switch to citizen view */}
        {role === 'responder' && (
          <button
            type="button"
            onClick={() => onSwitchRole('citizen')}
            className={`w-full py-3.5 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider border transition-all ${
              isPowerSaving
                ? 'border-neutral-800 text-[#00ff41] hover:bg-neutral-900'
                : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
            }`}
          >
            Switch to Citizen Mode
          </button>
        )}

        <button
          type="button"
          onClick={onLogout}
          className={`w-full py-3.5 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            isPowerSaving
              ? 'text-red-400 border border-neutral-800 hover:bg-neutral-900'
              : 'border border-white/10 bg-white/5 text-stone-400 hover:text-stone-200'
          }`}
        >
          <LogOut className="w-4 h-4" />
          Exit to Welcome Screen
        </button>
      </div>
    </div>
  );
}
