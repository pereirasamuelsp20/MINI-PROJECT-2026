'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserRole, ReliefData, AlertNeed, AnnouncementSeverity, Alert } from '@/types';
import { initialReliefData } from '@/lib/mockData';
import {
  fetchReliefData,
  createSOS,
  verifyIncident,
  resolveIncident,
  createAnnouncement,
  createMeshChannel,
  sendMeshMessage,
  sendResponderMessage,
} from '@/lib/api';
import { usePowerMode } from '@/lib/powerMode';

// Components
import WelcomeScreen from '@/components/WelcomeScreen';
import AppHeader from '@/components/AppHeader';
import NavigationBar from '@/components/NavigationBar';
import CitizenHome from '@/components/CitizenHome';
import MapView from '@/components/MapView';
import { MapTarget } from '@/components/MapInner';
import BLEChatsView from '@/components/BLEChatsView';
import ResponderDashboard from '@/components/ResponderDashboard';
import LiveSOSFeed from '@/components/LiveSOSFeed';
import ResponderInboxView from '@/components/ResponderInboxView';
import ProfileView from '@/components/ProfileView';

// Modals
import SOSModal from '@/components/SOSModal';
import BroadcastModal from '@/components/BroadcastModal';
import CreateChannelModal from '@/components/CreateChannelModal';
import MessageResponderModal from '@/components/MessageResponderModal';

import { Radio, X } from 'lucide-react';

