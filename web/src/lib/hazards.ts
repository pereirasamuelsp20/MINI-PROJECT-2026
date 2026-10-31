import { HazardMarker, HazardType } from '@/types/hazards';

const HAZARDS_STORAGE_KEY = 'disaster_mesh_hazards';

// Default Mumbai hazard obstacles (common monsoon/disaster points in Dadar/Bandra/Kurla)
export const initialHazards: HazardMarker[] = [
  {
    id: 'hz-1',
    type: 'flooded',
    latitude: 19.0178,
    longitude: 72.8478,
    accuracyMeters: 15,
    description: 'Hindmata Flyover underpass completely submerged. Water level > 4 feet.',
    reportedBy: 'MESH-RELAY-01',
    reportedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    severity: 'high',
    confirmed: true,
    confirmCount: 4,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(),
    syncedViaBLE: true,
    city: 'Mumbai',
  },
  {
    id: 'hz-2',
    type: 'obstructed',
    latitude: 19.0380,
    longitude: 72.8360,
    accuracyMeters: 20,
    description: 'Large banyan tree fallen across Cadell Road, blocking southbound ambulances.',
    reportedBy: 'MESH-NODE-88',
    reportedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    severity: 'medium',
    confirmed: true,
    confirmCount: 2,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
    syncedViaBLE: true,
    city: 'Mumbai',
  },
  {
    id: 'hz-3',
    type: 'electrical',
    latitude: 19.0520,
    longitude: 72.8310,
    accuracyMeters: 12,
    description: 'Fallen overhead high-voltage wire submerged in water near Bandra station junction.',
    reportedBy: 'MESH-7721',
    reportedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    severity: 'high',
    confirmed: false,
    confirmCount: 1,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
    syncedViaBLE: true,
    city: 'Mumbai',
  },
];

let cachedHazards: HazardMarker[] = [...initialHazards];

export function getStoredHazards(): HazardMarker[] {
  if (typeof window === 'undefined') return cachedHazards;

  try {
    const raw = localStorage.getItem(HAZARDS_STORAGE_KEY);
    if (raw) {
      const parsed: HazardMarker[] = JSON.parse(raw);
      const now = Date.now();
      // Filter expired hazards (older than 6 hrs or past expiresAt)
      const valid = parsed.filter(
        (h) => !h.expiresAt || new Date(h.expiresAt).getTime() > now
      );
      cachedHazards = valid;
      return valid;
    }
  } catch {
    // fallback
  }

  // Seed default if empty
  saveHazardsToStorage(initialHazards);
  return initialHazards;
}

function saveHazardsToStorage(hazards: HazardMarker[]): void {
  cachedHazards = hazards;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(HAZARDS_STORAGE_KEY, JSON.stringify(hazards));
    } catch {
      // ignore
    }
  }
}

export function saveHazard(marker: HazardMarker): void {
  const current = getStoredHazards();
  const existingIdx = current.findIndex((h) => h.id === marker.id);
  let updated: HazardMarker[];

  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = marker;
  } else {
    updated = [marker, ...current];
  }

  saveHazardsToStorage(updated);
}

export function createHazardReport(params: {
  type: HazardType;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  description?: string;
  severity?: 'low' | 'medium' | 'high';
  reportedBy?: string;
}): HazardMarker {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();

  const newMarker: HazardMarker = {
    id: `hz-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: params.type,
    latitude: params.latitude,
    longitude: params.longitude,
    accuracyMeters: params.accuracyMeters ?? 20,
    description: params.description?.trim() || `Reported ${params.type} obstruction in sector.`,
    reportedBy: params.reportedBy || 'MESH-NODE-LOCAL', // Rule 9: No PII broadcast
    reportedAt: now.toISOString(),
    severity: params.severity || 'medium',
    confirmed: false,
    confirmCount: 1,
    expiresAt,
    syncedViaBLE: true,
    city: 'Mumbai',
  };

  saveHazard(newMarker);
  return newMarker;
}

export function confirmHazard(id: string): void {
  const current = getStoredHazards();
  const target = current.find((h) => h.id === id);
  if (target) {
    target.confirmCount += 1;
    if (target.confirmCount >= 2) {
      target.confirmed = true;
    }
    saveHazardsToStorage([...current]);
  }
}

// Haversine distance in meters
export function calculateDistanceMeters(
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

export function getHazardsNearby(
  lat: number,
  lng: number,
  radiusMeters: number = 2500
): HazardMarker[] {
  const all = getStoredHazards();
  return all.filter((h) => {
    const dist = calculateDistanceMeters(lat, lng, h.latitude, h.longitude);
    return dist <= radiusMeters;
  });
}

// Compact serialization for BLE store-and-forward mesh (Rule 5 & Rule 9)
export function serializeForBLE(markers: HazardMarker[]): string {
  const compact = markers.map((m) => ({
    id: m.id,
    t: m.type,
    lat: Number(m.latitude.toFixed(5)),
    lng: Number(m.longitude.toFixed(5)),
    acc: Math.round(m.accuracyMeters),
    desc: m.description.slice(0, 80),
    by: m.reportedBy,
    sev: m.severity,
    cf: m.confirmed ? 1 : 0,
    cc: m.confirmCount,
  }));
  return JSON.stringify(compact);
}

export function mergeRemoteHazards(incoming: HazardMarker[]): void {
  const current = getStoredHazards();
  const currentMap = new Map<string, HazardMarker>();
  current.forEach((h) => currentMap.set(h.id, h));

  incoming.forEach((remote) => {
    if (!currentMap.has(remote.id)) {
      currentMap.set(remote.id, { ...remote, syncedViaBLE: true });
    } else {
      const existing = currentMap.get(remote.id)!;
      if (remote.confirmCount > existing.confirmCount) {
        existing.confirmCount = remote.confirmCount;
        existing.confirmed = remote.confirmed || existing.confirmed;
      }
    }
  });

  saveHazardsToStorage(Array.from(currentMap.values()));
}
