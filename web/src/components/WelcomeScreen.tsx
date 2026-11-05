'use client';

import React, { useState } from 'react';
import { Shield, ChevronRight, Zap, Radio, KeyRound } from 'lucide-react';
import { UserRole } from '@/types';
import { usePowerMode } from '@/lib/powerMode';

interface WelcomeScreenProps {
  onSelectRole: (role: UserRole) => void;
}

export default function WelcomeScreen({ onSelectRole }: WelcomeScreenProps) {
  const { isPowerSaving, togglePowerSaving } = usePowerMode();
  const [showResponderAuthModal, setShowResponderAuthModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  const handleResponderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Authorized responder access codes
    if (passcode.trim() === '112' || passcode.trim().toUpperCase() === 'RESCUE' || passcode.trim() === '999') {
      setShowResponderAuthModal(false);
      onSelectRole('responder');
    } else {
      setAuthError('Invalid Access Code. Responders use code 112 or RESCUE.');
    }
  };

  return (
    <main
      className={`flex h-full flex-col transition-colors ${
        isPowerSaving ? 'bg-[rgba(8,19,12,0.96)] text-white' : 'bg-transparent text-white'
      }`}
    >
      {/* Responder Passkey Verification Modal */}
      {showResponderAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl ${
              isPowerSaving
                ? 'bg-[rgba(8,19,12,0.96)] border-[rgba(74,222,128,0.32)] text-white'
                : 'bg-[#150f0f] border-[#54302c] text-white'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-2xl ${isPowerSaving ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(11,24,15,0.97)] text-red-400' : 'bg-red-500/15 text-red-400'}`}>
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold">Authorized Responder Access</h3>
                <p className={`text-xs ${isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-400'}`}>Restricted to emergency personnel</p>
              </div>
            </div>

            <form onSubmit={handleResponderSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Enter Responder Passcode
                </label>
                <input
                  type="password"
                  placeholder="e.g. 112 or RESCUE"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl text-sm outline-none border ${
                    isPowerSaving
                      ? 'bg-[rgba(8,19,12,0.96)] border-[rgba(74,222,128,0.32)] text-white'
                      : 'bg-black/50 border-white/10 text-white focus:border-red-500'
                  }`}
                  autoFocus
                />
              </div>

              {authError && (
                <p className="text-xs text-red-400">{authError}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResponderAuthModal(false)}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold border ${isPowerSaving ? 'border-[rgba(74,222,128,0.32)] text-[#A8B4D0]' : 'border-white/10 text-stone-400 hover:text-white'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider ${
                    isPowerSaving
                      ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(11,24,15,0.97)] text-white'
                      : 'bg-red-600 text-white shadow-lg'
                  }`}
                >
                  Authenticate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Status Bar */}
      <div className="flex h-12 items-center justify-between px-6 pt-3 text-xs font-semibold">
        <button
          type="button"
          onClick={togglePowerSaving}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest transition-all ${
            isPowerSaving
              ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(11,24,15,0.97)] text-white'
              : 'border border-white/10 bg-white/5 text-stone-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          {isPowerSaving ? 'ECO ON' : 'ECO'}
        </button>

        <span
          className={`flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider ${
            isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-300'
          }`}
        >
          <Radio className={`w-4 h-4 ${isPowerSaving ? 'text-red-500' : 'text-red-500'}`} />
          BLE MESH (MUMBAI)
        </span>
      </div>

      {/* Main Body */}
      <section className="flex flex-1 flex-col items-center px-7 pb-8 pt-8 text-center">
        {/* Shield Hero Icon */}
        <div
          className={`relative grid size-36 place-items-center rounded-full border transition-all ${
            isPowerSaving
              ? 'border-[rgba(74,222,128,0.32)] bg-[rgba(8,19,12,0.96)] text-red-400'
              : 'border-red-500/20 bg-[radial-gradient(circle,rgba(255,55,55,.25),transparent_66%)] text-red-400 shadow-[0_0_60px_rgba(242,37,53,.28)]'
          }`}
        >
          <span
            className={`absolute size-28 rounded-full border-t-2 ${
              isPowerSaving ? 'border-[rgba(74,222,128,0.32)]' : 'border-red-400'
            }`}
          />
          <span
            className={`absolute size-20 rounded-full border-t-2 ${
              isPowerSaving ? 'border-[rgba(74,222,128,0.32)]' : 'border-orange-400'
            }`}
          />
          <Shield className="w-14 h-14" />
        </div>

        {/* Title */}
        <div className="mt-7 text-3xl font-extrabold uppercase leading-tight tracking-wide">
          <span className="block">Disaster</span>
          <strong className={isPowerSaving ? 'text-red-500' : 'text-red-500'}>
            Relief
          </strong>{' '}
          Mesh
        </div>

        <p
          className={`mt-3 text-xs font-semibold uppercase tracking-wider ${
            isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-400'
          }`}
        >
          Connected people · safer tomorrows
        </p>

        {/* Slogan */}
        <div className="mt-8">
          <h1 className="text-xl font-extrabold uppercase tracking-wide">
            Help can travel
          </h1>
          <p
            className={`mt-1 text-sm ${
              isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-300'
            }`}
          >
            even when the cellular network cannot.
          </p>
        </div>

        {/* Role Selection Buttons */}
        <div className="mt-8 grid w-full gap-3.5">
          <button
            type="button"
            onClick={() => onSelectRole('citizen')}
            className={`w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-wider transition-all ${
              isPowerSaving
                ? 'border border-[rgba(74,222,128,0.45)] bg-[rgba(8,26,14,0.98)] text-white hover:bg-[rgba(16,38,23,0.98)]'
                : 'bg-gradient-to-r from-[#ff6754] via-[#ff263d] to-[#bd1230] text-white shadow-[0_12px_30px_rgba(207,20,45,0.35)] hover:brightness-110'
            }`}
          >
            Continue as citizen
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setShowResponderAuthModal(true)}
            className={`w-full py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider border transition-all ${
              isPowerSaving
                ? 'border-[rgba(74,222,128,0.32)] bg-[rgba(8,19,12,0.96)] text-[#A8B4D0] hover:text-white'
                : 'border-white/10 bg-white/5 text-stone-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Shield className={`w-4 h-4 ${isPowerSaving ? 'text-white' : 'text-stone-400'}`} />
            Responder Login
          </button>
        </div>

        {/* Bottom Badge */}
        <div
          className={`mt-auto flex w-full items-center justify-center gap-2 rounded-2xl border py-3.5 text-xs font-bold uppercase tracking-wider ${
            isPowerSaving
              ? 'bg-[rgba(8,19,12,0.96)] border-[rgba(74,222,128,0.32)] text-[#A8B4D0] backdrop-blur-sm'
              : 'border-red-950 bg-black/20 text-stone-400'
          }`}
        >
          <Radio className={`w-4 h-4 ${isPowerSaving ? 'text-white' : 'text-emerald-400'}`} />
          Offline-First · Mumbai Mesh Ready
        </div>
      </section>
    </main>
  );
}
