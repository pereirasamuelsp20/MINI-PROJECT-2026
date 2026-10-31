'use client';

import React from 'react';
import { Shield, ChevronRight, MapPin, MessageSquare, Radio, Megaphone } from 'lucide-react';
import { ReliefData } from '@/types';
import { usePowerMode } from '@/lib/powerMode';

interface CitizenHomeProps {
  data: ReliefData;
  onNavigate: (tab: string) => void;
  onOpenSOS: () => void;
}

export default function CitizenHome({ data, onNavigate, onOpenSOS }: CitizenHomeProps) {
  const { isPowerSaving } = usePowerMode();
  const latestAnnouncement = data.announcements[0];

  return (
    <div className="pb-28">
      {/* Title Header */}
      <header className="px-6 pb-2 pt-3">
        <p
          className={`text-xs font-extrabold uppercase tracking-widest ${
            isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
          }`}
        >
          Disaster Mesh · Mumbai
        </p>
        <h1
          className={`mt-1 text-2xl font-extrabold tracking-tight ${
            isPowerSaving ? 'text-[#00ff41]' : 'text-white'
          }`}
        >
          Stay safe, Aarya.
        </h1>
        <p
          className={`mt-0.5 text-xs ${
            isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-300'
          }`}
        >
          Your community is within BLE reach.
        </p>
      </header>

      {/* Official Announcement Card */}
      {latestAnnouncement && (
        <article
          className={`mx-5 mb-4 rounded-3xl border p-4 transition-colors ${
            isPowerSaving
              ? 'bg-black border-neutral-800 text-[#00ff41]'
              : latestAnnouncement.severity === 'critical'
              ? 'border-red-500/50 bg-red-500/15 text-white'
              : 'border-orange-500/40 bg-orange-500/10 text-white'
          }`}
        >
          <div className="flex gap-3.5">
            <span
              className={`p-2.5 rounded-2xl flex-none ${
                isPowerSaving
                  ? 'border border-[#00ff41] bg-black text-[#00ff41]'
                  : 'bg-orange-500/25 text-orange-300'
              }`}
            >
              <Megaphone className="w-5 h-5" />
            </span>
            <div className="min-w-0 flex-1">
              <span
                className={`text-xs font-extrabold uppercase tracking-wider block ${
                  isPowerSaving ? 'text-[#00ff41]/70' : 'text-orange-300'
                }`}
              >
                Official Alert · {latestAnnouncement.senderName}
              </span>
              <strong className="mt-1 block text-sm font-bold leading-snug">
                {latestAnnouncement.title}
              </strong>
              <p
                className={`mt-1 text-xs leading-relaxed line-clamp-3 ${
                  isPowerSaving ? 'text-[#00ff41]/80' : 'text-stone-300'
                }`}
              >
                {latestAnnouncement.body}
              </p>
            </div>
          </div>
        </article>
      )}

      {/* Connectivity Banner */}
      <div
        className={`mx-5 mb-5 flex items-center gap-3.5 rounded-2xl border p-3.5 ${
          isPowerSaving
            ? 'bg-black border-neutral-800 text-[#00ff41]'
            : 'border-red-900/60 bg-red-950/35 text-white'
        }`}
      >
        <span
          className={`w-3 h-3 rounded-full flex-none ${
            isPowerSaving
              ? 'bg-[#00ff41]'
              : 'bg-red-500 shadow-[0_0_0_4px_rgba(255,38,61,0.25),0_0_10px_#ff263d]'
          }`}
        />
        <div className="flex-1">
          <b
            className={`block text-xs uppercase tracking-wider font-bold ${
              isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
            }`}
          >
            Offline Mesh Active
          </b>
          <p
            className={`text-xs block mt-0.5 ${
              isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-300'
            }`}
          >
            6 BLE nodes available in Mumbai sector
          </p>
        </div>
        <ChevronRight
          className={`w-4 h-4 ${isPowerSaving ? 'text-[#00ff41]' : 'text-stone-400'}`}
        />
      </div>

      {/* Main SOS Trigger Section */}
      <section className="flex flex-col items-center py-4">
        <p
          className={`mb-3 text-xs font-bold uppercase tracking-wider ${
            isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-300'
          }`}
        >
          Need urgent help?
        </p>

        {/* Circular SOS Button */}
        <button
          type="button"
          onClick={onOpenSOS}
          className={`grid size-36 place-items-center rounded-full transition-all active:scale-95 ${
            isPowerSaving
              ? 'border-2 border-[#00ff41] bg-black text-[#00ff41]'
              : 'border border-red-400 bg-[radial-gradient(circle,#ff5e4f_0_42%,#e91e3a_43%_57%,rgba(121,20,34,.55)_58%_63%,transparent_64%)] shadow-[0_0_55px_rgba(242,37,53,.45)] text-white hover:brightness-110'
          }`}
        >
          <span className="text-center">
            <b className="block text-3xl font-extrabold tracking-wider">SOS</b>
            <small className="text-xs font-bold uppercase tracking-wider block mt-0.5">
              Tap to request
            </small>
          </span>
        </button>

        <p
          className={`mt-4 text-xs ${
            isPowerSaving ? 'text-[#00ff41]/60' : 'text-stone-400'
          }`}
        >
          Relays store-and-forward packets through nearby devices
        </p>
      </section>

      {/* Quick Access Section */}
      <div className="px-5 mt-4">
        <p
          className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${
            isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-400'
          }`}
        >
          Quick access
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* Safe Zones Button */}
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className={`p-4 rounded-3xl border text-left flex flex-col justify-between min-h-[105px] transition-all ${
              isPowerSaving
                ? 'bg-black border-neutral-800 text-[#00ff41] hover:border-[#00ff41]'
                : 'bg-gradient-to-br from-[#211313] to-[#111111] border-[#4d2c29] text-white hover:border-red-500/50'
            }`}
          >
            <MapPin
              className={`w-6 h-6 ${isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'}`}
            />
            <div>
              <b className="text-sm font-bold block mt-2">Safe Zones</b>
              <small
                className={`text-xs block mt-0.5 ${
                  isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-400'
                }`}
              >
                Mumbai relief shelters & routes
              </small>
            </div>
          </button>

          {/* WhatsApp BLE Chats Button */}
          <button
            type="button"
            onClick={() => onNavigate('chats')}
            className={`p-4 rounded-3xl border text-left flex flex-col justify-between min-h-[105px] transition-all ${
              isPowerSaving
                ? 'bg-black border-neutral-800 text-[#00ff41] hover:border-[#00ff41]'
                : 'bg-gradient-to-br from-[#211313] to-[#111111] border-[#4d2c29] text-white hover:border-red-500/50'
            }`}
          >
            <MessageSquare
              className={`w-6 h-6 ${isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'}`}
            />
            <div>
              <b className="text-sm font-bold block mt-2">BLE Chats</b>
              <small
                className={`text-xs block mt-0.5 ${
                  isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-400'
                }`}
              >
                Direct chats & community groups
              </small>
            </div>
          </button>
        </div>
      </div>

      {/* Mesh Diagnostics Status Bar */}
      <div
        className={`mx-5 mt-4 rounded-3xl border p-4 transition-colors ${
          isPowerSaving
            ? 'bg-black border-neutral-800'
            : 'bg-black/40 border-red-950/70'
        }`}
      >
        <div className="flex justify-between items-center border-b border-white/5 pb-2.5 text-xs font-bold uppercase tracking-wider">
          <span
            className={`flex items-center gap-2 ${
              isPowerSaving ? 'text-[#00ff41]' : 'text-stone-300'
            }`}
          >
            <Radio className="w-4 h-4" />
            Mesh Radio Status
          </span>
          <b className={isPowerSaving ? 'text-[#00ff41]' : 'text-emerald-400'}>
            ● Active (Mumbai)
          </b>
        </div>
        <div
          className={`grid grid-cols-3 pt-3 text-center text-xs ${
            isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-400'
          }`}
        >
          <div>
            <b
              className={`block text-lg font-bold ${
                isPowerSaving ? 'text-[#00ff41]' : 'text-white'
              }`}
            >
              06
            </b>
            nearby nodes
          </div>
          <div>
            <b
              className={`block text-lg font-bold ${
                isPowerSaving ? 'text-[#00ff41]' : 'text-white'
              }`}
            >
              02
            </b>
            relay hops
          </div>
          <div>
            <b
              className={`block text-lg font-bold ${
                isPowerSaving ? 'text-[#00ff41]' : 'text-white'
              }`}
            >
              OK
            </b>
            local queue
          </div>
        </div>
      </div>
    </div>
  );
}
