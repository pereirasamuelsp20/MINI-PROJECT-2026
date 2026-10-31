'use client';

import React, { useState } from 'react';
import { ArrowLeft, MapPin, Send, AlertTriangle } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    await onSubmit({ need, details });
    setSubmitting(false);
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto p-6 pt-14 flex flex-col justify-between ${
      isPowerSaving ? 'bg-black text-[#00ff41]' : 'bg-[#0b0808] text-white'
    }`}>
      <div>
        {/* Back Button */}
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

        {/* Title */}
        <p className={`text-[8px] font-extrabold uppercase tracking-[0.2em] ${
          isPowerSaving ? 'text-[#15803d]' : 'text-red-400'
        }`}>
          SOS alert
        </p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
          Request emergency help
        </h2>
        <p className={`mt-1 text-xs ${
          isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
        }`}>
          Your request will store locally and relay without internet.
        </p>

        {/* What do you need selection */}
        <p className={`text-[8px] font-bold uppercase tracking-widest mt-8 mb-3 ${
          isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
        }`}>
          What do you need?
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {(['Medical', 'Trapped', 'Supplies', 'Evacuation'] as AlertNeed[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setNeed(type)}
              className={`p-4 rounded-2xl border text-left text-xs font-bold transition-all ${
                need === type
                  ? isPowerSaving
                    ? 'border-[#00ff41] bg-[#031505] text-[#00ff41] shadow-[0_0_12px_#00ff41]'
                    : 'border-red-400 bg-red-500/15 text-red-300 shadow-[0_0_15px_rgba(255,38,61,0.2)]'
                  : isPowerSaving
                  ? 'border-[#0d3815] bg-black text-[#15803d]'
                  : 'border-red-950/70 bg-white/5 text-stone-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Details Textarea */}
        <label className="mt-6 block">
          <span className={`text-[8px] font-bold uppercase tracking-widest block mb-2 ${
            isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
          }`}>
            Details (optional)
          </span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
            placeholder="Describe what happened, injuries, or number of people needing help…"
            className={`h-28 w-full resize-none rounded-2xl p-4 text-xs outline-none transition-colors ${
              isPowerSaving
                ? 'bg-black border border-[#0d3815] text-[#00ff41] placeholder-[#15803d] focus:border-[#00ff41]'
                : 'bg-black/40 border border-red-950 text-white placeholder-stone-600 focus:border-red-500'
            }`}
          />
        </label>

        {/* Location Notice */}
        <div className={`mt-5 flex items-center gap-3 rounded-2xl border p-3.5 ${
          isPowerSaving
            ? 'bg-black border-[#0d3815] text-[#00ff41]'
            : 'border-red-950 bg-white/5 text-stone-300'
        }`}>
          <MapPin className={`w-5 h-5 flex-none ${isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'}`} />
          <div>
            <b className="block text-[10px]">Approximate location available</b>
            <small className={`text-[8px] block ${isPowerSaving ? 'text-[#15803d]' : 'text-stone-500'}`}>
              Andheri East, Mumbai · GPS ±25m accuracy
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
          className={`w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-wider transition-all ${
            isPowerSaving
              ? 'border-2 border-[#00ff41] bg-black text-[#00ff41] shadow-[0_0_20px_#00ff41]'
              : 'bg-gradient-to-r from-[#ff6754] via-[#ff263d] to-[#bd1230] text-white shadow-[0_12px_30px_rgba(207,20,45,0.4)] hover:brightness-110'
          }`}
        >
          {submitting ? 'Broadcasting to Mesh…' : 'Send SOS alert'}
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

