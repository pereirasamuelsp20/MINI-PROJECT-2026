'use client';

import React, { useState } from 'react';
import { ArrowLeft, Shield, Send, AlertTriangle } from 'lucide-react';
import { usePowerMode } from '@/lib/powerMode';

interface MessageResponderModalProps {
  onClose: () => void;
  onSubmit: (body: string) => Promise<void>;
}

export default function MessageResponderModal({ onClose, onSubmit }: MessageResponderModalProps) {
  const { isPowerSaving } = usePowerMode();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    setSending(true);
    await onSubmit(text.trim());
    setSending(false);
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col justify-between p-6 pt-14 ${
      isPowerSaving ? 'bg-black text-[#00ff41]' : 'bg-[#0b0808] text-white'
    }`}>
      <div>
        <header className="flex items-center gap-3 border-b border-red-950 pb-4 mb-5">
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 ${isPowerSaving ? 'text-[#15803d] hover:text-[#00ff41]' : 'text-stone-400 hover:text-white'}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className={`grid size-10 place-items-center rounded-full ${
            isPowerSaving ? 'bg-[#0d3815] text-[#00ff41]' : 'bg-orange-400/15 text-orange-300'
          }`}>
            <Shield className="w-5 h-5" />
          </span>
          <div>
            <b className="block text-sm">Relief responders</b>
            <small className={`text-[8px] block ${isPowerSaving ? 'text-[#15803d]' : 'text-emerald-400'}`}>
              Available through nearby mesh
            </small>
          </div>
        </header>

        {/* Not for immediate danger advisory */}
        <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${
          isPowerSaving
            ? 'bg-black border-[#0d3815] text-[#00ff41]'
            : 'border-orange-500/20 bg-orange-500/10 text-stone-300'
        }`}>
          <b className={`block mb-1 font-bold ${isPowerSaving ? 'text-[#00ff41]' : 'text-orange-300'}`}>
            Not for immediate danger
          </b>
          Use SOS for urgent medical, rescue, or evacuation needs. Send general inquiries and non-emergency updates here.
        </div>

        {/* Responder prompt greeting */}
        <div className={`mt-5 max-w-[85%] rounded-2xl rounded-bl-sm border p-3.5 ${
          isPowerSaving ? 'bg-black border-[#0d3815] text-[#00ff41]' : 'bg-[#211717] border-red-950 text-white'
        }`}>
          <b className={`text-[8px] block ${isPowerSaving ? 'text-[#15803d]' : 'text-orange-300'}`}>
            Relief Control
          </b>
          <p className="mt-1 text-xs">How can the response team help?</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="pt-4 pb-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message responders over BLE…"
            className={`h-12 flex-1 rounded-full px-4 text-xs outline-none transition-colors ${
              isPowerSaving
                ? 'bg-black border border-[#0d3815] text-[#00ff41] placeholder-[#15803d] focus:border-[#00ff41]'
                : 'bg-white/5 border border-red-950 text-white placeholder-stone-500 focus:border-red-500'
            }`}
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className={`grid size-12 place-items-center rounded-full transition-all ${
              isPowerSaving
                ? 'bg-[#00ff41] text-black shadow-[0_0_10px_#00ff41]'
                : 'bg-red-500 text-white shadow-[0_0_15px_rgba(255,38,61,0.4)]'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

