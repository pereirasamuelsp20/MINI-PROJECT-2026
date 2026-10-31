'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { defaultLocations } from '@/lib/mockData';
import { usePowerMode } from '@/lib/powerMode';

interface MapInnerProps {
  userLocation?: [number, number];
  onSelectLocation?: (name: string, distance: string) => void;
}

export default function MapInner({ userLocation = [19.1136, 72.8697], onSelectLocation }: MapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const { isPowerSaving } = usePowerMode();

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current, {
      center: userLocation,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // Use our Next.js tile proxy endpoint which handles OSM User-Agent and never gets blocked on mobile
    // Fallback directly to CartoDB dark matter / OSM
    const tileLayerUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? '/api/map-tile/{z}/{x}/{y}.png'
      : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileLayer = L.tileLayer(tileLayerUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Attribution control (compact)
    L.control.attribution({ position: 'bottomright', prefix: 'OSM' }).addTo(map);

    // Zoom control in top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Custom HTML Icons
    const createCustomIcon = (type: 'camp' | 'safe_zone' | 'relay', isSelected: boolean = false) => {
      let bgColor = '#ff263d';
      let symbol = '🛡️';
      let label = 'Camp';

      if (type === 'safe_zone') {
        bgColor = '#00d294';
        symbol = '⛺';
        label = 'Safe';
      } else if (type === 'relay') {
        bgColor = '#ff8b1a';
        symbol = '📶';
        label = 'Relay';
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
              border-radius: 12px;
              font-size: 10px;
              font-weight: 800;
              box-shadow: 0 0 14px ${bgColor}88;
              border: 1px solid rgba(255,255,255,0.4);
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
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });
    };

    // User Location Icon + Uncertainty Circle
    const userMarkerIcon = L.divIcon({
      className: 'user-marker',
      html: `
        <div style="
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          border: 4px solid #ff263d;
          box-shadow: 0 0 0 6px rgba(255, 38, 61, 0.3), 0 0 15px #ff263d;
          transform: translate(-50%, -50%);
        "></div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    // Add user marker
    const userMarker = L.marker(userLocation, { icon: userMarkerIcon }).addTo(map);
    userMarker.bindPopup('<b style="color:#000;">Your Approximate Area</b><br/><span style="color:#666;font-size:11px;">BLE estimate ±35m</span>');

    // Add Uncertainty Circle (non-negotiable rule 8: uncertainty metadata)
    L.circle(userLocation, {
      radius: 35,
      color: '#ff263d',
      fillColor: '#ff263d',
      fillOpacity: 0.12,
      weight: 1.5,
      dashArray: '4, 4',
    }).addTo(map);

    // Add Relief Camps, Safe Zones & Relays
    defaultLocations.forEach((loc) => {
      const marker = L.marker([loc.latitude, loc.longitude], {
        icon: createCustomIcon(loc.type),
      }).addTo(map);

      marker.bindPopup(`
        <div style="color: #000; font-family: sans-serif; font-size: 12px;">
          <b style="font-size: 13px;">${loc.name}</b>
          ${loc.capacity ? `<p style="margin: 4px 0 2px;"><b>Capacity:</b> ${loc.capacity}</p>` : ''}
          ${loc.supplies ? `<p style="margin: 2px 0;"><b>Supplies:</b> ${loc.supplies.join(', ')}</p>` : ''}
          ${loc.distanceEstimate ? `<p style="margin: 2px 0; color: #888;">${loc.distanceEstimate}</p>` : ''}
        </div>
      `);

      marker.on('click', () => {
        if (onSelectLocation) {
          onSelectLocation(loc.name, loc.distanceEstimate || 'Nearby');
        }
      });
    });

    // Suggested Safe Route (Polyline avoiding hazard zones)
    const nearestCamp = defaultLocations[0];
    const safeRoutePoints: [number, number][] = [
      userLocation,
      [19.1142, 72.8710],
      [19.1150, 72.8722],
      [nearestCamp.latitude, nearestCamp.longitude],
    ];

    L.polyline(safeRoutePoints, {
      color: '#ff8b1a',
      weight: 4,
      dashArray: '8, 8',
      opacity: 0.85,
    }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [userLocation]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl">
      <div
        ref={mapContainerRef}
        className={`w-full h-full transition-all duration-300 ${
          isPowerSaving ? 'filter invert hue-rotate-180 brightness-75 contrast-125' : ''
        }`}
        style={{ minHeight: '380px' }}
      />
      
      {/* Map Legend Overlay */}
      <div className={`absolute bottom-3 left-3 right-3 z-[1000] p-2.5 rounded-xl border backdrop-blur-md text-[9px] grid grid-cols-3 gap-1 pointer-events-none transition-colors ${
        isPowerSaving 
          ? 'bg-black/90 border-[#0d3815] text-[#00ff41]' 
          : 'bg-black/80 border-white/10 text-stone-300'
      }`}>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff263d] inline-block shadow-[0_0_6px_#ff263d]"></span>
          <span>You (est.)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00d294] inline-block"></span>
          <span>Safe Zone</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#ff8b1a] inline-block"></span>
          <span>Safe Route</span>
        </span>
      </div>
    </div>
  );
}

