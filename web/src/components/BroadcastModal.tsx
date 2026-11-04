'use client';

import React, { useState } from 'react';
import { ArrowLeft, Send, MapPin } from 'lucide-react';
import { AnnouncementSeverity } from '@/types';
import { usePowerMode } from '@/lib/powerMode';

interface BroadcastModalProps {
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    body: string;
    severity: AnnouncementSeverity;
    area: string;
  }) => Promise<void>;
}

export default function BroadcastModal({ onClose, onSubmit }: BroadcastModalProps) {
  const { isPowerSaving } = usePowerMode();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState<AnnouncementSeverity>('warning');
  const [area, setArea] = useState('Mumbai Response Zone');
  const [broadcasting, setBroadcasting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim() || broadcasting) return;
    setBroadcasting(true);
    await onSubmit({
      title: title.trim(),
      body: body.trim(),
      severity,
      area,
    });
    setBroadcasting(false);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between p-6 overflow-y-auto transition-colors ${
        isPowerSaving ? 'bg-black text-[#00ff41]' : 'bg-[#0e0909] text-white'
      }`}
    >
      <div>
        {/* Cancel */}
        <button
          type="button"
          onClick={onClose}
          className={`flex items-center gap-2 text-sm font-semibold transition-colors mb-4 ${
            isPowerSaving ? 'text-[rgba(0,255,65,0.7)] hover:text-[#00ff41]' : 'text-stone-400 hover:text-white'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
          Cancel
        </button>

        {/* Title */}
        <p
          className={`text-xs font-extrabold uppercase tracking-widest ${
            isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
          }`}
        >
          Civil Safety Broadcast
        </p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
          Issue Public Announcement
        </h2>
        <p
          className={`mt-1 text-xs ${
            isPowerSaving ? 'text-[rgba(0,255,65,0.7)]' : 'text-stone-300'
          }`}
        >
          Broadcasts immediately to all citizen mesh nodes in Mumbai.
        </p>

        {/* Headline */}
        <label className="mt-6 block">
          <span
            className={`text-xs font-bold uppercase tracking-wider block mb-2 ${
              isPowerSaving ? 'text-[rgba(0,255,65,0.7)]' : 'text-stone-400'
            }`}
          >
            Announcement Headline
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Bandra Shelter Open — Drinking Water Available"
            className={`w-full rounded-2xl p-4 text-sm outline-none transition-colors border ${
              isPowerSaving
                ? 'bg-[rgba(0,255,65,0.04)] border-[rgba(0,255,65,0.2)] text-[#00ff41] placeholder-[rgba(0,255,65,0.4)] focus:border-[#00ff41]'
                : 'bg-black/40 border-red-950 text-white placeholder-stone-600 focus:border-red-500'
            }`}
          />
        </label>

        {/* Body Text */}
        <label className="mt-4 block">
          <span
            className={`text-xs font-bold uppercase tracking-wider block mb-2 ${
              isPowerSaving ? 'text-[rgba(0,255,65,0.7)]' : 'text-stone-400'
            }`}
          >
            Detailed Instructions
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Details on relief supplies, safe evacuation corridors, or emergency notices…"
            className={`w-full resize-none rounded-2xl p-4 text-sm outline-none transition-colors border ${
              isPowerSaving
                ? 'bg-[rgba(0,255,65,0.04)] border-[rgba(0,255,65,0.2)] text-[#00ff41] placeholder-[rgba(0,255,65,0.4)] focus:border-[#00ff41]'
                : 'bg-black/40 border-red-950 text-white placeholder-stone-600 focus:border-red-500'
            }`}
          />
        </label>

        {/* Severity */}
        <p
          className={`text-xs font-bold uppercase tracking-wider mt-5 mb-2.5 ${
            isPowerSaving ? 'text-[rgba(0,255,65,0.7)]' : 'text-stone-400'
          }`}
        >
          Severity Level
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          {(['info', 'warning', 'critical'] as AnnouncementSeverity[]).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSeverity(lvl)}
              className={`p-3.5 rounded-2xl border text-xs font-bold uppercase tracking-wider transition-all ${
                severity === lvl
                  ? isPowerSaving
                    ? 'border-[#00ff41] bg-[rgba(0,255,65,0.14)] text-[#00ff41]'
                    : lvl === 'critical'
                    ? 'border-red-500 bg-red-500/25 text-white'
                    : 'border-orange-500 bg-orange-500/25 text-white'
                  : isPowerSaving
                  ? 'border-[rgba(0,255,65,0.18)] bg-[rgba(0,255,65,0.06)] text-[rgba(0,255,65,0.6)]'
                  : 'border-red-950 text-stone-400'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Broadcast Area Notice */}
        <div
          className={`mt-5 flex items-center gap-3.5 rounded-2xl border p-4 ${
            isPowerSaving ? 'bg-[rgba(0,255,65,0.06)] border-[rgba(0,255,65,0.18)] backdrop-blur-sm' : 'border-red-950 bg-white/5'
          }`}
        >
          <MapPin
            className={`w-5 h-5 flex-none ${
              isPowerSaving ? 'text-[#00ff41]' : 'text-stone-400'
            }`}
          />
          <div>
            <b className="block text-xs font-semibold">Broadcast Coverage</b>
            <small
              className={`text-xs block mt-0.5 ${
                isPowerSaving ? 'text-[rgba(0,255,65,0.7)]' : 'text-stone-400'
              }`}
            >
              Mumbai Citywide Mesh Coverage (All Nodes)
            </small>
          </div>
        </div>
      </div>

      <div className="pt-6 pb-2">
        <button
          type="button"
          disabled={broadcasting || !title.trim() || !body.trim()}
          onClick={handleSubmit}
          className={`w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-wider transition-all ${
            isPowerSaving
              ? 'border-2 border-[#00ff41] bg-[rgba(0,255,65,0.15)] text-[#00ff41] hover:bg-[rgba(0,255,65,0.25)]'
              : 'bg-gradient-to-r from-[#ff6754] via-[#ff263d] to-[#bd1230] text-white shadow-[0_12px_30px_rgba(207,20,45,0.4)] hover:brightness-110'
          }`}
        >
          {broadcasting ? 'Transmitting…' : 'Broadcast Announcement'}
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
