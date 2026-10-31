'use client';

import React from 'react';
import { Shield, ChevronRight, MapPin, MessageSquare, Radio, Megaphone, AlertCircle } from 'lucide-react';
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
    <div className="pb-24">
      {/* Title Header */}
      <header className="px-6 pb-3 pt-2">
        <p className={`text-[8px] font-extrabold uppercase tracking-[0.2em] ${
          isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
        }`}>
          Disaster relief
        </p>
        <h1 className={`mt-1 text-[23px] font-extrabold tracking-tight ${
          isPowerSaving ? 'text-[#00ff41]' : 'text-white'
        }`}>
          Stay safe, Aarya.
        </h1>
        <p className={`mt-1 text-[11px] ${
          isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
        }`}>
          Your community is within reach.
        </p>
      </header>

      {/* Official Announcement Card */}
      {latestAnnouncement && (
        <article
          className={`mx-6 mb-4 rounded-2xl border p-3.5 transition-colors ${
            isPowerSaving
              ? 'bg-black border-[#0d3815] text-[#00ff41]'
              : latestAnnouncement.severity === 'critical'
              ? 'border-red-500/50 bg-red-500/15 text-white'
              : 'border-orange-500/30 bg-orange-500/10 text-white'
          }`}
        >
          <div className="flex gap-3">
            <span
              className={`p-2 rounded-xl flex-none ${
                isPowerSaving
                  ? 'bg-[#0d3815] text-[#00ff41]'
                  : 'bg-orange-500/20 text-orange-300'
              }`}
            >
              <Megaphone className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <span
                className={`text-[8px] font-extrabold uppercase tracking-widest block ${
                  isPowerSaving ? 'text-[#15803d]' : 'text-orange-300'
                }`}
              >
                Official announcement · {latestAnnouncement.senderName}
              </span>
              <strong className="mt-1 block text-xs font-bold leading-tight">
                {latestAnnouncement.title}
              </strong>
              <p
                className={`mt-1 text-[9px] leading-relaxed line-clamp-2 ${
                  isPowerSaving ? 'text-[#00ff41]' : 'text-stone-300'
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
        className={`mx-6 mb-5 flex items-center gap-3 rounded-2xl border p-3 ${
          isPowerSaving
            ? 'bg-black border-[#0d3815] text-[#00ff41]'
            : 'border-red-900/60 bg-red-950/35 text-white'
        }`}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full flex-none ${
            isPowerSaving
              ? 'bg-[#00ff41]'
              : 'bg-red-500 shadow-[0_0_0_4px_rgba(255,38,61,0.2),0_0_10px_#ff263d]'
          }`}
        />
        <div className="flex-1">
          <b
            className={`block text-[8px] uppercase tracking-widest ${
              isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
            }`}
          >
            Limited connectivity
          </b>
          <small
            className={`text-[10px] block ${
              isPowerSaving ? 'text-[#15803d]' : 'text-stone-300'
            }`}
          >
            6 BLE nodes available nearby
          </small>
        </div>
        <ChevronRight
          className={`w-4 h-4 ${isPowerSaving ? 'text-[#00ff41]' : 'text-stone-400'}`}
        />
      </div>

      {/* Main SOS Trigger Section */}
      <section className="flex flex-col items-center py-5">
        <p
          className={`mb-3 text-[9px] font-bold uppercase tracking-widest ${
            isPowerSaving ? 'text-[#15803d]' : 'text-stone-300'
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
              ? 'border-2 border-[#00ff41] bg-black text-[#00ff41] shadow-[0_0_25px_#00ff41]'
              : 'border border-red-400 bg-[radial-gradient(circle,#ff5e4f_0_42%,#e91e3a_43%_57%,rgba(121,20,34,.55)_58%_63%,transparent_64%)] shadow-[0_0_55px_rgba(242,37,53,.45)] text-white hover:brightness-110'
          }`}
        >
          <span className="text-center">
            <b className="block text-3xl font-extrabold tracking-wider">SOS</b>
            <small className="text-[8px] font-bold uppercase tracking-wider block mt-0.5">
              Tap to request
            </small>
          </span>
        </button>

        <p
          className={`mt-4 text-[9px] ${
            isPowerSaving ? 'text-[#15803d]' : 'text-stone-500'
          }`}
        >
          Relays through nearby devices when offline
        </p>
      </section>

      {/* Quick Access Section */}
      <div className="px-6 mt-4">
        <p
          className={`text-[8px] font-bold uppercase tracking-widest mb-2.5 ${
            isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
          }`}
        >
          Quick access
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* Safe Zones Button */}
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between min-h-[95px] transition-all ${
              isPowerSaving
                ? 'bg-black border-[#0d3815] text-[#00ff41] hover:border-[#00ff41]'
                : 'bg-gradient-to-br from-[#211313] to-[#111111] border-[#4d2c29] text-white hover:border-red-500/50'
            }`}
          >
            <MapPin
              className={`w-5 h-5 ${isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'}`}
            />
            <div>
              <b className="text-[11px] block mt-2">Safe zones</b>
              <small
                className={`text-[8px] block mt-0.5 ${
                  isPowerSaving ? 'text-[#15803d]' : 'text-[#9f9089]'
                }`}
              >
                Nearby relief and shelter points
              </small>
            </div>
          </button>

          {/* BLE Chats Button */}
          <button
            type="button"
            onClick={() => onNavigate('chats')}
            className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between min-h-[95px] transition-all ${
              isPowerSaving
                ? 'bg-black border-[#0d3815] text-[#00ff41] hover:border-[#00ff41]'
                : 'bg-gradient-to-br from-[#211313] to-[#111111] border-[#4d2c29] text-white hover:border-red-500/50'
            }`}
          >
            <MessageSquare
              className={`w-5 h-5 ${isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'}`}
            />
            <div>
              <b className="text-[11px] block mt-2">BLE chats</b>
              <small
                className={`text-[8px] block mt-0.5 ${
                  isPowerSaving ? 'text-[#15803d]' : 'text-[#9f9089]'
                }`}
              >
                Groups and communities nearby
              </small>
            </div>
          </button>
        </div>
      </div>

      {/* Mesh Diagnostics Status Bar */}
      <div
        className={`mx-6 mt-4 rounded-2xl border p-3 transition-colors ${
          isPowerSaving
            ? 'bg-black border-[#0d3815]'
            : 'bg-black/40 border-red-950/70'
        }`}
      >
        <div className="flex justify-between items-center border-b border-white/5 pb-2 text-[8px] font-bold uppercase tracking-widest">
          <span
            className={`flex items-center gap-2 ${
              isPowerSaving ? 'text-[#00ff41]' : 'text-stone-300'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Mesh status
          </span>
          <b className={isPowerSaving ? 'text-[#00ff41]' : 'text-emerald-400'}>
            ● Active
          </b>
        </div>
        <div
          className={`grid grid-cols-3 pt-3 text-center text-[8px] ${
            isPowerSaving ? 'text-[#15803d]' : 'text-stone-500'
          }`}
        >
          <div>
            <b
              className={`block text-base ${
                isPowerSaving ? 'text-[#00ff41]' : 'text-white'
              }`}
            >
              06
            </b>
            nearby nodes
          </div>
          <div>
            <b
              className={`block text-base ${
                isPowerSaving ? 'text-[#00ff41]' : 'text-white'
              }`}
            >
              02
            </b>
            relay hops
          </div>
          <div>
            <b
              className={`block text-base ${
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

