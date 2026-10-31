'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Shield, Navigation, Radio, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { usePowerMode } from '@/lib/powerMode';
import PermissionModal from './PermissionModal';

const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[460px] rounded-3xl bg-[#101515] border border-neutral-800 flex flex-col items-center justify-center text-center p-6 text-stone-400">
      <Radio className="w-10 h-10 text-red-500 animate-pulse mb-3" />
      <p className="text-sm font-bold uppercase tracking-wider text-white">Loading Mumbai MeshMap…</p>
      <p className="text-xs text-stone-400 mt-1">Acquiring local OpenStreetMap tiles</p>
    </div>
  ),
});

export default function MapView() {
  const { isPowerSaving } = usePowerMode();
  const [selectedPoint, setSelectedPoint] = useState({
    name: 'Shivaji Park Relief Camp (Central Mumbai)',
    distance: 'Approx. 1.2 km · route estimate',
  });
  const [routeActive, setRouteActive] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionsActive, setPermissionsActive] = useState(false);
  const [userCoords, setUserCoords] = useState<[number, number] | undefined>(undefined);

  useEffect(() => {
    // Check if permission already stored
    if (typeof window !== 'undefined') {
      const granted = localStorage.getItem('mesh_permissions_granted') === 'true';
      setPermissionsActive(granted);
      const savedLoc = localStorage.getItem('mesh_user_location');
      if (savedLoc) {
        try {
          const parsed = JSON.parse(savedLoc);
          setUserCoords([parsed.lat, parsed.lng]);
        } catch {
          // Fallback
        }
      }
    }
  }, []);

  const handlePermissionsCompleted = (coords?: [number, number]) => {
    setShowPermissionModal(false);
    setPermissionsActive(true);
    if (coords) {
      setUserCoords(coords);
    }
  };

  return (
    <div className="pb-24">
      {/* Permission Modal */}
      <PermissionModal
        isOpen={showPermissionModal}
        onComplete={handlePermissionsCompleted}
      />

      {/* Header */}
      <header className="px-6 pb-3 pt-3">
        <div className="flex items-center justify-between">
          <p
            className={`text-xs font-extrabold uppercase tracking-widest ${
              isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
            }`}
          >
            Evacuation & Safe Corridors
          </p>

          <span
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              isPowerSaving
                ? 'border-neutral-800 bg-black text-[#00ff41]'
                : 'border-red-900/50 bg-red-950/30 text-red-300'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            Mumbai Sector
          </span>
        </div>

        <h1
          className={`mt-1.5 text-2xl font-extrabold tracking-tight ${
            isPowerSaving ? 'text-[#00ff41]' : 'text-white'
          }`}
        >
          City MeshMap
        </h1>
        <p
          className={`mt-1 text-xs leading-relaxed ${
            isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-300'
          }`}
        >
          Relief centers, water havens and offline relays in Mumbai
        </p>

        {/* Permission / Radio State Bar */}
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowPermissionModal(true)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              permissionsActive
                ? isPowerSaving
                  ? 'border-neutral-800 bg-black text-[#00ff41]'
                  : 'border-emerald-800/60 bg-emerald-950/20 text-emerald-400'
                : isPowerSaving
                ? 'border-[#00ff41] bg-black text-[#00ff41]'
                : 'border-red-700 bg-red-950/40 text-red-300 hover:brightness-110'
            }`}
          >
            {permissionsActive ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                GPS & BLE Active
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                Enable Location & BLE
              </>
            )}
          </button>

          <span className="text-xs text-stone-400 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-orange-400" />
            Locked to Mumbai
          </span>
        </div>
      </header>

      {/* Map Viewport Container */}
      <div className="mx-5 h-[440px] relative rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl">
        <MapInner
          userLocation={userCoords}
          safeRouteActive={routeActive}
          onSelectLocation={(name, distance) => {
            setSelectedPoint({ name, distance });
          }}
        />
      </div>

      {/* Selected Relief Point / Nearest Camp Card */}
      <article
        className={`mx-5 mt-4 flex items-center gap-3.5 rounded-2xl border p-4 transition-colors ${
          isPowerSaving
            ? 'bg-black border-neutral-800 text-[#00ff41]'
            : 'bg-[#181111] border-red-950 text-white'
        }`}
      >
        <span
          className={`p-3 rounded-2xl ${
            isPowerSaving ? 'border border-neutral-800 bg-black text-[#00ff41]' : 'bg-red-500/15 text-red-400'
          }`}
        >
          <Shield className="w-6 h-6" />
        </span>
        <span className="flex-1 min-w-0">
          <small
            className={`block text-xs font-bold uppercase tracking-wider ${
              isPowerSaving ? 'text-[#00ff41]/70' : 'text-red-400'
            }`}
          >
            Nearest Safe Haven
          </small>
          <b
            className={`text-sm block truncate mt-0.5 ${
              isPowerSaving ? 'text-[#00ff41]' : 'text-white'
            }`}
          >
            {selectedPoint.name}
          </b>
          <small
            className={`block text-xs mt-0.5 ${
              isPowerSaving ? 'text-[#00ff41]/60' : 'text-stone-400'
            }`}
          >
            {selectedPoint.distance}
          </small>
        </span>
        <button
          type="button"
          onClick={() => setRouteActive(!routeActive)}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
            isPowerSaving
              ? 'border border-[#00ff41] bg-black text-[#00ff41] hover:bg-[#00ff41]/10'
              : 'border border-red-900 bg-red-500/15 text-red-400 hover:bg-red-500/25'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          {routeActive ? 'Active' : 'Safe route'}
        </button>
      </article>

      {/* Offline Status Notice */}
      <div
        className={`mx-5 mt-3 p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 ${
          isPowerSaving
            ? 'bg-black border-neutral-800 text-[#00ff41]/80'
            : 'bg-black/30 border-white/5 text-stone-300'
        }`}
      >
        <Radio className="w-4 h-4 text-emerald-400 flex-none" />
        <span>
          <strong>Offline Ready:</strong> Map tiles cached for Mumbai. Route guidance functions without cellular network.
        </span>
      </div>
    </div>
  );
}
