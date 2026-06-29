import { useState, useEffect } from 'react';
import { DuplicateConflict, Profile, Client } from '../types';
import { db } from '../db';
import { useToast } from './Toast';
import { AlertDialog } from './AlertDialog';
import { ShieldCheck, Scale, ShieldAlert, CheckCircle2, ChevronRight, X, AlertCircle, Search, ChevronLeft } from 'lucide-react';

interface ConflictsManagerProps {
  currentProfile: Profile;
  conflicts: DuplicateConflict[];
  clients: Client[];
  profiles: Profile[];
  onRefresh: () => void;
}

export function ConflictsManager({ currentProfile, conflicts, clients, profiles, onRefresh }: ConflictsManagerProps) {
  const { toast } = useToast();
  
  // Selected conflict for comparative modal review
  const [selectedConflict, setSelectedConflict] = useState<DuplicateConflict | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Dialog settings
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

  // Visibility filters on conflicts based on access roles:
  // - Admin: see and resolve all conflicts
  // - Broker: view/resolve conflicts involving their downline (self or subagents)
  // - Agent: view only conflicts involving themselves as original/challenging encoder
  // - Treasurer: absolute zero access
  const visibleConflicts = conflicts.filter(c => {
    // Skip conflicts involving soft-deleted clients
    const origClient = clients.find(cl => cl.id === c.original_client_id);
    const chalClient = clients.find(cl => cl.id === c.challenged_client_id);
    if (!origClient || origClient.is_deleted || !chalClient || chalClient.is_deleted) {
      return false;
    }

    if (currentProfile.role === 'Admin') return true;
    
    if (currentProfile.role === 'Broker') {
      const brokerSubAgents = profiles.filter(p => p.parent_broker_id === currentProfile.id).map(p => p.id);
      const isDownlineParticipant = 
        c.original_encoder_id === currentProfile.id || 
        c.challenging_encoder_id === currentProfile.id ||
        brokerSubAgents.includes(c.original_encoder_id) || 
        brokerSubAgents.includes(c.challenging_encoder_id);
      
      return isDownlineParticipant;
    }

    if (currentProfile.role === 'Agent') {
      return c.original_encoder_id === currentProfile.id || c.challenging_encoder_id === currentProfile.id;
    }

    return false; // Treasurer
  });

  const getClientObject = (id: string) => {
    return clients.find(c => c.id === id);
  };

  const getClientName = (id: string) => {
    const raw = getClientObject(id);
    return raw ? `${raw.first_name} ${raw.middle_name ? raw.middle_name + ' ' : ''}${raw.last_name}` : `Unknown Client ID (${id})`;
  };

  const getEncoderName = (id: string) => {
    const p = profiles.find(prof => prof.id === id);
    return p ? `${p.first_name} ${p.middle_name ? p.middle_name + ' ' : ''}${p.last_name}` : `Unknown Node (${id})`;
  };

  const getEncoderRole = (id: string) => {
    const p = profiles.find(prof => prof.id === id);
    return p ? p.role : '';
  };

  const filteredConflicts = visibleConflicts.filter(c => {
    const isPending = c.status === 'Pending';
    const query = searchTerm.toLowerCase();
    const origClientName = getClientName(c.original_client_id).toLowerCase();
    const origClientId = c.original_client_id.toLowerCase();
    const challClientName = getClientName(c.challenged_client_id).toLowerCase();
    const challClientId = c.challenged_client_id.toLowerCase();
    const origEncoderName = getEncoderName(c.original_encoder_id).toLowerCase();
    const challEncoderName = getEncoderName(c.challenging_encoder_id).toLowerCase();
    const conflictId = c.id.toLowerCase();

    const matchesSearch = 
      origClientName.includes(query) ||
      origClientId.includes(query) ||
      challClientName.includes(query) ||
      challClientId.includes(query) ||
      origEncoderName.includes(query) ||
      challEncoderName.includes(query) ||
      conflictId.includes(query);

    let matchesStatus = true;
    if (statusFilter === 'Pending') {
      matchesStatus = isPending;
    } else if (statusFilter === 'Resolved') {
      matchesStatus = !isPending;
    }

    return matchesSearch && matchesStatus;
  });

  const handleResolveFromModal = async (decision: DuplicateConflict['resolution_decision']) => {
    if (!selectedConflict) return;

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
          // If notes are supplied, we save them as client notes for audit trail tracking of conflict ruling
          if (reviewNotes.trim()) {
            const conflict = selectedConflict;
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

          await db.resolveConflict(selectedConflict.id, decision, currentProfile.id);
          toast(`Conflict case successfully settled under: "${decision}".`, 'success');
          
          setSelectedConflict(null);
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
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/60 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-400" />
            Duplicate Resolution Panel
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Resolve database collisions. Conduct side-by-side credential reviews of original vs challenger logs to settle ownerships.
          </p>
        </div>
      </div>

      {/* Numerical logs statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Pending Cases</div>
          <div className="text-2xl font-semibold text-indigo-400 mt-1">
            {visibleConflicts.filter(c => c.status === 'Pending').length} Pending
          </div>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Settled Judgments</div>
          <div className="text-2xl font-semibold text-emerald-400 mt-1">
            {visibleConflicts.filter(c => c.status === 'Resolved' && (c.resolution || c.resolution_decision) !== 'Surrendered Claim').length} Decrees
          </div>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Voluntary Forfeits</div>
          <div className="text-2xl font-semibold text-amber-400 mt-1">
            {visibleConflicts.filter(c => (c.resolution || c.resolution_decision) === 'Surrendered Claim').length} Surrenders
          </div>
        </div>
      </div>

      {/* Search and status filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search conflicting tickets, clients, or agent identifiers..."
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
            <option value="All">All statuses</option>
            <option value="Pending">Pending Review</option>
            <option value="Resolved">Resolved Cases</option>
          </select>
        </div>
      </div>

      {/* Collisions logs directory */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/20 border-b border-slate-800/80 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Conflict Docket Record</h3>
          <span className="text-[10px] bg-indigo-950/80 text-indigo-400 px-2 py-0.5 rounded border border-indigo-900 font-mono font-semibold">
            SECURE RECONCILIATIONS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-5">Conflict ID</th>
                <th className="py-4 px-5">Challenged Client</th>
                <th className="py-4 px-5">Original Encoder</th>
                <th className="py-4 px-5">Challenging Encoder</th>
                <th className="py-4 px-5">Ruling Status</th>
                <th className="py-4 px-5 text-right">Operational Ruling</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(() => {
                const sorted = [...filteredConflicts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const totalPages = Math.ceil(sorted.length / recordsPerPage);
                const paginated = sorted.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

                if (paginated.length === 0) {
                  return (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-slate-500 italic">
                        No active duplicate claims registered in your security cluster.
                      </td>
                    </tr>
                  );
                }

                return (
                  <>
                    {paginated.map((c) => {
                      const isPending = c.status === 'Pending';
                      
                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-slate-950/20 transition-colors ${
                            isPending ? 'bg-indigo-950/5' : ''
                          }`}
                        >
                          <td className="py-4 px-5 font-mono font-bold tracking-wider text-slate-300">
                            {/* Make the duplicate ID clickable to pop up comparing view */}
                            <button
                              onClick={() => {
                                setSelectedConflict(c);
                                setReviewNotes('');
                              }}
                              className="hover:text-indigo-455 transition-colors font-semibold"
                            >
                              {c.id}
                            </button>
                          </td>
                          <td className="py-4 px-5">
                            <div className="font-semibold text-slate-200">
                              {getClientName(c.original_client_id)}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                              Registry codes: {c.original_client_id} vs {c.challenged_client_id}
                            </div>
                          </td>
                          <td className="py-4 px-5 text-slate-300">
                            <div className="font-medium">{getEncoderName(c.original_encoder_id)}</div>
                            {/* Display original encoder ID under name inside styling */}
                            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                              ID: {c.original_encoder_id} ({getEncoderRole(c.original_encoder_id)})
                            </div>
                          </td>
                          <td className="py-4 px-5 text-slate-300">
                            <div className="font-medium">{getEncoderName(c.challenging_encoder_id)}</div>
                            {/* Display challenger encoder ID under name inside styling */}
                            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                              ID: {c.challenging_encoder_id} ({getEncoderRole(c.challenging_encoder_id)})
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-900/40 rounded-xl uppercase">
                                Pending
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-950/40 rounded-xl uppercase">
                                  Resolved
                                </span>
                                <div className="text-[10px] text-slate-400 font-medium">
                                  {c.resolution || c.resolution_decision}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-5 text-right whitespace-nowrap">
                            {/* Conduct Review action button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedConflict(c);
                                setReviewNotes('');
                              }}
                              className={`${
                                isPending 
                                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-slate-950 font-bold' 
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold'
                              } px-3 py-1.5 rounded-xl text-[10px] uppercase shadow hover:scale-[1.01] transition-all cursor-pointer inline-flex items-center gap-1.5`}
                            >
                              <span>{isPending ? "Conduct Review" : "View Settlement Details"}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>

        {/* Pagination controller inside wrapper */}
        {(() => {
          const sorted = [...filteredConflicts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const totalPages = Math.ceil(sorted.length / recordsPerPage);
          if (totalPages <= 1) return null;
          return (
            <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
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

      {/* Detailed Comparative Check Modal (Side-by-Side Reviewer) */}
      {selectedConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-4xl relative shadow-2xl my-8 flex flex-col max-h-[85vh]">
            <button
              onClick={() => {
                setSelectedConflict(null);
                setReviewNotes('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-base font-bold text-slate-100 tracking-tight uppercase tracking-wider mb-5 flex items-center gap-2 flex-shrink-0">
              <Scale className="w-5 h-5 text-indigo-400" />
              Comparative Identity Audit Log ({selectedConflict.id})
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
                    const client = getClientObject(selectedConflict.original_client_id);
                    return (
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="text-[9px] text-slate-500 font-mono font-semibold uppercase">Client Reference Code</label>
                          <p className="font-mono text-slate-300 text-sm font-semibold mt-0.5">{selectedConflict.original_client_id}</p>
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
                            <span className="text-slate-550">Registered by:</span> <strong className="text-slate-300">{getEncoderName(selectedConflict.original_encoder_id)}</strong>
                          </p>
                          <p className="text-slate-500 font-mono text-[9px] mt-0.5">Encoder ID: {selectedConflict.original_encoder_id}</p>
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
                    const client = getClientObject(selectedConflict.challenged_client_id);
                    return (
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="text-[9px] text-slate-500 font-mono font-semibold uppercase">Client Reference Code</label>
                          <p className="font-mono text-slate-300 text-sm font-semibold mt-0.5">{selectedConflict.challenged_client_id}</p>
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
                            <span className="text-slate-550">Registered by:</span> <strong className="text-slate-300">{getEncoderName(selectedConflict.challenging_encoder_id)}</strong>
                          </p>
                          <p className="text-slate-500 font-mono text-[9px] mt-0.5">Encoder ID: {selectedConflict.challenging_encoder_id}</p>
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
                  {selectedConflict.status === 'Resolved' ? (
                    <span className="text-emerald-400 font-bold uppercase">RESOLVED under {selectedConflict.resolution || selectedConflict.resolution_decision}</span>
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
                {selectedConflict.status === 'Resolved' ? (
                  <span className="text-slate-400 font-medium">This case is resolved and locked against further administrative ruling changes.</span>
                ) : (
                  <span>Select an operational ruling option below to resolve the duplicate conflict.</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Only display ruling controls if the conflict is still Pending */}
                {selectedConflict.status === 'Pending' && currentProfile.role !== 'Agent' && (
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
                    setSelectedConflict(null);
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

      {/* Interactive dialogue decree */}
      <AlertDialog
        isOpen={dialogOpen}
        title={dialogConfig.title}
        description={dialogConfig.description}
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogOpen(false)}
        isDestructive={dialogConfig.isDestructive}
        confirmText="Confirm Judgment"
      />
    </div>
  );
}

export default ConflictsManager;
