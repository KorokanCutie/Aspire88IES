import React, { useState, useEffect } from 'react';
import { Client, Profile, DuplicateConflict, Appointment } from '../types';
import { db, generateAlphaId } from '../db';
import { useToast } from './Toast';
import { AlertDialog } from './AlertDialog';
import { UserCheck, Plus, Search, Lock, ShieldAlert, ShieldCheck, HeartCrack, ChevronRight, ChevronLeft, X, Edit, Trash2, Scale, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ClientsManagerProps {
  currentProfile: Profile;
  clients: Client[];
  conflicts: DuplicateConflict[];
  appointments: Appointment[];
  profiles: Profile[];
  onRefresh: () => void;
}

export function ClientsManager({ currentProfile, clients, conflicts, appointments, profiles, onRefresh }: ClientsManagerProps) {
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(
    currentProfile.role === 'Admin' ? 'All' : 'Clean Record'
  );
  const [isCreating, setIsCreating] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;
  const [selectedConflictForModal, setSelectedConflictForModal] = useState<DuplicateConflict | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [createdBy, setCreatedBy] = useState(currentProfile.id);

  // Owner Selection List Calculation
  const isOwnerSelectionAllowed = currentProfile.role === 'Admin' || currentProfile.role === 'Broker';
  
  const eligibleOwners = (() => {
    if (currentProfile.role === 'Admin') {
      // Choose from all active agent and broker profiles
      return profiles.filter(p => p.is_active && (p.role === 'Agent' || p.role === 'Broker'));
    }
    if (currentProfile.role === 'Broker') {
      // Choose from self and own active agents
      return profiles.filter(p => 
        p.is_active && (
          p.id === currentProfile.id || 
          (p.role === 'Agent' && p.parent_broker_id === currentProfile.id)
        )
      );
    }
    return [];
  })();

  // Alert Dialog Hooks
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
    isDestructive: boolean;
  }>({
    title: '',
    description: '',
    onConfirm: () => {},
    isDestructive: false
  });

  // Check the conflict status for a specific client
  const getConflictState = (client: Client) => {
    const activeConflict = conflicts.find(
      conf => conf.status === 'Pending' && 
      (conf.original_client_id === client.id || conf.challenged_client_id === client.id)
    );

    if (!activeConflict) {
      const resolvedConflict = conflicts.find(
        conf => conf.status === 'Resolved' &&
        (conf.original_client_id === client.id || conf.challenged_client_id === client.id)
      );

      if (resolvedConflict) {
        const resVal = resolvedConflict.resolution || resolvedConflict.resolution_decision;
        if (resVal === 'Marked Duplicate' || resVal === 'Surrendered Claim') {
          const isChallenger = resolvedConflict.challenged_client_id === client.id;
          if (isChallenger) return { state: 'Restricted-LosingAgent', conflict: resolvedConflict };
        } else if (resVal === 'Awarded To Challenger') {
          const isOriginal = resolvedConflict.original_client_id === client.id;
          if (isOriginal) return { state: 'Restricted-LosingAgent', conflict: resolvedConflict };
        }
      }
      return { state: 'Clear', conflict: null };
    }

    const isOriginal = activeConflict.original_client_id === client.id;
    return {
      state: isOriginal ? 'Conflicted-Original' : 'Conflicted-Challenger',
      conflict: activeConflict
    };
  };

  const getConflictStatusLabel = (client: Client) => {
    if (client.duplicateStatus !== true) {
      return 'Clean Record';
    }
    const conf = conflicts.find(
      cc => cc.original_client_id === client.id || cc.challenged_client_id === client.id
    );
    if (!conf) return 'Clean Record';
    const resolutionValue = conf.resolution || conf.resolution_decision;
    if (conf.status === 'Pending' || !resolutionValue || resolutionValue === 'Pending') {
      return 'Pending';
    }
    return resolutionValue;
  };

  const getClientObject = (id: string) => {
    return clients.find(cl => cl.id === id);
  };

  const getEncoderName = (id: string) => {
    const prof = profiles.find(p => p.id === id);
    return prof ? `${prof.first_name} ${prof.last_name}` : id;
  };

  const getEncoderRole = (id: string) => {
    const prof = profiles.find(p => p.id === id);
    return prof ? prof.role : 'Unknown';
  };

  // Client visibility rules based on RBAC:
  // - Admin/Treasurer: Admin see all clients, Agent see own, Broker see downline.
  //   Filter out soft deleted clients and clients whose access was lost in change-ownership.
  const visibleClients = clients.filter(c => {
    return !c.is_deleted && !c.is_access_lost;
  }).filter(c => {
    if (currentProfile.role === 'Admin') return true;
    if (currentProfile.role === 'Broker') {
      if (c.created_by === currentProfile.id) return true;
      const subAgents = profiles.filter((p: Profile) => p.parent_broker_id === currentProfile.id).map((p: Profile) => p.id);
      return subAgents.includes(c.created_by);
    }
    if (currentProfile.role === 'Agent') {
      return c.created_by === currentProfile.id;
    }
    return false; // Treasurer zero access
  }).filter(c => {
    const fullText = `${c.first_name} ${c.middle_name || ''} ${c.last_name}`.toLowerCase();
    const matchesSearch = fullText.includes(searchTerm.toLowerCase()) || 
                          c.contact_number.includes(searchTerm) || 
                          c.id.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'All') return matchesSearch;
    if (statusFilter === 'Clean Record' || statusFilter === 'CLEAN RECORD') return matchesSearch && !c.duplicateStatus;
    if (statusFilter === 'Conflicted Record') return matchesSearch && !!c.duplicateStatus;
    return matchesSearch;
  });

  const handleCreateOrUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingClient?.duplicateStatus === true) {
      toast('Operation Prohibited: Non-clean client records cannot be edited.', 'error');
      return;
    }

    // Validation: all fields except notes and middleName are mandatory
    if (!firstName.trim() || !lastName.trim() || !contactNumber.trim() || !address.trim()) {
      toast('All fields except Notes and Middle Name are mandatory.', 'error');
      return;
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedAddress = address.trim();
    const trimmedContactNumber = contactNumber.trim();

    // DUPLICATE CHECKS: Check if same name, address, contact number, owner and is_deleted=false exists in the record
    const duplicateExists = clients.some(c => 
      !c.is_deleted &&
      (!editingClient || c.id !== editingClient.id) &&
      c.first_name.toLowerCase().trim() === trimmedFirstName.toLowerCase() &&
      c.last_name.toLowerCase().trim() === trimmedLastName.toLowerCase() &&
      c.address.toLowerCase().trim() === trimmedAddress.toLowerCase() &&
      c.contact_number.trim() === trimmedContactNumber &&
      c.created_by === createdBy
    );

    if (duplicateExists) {
      toast('A client with the same name, address, contact number, and owner already exists in the system.', 'error');
      return;
    }

    if (!editingClient) {
      // Direct save with transaction dialog
      setDialogConfig({
        title: 'Add Client Record?',
        description: `Confirm registering client ${trimmedFirstName} ${trimmedLastName} into the corporate database registry.`,
        isDestructive: false,
        onConfirm: () => commitClientSave()
      });
      setDialogOpen(true);

    } else {
      // If no duplicate, ask confirmation if edits will be saved.
      setDialogConfig({
        title: 'Save Client Edits?',
        description: `Are you sure you want to save modifications made to client ${trimmedFirstName} ${trimmedLastName}?`,
        isDestructive: false,
        onConfirm: () => commitClientSave()
      });
      setDialogOpen(true);
    }
  };

  const commitClientSave = async () => {
    setDialogOpen(false);
    const payload: Client = {
      id: editingClient ? editingClient.id : generateAlphaId('CL-'),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      middle_name: middleName.trim() || undefined,
      contact_number: contactNumber.trim(),
      address: address.trim(),
      notes: notes.trim() || undefined,
      is_deleted: editingClient ? editingClient.is_deleted : false,
      created_by: createdBy, // Save specified owner
      created_at: editingClient ? editingClient.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const res = await db.saveClient(payload, currentProfile.id);
    if (res.createdConflict) {
      toast(`🚨 PG conflict logged! Duplicate conflict ticket auto-mapped with identifier ${res.createdConflict.original_client_id}. State frozen.`, 'error');
    } else {
      toast(`Client record updated successfully. ID: ${payload.id}.`, 'success');
    }

    setIsCreating(false);
    setEditingClient(null);
    setFirstName('');
    setLastName('');
    setMiddleName('');
    setContactNumber('');
    setAddress('');
    setNotes('');
    setCreatedBy(currentProfile.id); // Reset to default creator
    onRefresh();
  };

  const triggerEdit = (client: Client) => {
    setEditingClient(client);
    setFirstName(client.first_name);
    setLastName(client.last_name);
    setMiddleName(client.middle_name || '');
    setContactNumber(client.contact_number);
    setAddress(client.address);
    setNotes(client.notes || '');
    setCreatedBy(client.created_by); // Set initial owner when editing
    setIsCreating(true);
  };

  const triggerDelete = (client: Client) => {
    setDialogConfig({
      title: 'Soft Delete Client Record?',
      description: `Are you sure you want to delete client ${client.first_name} ${client.last_name}? Open appointments scheduled for this client will be updated to "Cancelled" status with a "Client Record Deleted" notes suffix.`,
      isDestructive: true,
      onConfirm: async () => {
        setDialogOpen(false);
        await db.deleteClient(client.id, currentProfile.id);
        toast(`Client list record soft deleted successfully.`, 'success');
        onRefresh();
      }
    });
    setDialogOpen(true);
  };

  const triggerSurrender = (client: Client, conflict: DuplicateConflict) => {
    setDialogConfig({
      title: 'Voluntarily Surrender Claim?',
      description: `Surrendering claim forfeits client marketing and scheduled site-booking rights for ${client.first_name} ${client.last_name} to the original historic registry owner. Open appointments will be cancelled.`,
      isDestructive: true,
      onConfirm: async () => {
        setDialogOpen(false);
        await db.resolveConflict(conflict.id, 'Surrendered Claim', currentProfile.id);
        toast(`Claim successfully surrendered. Full rights restored to original historic owner.`, 'success');
        onRefresh();
      }
    });
    setDialogOpen(true);
  };

  const handleResolveFromModal = async (decision: DuplicateConflict['resolution_decision']) => {
    if (!selectedConflictForModal) return;

    const descriptiveMap = {
      'Marked False Positive': 'Rule as Marked False Positive. Independent clear claims granted to both encoders.',
      'Marked Duplicate': 'Rule as Marked Duplicate. Historical registry record priority confirmed. Challenger record frozen to permanent read-only status.',
      'Awarded To Challenger': 'Award to Challenger. Original claimant record will be Marked Duplicate and appointments will be cancelled.',
      'Surrendered Claim': 'Claim voluntarily forfeited.'
    };

    setDialogConfig({
      title: 'Confirm Ruling Decree?',
      description: `Commiting verdict: "${decision}". ${descriptiveMap[decision || 'Marked False Positive']}`,
      isDestructive: decision === 'Awarded To Challenger',
      onConfirm: async () => {
        setDialogOpen(false);
        try {
          if (reviewNotes.trim()) {
            const conflict = selectedConflictForModal;
            const winningClientId = decision === 'Awarded To Challenger' ? conflict.challenged_client_id : conflict.original_client_id;
            const winningClient = clients.find(cl => cl.id === winningClientId);
            if (winningClient) {
              const currentNotes = winningClient.notes ? winningClient.notes.trim() : '';
              const stamp = `[Conflict ruling notes by ${currentProfile.id} on ${new Date().toLocaleDateString()}: ${reviewNotes.trim()}]`;
              const updatedNotes = currentNotes ? `${currentNotes}\n${stamp}` : stamp;
              await db.saveClient({
                ...winningClient,
                notes: updatedNotes
              }, currentProfile.id);
            }
          }

          await db.resolveConflict(selectedConflictForModal.id, decision, currentProfile.id);
          toast(`Conflict case successfully settled under: "${decision}".`, 'success');
          
          setSelectedConflictForModal(null);
          setReviewNotes('');
          onRefresh();
        } catch (err: any) {
          toast(err.message || 'Veritable ruling transaction failed.', 'error');
        }
      }
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/60 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-400" />
            Client Identity Registry
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Map client location and identity directories. System handles duplicates and freezes conflict lines immediately.
          </p>
        </div>

        {currentProfile.role !== 'Treasurer' && (
          <button
            onClick={() => {
              setIsCreating(true);
              setEditingClient(null);
              setFirstName('');
              setLastName('');
              setMiddleName('');
              setContactNumber('');
              setAddress('');
              setNotes('');
              setCreatedBy(currentProfile.id);
            }}
            className="self-start sm:self-center bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-slate-100 px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-950/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        )}
      </div>

      {/* Main filter directory & Status Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search matching clients, names, contact numbers, database serial IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans cursor-pointer"
          >
            <option value="All">All</option>
            <option value="Clean Record">Clean Record</option>
            <option value="Conflicted Record">Conflicted Record</option>
          </select>
        </div>
      </div>

      {/* Listings tabular view */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-5">Client ID</th>
                <th className="py-4 px-5">Client Identity</th>
                <th className="py-4 px-5">Contact & Location</th>
                <th className="py-4 px-5">Owner Node</th>
                <th className="py-4 px-5">Internal Notes</th>
                <th className="py-4 px-5">Conflict Status</th>
                {currentProfile.role !== 'Treasurer' && <th className="py-4 px-5 text-right">Operational Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {(() => {
                const sorted = [...visibleClients].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const totalPages = Math.ceil(sorted.length / recordsPerPage);
                const paginated = sorted.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

                if (paginated.length === 0) {
                  return (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-slate-500 italic">
                        No matching non-deleted client parameters found in database.
                      </td>
                    </tr>
                  );
                }

                return (
                  <>
                    {paginated.map((client) => {
                      const { state, conflict } = getConflictState(client);
                      const isFrozen = state === 'Conflicted-Challenger' || state === 'Restricted-LosingAgent';
                      
                      // Owner Full Name under ID in owner node
                      const ownerProfile = profiles.find(p => p.id === client.created_by);
                      const ownerName = ownerProfile 
                        ? `${ownerProfile.first_name} ${ownerProfile.middle_name ? ownerProfile.middle_name + ' ' : ''}${ownerProfile.last_name}` 
                        : 'Unresolved';

                      const conflictLabel = getConflictStatusLabel(client);
                      const isClickable = conflictLabel !== 'Clean Record';

                      return (
                        <tr
                          key={client.id}
                          className={`hover:bg-slate-950/20 transition-colors ${
                            isFrozen ? 'bg-rose-950/5' : ''
                          }`}
                        >
                          <td className="py-4 px-5 font-mono text-xs font-semibold tracking-wider text-slate-300">
                            {/* Clickable user ID pop-up the modal view for edit (always clickable as per prompt) */}
                            <button
                              onClick={() => triggerEdit(client)}
                              title={client.duplicateStatus === true ? 'View Client Details (Read-only)' : 'Edit Client'}
                              className="text-left font-semibold text-xs tracking-wider transition-colors text-slate-300 hover:text-indigo-400 cursor-pointer hover:underline"
                            >
                              {client.id}
                            </button>
                          </td>
                          <td className="py-4 px-5">
                            <div className="font-semibold text-slate-200 text-sm">
                              {client.first_name} {client.middle_name ? `${client.middle_name} ` : ''}{client.last_name}
                            </div>
                          </td>
                          <td className="py-4 px-5 space-y-0.5">
                            <div className="font-mono text-slate-300">{client.contact_number}</div>
                            <div className="text-[11px] text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs">{client.address}</div>
                          </td>
                          <td className="py-3 px-5">
                            <div className="space-y-1">
                              <code className="text-[10px] bg-slate-950/80 border border-slate-800/60 text-slate-400 px-2 py-0.5 rounded font-mono">
                                {client.created_by}
                              </code>
                              {/* Client owner's full name under ID with premium styling */}
                              <div className="text-xs font-semibold text-slate-200">
                                {ownerName}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-5 max-w-xs">
                            <p className="text-[11px] text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap" title={client.notes || 'No added notes'}>
                              {client.notes || <span className="text-slate-650 italic">None</span>}
                            </p>
                          </td>
                          <td className="py-4 px-5">
                            {isClickable ? (
                              <button
                                onClick={() => {
                                  const conf = conflicts.find(
                                    cc => cc.original_client_id === client.id || cc.challenged_client_id === client.id
                                  );
                                  if (conf) {
                                    setSelectedConflictForModal(conf);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-900/40 rounded-xl uppercase hover:bg-indigo-900/35 hover:scale-[1.02] transition-all cursor-pointer text-left"
                              >
                                <AlertCircle className="w-3.5 h-3.5 animate-pulse text-indigo-300" />
                                {conflictLabel}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-900/40 rounded-xl uppercase">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                {conflictLabel}
                              </span>
                            )}
                          </td>

                          {currentProfile.role !== 'Treasurer' && (
                            <td className="py-3 px-5 text-right font-semibold">
                              <div className="flex items-center justify-end gap-2">
                                {/* Icons only for operational actions button */}
                                {state === 'Conflicted-Challenger' && conflict && (
                                  <button
                                    type="button"
                                    onClick={() => triggerSurrender(client, conflict)}
                                    title="Surrender Claim"
                                    className="p-2 rounded-lg bg-rose-950/40 border border-rose-900/30 text-rose-400 hover:bg-rose-900/30 transition-all cursor-pointer"
                                  >
                                    <HeartCrack className="w-4 h-4" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => triggerEdit(client)}
                                  disabled={client.duplicateStatus === true}
                                  title={client.duplicateStatus === true ? 'Editing disabled for non-clean client records' : 'Edit Client'}
                                  className={`p-2 rounded-lg border transition-all ${
                                    client.duplicateStatus === true
                                      ? 'bg-slate-950 border-slate-805 text-slate-600 cursor-not-allowed opacity-30'
                                      : 'bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 hover:bg-slate-800 hover:border-slate-700 cursor-pointer'
                                  }`}
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => triggerDelete(client)}
                                  title="Delete Client"
                                  className="p-2 rounded-lg bg-rose-950/30 border border-rose-900/40 text-rose-400 hover:bg-rose-955/55 transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls inside wrapper */}
        {(() => {
          const sorted = [...visibleClients].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const totalPages = Math.ceil(sorted.length / recordsPerPage);
          if (totalPages <= 1) return null;
          return (
            <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between">
              <div className="text-[11px] text-slate-400 font-sans">
                Showing Page <span className="font-semibold text-slate-200">{currentPage}</span> of <span className="font-semibold text-slate-200">{totalPages}</span> ({sorted.length} records)
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="p-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="p-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Add / Edit Client Modal overlay */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in origin-center overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl relative shadow-2xl my-8">
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingClient(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-base font-bold text-slate-100 tracking-tight uppercase tracking-wider mb-5 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              {editingClient ? `Edit Client Identity (${editingClient.id})` : 'Onboard New Prospective Client'}
            </h3>

            <form onSubmit={handleCreateOrUpdateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">First Name *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="Juan"
                    disabled={editingClient?.duplicateStatus === true}
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Middle Name (Optional)</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="Santos"
                    disabled={editingClient?.duplicateStatus === true}
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Last Name *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Dela Cruz"
                    disabled={editingClient?.duplicateStatus === true}
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans disabled:opacity-50"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Contact Number *</label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    required
                    placeholder="0917XXXXXXX"
                    disabled={editingClient?.duplicateStatus === true}
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-mono disabled:opacity-50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Verified Address *</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    placeholder="123 Rizal St, Makati, NCR, Philippines"
                    disabled={editingClient?.duplicateStatus === true}
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans disabled:opacity-50"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Internal Client Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Provide buyer targets, budget coordinates, or preferred geographic zones..."
                    disabled={editingClient?.duplicateStatus === true}
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans resize-none disabled:opacity-50"
                  />
                </div>

                {isOwnerSelectionAllowed && (
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                      Client Owner / Assignee * <span className="text-[9px] text-indigo-400 font-mono">(Rbac Active Allocation)</span>
                    </label>
                    <select
                      value={createdBy}
                      onChange={(e) => setCreatedBy(e.target.value)}
                      required
                      disabled={editingClient?.duplicateStatus === true}
                      className="mt-1.5 w-full bg-slate-950 border border-slate-805 text-slate-300 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs cursor-pointer outline-none font-sans font-medium disabled:opacity-50"
                    >
                      <option value="">-- Choose Client Owner --</option>
                      {eligibleOwners.map(owner => (
                        <option key={owner.id} value={owner.id}>
                          {owner.first_name} {owner.middle_name ? owner.middle_name + ' ' : ''}{owner.last_name} ({owner.role} - {owner.id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingClient(null);
                  }}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                {(!editingClient || editingClient.duplicateStatus !== true) && (
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-450 text-slate-950 px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer font-sans"
                  >
                    {editingClient ? 'Save Client Updates' : 'Save New Client'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable warning dialog handler */}
      <AlertDialog
        isOpen={dialogOpen}
        title={dialogConfig.title}
        description={dialogConfig.description}
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogOpen(false)}
        isDestructive={dialogConfig.isDestructive}
        confirmText="Confirm"
      />

      {/* Detailed Comparative Check Modal for Client Segment (Read-only view) */}
      {selectedConflictForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-4xl relative shadow-2xl my-8 flex flex-col max-h-[85vh]">
            <button
              onClick={() => {
                setSelectedConflictForModal(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-base font-bold text-slate-100 tracking-tight uppercase tracking-wider mb-5 flex items-center gap-2 flex-shrink-0">
              <Scale className="w-5 h-5 text-indigo-400" />
              Comparative Identity Audit Log ({selectedConflictForModal.id})
            </h3>

            <div className="overflow-y-auto flex-1 pr-2 space-y-5 mb-5 max-h-[60vh] scrollbar-thin scrollbar-thumb-slate-800">
              {/* Side-by-Side Comparatives Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* ORIGINAL CREDENTIALS */}
                <div className="bg-slate-950/60 p-5 border border-indigo-950/80 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-950 pb-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-400">
                      A. Original Registry Holder
                    </span>
                    <span className="text-[10px] bg-indigo-950 border border-indigo-900 font-mono px-2 py-0.5 rounded text-indigo-300 font-bold uppercase">
                      Priority Node
                    </span>
                  </div>
                  
                  {(() => {
                    const client = getClientObject(selectedConflictForModal.original_client_id);
                    return (
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="text-[9px] text-slate-500 font-mono font-semibold uppercase">Client Reference Code</label>
                          <p className="font-mono text-slate-300 text-sm font-semibold mt-0.5">{selectedConflictForModal.original_client_id}</p>
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-500 font-mono font-semibold uppercase">Full Identity credentials</label>
                          <p className="font-semibold text-slate-200 text-base mt-0.5">
                            {client ? `${client.first_name} ${client.middle_name ? client.middle_name + ' ' : ''}${client.last_name}` : 'Unknown Client'}
                          </p>
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-500 font-mono font-semibold uppercase">Contact coordinates</label>
                          <p className="font-mono text-slate-350 mt-0.5">{client?.contact_number || 'No contact'}</p>
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-500 font-mono font-semibold uppercase">Verified Address</label>
                          <p className="text-slate-350 mt-0.5 leading-relaxed">{client?.address || 'No registered address'}</p>
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-500 font-mono font-semibold uppercase">Internal Notes Inputted</label>
                          <p className="text-slate-400 bg-slate-900/50 p-2 rounded-lg mt-1 italic leading-relaxed text-[11px] border border-slate-800">
                            {client?.notes || 'No notes archived.'}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-900/80 text-[11px]">
                          <p className="text-slate-400">
                            <span className="text-slate-550">Registered by:</span> <strong className="text-slate-300">{getEncoderName(selectedConflictForModal.original_encoder_id)}</strong>
                          </p>
                          <p className="text-slate-500 font-mono text-[9px] mt-0.5">Encoder ID: {selectedConflictForModal.original_encoder_id}</p>
                          <p className="text-slate-500 font-mono text-[9px] mt-0.5">Date: {client ? new Date(client.created_at).toLocaleString() : 'N/A'}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* CHALLENGER CREDENTIALS */}
                <div className="bg-slate-950/60 p-5 border border-rose-950/80 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-rose-950 pb-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-rose-400">
                      B. Challenger Registry Node
                    </span>
                    <span className="text-[10px] bg-rose-950 border border-rose-900 font-mono px-2 py-0.5 rounded text-rose-300 font-bold uppercase">
                      Collided Claim
                    </span>
                  </div>

                  {(() => {
                    const client = getClientObject(selectedConflictForModal.challenged_client_id);
                    return (
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="text-[9px] text-slate-500 font-mono font-semibold uppercase">Client Reference Code</label>
                          <p className="font-mono text-slate-300 text-sm font-semibold mt-0.5">{selectedConflictForModal.challenged_client_id}</p>
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-500 font-mono font-semibold uppercase">Full Identity credentials</label>
                          <p className="font-semibold text-slate-200 text-base mt-0.5">
                            {client ? `${client.first_name} ${client.middle_name ? client.middle_name + ' ' : ''}${client.last_name}` : 'Unknown Client'}
                          </p>
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-500 font-mono font-semibold uppercase">Contact coordinates</label>
                          <p className="font-mono text-slate-350 mt-0.5">{client?.contact_number || 'No contact'}</p>
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-500 font-mono font-semibold uppercase">Verified Address</label>
                          <p className="text-slate-350 mt-0.5 leading-relaxed">{client?.address || 'No registered address'}</p>
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-500 font-mono font-semibold uppercase">Internal Notes Inputted</label>
                          <p className="text-slate-400 bg-slate-900/50 p-2 rounded-lg mt-1 italic leading-relaxed text-[11px] border border-slate-800">
                            {client?.notes || 'No notes archived.'}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-900/80 text-[11px]">
                          <p className="text-slate-400">
                            <span className="text-slate-550">Registered by:</span> <strong className="text-slate-300">{getEncoderName(selectedConflictForModal.challenging_encoder_id)}</strong>
                          </p>
                          <p className="text-slate-500 font-mono text-[9px] mt-0.5">Encoder ID: {selectedConflictForModal.challenging_encoder_id}</p>
                          <p className="text-slate-500 font-mono text-[9px] mt-0.5">Date: {client ? new Date(client.created_at).toLocaleString() : 'N/A'}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Case Settle Status Banner */}
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Case Settle Status
                </label>
                <div className="text-xs font-medium">
                  {selectedConflictForModal.status === 'Resolved' ? (
                    <span className="text-emerald-400 font-bold uppercase">RESOLVED under {selectedConflictForModal.resolution || selectedConflictForModal.resolution_decision}</span>
                  ) : (
                    <span className="text-amber-400 font-bold uppercase">PENDING ADMINISTRATIVE REVIEW</span>
                  )}
                </div>
              </div>

              {/* Notes input area inside the comparison view modal */}
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Administrative Review Notes (Appended to the verdict record)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Declare historical justifications, verification evidence, or operational conditions surrounding this claim verdict..."
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans resize-none"
                />
              </div>
            </div>

            {/* Ruling Decision Controls */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-shrink-0">
              <div className="text-xs text-slate-450 font-medium">
                {selectedConflictForModal.status === 'Resolved' ? (
                  <span className="text-slate-400 font-medium">This case is resolved and locked against further administrative ruling changes.</span>
                ) : currentProfile.role === 'Agent' ? (
                  <span>This case is pending review. Administrative action buttons are restricted in this workspace segment.</span>
                ) : (
                  <span>Select an operational ruling option below to resolve the duplicate conflict.</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Only display ruling controls if the conflict is still Pending and role is not Agent */}
                {selectedConflictForModal.status === 'Pending' && currentProfile.role !== 'Agent' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleResolveFromModal('Marked False Positive')}
                      className="px-4 py-2 bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Mark False Positive
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveFromModal('Marked Duplicate')}
                      className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-100 border border-slate-850 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                    >
                      Mark as Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveFromModal('Awarded To Challenger')}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold rounded-xl text-xs shadow transition-all cursor-pointer"
                    >
                      Award To Challenger
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedConflictForModal(null);
                    setReviewNotes('');
                  }}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-850 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientsManager;
