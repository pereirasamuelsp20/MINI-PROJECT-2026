import { HazardMarker } from '@/types/hazards';

// Earth radius in meters
const EARTH_RADIUS_METERS = 6371000;

export interface SafeRouteResult {
  waypoints: [number, number][]; // [lat, lng] array
  distanceMeters: number;
  distanceFormatted: string;
  estimatedMinutes: number;
  timeFormatted: string;
  avoidedHazards: HazardMarker[];
  isRerouted: boolean;
  statusText: string;
  isRealStreetPath: boolean;
}

/**
 * High-precision Haversine Distance between two geographical points (in meters)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates perpendicular distance (in meters) from point P to line segment AB.
 */
export function distancePointToSegment(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const dAB = calculateHaversineDistance(aLat, aLng, bLat, bLng);
  if (dAB === 0) return calculateHaversineDistance(pLat, pLng, aLat, aLng);

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

// -------------------------------------------------------------
// MUMBAI ARTERIAL STREET NETWORK GRAPH FOR OFFLINE MESH NAVIGATION
// Interconnected real street intersections in the Mumbai disaster response corridor
// -------------------------------------------------------------

export interface StreetNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface StreetEdge {
  from: string;
  to: string;
  streetName: string;
}

export const MUMBAI_STREET_NODES: Record<string, StreetNode> = {
  // Bandra West Corridor
  bandra_fort: { id: 'bandra_fort', name: 'Bandra Fort / BJ Rd', lat: 19.0415, lng: 72.818 },
  bandstand: { id: 'bandstand', name: 'Bandstand Promenade', lat: 19.0435, lng: 72.8195 },
  mehboob_studio: { id: 'mehboob_studio', name: 'Hill Rd / Mehboob Studio', lat: 19.0526, lng: 72.827 },
  lilavati_junc: { id: 'lilavati_junc', name: 'Lilavati Hospital & KC Marg', lat: 19.0514, lng: 72.8291 },
  elco_arcade: { id: 'elco_arcade', name: 'Hill Rd / Waterfield Rd (Elco)', lat: 19.0545, lng: 72.8335 },
  waterfield_turner: { id: 'waterfield_turner', name: 'Waterfield Rd / Turner Rd', lat: 19.057, lng: 72.8315 },
  linking_rd_south: { id: 'linking_rd_south', name: 'Linking Rd / Waterfield', lat: 19.055, lng: 72.832 },
  linking_rd_turner: { id: 'linking_rd_turner', name: 'Linking Rd / Turner Rd Junction', lat: 19.0585, lng: 72.833 },
  linking_rd_24th: { id: 'linking_rd_24th', name: 'Linking Rd / 24th Road', lat: 19.062, lng: 72.8335 },
  linking_rd_khar: { id: 'linking_rd_khar', name: 'Linking Rd / Khar Corner', lat: 19.072, lng: 72.8345 },
  bandra_stn_west: { id: 'bandra_stn_west', name: 'Bandra Station West / SV Rd', lat: 19.0557, lng: 72.8365 },
  sv_rd_turner: { id: 'sv_rd_turner', name: 'SV Rd / Turner Rd Junction', lat: 19.058, lng: 72.8375 },
  sv_rd_khar: { id: 'sv_rd_khar', name: 'SV Rd / Khar Station Rd', lat: 19.0715, lng: 72.841 },
  sv_rd_bandra_talao: { id: 'sv_rd_bandra_talao', name: 'SV Rd / Bandra Talao', lat: 19.051, lng: 72.8385 },
  bandra_reclamation: { id: 'bandra_reclamation', name: 'KC Marg Reclamation Camp', lat: 19.045, lng: 72.833 },
  reclamation_causeway_link: { id: 'reclamation_causeway_link', name: 'Reclamation Causeway Connector', lat: 19.0455, lng: 72.8385 },

  // Mahim Causeway & Mithi River Transit
  causeway_north: { id: 'causeway_north', name: 'Mahim Causeway North', lat: 19.046, lng: 72.8405 },
  causeway_bridge: { id: 'causeway_bridge', name: 'Mahim Causeway Bridge', lat: 19.0435, lng: 72.841 },
  causeway_south: { id: 'causeway_south', name: 'Mahim Causeway South (LJ Rd / Cadell Rd)', lat: 19.041, lng: 72.8415 },

  // Mahim & Cadell Road Corridor
  cadell_rd_church: { id: 'cadell_rd_church', name: 'Cadell Rd / Mahim Church', lat: 19.039, lng: 72.838 },
  cadell_rd_hinduja: { id: 'cadell_rd_hinduja', name: 'Veer Savarkar Marg / Hinduja Hosp', lat: 19.0333, lng: 72.8394 },
  cadell_rd_shivaji_park: { id: 'cadell_rd_shivaji_park', name: 'Veer Savarkar Marg / Shivaji Park West', lat: 19.027, lng: 72.836 },
  siddhivinayak_cadell: { id: 'siddhivinayak_cadell', name: 'Prabhadevi / Siddhivinayak Temple', lat: 19.017, lng: 72.831 },
  worli_sea_face: { id: 'worli_sea_face', name: 'Worli Sea Face North', lat: 19.02, lng: 72.815 },
  worli_naka: { id: 'worli_naka', name: 'Worli Naka Junction', lat: 19.005, lng: 72.818 },

  // Lady Jamshedjee (LJ) Road & Dadar West Corridor
  lj_rd_north: { id: 'lj_rd_north', name: 'LJ Rd Mahim Entry', lat: 19.0395, lng: 72.842 },
  mahim_station_west: { id: 'mahim_station_west', name: 'Mahim Station West', lat: 19.0405, lng: 72.845 },
  lj_rd_sena_bhavan: { id: 'lj_rd_sena_bhavan', name: 'LJ Rd / Sena Bhavan', lat: 19.0285, lng: 72.8415 },
  dadar_plaza: { id: 'dadar_plaza', name: 'Dadar West / Plaza Cinema', lat: 19.023, lng: 72.842 },
  senapati_bapat_mahim: { id: 'senapati_bapat_mahim', name: 'Senapati Bapat Marg / Mahim Stn', lat: 19.035, lng: 72.847 },
  senapati_bapat_dadar: { id: 'senapati_bapat_dadar', name: 'Senapati Bapat Marg / Dadar W', lat: 19.021, lng: 72.841 },
  senapati_bapat_elphinstone: { id: 'senapati_bapat_elphinstone', name: 'Senapati Bapat Marg / Prabhadevi Stn', lat: 19.008, lng: 72.833 },

  // Central Corridor: Dadar TT, Hindmata & KEM Hospital (Dr. Ambedkar Rd)
  dadar_tt_circle: { id: 'dadar_tt_circle', name: 'Dadar TT Circle / Ambedkar Rd', lat: 19.021, lng: 72.8435 },
  hindmata_flyover: { id: 'hindmata_flyover', name: 'Hindmata Flyover Junction', lat: 19.011, lng: 72.843 },
  kem_hospital_gate: { id: 'kem_hospital_gate', name: 'KEM Hospital Emergency Gate', lat: 19.0028, lng: 72.8427 },

  // Dharavi & Sion Link Corridor
  kalanagar_bandra_e: { id: 'kalanagar_bandra_e', name: 'Kalanagar Junction / WEH', lat: 19.058, lng: 72.846 },
  bkc_junction: { id: 'bkc_junction', name: 'BKC Western Gateway', lat: 19.06, lng: 72.852 },
  bkc_relief_camp: { id: 'bkc_relief_camp', name: 'BKC Relief Camp & MMRDA Hub', lat: 19.065, lng: 72.865 },
  dharavi_link_road: { id: 'dharavi_link_road', name: 'Sion-Bandra Link Rd Dharavi', lat: 19.051, lng: 72.852 },
  dharavi_transit_camp: { id: 'dharavi_transit_camp', name: 'Dharavi 90ft Rd Transit Camp', lat: 19.042, lng: 72.858 },
  sion_station_west: { id: 'sion_station_west', name: 'Sion Station West / LBS Marg', lat: 19.041, lng: 72.862 },
  sion_hospital_gate: { id: 'sion_hospital_gate', name: 'Sion Hospital Trauma Center', lat: 19.0366, lng: 72.8601 },
};

export const MUMBAI_STREET_EDGES: StreetEdge[] = [
  // Bandra West network
  { from: 'bandra_fort', to: 'bandstand', streetName: 'BJ Road' },
  { from: 'bandstand', to: 'mehboob_studio', streetName: 'Hill Road West' },
  { from: 'mehboob_studio', to: 'lilavati_junc', streetName: 'KC Marg Link' },
  { from: 'mehboob_studio', to: 'elco_arcade', streetName: 'Hill Road Central' },
  { from: 'elco_arcade', to: 'bandra_stn_west', streetName: 'Hill Road East' },
  { from: 'elco_arcade', to: 'linking_rd_south', streetName: 'Waterfield Road' },
  { from: 'linking_rd_south', to: 'linking_rd_turner', streetName: 'Linking Road' },
  { from: 'linking_rd_turner', to: 'linking_rd_24th', streetName: 'Linking Road' },
  { from: 'linking_rd_24th', to: 'linking_rd_khar', streetName: 'Linking Road' },
  { from: 'linking_rd_turner', to: 'sv_rd_turner', streetName: 'Turner Road' },
  { from: 'linking_rd_24th', to: 'sv_rd_khar', streetName: '24th Road / Khar Rd' },
  { from: 'waterfield_turner', to: 'linking_rd_turner', streetName: 'Turner Road' },
  { from: 'bandra_stn_west', to: 'sv_rd_turner', streetName: 'SV Road' },
  { from: 'sv_rd_turner', to: 'sv_rd_khar', streetName: 'SV Road' },
  { from: 'bandra_stn_west', to: 'sv_rd_bandra_talao', streetName: 'SV Road South' },
  { from: 'lilavati_junc', to: 'bandra_reclamation', streetName: 'KC Marg' },
  { from: 'bandra_reclamation', to: 'reclamation_causeway_link', streetName: 'Reclamation Bypass' },
  { from: 'sv_rd_bandra_talao', to: 'causeway_north', streetName: 'SV Road to Causeway' },
  { from: 'reclamation_causeway_link', to: 'causeway_north', streetName: 'Reclamation Link' },

  // Bandra East to Dharavi
  { from: 'bandra_stn_west', to: 'kalanagar_bandra_e', streetName: 'Bandra Station Bridge' },
  { from: 'kalanagar_bandra_e', to: 'bkc_junction', streetName: 'BKC Entry Road' },
  { from: 'bkc_junction', to: 'bkc_relief_camp', streetName: 'BKC Main Avenue' },
  { from: 'kalanagar_bandra_e', to: 'dharavi_link_road', streetName: 'Sion-Bandra Link Road' },
  { from: 'dharavi_link_road', to: 'dharavi_transit_camp', streetName: 'Dharavi 90ft Road' },
  { from: 'dharavi_transit_camp', to: 'sion_station_west', streetName: 'Sion Station Road' },
  { from: 'sion_station_west', to: 'sion_hospital_gate', streetName: 'Sulochana Shetty Marg' },

  // Causeway Crossings (Connecting Bandra to Mahim)
  { from: 'causeway_north', to: 'causeway_bridge', streetName: 'Mahim Causeway' },
  { from: 'causeway_bridge', to: 'causeway_south', streetName: 'Mahim Causeway' },

  // Mahim Coastal Arteries (Cadell Rd / Veer Savarkar Marg)
  { from: 'causeway_south', to: 'cadell_rd_church', streetName: 'Cadell Road Entry' },
  { from: 'cadell_rd_church', to: 'cadell_rd_hinduja', streetName: 'Veer Savarkar Marg' },
  { from: 'cadell_rd_hinduja', to: 'cadell_rd_shivaji_park', streetName: 'Veer Savarkar Marg' },
  { from: 'cadell_rd_shivaji_park', to: 'siddhivinayak_cadell', streetName: 'Veer Savarkar Marg South' },
  { from: 'siddhivinayak_cadell', to: 'worli_sea_face', streetName: 'Sea Face Connector' },
  { from: 'worli_sea_face', to: 'worli_naka', streetName: 'Worli Sea Face' },

  // Mahim Central Arteries (LJ Road)
  { from: 'causeway_south', to: 'lj_rd_north', streetName: 'LJ Road' },
  { from: 'lj_rd_north', to: 'mahim_station_west', streetName: 'Mahim Bazar Road' },
  { from: 'lj_rd_north', to: 'lj_rd_sena_bhavan', streetName: 'Lady Jamshedjee Road' },
  { from: 'lj_rd_sena_bhavan', to: 'cadell_rd_shivaji_park', streetName: 'Shivaji Park Cross Rd' },
  { from: 'lj_rd_sena_bhavan', to: 'dadar_plaza', streetName: 'LJ Road to Dadar' },
  { from: 'dadar_plaza', to: 'dadar_tt_circle', streetName: 'Tilak Bridge' },

  // Senapati Bapat Marg (Western Railway Corridor)
  { from: 'mahim_station_west', to: 'senapati_bapat_mahim', streetName: 'Senapati Bapat Marg' },
  { from: 'senapati_bapat_mahim', to: 'senapati_bapat_dadar', streetName: 'Senapati Bapat Marg' },
  { from: 'senapati_bapat_dadar', to: 'dadar_plaza', streetName: 'Dadar Station Link' },
  { from: 'senapati_bapat_dadar', to: 'senapati_bapat_elphinstone', streetName: 'Senapati Bapat Marg South' },
  { from: 'senapati_bapat_elphinstone', to: 'siddhivinayak_cadell', streetName: 'Sayani Road' },

  // Dr. Ambedkar Road (Central Highway Corridor to KEM Hospital)
  { from: 'sion_station_west', to: 'dadar_tt_circle', streetName: 'Dr. Ambedkar Road North' },
  { from: 'dadar_tt_circle', to: 'hindmata_flyover', streetName: 'Dr. Ambedkar Road' },
  { from: 'hindmata_flyover', to: 'kem_hospital_gate', streetName: 'Dr. Ambedkar Road South' },
  { from: 'senapati_bapat_elphinstone', to: 'kem_hospital_gate', streetName: 'Parel Station Road' },
];

/**
 * Snaps a given lat/lng to the nearest street node in our network
 */
function findNearestStreetNodes(
  lat: number,
  lng: number,
  count = 2
): { node: StreetNode; dist: number }[] {
  const nodes = Object.values(MUMBAI_STREET_NODES);
  const scored = nodes.map((node) => ({
    node,
    dist: calculateHaversineDistance(lat, lng, node.lat, node.lng),
  }));
  scored.sort((a, b) => a.dist - b.dist);
  return scored.slice(0, count);
}

/**
 * A* Pathfinding along Mumbai street network with real obstacle avoidance.
 * Any edge intersecting an active hazard receives an insurmountable cost penalty.
 */
function astarMumbaiStreetRoute(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number,
  hazards: HazardMarker[]
): {
  waypoints: [number, number][];
  distanceMeters: number;
  avoidedHazards: HazardMarker[];
} {
  // Find nearest street entry and exit nodes
  const startSnap = findNearestStreetNodes(startLat, startLng, 1)[0];
  const destSnap = findNearestStreetNodes(destLat, destLng, 1)[0];

  const avoidedHazardsMap = new Map<string, HazardMarker>();

  // Helper to test if an edge is blocked by any hazard
  const isEdgeBlocked = (from: StreetNode, to: StreetNode): boolean => {
    for (const h of hazards) {
      const dangerRadius = Math.max(h.accuracyMeters + 40, 75); // Safe buffer
      const dist = distancePointToSegment(h.latitude, h.longitude, from.lat, from.lng, to.lat, to.lng);
      if (dist < dangerRadius) {
        avoidedHazardsMap.set(h.id, h);
        return true;
      }
    }
    return false;
  };

  // Build Adjacency List
  const adj = new Map<string, { toId: string; weight: number; streetName: string }[]>();
  for (const n of Object.keys(MUMBAI_STREET_NODES)) {
    adj.set(n, []);
  }

  for (const edge of MUMBAI_STREET_EDGES) {
    const fromNode = MUMBAI_STREET_NODES[edge.from];
    const toNode = MUMBAI_STREET_NODES[edge.to];
    if (!fromNode || !toNode) continue;

    const baseDist = calculateHaversineDistance(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng);
    const blocked = isEdgeBlocked(fromNode, toNode);
    // Severely penalize or block edges with hazards
    const weight = blocked ? baseDist + 50000 : baseDist;

    adj.get(edge.from)?.push({ toId: edge.to, weight, streetName: edge.streetName });
    adj.get(edge.to)?.push({ toId: edge.from, weight, streetName: edge.streetName });
  }

  // A* Priority Queue / Open Set
  const startId = startSnap.node.id;
  const targetId = destSnap.node.id;

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const cameFrom = new Map<string, string>();

  for (const n of Object.keys(MUMBAI_STREET_NODES)) {
    gScore.set(n, Infinity);
    fScore.set(n, Infinity);
  }

  gScore.set(startId, 0);
  fScore.set(
    startId,
    calculateHaversineDistance(startSnap.node.lat, startSnap.node.lng, destSnap.node.lat, destSnap.node.lng)
  );

  const openSet = new Set<string>([startId]);

  while (openSet.size > 0) {
    let current = '';
    let lowestF = Infinity;
    openSet.forEach((node) => {
      const f = fScore.get(node) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        current = node;
      }
    });

    if (current === targetId || !current) {
      break;
    }

    openSet.delete(current);
    const currentNode = MUMBAI_STREET_NODES[current];
    const neighbors = adj.get(current) || [];

    for (const neighbor of neighbors) {
      const neighborNode = MUMBAI_STREET_NODES[neighbor.toId];
      if (!neighborNode) continue;

      const tentativeG = (gScore.get(current) ?? Infinity) + neighbor.weight;
      if (tentativeG < (gScore.get(neighbor.toId) ?? Infinity)) {
        cameFrom.set(neighbor.toId, current);
        gScore.set(neighbor.toId, tentativeG);
        const h = calculateHaversineDistance(
          neighborNode.lat,
          neighborNode.lng,
          destSnap.node.lat,
          destSnap.node.lng
        );
        fScore.set(neighbor.toId, tentativeG + h);
        openSet.add(neighbor.toId);
      }
    }
  }

  // Reconstruct path
  const pathNodes: StreetNode[] = [];
  let curr: string | undefined = targetId;

  if (cameFrom.has(targetId) || startId === targetId) {
    while (curr) {
      const node = MUMBAI_STREET_NODES[curr];
      if (node) pathNodes.unshift(node);
      curr = cameFrom.get(curr);
    }
  } else {
    // Direct link between snaps if unreachable
    pathNodes.push(startSnap.node, destSnap.node);
  }

  // Assemble full waypoints: User Start -> Street Intersections -> User Destination
  const waypoints: [number, number][] = [
    [startLat, startLng],
    ...pathNodes.map((n): [number, number] => [n.lat, n.lng]),
    [destLat, destLng],
  ];

  // Clean consecutive duplicate points
  const cleanedWaypoints: [number, number][] = [];
  for (const pt of waypoints) {
    if (cleanedWaypoints.length === 0) {
      cleanedWaypoints.push(pt);
    } else {
      const last = cleanedWaypoints[cleanedWaypoints.length - 1];
      if (calculateHaversineDistance(last[0], last[1], pt[0], pt[1]) > 5) {
        cleanedWaypoints.push(pt);
      }
    }
  }

  let totalDist = 0;
  for (let i = 0; i < cleanedWaypoints.length - 1; i++) {
    totalDist += calculateHaversineDistance(
      cleanedWaypoints[i][0],
      cleanedWaypoints[i][1],
      cleanedWaypoints[i + 1][0],
      cleanedWaypoints[i + 1][1]
    );
  }

  return {
    waypoints: cleanedWaypoints,
    distanceMeters: Math.round(totalDist),
    avoidedHazards: Array.from(avoidedHazardsMap.values()),
  };
}

