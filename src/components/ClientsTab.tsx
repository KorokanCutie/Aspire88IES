/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  Search, 
  UserCheck, 
  UserX,
  X,
  Compass,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { Client, UserProfile, DuplicateConflict } from '../types';

interface ClientsTabProps {
  currentUser: UserProfile;
  clients: Client[];
  profiles: UserProfile[];
  conflicts: DuplicateConflict[];
  onAddClient: (clientData: Omit<Client, 'id' | 'isActive' | 'conflictStatus' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateClient: (id: string, updatedData: Partial<Client>) => void;
  onSurrenderClaim: (conflictId: string, surrenderingAgentId: string) => void;
  onRequestConfirm: (title: string, msg: string, type: 'danger' | 'warning' | 'info' | 'success', onConfirm: () => void) => void;
  onShowSuccessToast: (text: string) => void;
}

export default function ClientsTab({
  currentUser,
  clients,
  profiles,
  conflicts,
  onAddClient,
  onUpdateClient,
  onSurrenderClaim,
  onRequestConfirm,
  onShowSuccessToast
}: ClientsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');

  // Determine which clients this logged-in user can view:
  // Admin: Views all
  // Broker: Views own clients + own agents' clients
  // Agent: Views own clients only
  // Treasurer: Cannot manage clients (handled by tab hides or empty state)
  const getFilteredClients = () => {
    let list = clients.filter(c => c.isActive); // Only active ones (removing client changes isActive to false, i.e., soft delete)

    if (currentUser.role === 'Admin') {
      // Admin sees everything
    } else if (currentUser.role === 'Broker') {
      // See own + agents reporting to this broker
      const myAgentIds = profiles.filter(p => p.brokerId === currentUser.id).map(p => p.id);
      list = list.filter(c => c.createdBy === currentUser.id || myAgentIds.includes(c.createdBy));
    } else if (currentUser.role === 'Agent') {
      list = list.filter(c => c.createdBy === currentUser.id);
    } else {
      list = [];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        c =>
          c.firstName.toLowerCase().includes(q) ||
          c.lastName.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.contactNumber.toLowerCase().includes(q)
      );
    }

    return list;
  };

  const filteredClients = getFilteredClients();

