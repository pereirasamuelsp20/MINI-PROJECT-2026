'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { usePowerMode } from '@/lib/powerMode';

interface CreateChannelModalProps {
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description: string;
    channelType: 'community' | 'group';
  }) => Promise<void>;
}

export default function CreateChannelModal({ onClose, onSubmit }: CreateChannelModalProps) {
  const { isPowerSaving } = usePowerMode();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channelType, setChannelType] = useState<'community' | 'group'>('group');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || creating) return;

    setCreating(true);
    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      channelType,
    });
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/75 p-3 backdrop-blur-sm">
      <div
        className={`w-full rounded-3xl border p-5 transition-colors ${
          isPowerSaving
            ? 'bg-black border-[rgba(0,255,65,0.25)] text-[#00ff41]'
            : 'bg-[#1a1111] border-red-900 text-white'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <p
              className={`text-xs font-extrabold uppercase tracking-widest ${
                isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
              }`}
            >
              New Mesh Space
            </p>
            <h2 className="text-lg font-extrabold">Create a Channel</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-full ${
              isPowerSaving
                ? 'text-[rgba(0,255,65,0.6)] hover:text-[#00ff41]'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel Type Selector */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(['group', 'community'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setChannelType(type)}
              className={`p-3.5 rounded-xl border text-xs capitalize font-bold transition-all ${
                channelType === type
                  ? isPowerSaving
                    ? 'border-[#00ff41] bg-[rgba(0,255,65,0.14)] text-[#00ff41]'
                    : 'border-red-400 bg-red-500/20 text-white'
                  : isPowerSaving
                  ? 'border-[rgba(0,255,65,0.18)] bg-[rgba(0,255,65,0.06)] text-[rgba(0,255,65,0.6)]'
                  : 'border-red-950 text-stone-400'
              }`}
            >
              {type === 'group' ? 'Private Group' : 'Public Community'}
            </button>
          ))}
        </div>

        {/* Inputs */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Channel Name (e.g. Bandra Volunteers)"
          className={`h-12 w-full rounded-xl px-4 text-sm outline-none mb-3 transition-colors border ${
            isPowerSaving
              ? 'bg-[rgba(0,255,65,0.04)] border-[rgba(0,255,65,0.2)] text-[#00ff41] placeholder-[rgba(0,255,65,0.4)] focus:border-[#00ff41]'
              : 'bg-black/40 border-red-950 text-white placeholder-stone-500 focus:border-red-500'
          }`}
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this channel for?"
          rows={3}
          className={`w-full resize-none rounded-xl p-3 text-sm outline-none transition-colors mb-4 border ${
            isPowerSaving
              ? 'bg-[rgba(0,255,65,0.04)] border-[rgba(0,255,65,0.2)] text-[#00ff41] placeholder-[rgba(0,255,65,0.4)] focus:border-[#00ff41]'
              : 'bg-black/40 border-red-950 text-white placeholder-stone-500 focus:border-red-500'
          }`}
        />

        <button
          type="button"
          disabled={creating || !name.trim()}
          onClick={handleSubmit}
          className={`w-full py-4 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
            isPowerSaving
              ? 'border-2 border-[#00ff41] bg-[rgba(0,255,65,0.15)] text-[#00ff41] hover:bg-[rgba(0,255,65,0.25)]'
              : 'bg-gradient-to-r from-[#ff6754] via-[#ff263d] to-[#bd1230] text-white shadow-lg'
          }`}
        >
          {creating ? 'Creating…' : `Create ${channelType}`}
        </button>
      </div>
    </div>
  );
}
