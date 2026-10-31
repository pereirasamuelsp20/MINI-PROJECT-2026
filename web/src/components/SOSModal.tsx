'use client';

import React, { useState } from 'react';
import { ArrowLeft, Send, MapPin, AlertTriangle } from 'lucide-react';
import { AlertNeed } from '@/types';
import { usePowerMode } from '@/lib/powerMode';

interface SOSModalProps {
  onClose: () => void;
  onSubmit: (payload: { need: AlertNeed; details: string }) => Promise<void>;
}

export default function SOSModal({ onClose, onSubmit }: SOSModalProps) {
  const { isPowerSaving } = usePowerMode();
  const [need, setNeed] = useState<AlertNeed>('Medical');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    await onSubmit({ need, details });
    setSubmitting(false);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between p-6 overflow-y-auto transition-colors ${
        isPowerSaving ? 'bg-black text-[#00ff41]' : 'bg-[#0e0909] text-white'
      }`}
    >
      <div>
        {/* Cancel Button */}
        <button
          type="button"
          onClick={onClose}
          className={`flex items-center gap-2 text-sm font-semibold transition-colors mb-4 ${
            isPowerSaving
              ? 'text-neutral-400 hover:text-[#00ff41]'
              : 'text-stone-400 hover:text-white'
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
          Emergency Transmission
        </p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
          Request Urgent Help
        </h2>
        <p
          className={`mt-1 text-xs ${
            isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-400'
          }`}
        >
          Stored locally and relayed across peer devices without internet.
        </p>

        {/* Need Selection */}
        <p
          className={`text-xs font-bold uppercase tracking-wider mt-6 mb-3 ${
            isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-400'
          }`}
        >
          What is the emergency?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(['Medical', 'Trapped', 'Supplies', 'Evacuation'] as AlertNeed[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setNeed(type)}
              className={`p-4 rounded-2xl border text-left text-sm font-bold transition-all ${
                need === type
                  ? isPowerSaving
                    ? 'border-[#00ff41] bg-black text-[#00ff41]'
                    : 'border-red-400 bg-red-500/20 text-red-300 shadow-[0_0_15px_rgba(255,38,61,0.2)]'
                  : isPowerSaving
                  ? 'border-neutral-800 bg-black text-neutral-400'
                  : 'border-red-950/70 bg-white/5 text-stone-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Details Textarea */}
        <label className="mt-6 block">
          <span
            className={`text-xs font-bold uppercase tracking-wider block mb-2 ${
              isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-400'
            }`}
          >
            Details (Injuries, exact landmark, count)
          </span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
            placeholder="Describe what happened, injuries, or number of people needing help in Mumbai…"
            className={`h-28 w-full resize-none rounded-2xl p-4 text-sm outline-none transition-colors border ${
              isPowerSaving
                ? 'bg-black border-neutral-800 text-[#00ff41] placeholder-[#00ff41]/40 focus:border-[#00ff41]'
                : 'bg-black/40 border-red-950 text-white placeholder-stone-600 focus:border-red-500'
            }`}
          />
        </label>

        {/* Location Notice */}
        <div
          className={`mt-5 flex items-center gap-3.5 rounded-2xl border p-4 ${
            isPowerSaving
              ? 'bg-black border-neutral-800 text-[#00ff41]'
              : 'border-red-950 bg-white/5 text-stone-300'
          }`}
        >
          <MapPin
            className={`w-5 h-5 flex-none ${
              isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
            }`}
          />
          <div>
            <b className="block text-xs font-semibold">Location metadata attached</b>
            <small
              className={`text-xs block mt-0.5 ${
                isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-400'
              }`}
            >
              Mumbai Sector · GPS estimate (±35m accuracy)
            </small>
          </div>
        </div>
      </div>

      {/* Submit Action */}
      <div className="pt-6 pb-2">
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className={`w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-wider transition-all ${
            isPowerSaving
              ? 'border-2 border-[#00ff41] bg-black text-[#00ff41]'
              : 'bg-gradient-to-r from-[#ff6754] via-[#ff263d] to-[#bd1230] text-white shadow-[0_12px_30px_rgba(207,20,45,0.4)] hover:brightness-110'
          }`}
        >
          {submitting ? 'Broadcasting to Mesh…' : 'Send Emergency SOS'}
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
