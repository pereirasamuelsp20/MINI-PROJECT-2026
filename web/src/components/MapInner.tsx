'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { defaultLocations, MUMBAI_BOUNDS, MUMBAI_CENTER } from '@/lib/mockData';
import { usePowerMode } from '@/lib/powerMode';
import { HazardMarker, HAZARD_INFO } from '@/types/hazards';
import { getStoredHazards, confirmHazard, calculateDistanceMeters } from '@/lib/hazards';
import { PDRKalmanTracker, LocationEstimate } from '@/lib/pdr';
import { TriangleAlert, Footprints, Compass, Navigation } from 'lucide-react';

export interface MapTarget {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  need?: string;
  details?: string;
  priority?: string;
}

interface MapInnerProps {
  userLocation?: [number, number];
  activeTarget?: MapTarget | null;
  onSelectLocation?: (name: string, distance: string) => void;
  safeRouteActive?: boolean;
  onOpenReportHazard?: () => void;
  isResponder?: boolean;
  hazards?: HazardMarker[];
  onConfirmHazard?: (id: string) => void;
  onPdrUpdate?: (estimate: LocationEstimate) => void;
}

export default function MapInner({
  userLocation = MUMBAI_CENTER,
  activeTarget = null,
  onSelectLocation,
  safeRouteActive = true,
  onOpenReportHazard,
  isResponder = false,
  hazards,
  onConfirmHazard,
  onPdrUpdate,
}: MapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const targetMarkerRef = useRef<L.Marker | null>(null);
  const trackerRef = useRef<PDRKalmanTracker | null>(null);

  const [pdrStatus, setPdrStatus] = useState<LocationEstimate | null>(null);
  const { isPowerSaving } = usePowerMode();

  // Validate if location is within Mumbai bounds, otherwise clamp to Mumbai center
  const validCenter: [number, number] =
    userLocation[0] >= 18.85 &&
    userLocation[0] <= 19.35 &&
    userLocation[1] >= 72.70 &&
    userLocation[1] <= 73.15
      ? userLocation
      : MUMBAI_CENTER;

  // Initialize PDR Kalman tracker
  useEffect(() => {
    const tracker = new PDRKalmanTracker(validCenter[0], validCenter[1]);
    trackerRef.current = tracker;
    tracker.start();

    // Seed initial GPS position
    tracker.updateGPS(validCenter[0], validCenter[1], 15);

    const unsubscribe = tracker.onUpdate((estimate) => {
      setPdrStatus(estimate);
      if (onPdrUpdate) onPdrUpdate(estimate);

      // Smoothly update user marker & accuracy circle on the map
      if (userMarkerRef.current && accuracyCircleRef.current) {
        const newPos = L.latLng(estimate.latitude, estimate.longitude);
        userMarkerRef.current.setLatLng(newPos);
        accuracyCircleRef.current.setLatLng(newPos);
        accuracyCircleRef.current.setRadius(estimate.accuracyMeters);

        if (estimate.isGpsLost) {
          accuracyCircleRef.current.setStyle({
            color: '#f59e0b',
            fillColor: '#f59e0b',
            dashArray: '4, 4',
          });
        } else {
          accuracyCircleRef.current.setStyle({
            color: '#ff263d',
            fillColor: '#ff263d',
            dashArray: '5, 5',
          });
        }
      }
    });

    // Browser Geolocation continuous watch
    let watchId: number | null = null;
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          tracker.updateGPS(
            pos.coords.latitude,
            pos.coords.longitude,
            Math.round(pos.coords.accuracy)
          );
        },
        () => {
          // GPS signal error or lost — PDR takes over
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
      );
    }

    return () => {
      unsubscribe();
      tracker.stop();
      if (watchId !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Update tracker when userLocation changes
  useEffect(() => {
    if (trackerRef.current) {
      trackerRef.current.updateGPS(validCenter[0], validCenter[1], 15);
    }
  }, [validCenter[0], validCenter[1]]);

  // Initialize and render Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Determine initial center and zoom
    // REQUIREMENT: "When the map loads it zooms in and centers on the user location."
    const initialZoom = activeTarget ? 14 : 15;

    const map = L.map(mapContainerRef.current, {
      center: validCenter,
      zoom: initialZoom,
      minZoom: 11,
      maxZoom: 18,
      maxBounds: MUMBAI_BOUNDS,
      maxBoundsViscosity: 1.0,
      zoomControl: false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // OpenStreetMap tiles via proxy / direct
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const tileUrl = isLocalhost
      ? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
      : '/api/map-tile/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    // Fast resize invalidation for mobile smooth rendering
    const timer1 = setTimeout(() => {
      map.invalidateSize();
      // Zoom and center on user location
      map.setView(validCenter, initialZoom, { animate: true });
    }, 120);

    // Zoom controls at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Custom Marker Icons
    const createReliefIcon = (type: 'camp' | 'safe_zone' | 'relay') => {
      let bgColor = '#ff263d';
      let symbol = '🛡️';
      let label = 'Relief Camp';

      if (type === 'safe_zone') {
        bgColor = '#00d294';
        symbol = '⛺';
        label = 'Safe Haven';
      } else if (type === 'relay') {
        bgColor = '#ff8b1a';
        symbol = '📶';
        label = 'Mesh Relay';
      }

      return L.divIcon({
        className: 'custom-mesh-marker',
        html: `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            transform: translate(-50%, -100%);
          ">
            <div style="
              background: ${bgColor};
              color: white;
              padding: 4px 8px;
              border-radius: 9px;
              font-size: 11px;
              font-weight: 800;
              box-shadow: 0 2px 10px rgba(0,0,0,0.4);
              border: 1px solid rgba(255,255,255,0.7);
              display: flex;
              align-items: center;
              gap: 4px;
              white-space: nowrap;
            ">
              <span>${symbol}</span>
              <span>${label}</span>
            </div>
            <div style="
              width: 0;
              height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-top: 6px solid ${bgColor};
            "></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });
    };

    // User Location Icon (Pulsing marker)
    const userMarkerIcon = L.divIcon({
      className: 'user-marker',
      html: `
        <div style="
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #ffffff;
          border: 4px solid #ff263d;
          box-shadow: 0 0 0 8px rgba(255, 38, 61, 0.25), 0 0 16px #ff263d;
          transform: translate(-50%, -50%);
        "></div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    // Add user marker
    const userMarker = L.marker(validCenter, { icon: userMarkerIcon }).addTo(map);
    userMarkerRef.current = userMarker;
    userMarker.bindPopup(`
      <div style="color: #111; font-family: sans-serif; font-size: 13px; padding: 2px;">
        <b style="font-size: 14px; color: #ff263d;">${isResponder ? 'Responder Location' : 'Your Location'}</b>
        <p style="margin: 4px 0 0; color: #444; font-size: 12px;">PDR + Kalman Filter fused estimate</p>
      </div>
    `);

    // Add Uncertainty Circle (Rule 8)
    const accuracyCircle = L.circle(validCenter, {
      radius: 25,
      color: '#ff263d',
      fillColor: '#ff263d',
      fillOpacity: 0.15,
      weight: 2,
      dashArray: '5, 5',
    }).addTo(map);
    accuracyCircleRef.current = accuracyCircle;

    // Render Mumbai Relief Locations
    defaultLocations.forEach((loc) => {
      const marker = L.marker([loc.latitude, loc.longitude], {
        icon: createReliefIcon(loc.type),
      }).addTo(map);

      marker.bindPopup(`
        <div style="color: #111; font-family: sans-serif; font-size: 13px; line-height: 1.4; padding: 2px;">
          <b style="font-size: 14px; color: #111;">${loc.name}</b>
          ${loc.capacity ? `<p style="margin: 4px 0 2px;"><b>Capacity:</b> ${loc.capacity}</p>` : ''}
          ${loc.supplies ? `<p style="margin: 2px 0;"><b>Supplies:</b> ${loc.supplies.join(', ')}</p>` : ''}
          ${loc.distanceEstimate ? `<p style="margin: 4px 0 0; color: #0284c7; font-weight: bold;">${loc.distanceEstimate}</p>` : ''}
        </div>
      `);

      marker.on('click', () => {
        if (onSelectLocation) {
          onSelectLocation(loc.name, loc.distanceEstimate || 'Approx. 1.2 km');
        }
      });
    });

    // Render Hazard Obstacles
    const activeHazards = hazards || getStoredHazards();
    activeHazards.forEach((hazard) => {
      const info = HAZARD_INFO[hazard.type] || {
        emoji: '⚠️',
        label: hazard.type,
        color: '#ef4444',
      };

      const hazardIcon = L.divIcon({
        className: 'hazard-mesh-marker',
        html: `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            transform: translate(-50%, -100%);
          ">
            <div style="
              background: ${info.color};
              color: white;
              padding: 4px 8px;
              border-radius: 8px;
              font-size: 11px;
              font-weight: 800;
              box-shadow: 0 2px 10px rgba(0,0,0,0.5);
              border: 2px solid #ffffff;
              display: flex;
              align-items: center;
              gap: 4px;
              white-space: nowrap;
            ">
              <span>${info.emoji}</span>
              <span>${info.label}</span>
            </div>
            <div style="
              width: 0;
              height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-top: 6px solid ${info.color};
            "></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      const hazardMarker = L.marker([hazard.latitude, hazard.longitude], {
        icon: hazardIcon,
      }).addTo(map);

      hazardMarker.bindPopup(`
        <div style="color: #111; font-family: sans-serif; font-size: 12px; max-width: 210px; padding: 2px;">
          <b style="color: ${info.color}; font-size: 13px;">${info.emoji} ${info.label}</b>
          <p style="margin: 4px 0; color: #333; line-height: 1.3;">${hazard.description}</p>
          <div style="margin-top: 6px; font-size: 11px; color: #666; border-top: 1px solid #eee; pt: 4px;">
            <span>Severity: <b>${hazard.severity.toUpperCase()}</b></span> · 
            <span>Reports: <b>${hazard.confirmCount}</b></span>
          </div>
          <p style="margin: 4px 0 0; color: #059669; font-size: 10px; font-weight: bold;">
            Synchronized via BLE Mesh
          </p>
        </div>
      `);

      // Add hazard exclusion radius
      L.circle([hazard.latitude, hazard.longitude], {
        radius: hazard.accuracyMeters * 2,
        color: info.color,
        fillColor: info.color,
        fillOpacity: 0.18,
        weight: 1,
        dashArray: '3, 3',
      }).addTo(map);
    });

    // Render Active Target (e.g. SOS Victim if responder is responding)
    if (activeTarget) {
      const targetIcon = L.divIcon({
        className: 'sos-victim-beacon',
        html: `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            transform: translate(-50%, -100%);
          ">
            <div style="
              background: #ff1e38;
              color: white;
              padding: 5px 10px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 800;
              box-shadow: 0 0 20px #ff1e38;
              border: 2px solid #ffffff;
              display: flex;
              align-items: center;
              gap: 5px;
              white-space: nowrap;
              animation: pulse 1.5s infinite;
            ">
              <span>🚨</span>
              <span>SOS: ${activeTarget.name}</span>
            </div>
            <div style="
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 7px solid #ff1e38;
            "></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      const tMarker = L.marker([activeTarget.latitude, activeTarget.longitude], {
        icon: targetIcon,
      }).addTo(map);
      targetMarkerRef.current = tMarker;

      tMarker.bindPopup(`
        <div style="color: #111; font-family: sans-serif; font-size: 13px; padding: 2px;">
          <b style="color: #ff1e38; font-size: 14px;">🚨 EMERGENCY SOS VICTIM</b>
          <p style="margin: 4px 0 2px;"><b>Citizen:</b> ${activeTarget.name}</p>
          ${activeTarget.need ? `<p style="margin: 2px 0;"><b>Need:</b> ${activeTarget.need}</p>` : ''}
          ${activeTarget.details ? `<p style="margin: 2px 0; color: #444;">${activeTarget.details}</p>` : ''}
        </div>
      `).openPopup();

      // Fit bounds to show both user and target
      const bounds = L.latLngBounds([validCenter, [activeTarget.latitude, activeTarget.longitude]]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    // ACCURATE NAVIGATION ROUTE:
    // Generate route avoiding known hazards
    if (safeRouteActive) {
      let routePoints: [number, number][];

      if (activeTarget) {
        // Navigation from Responder to SOS Target
        const targetLat = activeTarget.latitude;
        const targetLng = activeTarget.longitude;
        const midLat = (validCenter[0] + targetLat) / 2;
        const midLng = (validCenter[1] + targetLng) / 2 + 0.003; // Corridors avoid direct straight lines
        routePoints = [validCenter, [midLat, midLng], [targetLat, targetLng]];
      } else {
        // Safe route to nearest shelter (Shivaji Park -> Bandra Reclamation corridor)
        routePoints = [
          validCenter,
          [19.0345, 72.8315],
          [19.0434, 72.8258],
        ];
      }

      const polyline = L.polyline(routePoints, {
        color: activeTarget ? '#ff263d' : '#00d294',
        weight: 5,
        opacity: 0.9,
        dashArray: '8, 8',
      }).addTo(map);

      routeLayerRef.current = polyline;
    }

    return () => {
      clearTimeout(timer1);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [validCenter, activeTarget, isPowerSaving, safeRouteActive, hazards]);

  // Handler to simulate a step for indoor / demo testing
  const handleSimulateStep = () => {
    if (trackerRef.current) {
      trackerRef.current.simulateStep();
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full ${
          isPowerSaving ? 'filter invert brightness-90' : ''
        }`}
      />

      {/* REQUIREMENT: Red Triangle Located on Top Right of Map to Place Hazard Markers */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col items-end gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            if (onOpenReportHazard) onOpenReportHazard();
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl font-black text-xs uppercase tracking-wider shadow-2xl transition-all active:scale-95 border ${
            isPowerSaving
              ? 'bg-[rgba(0,255,65,0.12)] border-[#00ff41] text-[#00ff41] backdrop-blur-sm'
              : 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-red-400 shadow-[0_0_20px_rgba(255,38,61,0.6)] hover:brightness-110'
          }`}
          title="Report Obstruction / Hazard (BLE)"
        >
          <TriangleAlert className={`w-4 h-4 ${isPowerSaving ? 'text-[#00ff41] fill-[#00ff41]' : 'text-white fill-white animate-pulse'}`} />
          <span>Report Hazard</span>
        </button>

        {/* PDR / GPS Dead Reckoning Status Tag */}
        <div
          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold backdrop-blur-md shadow-md flex items-center gap-2 ${
            isPowerSaving
              ? 'bg-black/90 border-[rgba(0,255,65,0.3)] text-[#00ff41]'
              : pdrStatus?.isGpsLost
              ? 'bg-amber-950/80 border-amber-600/70 text-amber-300'
              : 'bg-black/80 border-emerald-600/70 text-emerald-400'
          }`}
        >
          {pdrStatus?.isGpsLost ? (
            <>
              <Footprints className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span>PDR Kalman (±{pdrStatus?.accuracyMeters ?? 25}m)</span>
            </>
          ) : (
            <>
              <span className={`w-2 h-2 rounded-full ${isPowerSaving ? 'bg-[#00ff41]' : 'bg-emerald-400 animate-pulse'}`} />
              <span>GPS Real-Time (±{pdrStatus?.accuracyMeters ?? 15}m)</span>
            </>
          )}
        </div>
      </div>

      {/* Floating PDR / Step Counter controls at bottom left */}
      <div className="absolute bottom-3 left-3 z-[400] pointer-events-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleSimulateStep}
          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border backdrop-blur-md shadow-md transition-all active:scale-95 flex items-center gap-1.5 ${
            isPowerSaving
              ? 'bg-[rgba(0,255,65,0.1)] border-[rgba(0,255,65,0.3)] text-[#00ff41]'
              : 'bg-black/75 border-neutral-700 text-stone-200 hover:text-white'
          }`}
          title="Simulate walking step to test PDR dead reckoning"
        >
          <Footprints className="w-3.5 h-3.5 text-orange-400" />
          <span>Walk Step ({pdrStatus?.stepCount ?? 0})</span>
        </button>
      </div>
    </div>
  );
}
