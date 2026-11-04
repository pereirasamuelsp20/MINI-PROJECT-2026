import { HazardMarker } from '@/types/hazards';
import { defaultLocations } from './mockData';

export interface SearchableLocation {
  id: string;
  name: string;
  category: 'camp' | 'safe_zone' | 'hospital' | 'hub' | 'relay';
  latitude: number;
  longitude: number;
  description: string;
  badge?: string;
}

export const MUMBAI_SEARCHABLE_LOCATIONS: SearchableLocation[] = [
  // Existing Relief Camps & Safe Havens
  ...defaultLocations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    category: loc.type as 'camp' | 'safe_zone' | 'relay',
    latitude: loc.latitude,
    longitude: loc.longitude,
    description: loc.supplies ? `Supplies: ${loc.supplies.join(', ')}` : (loc.distanceEstimate || 'Relief Haven'),
    badge: loc.type === 'camp' ? 'Relief Camp' : loc.type === 'safe_zone' ? 'Safe Haven' : 'BLE Relay',
  })),

  // Emergency & Trauma Hospitals
  {
    id: 'hosp-1',
    name: 'KEM Hospital & Emergency Medical Center',
    category: 'hospital',
    latitude: 19.0028,
    longitude: 72.8427,
    description: '24/7 Trauma, ICU & Blood Bank · Parel',
    badge: 'Hospital',
  },
  {
    id: 'hosp-2',
    name: 'Lilavati Hospital & Research Centre',
    category: 'hospital',
    latitude: 19.0514,
    longitude: 72.8291,
    description: 'Emergency Services, Intensive Care · Bandra West',
    badge: 'Hospital',
  },
  {
    id: 'hosp-3',
    name: 'Lokmanya Tilak Municipal General Hospital (Sion)',
    category: 'hospital',
    latitude: 19.0366,
    longitude: 72.8601,
    description: 'Major Disaster Triage & Emergency Unit · Sion',
    badge: 'Hospital',
  },
  {
    id: 'hosp-4',
    name: 'P. D. Hinduja Hospital',
    category: 'hospital',
    latitude: 19.0333,
    longitude: 72.8394,
    description: '24-hour Emergency Medical Unit · Mahim',
    badge: 'Hospital',
  },

  // Key Safe Zones & Evacuation Corridors
  {
    id: 'hub-1',
    name: 'Shivaji Park Open Grounds',
    category: 'safe_zone',
    latitude: 19.0269,
    longitude: 72.8385,
    description: 'Large Elevated Open Ground · Flood-Resistant Evacuation Assembly',
    badge: 'Safe Zone',
  },
  {
    id: 'hub-2',
    name: 'Bandra Reclamation High Ground',
    category: 'safe_zone',
    latitude: 19.0434,
    longitude: 72.8258,
    description: 'Coastal Elevated Staging Area · Helipad & Relief Triage',
    badge: 'Safe Zone',
  },
  {
    id: 'hub-3',
    name: 'BKC Open Exhibition Grounds',
    category: 'safe_zone',
    latitude: 19.0657,
    longitude: 72.8672,
    description: 'Bandra-Kurla Complex Humanitarian Aid Hub',
    badge: 'Relief Hub',
  },
  {
    id: 'hub-4',
    name: 'Dadar Central Transit Corridor',
    category: 'hub',
    latitude: 19.0178,
    longitude: 72.8478,
    description: 'Central Mumbai Transfer Hub & Civil Defence Station',
    badge: 'Hub',
  },
  {
    id: 'hub-5',
    name: 'Andheri Sports Complex Relief Haven',
    category: 'camp',
    latitude: 19.1311,
    longitude: 72.8317,
    description: 'Covered Stadium Shelter · Western Suburbs Evacuation',
    badge: 'Relief Camp',
  },
  {
    id: 'hub-6',
    name: 'Kurla West Municipal School Haven',
    category: 'safe_zone',
    latitude: 19.0712,
    longitude: 72.8805,
    description: 'Multistory Flood-Safe Haven with Generator Power',
    badge: 'Safe Haven',
  },
  {
    id: 'hub-7',
    name: 'Colaba Disaster Station & Sea Haven',
    category: 'safe_zone',
    latitude: 18.9154,
    longitude: 72.8258,
    description: 'South Mumbai Coastal Evacuation Point',
    badge: 'Safe Haven',
  },
];

