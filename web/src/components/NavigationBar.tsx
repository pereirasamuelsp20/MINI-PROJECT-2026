'use client';

import React from 'react';
import { Home, Map, MessageSquare, User, LayoutDashboard, AlertCircle, Inbox } from 'lucide-react';
import { UserRole } from '@/types';
import { usePowerMode } from '@/lib/powerMode';

interface NavigationBarProps {
  role: UserRole;
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export default function NavigationBar({ role, currentTab, onSelectTab }: NavigationBarProps) {
  const { isPowerSaving } = usePowerMode();

  const citizenTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'map', label: 'MeshMap', icon: Map },
    { id: 'chats', label: 'BLE chats', icon: MessageSquare },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const responderTabs = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'map', label: 'MapNav', icon: Map },
    { id: 'sos', label: 'SOS alerts', icon: AlertCircle },
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const tabs = role === 'citizen' ? citizenTabs : responderTabs;
  const gridClass = role === 'citizen' ? 'grid-cols-4' : 'grid-cols-5';

  return (
    <nav
      className={`absolute inset-x-0 bottom-0 z-20 grid h-[76px] ${gridClass} border-t px-1 pb-2 backdrop-blur-xl transition-colors ${
        isPowerSaving
          ? 'bg-black border-neutral-800'
          : 'bg-[#0d0909]/95 border-red-950/80'
      }`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 transition-all ${
              isActive
                ? isPowerSaving
                  ? 'text-[#00ff41]'
                  : 'text-red-400 font-bold'
                : isPowerSaving
                ? 'text-[#00ff41]/50 hover:text-[#00ff41]'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                isActive
                  ? isPowerSaving
                    ? 'border border-[#00ff41] bg-black'
                    : 'bg-red-500/15 shadow-[0_0_12px_rgba(255,38,61,0.25)]'
                  : ''
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[11px] tracking-tight truncate">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