export default function ReliefMeshApp() {
  const { isPowerSaving, ecoConfig } = usePowerMode();

  // App State
  const [role, setRole] = useState<UserRole | null>(null);
  const [citizenTab, setCitizenTab] = useState<string>('home');
  const [responderTab, setResponderTab] = useState<string>('dashboard');
  const [reliefData, setReliefData] = useState<ReliefData>(initialReliefData);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [toast, setToast] = useState<string>('');

  // Active navigation target for Responder POV
  const [activeNavTarget, setActiveNavTarget] = useState<MapTarget | null>(null);

  // Modals
  const [showSOS, setShowSOS] = useState<boolean>(false);
  const [showBroadcast, setShowBroadcast] = useState<boolean>(false);
  const [showNewChannel, setShowNewChannel] = useState<boolean>(false);
  const [showMessageResponder, setShowMessageResponder] = useState<boolean>(false);

  const showNotification = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3500);
  };

  const refreshData = useCallback(async () => {
    setSyncing(true);
    try {
      const data = await fetchReliefData();
      setReliefData(data);
    } catch {
      showNotification('Operating in local mesh store-and-forward mode');
    } finally {
      setSyncing(false);
    }
  }, []);

  // Sync on startup and poll according to power mode (60s in ECO vs 15s in Normal)
  useEffect(() => {
    refreshData();
    const interval = ecoConfig?.pollIntervalMs || 15000;
    const timer = window.setInterval(refreshData, interval);
    return () => window.clearInterval(timer);
  }, [refreshData, ecoConfig?.pollIntervalMs]);

  // Handlers
  const handleLogout = () => {
    setRole(null);
    setCitizenTab('home');
    setResponderTab('dashboard');
    setActiveNavTarget(null);
    showNotification('Session ended. Stored data preserved locally.');
  };

  const handleNavigateToAlert = (alert: Alert) => {
    setActiveNavTarget({
      id: alert.id,
      name: alert.citizenName,
      latitude: alert.latitude ?? 19.0544,
      longitude: alert.longitude ?? 72.8402,
      need: alert.need,
      details: alert.details,
      priority: alert.priority,
    });
    setResponderTab('map');
    showNotification(`Tactical navigation plotted to ${alert.citizenName} (${alert.need})`);
  };

  const handleSendSOS = async (payload: { need: AlertNeed; details: string }) => {
    const res = await createSOS(payload);
    if (res.ok) {
      setShowSOS(false);
      await refreshData();
      showNotification('SOS alert queued & transmitted to nearby relays.');
    } else {
      showNotification(res.error || 'Failed to submit SOS');
    }
  };

  const handleBroadcast = async (payload: {
    title: string;
    body: string;
    severity: AnnouncementSeverity;
    area: string;
  }) => {
    const res = await createAnnouncement(payload);
    if (res.ok) {
      setShowBroadcast(false);
      await refreshData();
      showNotification('Announcement broadcast synchronized across mesh.');
    } else {
      showNotification(res.error || 'Failed to broadcast announcement');
    }
  };

  const handleCreateChannel = async (payload: {
    name: string;
    description: string;
    channelType: 'community' | 'group';
  }) => {
    const res = await createMeshChannel(payload);
    if (res.ok) {
      setShowNewChannel(false);
      await refreshData();
      showNotification(`Created channel ${payload.name}`);
    } else {
      showNotification(res.error || 'Failed to create channel');
    }
  };

  const handleSendMessage = async (channelName: string, body: string) => {
    const res = await sendMeshMessage({
      channelName,
      body,
      senderRole: role || 'citizen',
    });
    if (res.ok) {
      await refreshData();
    } else {
      showNotification(res.error || 'Failed to send message');
    }
  };

  const handleMessageResponder = async (body: string) => {
    const res = await sendResponderMessage(body);
    if (res.ok) {
      setShowMessageResponder(false);
      await refreshData();
      showNotification('Message relayed to the responder command inbox.');
    } else {
      showNotification(res.error || 'Failed to send message');
    }
  };

  const handleVerifyAlert = async (id: string) => {
    await verifyIncident(id);
    await refreshData();
    showNotification('Incident verified and published to responders.');
  };

  const handleResolveAlert = async (id: string) => {
    await resolveIncident(id);
    await refreshData();
    showNotification('Incident resolved.');
  };

  return (
    <div className={`relief-page ${isPowerSaving ? 'power-saving-mode' : ''}`}>
      {/* Mobile Frame Container */}
      <div className={`app-frame ${isPowerSaving ? '!bg-black !border-[rgba(0,255,65,0.2)]' : ''}`}>
        {/* If no role is chosen, render Welcome Splash Screen */}
        {!role && <WelcomeScreen onSelectRole={(r) => setRole(r)} />}

        {/* Citizen Role Views */}
        {role === 'citizen' && (
          <main className="h-full overflow-y-auto">
            <AppHeader syncing={syncing} />

            {citizenTab === 'home' && (
              <CitizenHome
                data={reliefData}
                onNavigate={(t) => setCitizenTab(t)}
                onOpenSOS={() => setShowSOS(true)}
              />
            )}

            {citizenTab === 'map' && <MapView isResponder={false} />}

            {citizenTab === 'chats' && (
              <BLEChatsView
                data={reliefData}
                onSendMessage={handleSendMessage}
                onOpenNewChannel={() => setShowNewChannel(true)}
                onOpenMessageResponder={() => setShowMessageResponder(true)}
              />
            )}

            {citizenTab === 'profile' && (
              <ProfileView
                role="citizen"
                onLogout={handleLogout}
                onSwitchRole={(newR) => setRole(newR)}
              />
            )}

            <NavigationBar
              role="citizen"
              currentTab={citizenTab}
              onSelectTab={(t) => setCitizenTab(t)}
            />

            {showSOS && (
              <SOSModal
                onClose={() => setShowSOS(false)}
                onSubmit={handleSendSOS}
              />
            )}

            {showNewChannel && (
              <CreateChannelModal
                onClose={() => setShowNewChannel(false)}
                onSubmit={handleCreateChannel}
              />
            )}

            {showMessageResponder && (
              <MessageResponderModal
                onClose={() => setShowMessageResponder(false)}
                onSubmit={handleMessageResponder}
              />
            )}
          </main>
        )}

        {/* Responder Role Views */}
        {role === 'responder' && (
          <main className="h-full overflow-y-auto">
            <AppHeader syncing={syncing} />

            {responderTab === 'dashboard' && (
              <ResponderDashboard
                data={reliefData}
                onNavigate={(t) => setResponderTab(t)}
                onOpenBroadcast={() => setShowBroadcast(true)}
                onVerifyAlert={handleVerifyAlert}
                onNavigateToAlert={handleNavigateToAlert}
              />
            )}

            {responderTab === 'map' && (
              <MapView
                isResponder={true}
                activeTarget={activeNavTarget}
                onClearTarget={() => setActiveNavTarget(null)}
              />
            )}

            {responderTab === 'sos' && (
              <LiveSOSFeed
                data={reliefData}
                onVerify={handleVerifyAlert}
                onResolve={handleResolveAlert}
                onNavigateToAlert={handleNavigateToAlert}
              />
            )}

            {responderTab === 'inbox' && (
              <ResponderInboxView data={reliefData} />
            )}

            {responderTab === 'profile' && (
              <ProfileView
                role="responder"
                onLogout={handleLogout}
                onSwitchRole={(newR) => setRole(newR)}
              />
            )}

            <NavigationBar
              role="responder"
              currentTab={responderTab}
              onSelectTab={(t) => setResponderTab(t)}
            />

            {showBroadcast && (
              <BroadcastModal
                onClose={() => setShowBroadcast(false)}
                onSubmit={handleBroadcast}
              />
            )}
          </main>
        )}
      </div>

      {/* Transient Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 flex w-[min(350px,calc(100%-2rem))] -translate-x-1/2 items-center gap-2.5 rounded-2xl p-3 text-[10px] shadow-2xl transition-all border ${
            isPowerSaving
              ? 'bg-black border-[rgba(0,255,65,0.35)] text-[#00ff41] shadow-[0_0_20px_rgba(0,255,65,0.2)] backdrop-blur-sm'
              : 'bg-[#211515] border-red-900 text-stone-200'
          }`}
        >
          <Radio className="w-4 h-4 flex-none text-emerald-400" />
          <span className="flex-1 font-medium">{toast}</span>
          <button
            type="button"
            onClick={() => setToast('')}
            className="p-1 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
