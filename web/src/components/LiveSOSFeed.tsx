'use client';

import React, { useState } from 'react';
import { AlertCircle, ShieldCheck, Check } from 'lucide-react';
import { ReliefData } from '@/types';
import { usePowerMode } from '@/lib/powerMode';

interface LiveSOSFeedProps {
  data: ReliefData;
  onVerify: (id: string) => void;
  onResolve: (id: string) => void;
}

export default function LiveSOSFeed({ data, onVerify, onResolve }: LiveSOSFeedProps) {
  const { isPowerSaving } = usePowerMode();
  const [filter, setFilter] = useState<string>('all');

  const filteredAlerts =
    filter === 'all'
      ? data.alerts
      : data.alerts.filter((a) => a.need.toLowerCase() === filter.toLowerCase());

  return (
    <div className="pb-28">
      {/* Header */}
      <header className="px-6 pb-2 pt-3">
        <p
          className={`text-xs font-extrabold uppercase tracking-widest ${
            isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
          }`}
        >
          Live Mumbai Mesh Feed
        </p>
        <h1
          className={`mt-1 text-2xl font-extrabold tracking-tight ${
            isPowerSaving ? 'text-[#00ff41]' : 'text-white'
          }`}
        >
          Emergency SOS
        </h1>
        <p
          className={`mt-0.5 text-xs ${
            isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-300'
          }`}
        >
          {data.alerts.length} verified citizen requests in sector
        </p>
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto px-6 pb-2 pt-1 no-scrollbar">
        {['all', 'Medical', 'Trapped', 'Supplies', 'Evacuation'].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
              filter === item
                ? isPowerSaving
                  ? 'bg-[#00ff41] text-black font-extrabold'
                  : 'bg-red-600 text-white shadow-md'
                : isPowerSaving
                ? 'border border-neutral-800 bg-black text-neutral-400'
                : 'border border-red-950 bg-white/5 text-stone-400 hover:text-white'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-3 px-5 mt-2">
        {filteredAlerts.map((alert) => (
          <article
            key={alert.id}
            className={`p-4 rounded-3xl border transition-colors ${
              isPowerSaving
                ? 'bg-black border-neutral-800 text-[#00ff41]'
                : 'bg-[#181111] border-red-950/80 text-white'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <span
                className={`p-3 rounded-2xl flex-none ${
                  isPowerSaving
                    ? 'border border-[#00ff41] text-[#00ff41] bg-black'
                    : 'bg-red-500/15 text-red-400'
                }`}
              >
                <AlertCircle className="w-6 h-6" />
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <b className="text-sm font-bold">{alert.need} Urgently Needed</b>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        alert.status === 'verified'
                          ? isPowerSaving
                            ? 'border border-[#00ff41] text-[#00ff41]'
                            : 'bg-emerald-500/20 text-emerald-400'
                          : alert.status === 'resolved'
                          ? 'bg-blue-500/20 text-blue-400'
                          : isPowerSaving
                          ? 'border border-neutral-800 text-neutral-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {alert.status}
                    </span>
                    <span
                      className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        alert.priority === 'urgent'
                          ? 'bg-red-600 text-white'
                          : isPowerSaving
                          ? 'text-neutral-400 border border-neutral-800'
                          : 'bg-white/10 text-stone-300'
                      }`}
                    >
                      {alert.priority}
                    </span>
                  </div>
                </div>

                <p
                  className={`mt-2 text-xs leading-relaxed ${
                    isPowerSaving ? 'text-[#00ff41]/80' : 'text-stone-300'
                  }`}
                >
                  {alert.details}
                </p>

                <div
                  className={`mt-3 flex items-center justify-between text-xs border-t pt-2.5 ${
                    isPowerSaving
                      ? 'border-neutral-800 text-neutral-400'
                      : 'border-white/5 text-stone-400'
                  }`}
                >
                  <span className="truncate">
                    {alert.citizenName} · {alert.area}
                  </span>
                  <span>
                    {new Date(alert.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Operator Actions */}
                <div className="mt-3.5 flex items-center gap-2">
                  {alert.status === 'new' && (
                    <button
                      type="button"
                      onClick={() => onVerify(alert.id)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                        isPowerSaving
                          ? 'border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black'
                          : 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/50'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Verify Incident
                    </button>
                  )}
                  {alert.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() => onResolve(alert.id)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                        isPowerSaving
                          ? 'border border-neutral-800 text-neutral-400 hover:text-[#00ff41]'
                          : 'bg-white/5 border border-white/10 text-stone-300 hover:bg-white/10'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}

        {filteredAlerts.length === 0 && (
          <div className="p-10 text-center border border-dashed border-neutral-800 rounded-3xl text-stone-500">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 text-stone-600" />
            <b className="text-sm block text-stone-400">No active alerts</b>
            <p className="text-xs mt-1">Incoming citizen alerts will appear here over BLE mesh.</p>
          </div>
        )}
      </div>
    </div>
  );
}
