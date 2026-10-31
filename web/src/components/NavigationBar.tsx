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
    { id: 'sos', label: 'SOS alerts', icon: AlertCircle },
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const tabs = role === 'citizen' ? citizenTabs : responderTabs;

  return (
    <nav
      className={`absolute inset-x-0 bottom-0 z-20 grid h-[74px] grid-cols-4 border-t px-2 pb-2 backdrop-blur-xl transition-colors ${
        isPowerSaving
          ? 'bg-black/95 border-[#0d3815]'
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
                ? 'text-[#15803d] hover:text-[#00ff41]'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                isActive
                  ? isPowerSaving
                    ? 'bg-[#0d3815] shadow-[0_0_8px_#00ff41]'
                    : 'bg-red-500/15 shadow-[0_0_12px_rgba(255,38,61,0.25)]'
                  : ''
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-[9px] tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

