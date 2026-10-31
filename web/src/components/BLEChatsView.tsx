'use client';

import React, { useState } from 'react';
import { Radio, Users, Shield, Plus, ChevronRight, Send, ArrowLeft } from 'lucide-react';
import { MeshChannel, ReliefData } from '@/types';
import { usePowerMode } from '@/lib/powerMode';

interface BLEChatsViewProps {
  data: ReliefData;
  onSendMessage: (channelName: string, body: string) => Promise<void>;
  onOpenNewChannel: () => void;
  onOpenMessageResponder: () => void;
}

export default function BLEChatsView({
  data,
  onSendMessage,
  onOpenNewChannel,
  onOpenMessageResponder,
}: BLEChatsViewProps) {
  const { isPowerSaving } = usePowerMode();
  const [activeChannel, setActiveChannel] = useState<MeshChannel | null>(null);
  const [messageText, setMessageText] = useState<string>('');
  const [sending, setSending] = useState(false);

  const activeMessages = activeChannel
    ? data.meshMessages.filter((m) => m.channelName === activeChannel.name)
    : [];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChannel || !messageText.trim() || sending) return;

    setSending(true);
    await onSendMessage(activeChannel.name, messageText.trim());
    setMessageText('');
    setSending(false);
  };

  // If inside a specific channel conversation
  if (activeChannel) {
    return (
      <div className="flex h-full flex-col pb-[74px]">
        {/* Chat Header */}
        <header className={`flex items-center gap-3 border-b px-5 py-3 transition-colors ${
          isPowerSaving ? 'bg-black border-[#0d3815]' : 'bg-[#100b0b] border-red-950'
        }`}>
          <button
            type="button"
            onClick={() => setActiveChannel(null)}
            className={`p-1 text-lg ${isPowerSaving ? 'text-[#00ff41]' : 'text-stone-300'}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className={`grid size-10 place-items-center rounded-full ${
            isPowerSaving ? 'bg-[#0d3815] text-[#00ff41]' : 'bg-red-500/15 text-red-400'
          }`}>
            {activeChannel.channelType === 'community' ? <Radio className="w-5 h-5" /> : <Users className="w-5 h-5" />}
          </span>
          <div className="flex-1 min-w-0">
            <b className={`block text-sm truncate ${isPowerSaving ? 'text-[#00ff41]' : 'text-white'}`}>
              {activeChannel.name}
            </b>
            <small className={`text-[8px] block ${isPowerSaving ? 'text-[#15803d]' : 'text-emerald-400'}`}>
              BLE mesh · 6 nodes online
            </small>
          </div>
        </header>

        {/* Message Stream */}
        <div className={`flex-1 space-y-3 overflow-y-auto p-4 ${
          isPowerSaving ? 'bg-black' : 'bg-[#0b0808]'
        }`}>
          <p className={`mx-auto w-fit rounded-full px-3 py-1 text-[8px] border ${
            isPowerSaving ? 'bg-black border-[#0d3815] text-[#15803d]' : 'bg-black/40 border-white/5 text-stone-500'
          }`}>
            Messages are relayed device-to-device via BLE mesh
          </p>

          {activeMessages.map((msg) => {
            const isUser = msg.senderName === 'Aarya Mehta';
            return (
              <article
                key={msg.id}
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${
                  isUser
                    ? isPowerSaving
                      ? 'ml-auto rounded-br-sm border border-[#00ff41] bg-[#031505] text-[#00ff41]'
                      : 'ml-auto rounded-br-sm bg-red-600 text-white'
                    : isPowerSaving
                    ? 'rounded-bl-sm border border-[#0d3815] bg-black text-[#00ff41]'
                    : 'rounded-bl-sm border border-red-950 bg-[#211717] text-white'
                }`}
              >
                <b className={`block text-[8px] ${
                  msg.senderRole === 'responder'
                    ? isPowerSaving
                      ? 'text-[#00ff41] font-extrabold'
                      : 'text-orange-300'
                    : isPowerSaving
                    ? 'text-[#15803d]'
                    : 'text-red-300'
                }`}>
                  {msg.senderName} {msg.senderRole === 'responder' && '✓ (Responder)'}
                </b>
                <p className="mt-1 text-[11px] leading-relaxed">{msg.body}</p>
                <small className={`mt-1 flex justify-end gap-1 text-[7px] ${
                  isPowerSaving ? 'text-[#15803d]' : 'text-stone-300/70'
                }`}>
                  {msg.transmission?.toUpperCase()} · relayed
                </small>
              </article>
            );
          })}
        </div>

        {/* Message Input Form */}
        <form
          onSubmit={handleSend}
          className={`flex gap-2 border-t p-3 ${
            isPowerSaving ? 'bg-black border-[#0d3815]' : 'bg-[#100b0b] border-red-950'
          }`}
        >
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Message over BLE mesh…"
            className={`h-11 flex-1 rounded-full px-4 text-xs outline-none transition-colors ${
              isPowerSaving
                ? 'bg-black border border-[#0d3815] text-[#00ff41] placeholder-[#15803d] focus:border-[#00ff41]'
                : 'bg-white/5 border border-red-950 text-white placeholder-stone-500 focus:border-red-500'
            }`}
          />
          <button
            type="submit"
            disabled={sending || !messageText.trim()}
            className={`grid size-11 place-items-center rounded-full transition-all ${
              isPowerSaving
                ? 'bg-[#00ff41] text-black shadow-[0_0_10px_#00ff41]'
                : 'bg-red-500 text-white shadow-[0_0_15px_rgba(255,38,61,0.4)]'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    );
  }

  // Channel List View
  return (
    <div className="pb-24">
      {/* Header */}
      <header className="px-6 pb-3 pt-2">
        <p className={`text-[8px] font-extrabold uppercase tracking-[0.2em] ${
          isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
        }`}>
          Offline messaging
        </p>
        <h1 className={`mt-1 text-[23px] font-extrabold tracking-tight ${
          isPowerSaving ? 'text-[#00ff41]' : 'text-white'
        }`}>
          BLE chats
        </h1>
        <p className={`mt-1 text-[11px] ${
          isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
        }`}>
          Private groups and nearby communities
        </p>
      </header>

      {/* BLE Available Banner */}
      <div className={`mx-6 mb-4 flex items-center gap-3 rounded-2xl border p-3 ${
        isPowerSaving
          ? 'bg-black border-[#0d3815] text-[#00ff41]'
          : 'border-emerald-900/50 bg-emerald-950/20 text-white'
      }`}>
        <span className={`w-2.5 h-2.5 rounded-full flex-none ${
          isPowerSaving ? 'bg-[#00ff41]' : 'bg-emerald-400 shadow-[0_0_8px_#00d294]'
        }`} />
        <div className="flex-1">
          <b className={`block text-[9px] uppercase tracking-wider ${
            isPowerSaving ? 'text-[#00ff41]' : 'text-emerald-400'
          }`}>
            BLE available
          </b>
          <small className={`text-[9px] block ${
            isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
          }`}>
            Messages hop across 6 nearby devices
          </small>
        </div>
      </div>

      {/* Contact Responders Card */}
      <button
        type="button"
        onClick={onOpenMessageResponder}
        className={`mx-6 mb-4 flex w-[calc(100%-3rem)] items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
          isPowerSaving
            ? 'bg-black border-[#0d3815] text-[#00ff41] hover:border-[#00ff41]'
            : 'border-orange-500/30 bg-orange-500/10 text-white hover:border-orange-500/50'
        }`}
      >
        <span className={`grid size-10 place-items-center rounded-full ${
          isPowerSaving ? 'bg-[#0d3815] text-[#00ff41]' : 'bg-orange-400/15 text-orange-300'
        }`}>
          <Shield className="w-5 h-5" />
        </span>
        <div className="flex-1">
          <b className="block text-xs">Message responders</b>
          <small className={`text-[9px] block ${
            isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
          }`}>
            Non-emergency questions and local updates
          </small>
        </div>
        <ChevronRight className={`w-4 h-4 ${isPowerSaving ? 'text-[#00ff41]' : 'text-stone-400'}`} />
      </button>

      {/* Chats Section Header with "+ New" button */}
      <div className="flex items-center justify-between px-6 mb-2">
        <p className={`text-[8px] font-bold uppercase tracking-widest ${
          isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
        }`}>
          Chats & communities
        </p>
        <button
          type="button"
          onClick={onOpenNewChannel}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all ${
            isPowerSaving
              ? 'border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black'
              : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
      </div>

      {/* Channels List */}
      <div className={`divide-y mx-6 rounded-2xl border overflow-hidden ${
        isPowerSaving ? 'divide-[#0d3815] border-[#0d3815] bg-black' : 'divide-red-950/70 border-red-950 bg-black/20'
      }`}>
        {data.channels.map((ch) => {
          const lastMsg = [...data.meshMessages]
            .reverse()
            .find((m) => m.channelName === ch.name);

          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => setActiveChannel(ch)}
              className={`flex w-full items-center gap-3 p-3.5 text-left transition-colors ${
                isPowerSaving ? 'hover:bg-[#031505]' : 'hover:bg-white/5'
              }`}
            >
              <span className={`grid size-10 place-items-center rounded-full flex-none ${
                isPowerSaving ? 'bg-[#0d3815] text-[#00ff41]' : 'bg-red-500/15 text-red-400'
              }`}>
                {ch.channelType === 'community' ? <Radio className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              </span>
              <div className="flex-1 min-w-0">
                <b className={`block text-xs truncate ${isPowerSaving ? 'text-[#00ff41]' : 'text-white'}`}>
                  {ch.name}
                </b>
                <small className={`block text-[9px] truncate ${isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'}`}>
                  {lastMsg?.body || ch.description}
                </small>
              </div>
              <span className={`text-[8px] ${isPowerSaving ? 'text-[#15803d]' : 'text-stone-500'}`}>
                BLE ›
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

