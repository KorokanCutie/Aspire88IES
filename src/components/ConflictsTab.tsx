/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  RefreshCcw,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  UserX
} from 'lucide-react';
import { DuplicateConflict, Client, UserProfile } from '../types';

interface ConflictsTabProps {
  currentUser: UserProfile;
  conflicts: DuplicateConflict[];
  clients: Client[];
  profiles: UserProfile[];
  onResolveConflict: (conflictId: string, action: 'FalsePositive' | 'Duplicate' | 'ChangeOwnership') => void;
  onRequestConfirm: (title: string, msg: string, type: 'danger' | 'warning' | 'info' | 'success', onConfirm: () => void) => void;
  onShowSuccessToast: (text: string) => void;
}

export default function ConflictsTab({
  currentUser,
  conflicts,
  clients,
  profiles,
  onResolveConflict,
  onRequestConfirm,
  onShowSuccessToast
}: ConflictsTabProps) {

  // Retrieve pending conflicts
  const pendingConflicts = conflicts.filter(c => c.status === 'Pending');
  const resolvedConflicts = conflicts.filter(c => c.status !== 'Pending');

  // Verify permission
  const canDecide = currentUser.role === 'Admin' || currentUser.role === 'Broker';

  const handleResolveAction = (conflictId: string, action: 'FalsePositive' | 'Duplicate' | 'ChangeOwnership', originalName: string, challengerName: string) => {
    let actionTitle = '';
    let actionMsg = '';
    let alertType: 'success' | 'warning' | 'danger' = 'warning';

    if (action === 'FalsePositive') {
      actionTitle = 'Mark as False Positive';
      actionMsg = `This action declares that "${originalName}" and "${challengerName}" are different people (not duplicates). Both agents will keep their own client records with full active access.`;
      alertType = 'success';
    } else if (action === 'Duplicate') {
      actionTitle = 'Mark as Duplicate';
      actionMsg = `Confirming that this is a duplicate entry. Custody and active access will remain with the ORIGINAL agent. The challenger's client record will be restricted, and all their open appointments will be CANCELLED automatically.`;
      alertType = 'warning';
    } else if (action === 'ChangeOwnership') {
      actionTitle = 'Approve Change of Ownership';
      actionMsg = `This will transfer primary custody of the client to the CHALLENGING agent. The original agent's client record will be restricted, and all their open appointments will be CANCELLED automatically.`;
      alertType = 'danger';
    }

    onRequestConfirm(
      actionTitle,
      actionMsg,
      alertType === 'danger' ? 'danger' : alertType === 'warning' ? 'warning' : 'success',
      () => {
        onResolveConflict(conflictId, action);
        onShowSuccessToast(`Conflict resolved successfully via ${action}.`);
      }
    );
  };

  return (
    <div className="space-y-6" id="conflicts-tab-root">
      {/* Tab Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2" id="conflicts-title">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          Duplicate Detection & Resolution Hub
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Review, analyze, and resolve lead custody disputes. Decisions lock ownership and update open appointments.
        </p>
      </div>

      {!canDecide && (
        <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl text-xs text-amber-400 font-medium" id="conflict-permission-warning">
          Only Admins and Corporate Brokers hold the security clearance to resolve duplicate lead conflicts.
        </div>
      )}

      {/* Pending Conflicts List */}
      <div className="space-y-4" id="pending-conflicts-list">
        <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-widest font-mono">
          Pending Custody Disputes ({pendingConflicts.length})
        </h3>

        {pendingConflicts.map((conflict) => {
          const originalClient = clients.find(c => c.id === conflict.originalClientId);
          const challengingClient = clients.find(c => c.id === conflict.challengingClientId);
          const originalAgent = profiles.find(p => p.id === conflict.originalAgentId);
          const challengingAgent = profiles.find(p => p.id === conflict.challengingAgentId);

          if (!originalClient || !challengingClient || !originalAgent || !challengingAgent) return null;

          const origFullName = `${originalClient.firstName} ${originalClient.lastName}`;
          const challFullName = `${challengingClient.firstName} ${challengingClient.lastName}`;

          return (
            <div
              key={conflict.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
              id={`conflict-card-${conflict.id}`}
            >
              {/* Conflict Header */}
              <div className="bg-slate-950/60 border-b border-slate-800 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2" id={`conflict-header-${conflict.id}`}>
                <span className="font-mono text-xs font-bold text-amber-500">
                  CONFLICT ID: {conflict.id}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Detected {new Date(conflict.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Conflict Body */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative" id={`conflict-body-${conflict.id}`}>
                {/* Separation Indicator on Desktop */}
                <div className="hidden md:flex absolute inset-y-0 left-1/2 -ml-px w-px bg-slate-800/80 items-center justify-center">
                  <div className="bg-slate-950 border border-slate-800 p-1.5 rounded-full text-amber-500 font-bold font-mono text-xs">
                    VS
                  </div>
                </div>

                {/* Left: Original Record */}
                <div className="space-y-4" id={`conflict-original-section-${conflict.id}`}>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-sky-500/15 text-sky-400 font-mono font-bold text-[10px] rounded border border-sky-500/20 uppercase">
                      Original Entry
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {originalClient.id}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-base font-bold text-slate-100">
                      {origFullName}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      Phone: {originalClient.contactNumber}
                    </p>
                    <p className="text-xs text-slate-400 font-mono truncate">
                      Addr: {originalClient.address}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850">
                    <p className="text-xs text-slate-500 font-mono uppercase tracking-wider font-semibold">
                      Encoded By
                    </p>
                    <p className="text-xs text-slate-300 font-semibold mt-1">
                      {originalAgent.firstName} {originalAgent.lastName}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      ID: {originalAgent.id} • {originalAgent.role}
                    </p>
                  </div>
                </div>

                {/* Right: Challenging Record */}
                <div className="space-y-4 md:pl-6" id={`conflict-challenger-section-${conflict.id}`}>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 font-mono font-bold text-[10px] rounded border border-amber-500/20 uppercase">
                      Challenging Entry
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {challengingClient.id}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-base font-bold text-slate-100">
                      {challFullName}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      Phone: {challengingClient.contactNumber}
                    </p>
                    <p className="text-xs text-slate-400 font-mono truncate">
                      Addr: {challengingClient.address}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850">
                    <p className="text-xs text-slate-500 font-mono uppercase tracking-wider font-semibold">
                      Encoded By
                    </p>
                    <p className="text-xs text-slate-300 font-semibold mt-1">
                      {challengingAgent.firstName} {challengingAgent.lastName}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      ID: {challengingAgent.id} • {challengingAgent.role}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Deciders */}
              {canDecide && (
                <div className="bg-slate-950/40 border-t border-slate-800 px-6 py-4 flex flex-wrap gap-2.5 items-center justify-end" id={`conflict-decision-actions-${conflict.id}`}>
                  <span className="text-xs text-slate-400 mr-auto font-medium">
                    Select Corporate Action:
                  </span>

                  {/* False Positive Action */}
                  <button
                    type="button"
                    onClick={() => handleResolveAction(conflict.id, 'FalsePositive', origFullName, challFullName)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
                    id={`btn-false-positive-${conflict.id}`}
                  >
                    False Positive
                  </button>

                  {/* Retain Original Action */}
                  <button
                    type="button"
                    onClick={() => handleResolveAction(conflict.id, 'Duplicate', origFullName, challFullName)}
                    className="px-3.5 py-1.5 bg-sky-600/10 border border-sky-500/20 hover:bg-sky-600/25 text-sky-400 text-xs font-semibold rounded-lg transition"
                    id={`btn-retain-original-${conflict.id}`}
                  >
                    Retain Original Agent
                  </button>

                  {/* Change Ownership Action */}
                  <button
                    type="button"
                    onClick={() => handleResolveAction(conflict.id, 'ChangeOwnership', origFullName, challFullName)}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition"
                    id={`btn-change-ownership-${conflict.id}`}
                  >
                    Change Ownership
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {pendingConflicts.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-900 border border-slate-800 rounded-2xl" id="empty-conflicts-state">
            <ShieldCheck className="w-12 h-12 text-emerald-500/30 mb-3" />
            <p className="text-sm font-semibold text-slate-300">Roster Fully Vetted & Clear</p>
            <p className="text-xs text-slate-500 mt-1">No active client custody duplicate conflicts pending review.</p>
          </div>
        )}
      </div>

      {/* Resolved Conflicts Log */}
      {resolvedConflicts.length > 0 && (
        <div className="space-y-3" id="resolved-conflicts-log">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-mono">
            Dispute Decision Audit Trail ({resolvedConflicts.length})
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800/60 overflow-hidden" id="audit-trail-container">
            {resolvedConflicts.map((conflict) => {
              const originalClient = clients.find(c => c.id === conflict.originalClientId);
              const challengingClient = clients.find(c => c.id === conflict.challengingClientId);
              const resolver = profiles.find(p => p.id === conflict.resolvedBy);

              if (!originalClient || !challengingClient) return null;

              return (
                <div key={conflict.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div>
                    <p className="font-mono font-bold text-slate-300">
                      Dispute {conflict.id}
                    </p>
                    <p className="text-slate-400 mt-1 leading-relaxed">
                      Lead: <strong>{originalClient.firstName} {originalClient.lastName}</strong>
                      <br />
                      Original: {conflict.originalAgentId} • Challenger: {conflict.challengingAgentId}
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1.5">
                    <span className={`px-2 py-0.5 rounded font-mono font-semibold text-[10px] uppercase ${
                      conflict.status.includes('FalsePositive') ? 'bg-emerald-500/10 text-emerald-400' :
                      conflict.status.includes('Duplicate') ? 'bg-sky-500/10 text-sky-400' :
                      conflict.status.includes('Surrendered') ? 'bg-slate-800 text-slate-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {conflict.status.replace('Resolved_', '').replace('Surrendered_', 'Surrendered By ')}
                    </span>
                    {resolver && (
                      <p className="text-[10px] text-slate-500">
                        Resolved by: {resolver.firstName} {resolver.lastName} ({resolver.role})
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