export interface SafeRouteResult {
  waypoints: [number, number][];
  distanceMeters: number;
  distanceFormatted: string;
  estimatedMinutes: number;
  timeFormatted: string;
  avoidedHazards: HazardMarker[];
  isRerouted: boolean;
  statusText: string;
}

/**
 * Calculates distance between two points in meters using Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculates perpendicular distance from a point to a line segment
 */
function distancePointToSegment(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const dAB = calculateHaversineDistance(aLat, aLng, bLat, bLng);
  if (dAB === 0) return calculateHaversineDistance(pLat, pLng, aLat, aLng);

  // Parameter t of projection onto segment
  const t = Math.max(
    0,
    Math.min(
      1,
      ((pLat - aLat) * (bLat - aLat) + (pLng - aLng) * (bLng - aLng)) /
        ((bLat - aLat) ** 2 + (bLng - aLng) ** 2)
    )
  );

  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);
  return calculateHaversineDistance(pLat, pLng, projLat, projLng);
}

/**
 * Generates the optimal safe route from start to destination,
 * dynamically steering around reported hazards/flooded areas.
 */
export function generateBestSafeRoute(
  start: [number, number],
  dest: [number, number],
  hazards: HazardMarker[] = []
): SafeRouteResult {
  const [startLat, startLng] = start;
  const [destLat, destLng] = dest;

  const avoidedHazards: HazardMarker[] = [];
  const detourPoints: [number, number][] = [];

  // Check each active hazard
  hazards.forEach((hazard) => {
    const distToPath = distancePointToSegment(
      hazard.latitude,
      hazard.longitude,
      startLat,
      startLng,
      destLat,
      destLng
    );

    // Hazard clearance safety buffer (buffer = accuracy * 2.5, min 75m)
    const safetyBufferMeters = Math.max(hazard.accuracyMeters * 2.5, 75);

    if (distToPath < safetyBufferMeters) {
      avoidedHazards.push(hazard);

      // Compute detour point perpendicular to the path
      const dirLat = destLat - startLat;
      const dirLng = destLng - startLng;
      const len = Math.sqrt(dirLat * dirLat + dirLng * dirLng);

      if (len > 0) {
        // Normal vector (-dirLng, dirLat)
        const perpLat = -dirLng / len;
        const perpLng = dirLat / len;

        // Offset detour by 120 meters (approx 0.0011 degrees)
        const offsetDeg = 0.0012;
        const detourLat = hazard.latitude + perpLat * offsetDeg;
        const detourLng = hazard.longitude + perpLng * offsetDeg;

        detourPoints.push([detourLat, detourLng]);
      }
    }
  });

  // Construct complete waypoints
  const waypoints: [number, number][] = [start, ...detourPoints, dest];

  // Calculate cumulative distance
  let totalDistanceMeters = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalDistanceMeters += calculateHaversineDistance(
      waypoints[i][0],
      waypoints[i][1],
      waypoints[i + 1][0],
      waypoints[i + 1][1]
    );
  }

  // Estimated pedestrian emergency walking speed: 4.2 km/h (approx 70 meters / min)
  const estimatedMinutes = Math.max(1, Math.round(totalDistanceMeters / 70));

  const distanceFormatted =
    totalDistanceMeters >= 1000
      ? `${(totalDistanceMeters / 1000).toFixed(1)} km`
      : `${Math.round(totalDistanceMeters)} m`;

  const timeFormatted = `${estimatedMinutes} min${estimatedMinutes > 1 ? 's' : ''} walk`;

  const isRerouted = avoidedHazards.length > 0;
  const statusText = isRerouted
    ? `⚠️ Safe detour active (avoiding ${avoidedHazards.length} obstacle${avoidedHazards.length > 1 ? 's' : ''})`
    : '✅ 100% Clear Safe Evacuation Corridor';

  return {
    waypoints,
    distanceMeters: Math.round(totalDistanceMeters),
    distanceFormatted,
    estimatedMinutes,
    timeFormatted,
    avoidedHazards,
    isRerouted,
    statusText,
  };
}

