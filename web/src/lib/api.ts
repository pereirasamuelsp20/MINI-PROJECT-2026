import { Alert, Announcement, MeshChannel, MeshMessage, ReliefData, ResponderMessage } from '@/types';
import { initialReliefData } from './mockData';

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || '';

// In-memory + LocalStorage fallback store for offline operation
let localData: ReliefData = { ...initialReliefData };

export function getStoredReliefData(): ReliefData {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('disaster_mesh_relief_data');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
  }
  return localData;
}

export function saveStoredReliefData(data: ReliefData) {
  localData = data;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('disaster_mesh_relief_data', JSON.stringify(data));
    } catch {
      // fallback
    }
  }
}

/**
 * Check backend connection readiness
 */
export async function checkBackendHealth(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${BACKEND_BASE}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      return { ok: true, message: 'Backend connected (Port 3001)' };
    }
    return { ok: false, message: `Backend returned status ${res.status}` };
  } catch {
    return { ok: false, message: 'Operating in Offline Mesh mode' };
  }
}

/**
 * Fetch latest relief data (merges backend incidents with local mesh messages)
 */
export async function fetchReliefData(): Promise<ReliefData> {
  const current = getStoredReliefData();

  try {
    const res = await fetch(`${BACKEND_BASE}/api/v1/incidents?limit=50`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const backendIncidents = await res.json();
      if (Array.isArray(backendIncidents) && backendIncidents.length > 0) {
        // Map backend incidents to our UI Alert schema
        const mappedAlerts: Alert[] = backendIncidents.map((inc: any) => ({
          id: inc.id,
          need: (inc.message_type === 'sos' ? 'Medical' : inc.message_type) || 'Medical',
          status: inc.status || 'new',
          details: inc.description || inc.title || 'Emergency request from mesh network',
          priority: inc.priority === 'critical' ? 'urgent' : 'normal',
          citizenName: inc.title ? inc.title.split(' - ')[0] : 'Citizen',
          area: 'Mesh Node Area',
          createdAt: inc.created_at,
          updatedAt: inc.updated_at,
        }));

        current.alerts = mappedAlerts;
        saveStoredReliefData(current);
      }
    }
  } catch {
    // Backend offline: continue using local store-and-forward state
  }

  return current;
}

/**
 * Submit emergency SOS
 */
export async function createSOS(payload: {
  need: Alert['need'];
  details: string;
  latitude?: number;
  longitude?: number;
  citizenName?: string;
}): Promise<{ ok: boolean; alert?: Alert; error?: string }> {
  const current = getStoredReliefData();

  const newAlert: Alert = {
    id: `sos-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    need: payload.need,
    status: 'new',
    details: payload.details || `${payload.need} assistance urgently required`,
    priority: payload.need === 'Medical' || payload.need === 'Trapped' ? 'urgent' : 'normal',
    citizenName: payload.citizenName || 'Aarya Mehta',
    area: 'Andheri East, Mumbai · estimate',
    latitude: payload.latitude || 19.1136,
    longitude: payload.longitude || 72.8697,
    accuracyMeters: 25,
    createdAt: new Date().toISOString(),
  };

  // Local persistence first (non-negotiable offline rule)
  current.alerts = [newAlert, ...current.alerts];
  saveStoredReliefData(current);

  // Opportunistic sync to backend
  try {
    await fetch(`${BACKEND_BASE}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packets: [
          {
            packet_id: newAlert.id,
            origin_id: 'citizen-local-key',
            message_type: 'sos',
            priority: newAlert.priority === 'urgent' ? 0 : 2,
            payload_kind: 0,
            payload: newAlert.details,
            created_at: Math.floor(Date.now() / 1000),
          },
        ],
      }),
    });
  } catch {
    // Stored locally in mesh queue
  }

  return { ok: true, alert: newAlert };
}

/**
 * Verify an incident (Responder / Operator action)
 */