  // Handle Add Client Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !contactNumber || !address) {
      alert("Please fill in all required fields.");
      return;
    }

    onRequestConfirm(
      "Confirm Client Registration",
      `Encode ${firstName} ${lastName} into the Aspire88 Client Registry?`,
      "info",
      () => {
        onAddClient({
          firstName,
          lastName,
          middleName: middleName || undefined,
          contactNumber,
          address,
          createdBy: currentUser.id,
        });
        setIsAddOpen(false);
        resetForm();
      }
    );
  };

  // Handle Edit Client Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    onRequestConfirm(
      "Confirm Profile Modifications",
      `Are you sure you want to save changes for ${selectedClient.firstName} ${selectedClient.lastName}?`,
      "info",
      () => {
        onUpdateClient(selectedClient.id, {
          firstName,
          lastName,
          middleName: middleName || undefined,
          contactNumber,
          address
        });
        setIsEditOpen(false);
        onShowSuccessToast(`Client profile updated successfully.`);
        resetForm();
      }
    );
  };

  // Soft delete / remove client
  const handleRemoveClient = (client: Client) => {
    onRequestConfirm(
      "Remove Client Record",
      `Are you sure you want to remove ${client.firstName} ${client.lastName} from active roster? No data is deleted; record access state is changed only.`,
      "danger",
      () => {
        onUpdateClient(client.id, { isActive: false });
        onShowSuccessToast(`Client successfully archived.`);
      }
    );
  };

  // Surrender duplicate conflict claim
  const handleSurrender = (client: Client) => {
    // Find matching pending conflict involving this client & this user
    const conflict = conflicts.find(
      c => 
        c.status === 'Pending' && 
        (c.originalClientId === client.id || c.challengingClientId === client.id) &&
        (c.originalAgentId === currentUser.id || c.challengingAgentId === currentUser.id)
    );

    if (!conflict) {
      alert("Could not locate active conflict record.");
      return;
    }

    onRequestConfirm(
      "Surrender Property Claim",
      `Are you sure you want to surrender your claim to client ${client.firstName} ${client.lastName}? Doing so will immediately transfer complete custody of appointments and communications to the other agent.`,
      "danger",
      () => {
        onSurrenderClaim(conflict.id, currentUser.id);
        onShowSuccessToast(`Surrendered claim successfully.`);
      }
    );
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setMiddleName('');
    setContactNumber('');
    setAddress('');
    setSelectedClient(null);
  };

  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    setFirstName(client.firstName);
    setLastName(client.lastName);
    setMiddleName(client.middleName || '');
    setContactNumber(client.contactNumber);
    setAddress(client.address);
    setIsEditOpen(true);
  };

  // Helper: check if a client is locked due to duplicate conflicts.
  // Exception rule: "First user to encode the client can still manage client profile and manage appointment. Only the duplicate user are prohibited."
  // So if client is in a pending conflict, but this user is the CREATOR (original), they are NOT locked.
  // If this user is NOT the creator, they are blocked.
  const isClientLockedForEdit = (client: Client) => {
    if (client.conflictStatus !== 'Pending') {
      // Check if they lost the decision
      if ((client.conflictStatus === 'Resolved_Duplicate' || client.conflictStatus === 'Resolved_ChangeOwnership') && client.originalClientId) {
        // Has reference to another original client, meaning this specific user lost the ownership
        return true;
      }
      if (client.conflictStatus === 'Surrendered') return true;
      return false;
    }

    // It is pending!
    // Is this user the original creator of this specific client?
    // Since original and challenger have distinct client records in our system (both pointing to the conflict),
    // let's check the conflict to find who is original vs challenger.
    const conflict = conflicts.find(c => c.status === 'Pending' && (c.originalClientId === client.id || c.challengingClientId === client.id));
    if (conflict) {
      if (conflict.originalClientId === client.id) {
        // This is the original encoder! They can edit.
        return false;
      } else {
        // This is the duplicate encoder (challenger). Prohibited.
        return true;
      }
    }
    return false;
  };

  const canManage = currentUser.role === 'Admin' || currentUser.role === 'Broker' || currentUser.role === 'Agent';

  return (
    <div className="space-y-6" id="clients-tab-root">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="clients-header">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight" id="clients-title">
            Properties & Leads Custody
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Encode, secure, and manage real estate clients. System operates instant duplicate detection.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-semibold transition shadow-lg shadow-amber-500/10"
            id="add-client-btn"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Encode Client
          </button>
        )}
      </div>

      {/* Roster Search Bar */}
      <div className="relative max-w-md" id="clients-search-container">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search clients by name, contact, or ID..."
          className="w-full bg-slate-900 border border-slate-800 pl-10 pr-4 py-2 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          id="client-search-input"
        />
      </div>

      {/* Leads Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="clients-grid">
        {filteredClients.map((client) => {
          const locked = isClientLockedForEdit(client);
          const isPendingDuplicate = client.conflictStatus === 'Pending';
          const isLosingClient = (client.conflictStatus === 'Resolved_Duplicate' || client.conflictStatus === 'Resolved_ChangeOwnership') && client.originalClientId;
          const isSurrendered = client.conflictStatus === 'Surrendered';

          // Find the agent who encoded this client
          const creatorProfile = profiles.find(p => p.id === client.createdBy);
          const creatorName = creatorProfile ? `${creatorProfile.firstName} ${creatorProfile.lastName}` : 'Unknown Agent';

          return (
            <div
              key={client.id}
              className={`p-5 rounded-2xl bg-slate-900 border transition relative flex flex-col justify-between h-64 ${
                locked 
                  ? 'border-rose-950/40 bg-slate-950/40 opacity-75' 
                  : isPendingDuplicate 
                    ? 'border-amber-500/40 shadow-lg shadow-amber-500/5' 
                    : 'border-slate-800/80 hover:border-slate-700/80 shadow-md'
              }`}
              id={`client-card-${client.id}`}
            >
              <div>
                <div className="flex items-start justify-between" id={`client-header-${client.id}`}>
                  <div>
                    <h3 className="font-semibold text-slate-200 text-base" id={`client-name-${client.id}`}>
                      {client.firstName} {client.lastName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono" id={`client-id-${client.id}`}>
                      ID: {client.id}
                    </p>
                  </div>

                  {/* Status Indicator Pill */}
                  {isPendingDuplicate ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-500 border border-amber-500/25 animate-pulse">
                      <ShieldAlert className="w-3 h-3" /> Conflict Pending
                    </span>
                  ) : isLosingClient ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Ownership Revoked
                    </span>
                  ) : isSurrendered ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-500 border border-slate-700">
                      Surrendered Claim
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                      <UserCheck className="w-3 h-3" /> Fully Vetted
                    </span>
                  )}
                </div>

                {/* Conflict/Lock Notice Banner inside card */}
                {locked && (
                  <div className="mt-3 bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-xl flex items-start gap-2" id={`lock-banner-${client.id}`}>
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-rose-400 leading-snug font-medium">
                      {isLosingClient ? "Prohibited due to Ownership loss decision by management." :
                       isSurrendered ? "Record surrendered. Write operations restricted." :
                       "Prohibited due to duplicate conflict. Pending admin review."}
                    </p>
                  </div>
                )}

                {/* Original encoding creator detail */}
                <div className="mt-3 text-xs text-slate-400 space-y-1" id={`client-details-${client.id}`}>
                  <p className="truncate"><strong className="font-mono text-slate-500 text-[10px] uppercase">Custody:</strong> {creatorName} ({client.createdBy})</p>
                  <p><strong className="font-mono text-slate-500 text-[10px] uppercase">Phone:</strong> {client.contactNumber}</p>
                  <p className="truncate"><strong className="font-mono text-slate-500 text-[10px] uppercase">Address:</strong> {client.address}</p>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between mt-auto" id={`client-actions-${client.id}`}>
                <span className="text-[11px] font-mono text-slate-500">
                  Added {new Date(client.createdAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  {/* Surrender Button for Pending conflicts */}
                  {isPendingDuplicate && (client.createdBy === currentUser.id) && (
                    <button
                      type="button"
                      onClick={() => handleSurrender(client)}
                      className="px-2.5 py-1.5 bg-rose-950/40 border border-rose-900/30 hover:bg-rose-950/60 text-rose-400 text-xs font-semibold rounded-lg transition"
                      title="Surrender Claim"
                      id={`client-surrender-${client.id}`}
                    >
                      Surrender Claim
                    </button>
                  )}

                  {/* Standard Edit button */}
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => openEditModal(client)}
                    className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                      locked 
                        ? 'border-slate-800 text-slate-600 cursor-not-allowed' 
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                    }`}
                    title="Edit Client"
                    id={`client-edit-btn-${client.id}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Soft Delete */}
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => handleRemoveClient(client)}
                    className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                      locked 
                        ? 'border-slate-800 text-slate-600 cursor-not-allowed' 
                        : 'border-rose-950/20 bg-rose-950/5 text-rose-500 hover:bg-rose-950/25 hover:text-rose-400'
                    }`}
                    title="Remove Lead"
                    id={`client-delete-btn-${client.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredClients.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-slate-900 border border-slate-800 rounded-2xl" id="empty-clients-state">
            <UserX className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-300">No matching client records found</p>
            <p className="text-xs text-slate-500 mt-1">Make sure you have registered clients under your custody tier.</p>
          </div>
        )}
      </div>

      {/* ADD CLIENT MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" id="add-client-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative"
            id="add-client-box"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800" id="add-client-modal-header">
              <h3 className="text-base font-bold text-slate-100 tracking-tight">
                Encode New Real Estate Lead
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-5 space-y-4 font-sans" id="add-client-form">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Contact Number *</label>
                <input
                  type="text"
                  required
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+639..."
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Address *</label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 space-y-2">
                <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 leading-relaxed">
                  <Compass className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <strong>AUTOMATED DUPLICATE CHECK TRIGGERED</strong>
                </p>
                <p className="text-[10px] text-slate-500 leading-normal">
                  The system scans existing active profiles for name or phone matches. If found, both clients enter a <em>Pending Conflict</em> state. Admin or Broker review decides custody.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition"
                >
                  Encode & Match
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* EDIT CLIENT MODAL */}
      {isEditOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" id="edit-client-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative"
            id="edit-client-box"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 tracking-tight">
                Modify Lead Profile
              </h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4" id="edit-client-form">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Contact Number *</label>
                <input
                  type="text"
                  required
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Address *</label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
