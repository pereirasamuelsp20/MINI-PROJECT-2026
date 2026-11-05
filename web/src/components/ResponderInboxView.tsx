'use client';

import React from 'react';
import { User, Inbox } from 'lucide-react';
import { ReliefData } from '@/types';
import { usePowerMode } from '@/lib/powerMode';

interface ResponderInboxViewProps {
  data: ReliefData;
}

export default function ResponderInboxView({ data }: ResponderInboxViewProps) {
  const { isPowerSaving } = usePowerMode();

  return (
    <div className="pb-28">
      {/* Header */}
      <header className="px-6 pb-2 pt-3">
        <p
          className={`text-xs font-extrabold uppercase tracking-widest ${
            isPowerSaving ? 'text-red-400' : 'text-red-400'
          }`}
        >
          Citizen Inquiries
        </p>
        <h1
          className={`mt-1 text-2xl font-extrabold tracking-tight ${
            isPowerSaving ? 'text-white' : 'text-white'
          }`}
        >
          Responder Inbox
        </h1>
        <p
          className={`mt-0.5 text-xs ${
            isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-300'
          }`}
        >
          Messages and localized updates from Mumbai residents
        </p>
      </header>

      {/* Messages List */}
      <div className="space-y-3 px-5 mt-2">
        {data.responderMessages.map((msg) => (
          <article
            key={msg.id}
            className={`p-4 rounded-3xl border transition-colors ${
              isPowerSaving
                ? 'bg-[rgba(8,19,12,0.96)] border-[rgba(74,222,128,0.32)] backdrop-blur-sm text-white'
                : 'bg-white/5 border-red-950/80 text-white'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <span
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-none ${
                  isPowerSaving
                    ? 'border border-[rgba(74,222,128,0.32)] text-red-400 bg-[rgba(11,24,15,0.97)]'
                    : 'bg-red-500/15 text-red-400'
                }`}
              >
                <User className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <b className="block text-sm font-bold truncate">{msg.senderName}</b>
                <small
                  className={`text-xs block mt-0.5 ${
                    isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-400'
                  }`}
                >
                  {msg.area} ·{' '}
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </small>
              </div>
              {msg.urgency === 'urgent' && (
                <span
                  className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    isPowerSaving
                      ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(11,24,15,0.97)] text-red-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  Urgent
                </span>
              )}
            </div>

            <p
              className={`mt-3 p-3.5 rounded-2xl text-xs leading-relaxed border ${
                isPowerSaving
                  ? 'bg-[rgba(8,19,12,0.96)] border-[rgba(74,222,128,0.32)] text-[#A8B4D0]'
                  : 'bg-black/30 border border-white/5 text-stone-200'
              }`}
            >
              {msg.body}
            </p>
          </article>
        ))}

        {data.responderMessages.length === 0 && (
          <div className="p-10 text-center border border-dashed border-neutral-800 rounded-3xl text-stone-500">
            <Inbox className="w-10 h-10 mx-auto mb-2 text-stone-600" />
            <b className="text-sm block text-stone-400">Inbox is clear</b>
            <p className="text-xs mt-1">Citizen questions and non-emergency reports will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
