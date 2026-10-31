'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Shield, Navigation, AlertTriangle, Radio } from 'lucide-react';
import { usePowerMode } from '@/lib/powerMode';

const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[480px] rounded-3xl bg-[#101515] border border-red-950 flex flex-col items-center justify-center text-center p-6 text-stone-400">
      <Radio className="w-8 h-8 text-red-500 animate-pulse mb-3" />
      <p className="text-xs font-bold uppercase tracking-widest text-white">Loading MeshMap…</p>
      <p className="text-[10px] text-stone-500 mt-1">Connecting to local OpenStreetMap tiles</p>
    </div>
  ),
});

export default function MapView() {
  const { isPowerSaving } = usePowerMode();
  const [selectedPoint, setSelectedPoint] = useState({
    name: 'Community Relief Camp',
    distance: 'Approx. 1.2 km · route estimate',
  });
  const [routeActive, setRouteActive] = useState(false);

  return (
    <div className="pb-24">
      {/* Header */}
      <header className="px-6 pb-4 pt-2">
        <p className={`text-[8px] font-extrabold uppercase tracking-[0.2em] ${
          isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
        }`}>
          Safer routes
        </p>
        <h1 className={`mt-1 text-[23px] font-extrabold tracking-tight ${
          isPowerSaving ? 'text-[#00ff41]' : 'text-white'
        }`}>
          MeshMap
        </h1>
        <p className={`mt-1 text-[11px] ${
          isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
        }`}>
          Nearby relays, relief points and safer routes
        </p>
      </header>

      {/* Map Viewport Container */}
      <div className="mx-5 h-[480px] relative rounded-3xl overflow-hidden border border-red-950 shadow-2xl">
        <MapInner
          onSelectLocation={(name, distance) => {
            setSelectedPoint({ name, distance });
          }}
        />
      </div>

      {/* Selected Relief Point / Nearest Camp Card */}
      <article className={`mx-5 mt-3 flex items-center gap-3 rounded-2xl border p-3.5 transition-colors ${
        isPowerSaving 
          ? 'bg-black border-[#0d3815] text-[#00ff41]' 
          : 'bg-[#181111] border-red-950 text-white'
      }`}>
        <span className={`p-2.5 rounded-xl ${
          isPowerSaving ? 'bg-[#0d3815] text-[#00ff41]' : 'bg-red-500/15 text-red-400'
        }`}>
          <Shield className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <small className={`block text-[7px] font-bold uppercase tracking-widest ${
            isPowerSaving ? 'text-[#15803d]' : 'text-red-400'
          }`}>
            Nearest relief point
          </small>
          <b className={`text-xs block truncate ${
            isPowerSaving ? 'text-[#00ff41]' : 'text-white'
          }`}>
            {selectedPoint.name}
          </b>
          <small className={`block text-[8px] ${
            isPowerSaving ? 'text-[#15803d]' : 'text-stone-500'
          }`}>
            {selectedPoint.distance}
          </small>
        </span>
        <button
          type="button"
          onClick={() => setRouteActive(!routeActive)}
          className={`px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
            isPowerSaving
              ? 'border border-[#00ff41] bg-black text-[#00ff41] hover:bg-[#00ff41]/10'
              : 'border border-red-900 bg-red-500/10 text-red-400 hover:bg-red-500/20'
          }`}
        >
          <Navigation className="w-3 h-3" />
          {routeActive ? 'Active' : 'Safe route'}
        </button>
      </article>

      {/* Offline Status Notice */}
      <div className={`mx-5 mt-2.5 p-3 rounded-xl border text-[9px] flex items-center gap-2 ${
        isPowerSaving 
          ? 'bg-black border-[#0d3815] text-[#15803d]' 
          : 'bg-black/30 border-white/5 text-stone-400'
      }`}>
        <AlertTriangle className={`w-3.5 h-3.5 flex-none ${isPowerSaving ? 'text-[#00ff41]' : 'text-orange-400'}`} />
        <span>OpenStreetMap tiles cached locally. Safe routes avoid reported debris hazards.</span>
      </div>
    </div>
  );
}

