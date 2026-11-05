'use client';

import React, { useState } from 'react';
import { ArrowLeft, Shield, Send } from 'lucide-react';
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
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between p-6 pt-12 ${
        isPowerSaving ? 'bg-black text-[#A8B4D0]' : 'bg-[#0b0808] text-white'
      }`}
    >
      <div>
        <header className={`flex items-center gap-3 border-b pb-4 mb-5 ${isPowerSaving ? 'border-[rgba(74,222,128,0.32)]' : 'border-white/10'}`}>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 ${
              isPowerSaving
                ? 'text-[#A8B4D0] hover:text-white'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isPowerSaving
                ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(11,24,15,0.97)] text-white'
                : 'bg-orange-400/15 text-orange-300'
            }`}
          >
            <Shield className="w-5 h-5" />
          </span>
          <div>
            <b className="block text-sm font-bold">Relief Responders</b>
            <small
              className={`text-xs block ${
                isPowerSaving ? 'text-[#A8B4D0]' : 'text-emerald-400'
              }`}
            >
              Mumbai Sector · Online via Mesh
            </small>
          </div>
        </header>

        {/* Not for immediate danger advisory */}
        <div
          className={`p-4 rounded-2xl border text-xs leading-relaxed ${
            isPowerSaving
              ? 'bg-[rgba(8,19,12,0.96)] border-[rgba(74,222,128,0.32)] backdrop-blur-sm text-white'
              : 'border-orange-500/25 bg-orange-500/10 text-stone-300'
          }`}
        >
          <b
            className={`block mb-1 font-bold ${
              isPowerSaving ? 'text-white' : 'text-orange-300'
            }`}
          >
            Non-Emergency Inquiries
          </b>
          Use the red SOS button for life-threatening medical, rescue, or evacuation needs. Send general questions or logistics updates here.
        </div>

        {/* Responder prompt greeting */}
        <div
          className={`mt-5 max-w-[85%] rounded-2xl rounded-bl-sm border p-4 ${
            isPowerSaving
              ? 'bg-[rgba(8,19,12,0.96)] border-[rgba(74,222,128,0.32)] text-white'
              : 'bg-[#211717] border-red-950 text-white'
          }`}
        >
          <b className="text-xs block text-orange-400 font-bold">
            Mumbai Relief Control
          </b>
          <p className="mt-1 text-sm">How can our rescue coordination unit help you?</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="pt-4 pb-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message responders over BLE…"
            className={`h-12 flex-1 rounded-2xl px-4 text-sm outline-none transition-colors border ${
              isPowerSaving
                ? 'bg-[rgba(8,19,12,0.96)] border-[rgba(74,222,128,0.32)] text-white placeholder-[#A8B4D0] focus:border-[rgba(74,222,128,0.32)]'
                : 'bg-white/5 border border-red-950 text-white placeholder-stone-500 focus:border-red-500'
            }`}
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className={`grid size-12 place-items-center rounded-2xl transition-all ${
              isPowerSaving
                ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(11,24,15,0.97)] text-white disabled:opacity-30'
                : 'bg-red-600 text-white shadow-lg disabled:opacity-40 hover:bg-red-500'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
