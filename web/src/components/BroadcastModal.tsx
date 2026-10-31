'use client';

import React, { useState } from 'react';
import { ArrowLeft, Send, MapPin, Megaphone } from 'lucide-react';
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
  const [broadcasting, setBroadcasting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || broadcasting) return;

    setBroadcasting(true);
    await onSubmit({
      title: title.trim(),
      body: body.trim(),
      severity,
      area: 'Andheri East, Mumbai',
    });
    setBroadcasting(false);
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto p-6 pt-14 flex flex-col justify-between ${
      isPowerSaving ? 'bg-black text-[#00ff41]' : 'bg-[#0b0808] text-white'
    }`}>
      <div>
        <button
          type="button"
          onClick={onClose}
          className={`flex items-center gap-1.5 text-xs font-semibold mb-5 ${
            isPowerSaving ? 'text-[#15803d] hover:text-[#00ff41]' : 'text-stone-400 hover:text-white'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </button>

        <p className={`text-[8px] font-extrabold uppercase tracking-[0.2em] ${
          isPowerSaving ? 'text-[#15803d]' : 'text-red-400'
        }`}>
          Area broadcast
        </p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
          Send announcement
        </h2>
        <p className={`mt-1 text-xs ${
          isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
        }`}>
          Citizens receive this alert over BLE mesh and internet gateways.
        </p>

        {/* Headline */}
        <label className="mt-6 block">
          <span className={`text-[8px] font-bold uppercase tracking-widest block mb-2 ${
            isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
          }`}>
            Headline
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Relief camp now open / Safe water distributed"
            className={`h-11 w-full rounded-2xl px-4 text-xs outline-none transition-colors ${
              isPowerSaving
                ? 'bg-black border border-[#0d3815] text-[#00ff41] placeholder-[#15803d] focus:border-[#00ff41]'
                : 'bg-black/40 border border-red-950 text-white placeholder-stone-600 focus:border-red-500'
            }`}
          />
        </label>

        {/* Message */}
        <label className="mt-4 block">
          <span className={`text-[8px] font-bold uppercase tracking-widest block mb-2 ${
            isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
          }`}>
            Actionable Instructions
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Give clear, unambiguous instructions for citizen safety…"
            className={`w-full resize-none rounded-2xl p-4 text-xs outline-none transition-colors ${
              isPowerSaving
                ? 'bg-black border border-[#0d3815] text-[#00ff41] placeholder-[#15803d] focus:border-[#00ff41]'
                : 'bg-black/40 border border-red-950 text-white placeholder-stone-600 focus:border-red-500'
            }`}
          />
        </label>

        {/* Priority Severity */}
        <p className={`text-[8px] font-bold uppercase tracking-widest mt-5 mb-2 ${
          isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
        }`}>
          Severity Priority
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(['info', 'warning', 'critical'] as AnnouncementSeverity[]).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSeverity(lvl)}
              className={`p-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${
                severity === lvl
                  ? isPowerSaving
                    ? 'border-[#00ff41] bg-[#031505] text-[#00ff41]'
                    : lvl === 'critical'
                    ? 'border-red-500 bg-red-500/20 text-white'
                    : 'border-orange-500 bg-orange-500/20 text-white'
                  : isPowerSaving
                  ? 'border-[#0d3815] text-[#15803d]'
                  : 'border-red-950 text-stone-400'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Broadcast Area Notice */}
        <div className={`mt-5 flex items-center gap-3 rounded-2xl border p-3.5 ${
          isPowerSaving ? 'bg-black border-[#0d3815]' : 'border-red-950 bg-white/5'
        }`}>
          <MapPin className={`w-5 h-5 flex-none ${isPowerSaving ? 'text-[#00ff41]' : 'text-stone-400'}`} />
          <div>
            <b className="block text-[10px]">Broadcast Area</b>
            <small className={`text-[8px] block ${isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'}`}>
              Andheri East, Mumbai · Mesh Area Coverage
            </small>
          </div>
        </div>
      </div>

      <div className="pt-6 pb-2">
        <button
          type="button"
          disabled={broadcasting || !title.trim() || !body.trim()}
          onClick={handleSubmit}
          className={`w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-wider transition-all ${
            isPowerSaving
              ? 'border-2 border-[#00ff41] bg-black text-[#00ff41] shadow-[0_0_20px_#00ff41]'
              : 'bg-gradient-to-r from-[#ff6754] via-[#ff263d] to-[#bd1230] text-white shadow-[0_12px_30px_rgba(207,20,45,0.4)] hover:brightness-110'
          }`}
        >
          {broadcasting ? 'Transmitting…' : 'Broadcast announcement'}
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