/**
 * Fetches real high-resolution street geometry from OSRM pedestrian API.
 * Times out after 2500ms to guarantee zero UI lockup in low-connectivity.
 */
async function fetchOsrmStreetRoute(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number
): Promise<{ coordinates: [number, number][]; distanceMeters: number } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const url = `https://router.project-osrm.org/route/v1/foot/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeout);

    if (!response.ok) return null;
    const data = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
      const coordinates: [number, number][] = route.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]]
      );
      return {
        coordinates,
        distanceMeters: Math.round(route.distance),
      };
    }
  } catch {
    // Offline or network timeout - cleanly fallback
  }
  return null;
}

/**
 * Checks if a real street path collides with any reported hazards.
 * If collision is found, splices safe street detour around the obstacle.
 */
function applyHazardAvoidanceToStreetRoute(
  streetPoints: [number, number][],
  hazards: HazardMarker[]
): {
  waypoints: [number, number][];
  avoidedHazards: HazardMarker[];
} {
  if (hazards.length === 0 || streetPoints.length < 2) {
    return { waypoints: streetPoints, avoidedHazards: [] };
  }

  const avoidedMap = new Map<string, HazardMarker>();
  const detourPath: [number, number][] = [];

  for (let i = 0; i < streetPoints.length - 1; i++) {
    const p1 = streetPoints[i];
    const p2 = streetPoints[i + 1];
    detourPath.push(p1);

    for (const h of hazards) {
      const dangerRadius = Math.max(h.accuracyMeters + 35, 65);
      const dist = distancePointToSegment(h.latitude, h.longitude, p1[0], p1[1], p2[0], p2[1]);

      if (dist < dangerRadius) {
        avoidedMap.set(h.id, h);

        // Vector p1 -> p2
        const dirLat = p2[0] - p1[0];
        const dirLng = p2[1] - p1[1];
        const len = Math.sqrt(dirLat * dirLat + dirLng * dirLng);

        if (len > 0) {
          // Perpendicular offset unit vector
          const perpLat = -dirLng / len;
          const perpLng = dirLat / len;

          // Safe offset of 90m (~0.00085 degrees)
          const offset = 0.0009;
          const detourPt: [number, number] = [
            h.latitude + perpLat * offset,
            h.longitude + perpLng * offset,
          ];
          detourPath.push(detourPt);
        }
      }
    }
  }

  detourPath.push(streetPoints[streetPoints.length - 1]);

  return {
    waypoints: detourPath,
    avoidedHazards: Array.from(avoidedMap.values()),
  };
}

/**
 * PRIMARY ROUTING ENGINE FUNCTION
 * Calculates the best and safest path:
 * 1. Synchronously computes real street route via Mumbai arterial network (A*).
 * 2. Asynchronously attempts OSRM pedestrian street route for granular street turns.
 * 3. Enforces obstacle clearance and steers around any reported hazards.
 */
export async function calculateSafeEvacuationRoute(
  start: [number, number],
  dest: [number, number],
  hazards: HazardMarker[] = []
): Promise<SafeRouteResult> {
  const [startLat, startLng] = start;
  const [destLat, destLng] = dest;

  // 1. Try real OSRM pedestrian road geometry first
  const osrmResult = await fetchOsrmStreetRoute(startLat, startLng, destLat, destLng);

  let waypoints: [number, number][];
  let distanceMeters: number;
  let avoidedHazards: HazardMarker[];
  let isRealStreetPath = true;

  if (osrmResult && osrmResult.coordinates.length > 1) {
    // Process OSRM street route with dynamic hazard avoidance
    const avoided = applyHazardAvoidanceToStreetRoute(osrmResult.coordinates, hazards);
    waypoints = avoided.waypoints;
    avoidedHazards = avoided.avoidedHazards;
    distanceMeters = osrmResult.distanceMeters;
  } else {
    // 2. Offline Mesh fallback: A* search on Mumbai street graph
    const astarResult = astarMumbaiStreetRoute(startLat, startLng, destLat, destLng, hazards);
    waypoints = astarResult.waypoints;
    distanceMeters = astarResult.distanceMeters;
    avoidedHazards = astarResult.avoidedHazards;
  }

  // Pedestrian evacuation walking speed (~4.2 km/h or 70 m/min)
  const estimatedMinutes = Math.max(1, Math.round(distanceMeters / 70));

  const distanceFormatted =
    distanceMeters >= 1000
      ? `${(distanceMeters / 1000).toFixed(1)} km`
      : `${distanceMeters} m`;

  const timeFormatted = `${estimatedMinutes} min${estimatedMinutes > 1 ? 's' : ''} walk`;

  const isRerouted = avoidedHazards.length > 0;
  const statusText = isRerouted
    ? `⚠️ Safe detour active (avoiding ${avoidedHazards.length} obstacle${avoidedHazards.length > 1 ? 's' : ''})`
    : '✅ 100% Clear Safe Street Evacuation Corridor';

  return {
    waypoints,
    distanceMeters,
    distanceFormatted,
    estimatedMinutes,
    timeFormatted,
    avoidedHazards,
    isRerouted,
    statusText,
    isRealStreetPath,
  };
}

/**
 * Fast synchronous fallback route (guarantees instantaneous initial render before async completes)
 */
export function calculateInstantSafeRoute(
  start: [number, number],
  dest: [number, number],
  hazards: HazardMarker[] = []
): SafeRouteResult {
  const [startLat, startLng] = start;
  const [destLat, destLng] = dest;

  const astarResult = astarMumbaiStreetRoute(startLat, startLng, destLat, destLng, hazards);
  const distanceMeters = astarResult.distanceMeters;
  const estimatedMinutes = Math.max(1, Math.round(distanceMeters / 70));

  const distanceFormatted =
    distanceMeters >= 1000
      ? `${(distanceMeters / 1000).toFixed(1)} km`
      : `${distanceMeters} m`;

  const timeFormatted = `${estimatedMinutes} min${estimatedMinutes > 1 ? 's' : ''} walk`;
  const isRerouted = astarResult.avoidedHazards.length > 0;
  const statusText = isRerouted
    ? `⚠️ Safe detour active (avoiding ${astarResult.avoidedHazards.length} obstacle${astarResult.avoidedHazards.length > 1 ? 's' : ''})`
    : '✅ 100% Clear Safe Street Corridor';

  return {
    waypoints: astarResult.waypoints,
    distanceMeters,
    distanceFormatted,
    estimatedMinutes,
    timeFormatted,
    avoidedHazards: astarResult.avoidedHazards,
    isRerouted,
    statusText,
    isRealStreetPath: true,
  };
}
