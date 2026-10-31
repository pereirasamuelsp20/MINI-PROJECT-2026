'use client';

import React from 'react';
import { User, Inbox, AlertTriangle } from 'lucide-react';
import { ReliefData } from '@/types';
import { usePowerMode } from '@/lib/powerMode';

interface ResponderInboxViewProps {
  data: ReliefData;
}

export default function ResponderInboxView({ data }: ResponderInboxViewProps) {
  const { isPowerSaving } = usePowerMode();

  return (
    <div className="pb-24">
      {/* Header */}
      <header className="px-6 pb-3 pt-2">
        <p className={`text-[8px] font-extrabold uppercase tracking-[0.2em] ${
          isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
        }`}>
          Citizen contact
        </p>
        <h1 className={`mt-1 text-[23px] font-extrabold tracking-tight ${
          isPowerSaving ? 'text-[#00ff41]' : 'text-white'
        }`}>
          Responder inbox
        </h1>
        <p className={`mt-1 text-[11px] ${
          isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
        }`}>
          Messages addressed to the response team
        </p>
      </header>

      {/* Messages List */}
      <div className="space-y-3 px-6 mt-2">
        {data.responderMessages.map((msg) => (
          <article
            key={msg.id}
            className={`p-4 rounded-2xl border transition-colors ${
              isPowerSaving
                ? 'bg-black border-[#0d3815] text-[#00ff41]'
                : 'bg-white/5 border-red-950/80 text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`grid size-10 place-items-center rounded-full flex-none ${
                isPowerSaving ? 'bg-[#0d3815] text-[#00ff41]' : 'bg-red-500/15 text-red-400'
              }`}>
                <User className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <b className="block text-xs truncate">{msg.senderName}</b>
                <small className={`text-[8px] ${
                  isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
                }`}>
                  {msg.area} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </small>
              </div>
              {msg.urgency === 'urgent' && (
                <span className={`text-[7px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  isPowerSaving ? 'border border-[#00ff41] text-[#00ff41]' : 'bg-red-500/20 text-red-400'
                }`}>
                  Urgent
                </span>
              )}
            </div>

            <p className={`mt-3 p-3 rounded-xl text-xs leading-relaxed ${
              isPowerSaving
                ? 'bg-[#031505] border border-[#0d3815] text-[#00ff41]'
                : 'bg-black/30 border border-white/5 text-stone-200'
            }`}>
              {msg.body}
            </p>
          </article>
        ))}

        {data.responderMessages.length === 0 && (
          <div className="p-8 text-center border border-dashed border-red-950 rounded-2xl text-stone-500">
            <Inbox className="w-8 h-8 mx-auto mb-2 text-stone-600" />
            <b className="text-xs block text-stone-400">Inbox is clear</b>
            <p className="text-[9px] mt-1">Citizen questions and non-emergency reports will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

