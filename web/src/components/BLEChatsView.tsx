'use client';

import React, { useState, useEffect } from 'react';
import {
  Radio,
  Users,
  Search,
  UserPlus,
  ArrowLeft,
  Send,
  CheckCheck,
  Shield,
  Copy,
  Check,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import { MeshContact, DirectMessage, MeshChannel, ReliefData } from '@/types';
import { usePowerMode } from '@/lib/powerMode';
import {
  getStoredContacts,
  addContact,
  getStoredDirectMessages,
  sendDirectMessage,
} from '@/lib/api';

interface BLEChatsViewProps {
  data: ReliefData;
  onSendMessage: (channelName: string, body: string) => Promise<void>;
  onOpenNewChannel: () => void;
  onOpenMessageResponder: () => void;
}

export default function BLEChatsView({
  data,
  onSendMessage,
  onOpenNewChannel,
  onOpenMessageResponder,
}: BLEChatsViewProps) {
  const { isPowerSaving } = usePowerMode();

  // Chat tab: 'direct' (WhatsApp 1-on-1) or 'channels' (Public Mesh groups)
  const [activeTab, setActiveTab] = useState<'direct' | 'channels'>('direct');

  // WhatsApp Contacts & Direct Messages State
  const [contacts, setContacts] = useState<MeshContact[]>([]);
  const [activeContact, setActiveContact] = useState<MeshContact | null>(null);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [directText, setDirectText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Contact Modal State
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactId, setNewContactId] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactArea, setNewContactArea] = useState('');
  const [addContactError, setAddContactError] = useState('');

  // Mesh Channel State (Secondary tab)
  const [activeChannel, setActiveChannel] = useState<MeshChannel | null>(null);
  const [channelText, setChannelText] = useState('');

  // Copy User ID feedback
  const [copiedId, setCopiedId] = useState(false);
  const myMeshId = 'MESH-8492';

  // Load contacts and messages from localStorage
  useEffect(() => {
    setContacts(getStoredContacts());
    setDirectMessages(getStoredDirectMessages());
  }, []);

  const handleCopyId = () => {
    navigator.clipboard.writeText(myMeshId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleAddContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactId.trim() || !newContactName.trim()) {
      setAddContactError('Please enter both a Unique Mesh ID and a Name.');
      return;
    }

    const formattedId = newContactId.trim().toUpperCase().startsWith('MESH-')
      ? newContactId.trim().toUpperCase()
      : `MESH-${newContactId.trim().toUpperCase()}`;

    const created = addContact({
      id: formattedId,
      name: newContactName.trim(),
      area: newContactArea.trim() || 'Mumbai Sector',
      statusNote: 'Added via BLE discovery',
    });

    setContacts(getStoredContacts());
    setShowAddContactModal(false);
    setNewContactId('');
    setNewContactName('');
    setNewContactArea('');
    setAddContactError('');
    setActiveContact(created);
  };

  const handleSendDirect = (e?: React.FormEvent, presetText?: string) => {
    if (e) e.preventDefault();
    const textToSend = presetText || directText;
    if (!activeContact || !textToSend.trim()) return;

    const newMsg = sendDirectMessage(activeContact.id, textToSend);
    setDirectMessages((prev) => [...prev, newMsg]);
    setDirectText('');
  };

  const handleSendChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChannel || !channelText.trim()) return;
    await onSendMessage(activeChannel.name, channelText.trim());
    setChannelText('');
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.area && c.area.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const contactMessages = activeContact
    ? directMessages.filter((m) => m.peerId === activeContact.id)
    : [];

  const activeChannelMessages = activeChannel
    ? data.meshMessages.filter((m) => m.channelName === activeChannel.name)
    : [];

  // ─────────────────────────────────────────────────────────────
  // 1. WHATSAPP 1-ON-1 CONVERSATION VIEW
  // ─────────────────────────────────────────────────────────────
  if (activeContact) {
    return (
      <div className="flex h-full flex-col pb-[74px]">
        {/* WhatsApp Chat Header */}
        <header
          className={`flex items-center gap-3 border-b px-4 py-3 transition-colors ${
            isPowerSaving
              ? 'bg-black border-[rgba(0,255,65,0.18)]'
              : 'bg-[#140e0e] border-red-950/70'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveContact(null)}
            className={`p-1.5 rounded-lg text-stone-300 hover:text-white ${
              isPowerSaving ? 'text-[#00ff41]' : ''
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Contact Avatar */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow ${activeContact.avatarColor}`}
          >
            {activeContact.name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <b
                className={`text-sm truncate font-bold ${
                  isPowerSaving ? 'text-[#00ff41]' : 'text-white'
                }`}
              >
                {activeContact.name}
              </b>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  isPowerSaving
                    ? 'border border-[rgba(0,255,65,0.3)] bg-[rgba(0,255,65,0.1)] text-[#00ff41]'
                    : 'bg-white/10 text-stone-300'
                }`}
              >
                {activeContact.id}
              </span>
            </div>
            <p
              className={`text-xs flex items-center gap-1.5 ${
                isPowerSaving ? 'text-[rgba(0,255,65,0.7)]' : 'text-emerald-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              {activeContact.lastSeen}
            </p>
          </div>
        </header>

        {/* Messages Stream */}
        <div
          className={`flex-1 space-y-3 overflow-y-auto p-4 ${
            isPowerSaving ? 'bg-black' : 'bg-[#090707]'
          }`}
        >
          {/* Security & BLE Mesh Notice */}
          <div
            className={`mx-auto w-fit max-w-[90%] text-center rounded-2xl px-3.5 py-2 text-xs border ${
              isPowerSaving
                ? 'bg-[rgba(0,255,65,0.06)] border-[rgba(0,255,65,0.18)] text-[rgba(0,255,65,0.85)]'
                : 'bg-black/50 border-white/5 text-stone-400'
            }`}
          >
            🔒 Messages travel peer-to-peer via BLE Mesh. No cell reception required.
          </div>

          {contactMessages.map((msg) => {
            const isMe = msg.sender === 'me';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow text-sm leading-relaxed ${
                    isMe
                      ? isPowerSaving
                        ? 'border border-[rgba(0,255,65,0.35)] bg-[rgba(0,255,65,0.12)] text-[#00ff41] rounded-br-sm'
                        : 'bg-gradient-to-r from-red-600 to-red-700 text-white rounded-br-sm'
                      : isPowerSaving
                      ? 'border border-[rgba(0,255,65,0.18)] bg-[rgba(0,255,65,0.05)] text-[#00ff41] rounded-bl-sm'
                      : 'bg-[#1e1515] text-stone-200 border border-white/5 rounded-bl-sm'
                  }`}
                >
                  <p className="break-words">{msg.text}</p>
                  <div
                    className={`flex items-center justify-end gap-1.5 text-[10px] mt-1 ${
                      isMe
                        ? isPowerSaving
                          ? 'text-[rgba(0,255,65,0.7)]'
                          : 'text-red-200'
                        : isPowerSaving
                        ? 'text-[rgba(0,255,65,0.5)]'
                        : 'text-stone-400'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {isMe && <CheckCheck className="w-3.5 h-3.5 text-sky-300" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Emergency Chips */}
        <div
          className={`px-3 py-2 border-t flex items-center gap-2 overflow-x-auto no-scrollbar ${
            isPowerSaving ? 'bg-black border-[rgba(0,255,65,0.15)]' : 'bg-[#110b0b] border-white/5'
          }`}
        >
          <button
            type="button"
            onClick={() => handleSendDirect(undefined, '✅ I am safe and at a secure location.')}
            className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold border ${
              isPowerSaving
                ? 'border-[rgba(0,255,65,0.2)] bg-[rgba(0,255,65,0.06)] text-[#00ff41]'
                : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
            }`}
          >
            ✅ I am safe
          </button>
          <button
            type="button"
            onClick={() => handleSendDirect(undefined, '📍 Sharing my coordinates: Dadar Sector (±35m).')}
            className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold border ${
              isPowerSaving
                ? 'border-[rgba(0,255,65,0.2)] bg-[rgba(0,255,65,0.06)] text-[#00ff41]'
                : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
            }`}
          >
            📍 Share Location
          </button>
          <button
            type="button"
            onClick={() => handleSendDirect(undefined, '🆘 Need drinking water and first aid support.')}
            className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold border ${
              isPowerSaving
                ? 'border-[rgba(0,255,65,0.25)] bg-[rgba(0,255,65,0.08)] text-[#00ff41]'
                : 'border-red-900 bg-red-950/40 text-red-300 hover:bg-red-950/60'
            }`}
          >
            🆘 Need Supplies
          </button>
        </div>

        {/* Message Input Bar */}
        <form
          onSubmit={(e) => handleSendDirect(e)}
          className={`flex items-center gap-2 border-t p-3 ${
            isPowerSaving ? 'bg-black border-[rgba(0,255,65,0.15)]' : 'bg-[#150f0f] border-red-950'
          }`}
        >
          <input
            type="text"
            value={directText}
            onChange={(e) => setDirectText(e.target.value)}
            placeholder="Type a BLE message..."
            className={`flex-1 rounded-2xl px-4 py-3 text-sm outline-none transition-all ${
              isPowerSaving
                ? 'bg-black border border-[rgba(0,255,65,0.2)] text-[#00ff41] placeholder-[rgba(0,255,65,0.4)]'
                : 'bg-black/50 border border-white/10 text-white placeholder-stone-500 focus:border-red-500'
            }`}
          />
          <button
            type="submit"
            disabled={!directText.trim()}
            className={`p-3 rounded-2xl font-bold transition-all ${
              isPowerSaving
                ? 'border border-[#00ff41] bg-[rgba(0,255,65,0.15)] text-[#00ff41] disabled:opacity-30'
                : 'bg-gradient-to-r from-[#ff6754] via-[#ff263d] to-[#bd1230] text-white disabled:opacity-40 hover:brightness-110 shadow-lg'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. MESH CHANNEL CONVERSATION VIEW (Group Tab)
  // ─────────────────────────────────────────────────────────────
  if (activeChannel) {
    return (
      <div className="flex h-full flex-col pb-[74px]">
        <header
          className={`flex items-center gap-3 border-b px-5 py-3 transition-colors ${
            isPowerSaving ? 'bg-black border-[rgba(0,255,65,0.18)]' : 'bg-[#100b0b] border-red-950'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveChannel(null)}
            className={`p-1 ${isPowerSaving ? 'text-[#00ff41]' : 'text-stone-300'}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isPowerSaving
                ? 'border border-[rgba(0,255,65,0.3)] bg-[rgba(0,255,65,0.1)] text-[#00ff41]'
                : 'bg-red-500/15 text-red-400'
            }`}
          >
            {activeChannel.channelType === 'community' ? (
              <Radio className="w-5 h-5" />
            ) : (
              <Users className="w-5 h-5" />
            )}
          </span>
          <div className="flex-1 min-w-0">
            <b
              className={`block text-sm truncate ${
                isPowerSaving ? 'text-[#00ff41]' : 'text-white'
              }`}
            >
              {activeChannel.name}
            </b>
            <small
              className={`text-xs block ${
                isPowerSaving ? 'text-[rgba(0,255,65,0.7)]' : 'text-emerald-400'
              }`}
            >
              BLE mesh · 8 nodes in sector
            </small>
          </div>
        </header>

        <div
          className={`flex-1 space-y-3 overflow-y-auto p-4 ${
            isPowerSaving ? 'bg-black' : 'bg-[#0b0808]'
          }`}
        >
          {activeChannelMessages.map((msg) => (
            <article
              key={msg.id}
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.senderName === 'Aarya Mehta'
                  ? isPowerSaving
                    ? 'ml-auto border border-[rgba(0,255,65,0.35)] bg-[rgba(0,255,65,0.12)] text-[#00ff41]'
                    : 'ml-auto bg-red-600 text-white'
                  : isPowerSaving
                  ? 'border border-[rgba(0,255,65,0.18)] bg-[rgba(0,255,65,0.05)] text-[#00ff41]'
                  : 'bg-[#211717] border border-red-950 text-white'
              }`}
            >
              <b className="block text-xs text-orange-400 mb-1">{msg.senderName}</b>
              <p>{msg.body}</p>
            </article>
          ))}
        </div>

        <form
          onSubmit={handleSendChannel}
          className={`flex items-center gap-2 border-t p-3 ${
            isPowerSaving ? 'bg-black border-[rgba(0,255,65,0.15)]' : 'bg-[#150f0f] border-red-950'
          }`}
        >
          <input
            type="text"
            value={channelText}
            onChange={(e) => setChannelText(e.target.value)}
            placeholder="Broadcast to channel..."
            className={`flex-1 rounded-2xl px-4 py-3 text-sm outline-none ${
              isPowerSaving
                ? 'bg-black border border-[rgba(0,255,65,0.2)] text-[#00ff41]'
                : 'bg-black/50 border border-white/10 text-white'
            }`}
          />
          <button
            type="submit"
            className={`p-3 rounded-2xl font-bold ${
              isPowerSaving
                ? 'border border-[#00ff41] bg-[rgba(0,255,65,0.15)] text-[#00ff41]'
                : 'bg-red-600 text-white'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. WHATSAPP CHATS OVERVIEW (Contacts List + Search + Add)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="pb-28">
      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl ${
              isPowerSaving
                ? 'bg-black border-[rgba(0,255,65,0.25)] text-[#00ff41]'
                : 'bg-[#140e0e] border-[#54302c] text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-red-500" />
                Add Mesh Contact
              </h3>
              <button
                type="button"
                onClick={() => setShowAddContactModal(false)}
                className="text-stone-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className={`text-xs mb-4 ${isPowerSaving ? 'text-[rgba(0,255,65,0.7)]' : 'text-stone-400'}`}>
              Add a peer by their unique Mesh ID to exchange offline store-and-forward messages.
            </p>

            <form onSubmit={handleAddContactSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1">Unique Mesh ID</label>
                <input
                  type="text"
                  placeholder="e.g. MESH-7721 or 7721"
                  value={newContactId}
                  onChange={(e) => setNewContactId(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl text-sm font-mono uppercase outline-none border ${
                    isPowerSaving
                      ? 'bg-black border-[rgba(0,255,65,0.2)] text-[#00ff41]'
                      : 'bg-black/50 border-white/10 text-white focus:border-red-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Pooja Sharma"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl text-sm outline-none border ${
                    isPowerSaving
                      ? 'bg-black border-[rgba(0,255,65,0.2)] text-[#00ff41]'
                      : 'bg-black/50 border-white/10 text-white focus:border-red-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Sector / Area (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Dadar West"
                  value={newContactArea}
                  onChange={(e) => setNewContactArea(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl text-sm outline-none border ${
                    isPowerSaving
                      ? 'bg-black border-[rgba(0,255,65,0.2)] text-[#00ff41]'
                      : 'bg-black/50 border-white/10 text-white focus:border-red-500'
                  }`}
                />
              </div>

              {addContactError && (
                <p className="text-xs text-red-400">{addContactError}</p>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold border border-white/10 text-stone-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    isPowerSaving
                      ? 'border border-[#00ff41] bg-[rgba(0,255,65,0.15)] text-[#00ff41]'
                      : 'bg-gradient-to-r from-[#ff6754] to-[#bd1230] text-white shadow-lg'
                  }`}
                >
                  Add Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="px-6 pb-2 pt-3">
        <div className="flex items-center justify-between">
          <p
            className={`text-xs font-extrabold uppercase tracking-widest ${
              isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
            }`}
          >
            Offline P2P Comms
          </p>

          {/* User's Own Mesh ID Badge */}
          <button
            type="button"
            onClick={handleCopyId}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border transition-all ${
              isPowerSaving
                ? 'border-[rgba(0,255,65,0.2)] bg-[rgba(0,255,65,0.06)] text-[#00ff41]'
                : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
            }`}
            title="Click to copy your unique Mesh ID"
          >
            {copiedId ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className={`w-3.5 h-3.5 ${isPowerSaving ? 'text-[#00ff41]' : 'text-stone-400'}`} />
                {myMeshId}
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between mt-1">
          <h1
            className={`text-2xl font-extrabold tracking-tight ${
              isPowerSaving ? 'text-[#00ff41]' : 'text-white'
            }`}
          >
            Mesh Messages
          </h1>

          <button
            type="button"
            onClick={() => setShowAddContactModal(true)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              isPowerSaving
                ? 'border border-[rgba(0,255,65,0.3)] bg-[rgba(0,255,65,0.12)] text-[#00ff41]'
                : 'bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Contact
          </button>
        </div>

        {/* WhatsApp Tab Switcher */}
        <div
          className={`mt-3 flex rounded-xl p-1 border ${
            isPowerSaving ? 'bg-black border-[rgba(0,255,65,0.18)]' : 'bg-black/30 border-white/5'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'direct'
                ? isPowerSaving
                  ? 'border border-[rgba(0,255,65,0.35)] bg-[rgba(0,255,65,0.14)] text-[#00ff41]'
                  : 'bg-red-600 text-white shadow'
                : isPowerSaving
                ? 'text-[rgba(0,255,65,0.55)] hover:text-[#00ff41]'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Direct Chats ({contacts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('channels')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'channels'
                ? isPowerSaving
                  ? 'border border-[rgba(0,255,65,0.35)] bg-[rgba(0,255,65,0.14)] text-[#00ff41]'
                  : 'bg-red-600 text-white shadow'
                : isPowerSaving
                ? 'text-[rgba(0,255,65,0.55)] hover:text-[#00ff41]'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Public Channels ({data.channels.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mt-3">
          <Search className={`w-4 h-4 absolute left-3.5 top-3 ${isPowerSaving ? 'text-[rgba(0,255,65,0.5)]' : 'text-stone-500'}`} />
          <input
            type="text"
            placeholder={
              activeTab === 'direct'
                ? 'Search contacts or Unique ID...'
                : 'Search mesh channels...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none border transition-all ${
              isPowerSaving
                ? 'bg-black border-[rgba(0,255,65,0.2)] text-[#00ff41] placeholder-[rgba(0,255,65,0.4)]'
                : 'bg-black/40 border-white/5 text-white placeholder-stone-500 focus:border-red-500'
            }`}
          />
        </div>
      </header>

      {/* ────────────────────────────────────────────── */}
      {/* TAB 1: DIRECT CHATS (WhatsApp Style)          */}
      {/* ────────────────────────────────────────────── */}
      {activeTab === 'direct' && (
        <div className="px-5 mt-2 space-y-2">
          {filteredContacts.length === 0 ? (
            <div className={`text-center py-12 ${isPowerSaving ? 'text-[rgba(0,255,65,0.5)]' : 'text-stone-500'}`}>
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No contacts found</p>
              <p className="text-xs mt-1">Tap &quot;Add Contact&quot; to connect with a peer&apos;s Mesh ID.</p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const lastMsg = directMessages
                .filter((m) => m.peerId === contact.id)
                .slice(-1)[0];

              return (
                <div
                  key={contact.id}
                  onClick={() => setActiveContact(contact)}
                  className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isPowerSaving
                      ? 'border-[rgba(0,255,65,0.18)] bg-[rgba(0,255,65,0.06)] hover:bg-[rgba(0,255,65,0.12)] backdrop-blur-sm'
                      : 'border-white/5 bg-[#140e0e] hover:bg-white/5'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-12 h-12 rounded-full flex-none flex items-center justify-center font-bold text-white text-base shadow ${contact.avatarColor}`}
                  >
                    {contact.name.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <b
                        className={`text-sm font-bold truncate ${
                          isPowerSaving ? 'text-[#00ff41]' : 'text-white'
                        }`}
                      >
                        {contact.name}
                      </b>
                      <span className={`text-[10px] font-mono ${isPowerSaving ? 'text-[rgba(0,255,65,0.6)]' : 'text-stone-500'}`}>
                        {lastMsg ? lastMsg.timestamp : '12:00 PM'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          isPowerSaving
                            ? 'border border-[rgba(0,255,65,0.3)] bg-[rgba(0,255,65,0.1)] text-[#00ff41]'
                            : 'bg-white/10 text-stone-300'
                        }`}
                      >
                        {contact.id}
                      </span>
                      {contact.area && (
                        <span className={`text-xs truncate ${isPowerSaving ? 'text-[rgba(0,255,65,0.7)]' : 'text-stone-400'}`}>
                          · {contact.area}
                        </span>
                      )}
                    </div>

                    <p
                      className={`text-xs truncate mt-1 ${
                        isPowerSaving ? 'text-[rgba(0,255,65,0.7)]' : 'text-stone-300'
                      }`}
                    >
                      {lastMsg ? lastMsg.text : contact.statusNote || 'No messages yet'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────── */}
      {/* TAB 2: PUBLIC MESH CHANNELS                   */}
      {/* ────────────────────────────────────────────── */}
      {activeTab === 'channels' && (
        <div className="px-5 mt-2 space-y-2">
          {data.channels.map((channel) => (
            <div
              key={channel.id}
              onClick={() => setActiveChannel(channel)}
              className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                isPowerSaving
                  ? 'border-[rgba(0,255,65,0.18)] bg-[rgba(0,255,65,0.06)] hover:bg-[rgba(0,255,65,0.12)] backdrop-blur-sm'
                  : 'border-white/5 bg-[#140e0e] hover:bg-white/5'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex-none flex items-center justify-center ${
                  isPowerSaving
                    ? 'border border-[rgba(0,255,65,0.3)] bg-[rgba(0,255,65,0.1)] text-[#00ff41]'
                    : 'bg-red-500/15 text-red-400'
                }`}
              >
                {channel.channelType === 'community' ? (
                  <Radio className="w-5 h-5" />
                ) : (
                  <Users className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <b
                  className={`text-sm font-bold block truncate ${
                    isPowerSaving ? 'text-[#00ff41]' : 'text-white'
                  }`}
                >
                  {channel.name}
                </b>
                <p
                  className={`text-xs truncate mt-0.5 ${
                    isPowerSaving ? 'text-[rgba(0,255,65,0.7)]' : 'text-stone-400'
                  }`}
                >
                  {channel.description}
                </p>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={onOpenNewChannel}
            className={`w-full mt-3 py-3 px-4 rounded-2xl border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              isPowerSaving
                ? 'border-[rgba(0,255,65,0.25)] bg-[rgba(0,255,65,0.08)] text-[#00ff41]'
                : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
            }`}
          >
            Create New Mesh Channel
          </button>
        </div>
      )}
    </div>
  );
}