export async function verifyIncident(id: string, title?: string, description?: string): Promise<boolean> {
  const current = getStoredReliefData();
  const alertIndex = current.alerts.findIndex(a => a.id === id);
  if (alertIndex !== -1) {
    current.alerts[alertIndex].status = 'verified';
    saveStoredReliefData(current);
  }

  try {
    await fetch(`${BACKEND_BASE}/api/v1/incidents/${id}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });
  } catch {
    // Queued locally
  }
  return true;
}

/**
 * Resolve an incident
 */
export async function resolveIncident(id: string): Promise<boolean> {
  const current = getStoredReliefData();
  const alertIndex = current.alerts.findIndex(a => a.id === id);
  if (alertIndex !== -1) {
    current.alerts[alertIndex].status = 'resolved';
    saveStoredReliefData(current);
  }

  try {
    await fetch(`${BACKEND_BASE}/api/v1/incidents/${id}/resolve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // Queued locally
  }
  return true;
}

/**
 * Broadcast an announcement (Responder)
 */
export async function createAnnouncement(payload: {
  title: string;
  body: string;
  severity: Announcement['severity'];
  area: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!payload.title || !payload.body) {
    return { ok: false, error: 'Title and message cannot be empty.' };
  }

  const current = getStoredReliefData();
  const newAnn: Announcement = {
    id: `ann-${Date.now()}`,
    title: payload.title,
    body: payload.body,
    severity: payload.severity,
    area: payload.area || 'Andheri East, Mumbai',
    senderName: 'Relief Control · Unit 7',
    createdAt: new Date().toISOString(),
  };

  current.announcements = [newAnn, ...current.announcements];
  saveStoredReliefData(current);
  return { ok: true };
}

/**
 * Create a new BLE mesh channel
 */
export async function createMeshChannel(payload: {
  name: string;
  description: string;
  channelType: 'community' | 'group';
}): Promise<{ ok: boolean; error?: string }> {
  if (!payload.name) {
    return { ok: false, error: 'Channel name is required.' };
  }

  const current = getStoredReliefData();
  const newCh: MeshChannel = {
    id: `ch-${Date.now()}`,
    name: payload.name,
    description: payload.description,
    channelType: payload.channelType,
    createdBy: 'Aarya Mehta',
    createdAt: new Date().toISOString(),
  };

  current.channels = [newCh, ...current.channels];
  saveStoredReliefData(current);
  return { ok: true };
}

/**
 * Send a message inside a mesh channel
 */
export async function sendMeshMessage(payload: {
  channelName: string;
  body: string;
  senderRole?: 'citizen' | 'responder';
  senderName?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!payload.body.trim()) {
    return { ok: false, error: 'Message cannot be empty.' };
  }

  const current = getStoredReliefData();
  const newMsg: MeshMessage = {
    id: `msg-${Date.now()}`,
    channelName: payload.channelName,
    senderName: payload.senderName || (payload.senderRole === 'responder' ? 'Relief Control' : 'Aarya Mehta'),
    senderRole: payload.senderRole || 'citizen',
    body: payload.body.trim(),
    transmission: 'ble',
    createdAt: new Date().toISOString(),
  };

  current.meshMessages = [...current.meshMessages, newMsg];
  saveStoredReliefData(current);
  return { ok: true };
}

/**
 * Send a direct message to responders
 */
export async function sendResponderMessage(body: string, senderName: string = 'Aarya Mehta'): Promise<{ ok: boolean; error?: string }> {
  if (!body.trim()) {
    return { ok: false, error: 'Message cannot be empty.' };
  }

  const current = getStoredReliefData();
  const newRespMsg: ResponderMessage = {
    id: `resp-msg-${Date.now()}`,
    senderName,
    area: 'Andheri East, Mumbai',
    urgency: 'normal',
    body: body.trim(),
    createdAt: new Date().toISOString(),
  };

  current.responderMessages = [newRespMsg, ...current.responderMessages];
  saveStoredReliefData(current);
  return { ok: true };
}

