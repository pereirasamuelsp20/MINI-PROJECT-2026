'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { defaultLocations, MUMBAI_BOUNDS, MUMBAI_CENTER } from '@/lib/mockData';
import { usePowerMode } from '@/lib/powerMode';

interface MapInnerProps {
  userLocation?: [number, number];
  onSelectLocation?: (name: string, distance: string) => void;
  safeRouteActive?: boolean;
}

export default function MapInner({
  userLocation = MUMBAI_CENTER,
  onSelectLocation,
  safeRouteActive = true,
}: MapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const { isPowerSaving } = usePowerMode();

  // Validate if location is within Mumbai bounds, otherwise clamp to Mumbai center
  const validCenter: [number, number] =
    userLocation[0] >= 18.85 &&
    userLocation[0] <= 19.35 &&
    userLocation[1] >= 72.70 &&
    userLocation[1] <= 73.15
      ? userLocation
      : MUMBAI_CENTER;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Leaflet Map locked strictly to Mumbai
    const map = L.map(mapContainerRef.current, {
      center: validCenter,
      zoom: 13,
      minZoom: 11,
      maxZoom: 18,
      maxBounds: MUMBAI_BOUNDS,
      maxBoundsViscosity: 1.0, // Hard boundary lock to Mumbai
      zoomControl: false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // Use standard OpenStreetMap tiles — via proxy for non-localhost (avoids CORS/referrer issues),
    // direct OSM for localhost dev
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const tileUrl = isLocalhost
      ? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
      : '/api/map-tile/{z}/{x}/{y}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Fast resize invalidation to eliminate rendering lag
    const timer1 = setTimeout(() => map.invalidateSize(), 100);
    const timer2 = setTimeout(() => map.invalidateSize(), 400);

    // Compact Attribution & Zoom controls
    L.control.attribution({ position: 'bottomright', prefix: 'OSM Mumbai' }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Custom Marker Icons with readable labels
    const createCustomIcon = (type: 'camp' | 'safe_zone' | 'relay', isSelected: boolean = false) => {
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
              padding: 5px 9px;
              border-radius: 10px;
              font-size: 11px;
              font-weight: 800;
              box-shadow: 0 2px 10px rgba(0,0,0,0.4);
              border: 1px solid rgba(255,255,255,0.6);
              display: flex;
              align-items: center;
              gap: 5px;
              white-space: nowrap;
            ">
              <span>${symbol}</span>
              <span>${label}</span>
            </div>
            <div style="
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 7px solid ${bgColor};
            "></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });
    };

    // User Location Icon (Pulsing blue/red dot)
    const userMarkerIcon = L.divIcon({
      className: 'user-marker',
      html: `
        <div style="
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 4px solid #ff263d;
          box-shadow: 0 0 0 8px rgba(255, 38, 61, 0.25), 0 0 16px #ff263d;
          transform: translate(-50%, -50%);
        "></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    // Add user marker
    const userMarker = L.marker(validCenter, { icon: userMarkerIcon }).addTo(map);
    userMarker.bindPopup(`
      <div style="color: #111; font-family: sans-serif; font-size: 13px; padding: 2px;">
        <b style="font-size: 14px; color: #ff263d;">Your Location (Mumbai)</b>
        <p style="margin: 4px 0 0; color: #444; font-size: 12px;">GPS / BLE estimate (±35m accuracy)</p>
      </div>
    `);

    // Add Uncertainty Circle (non-negotiable rule 8: uncertainty metadata)
    L.circle(validCenter, {
      radius: 35,
      color: '#ff263d',
      fillColor: '#ff263d',
      fillOpacity: 0.15,
      weight: 2,
      dashArray: '5, 5',
    }).addTo(map);

    // Add Mumbai Relief Locations
    defaultLocations.forEach((loc) => {
      const marker = L.marker([loc.latitude, loc.longitude], {
        icon: createCustomIcon(loc.type),
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

    // Draw Safe Route Polyline (Mumbai Dadar/Bandra corridor)
    if (safeRouteActive) {
      const routePoints: [number, number][] = [
        validCenter,
        [19.0345, 72.8315],
        [19.0434, 72.8258], // Bandra Reclamation Safe Haven
      ];

      const polyline = L.polyline(routePoints, {
        color: '#00d294',
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 8',
      }).addTo(map);

      routeLayerRef.current = polyline;
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [validCenter, isPowerSaving, safeRouteActive]);

  return (
    <div
      ref={mapContainerRef}
      className={`w-full h-full ${
        isPowerSaving ? 'filter invert brightness-75 contrast-125' : ''
      }`}
    />
  );
}
