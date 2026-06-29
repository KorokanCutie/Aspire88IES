import React, { useState, useEffect } from 'react';
import { Appointment, Profile, Client, Project, AppointmentType, AppointmentStatus } from '../types';
import { db, generateAlphaId } from '../db';
import { useToast } from './Toast';
import { AlertDialog } from './AlertDialog';
import { Calendar, Plus, Search, Building, Clock, Lock, CheckCircle2, XCircle, X, Edit, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface AppointmentsManagerProps {
  currentProfile: Profile;
  appointments: Appointment[];
  clients: Client[];
  projects: Project[];
  conflicts: any[]; // Duplicate conflicts
  profiles: Profile[];
  onRefresh: () => void;
}

export function AppointmentsManager({
  currentProfile,
  appointments,
  clients,
  projects,
  conflicts,
  profiles,
  onRefresh
}: AppointmentsManagerProps) {
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Open');
  const [isCreating, setIsCreating] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Form Fields
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [apptType, setApptType] = useState<AppointmentType>('Meeting');
  const [apptNotes, setApptNotes] = useState('');
  const [apptTime, setApptTime] = useState('');

  // Confirmation Dialogue variables
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

  const getClientConflictState = (clientId: string) => {
    const activeConflict = conflicts.find(
      c => c.status === 'Pending' && 
      (c.original_client_id === clientId || c.challenged_client_id === clientId)
    );
    if (!activeConflict) return 'Clear';

    // Account for broker sub-agents too
    const subAgents = profiles.filter((p: Profile) => p.parent_broker_id === currentProfile.id).map((p: Profile) => p.id);
    const isOriginal = activeConflict.original_encoder_id === currentProfile.id || subAgents.includes(activeConflict.original_encoder_id);
    return isOriginal ? 'Original-Claimant' : 'Challenger-Locked';
  };

  // Only clients with active clear claims or owned original conflicted claims are available.
  // Clients that are not in clean record (duplicateStatus === true) should not be available.
  const eligibleClients = clients.filter(c => !c.is_deleted && c.duplicateStatus !== true).filter(c => {
    // 1. Pending conflict check
    const pendingConflict = conflicts.find(conf => 
      conf.status === 'Pending' && 
      (conf.original_client_id === c.id || conf.challenged_client_id === c.id)
    );

    if (pendingConflict) {
      // Is this client in the "original" state of the pending conflict?
      const isOriginal = pendingConflict.original_client_id === c.id;
      if (!isOriginal) return false; // Challenger side is frozen/locked

      // Is it user's own client or broker's own subagent client?
      const isUserOwn = c.created_by === currentProfile.id;
      const subAgents = profiles.filter((p: Profile) => p.parent_broker_id === currentProfile.id).map((p: Profile) => p.id);
      const isBrokerSubagentOwn = subAgents.includes(c.created_by);

      if (currentProfile.role === 'Admin') {
        return true;
      }
      if (currentProfile.role === 'Broker') {
        if (!isUserOwn && !isBrokerSubagentOwn) return false;
      } else if (currentProfile.role === 'Agent') {
        if (!isUserOwn) return false;
      } else {
        return false;
      }
    }

    // 2. Must not have lost duplicates conflict
    const isLosing = conflicts.some(conf => 
      conf.status === 'Resolved' &&
      conf.challenged_client_id === c.id &&
      (conf.resolution_decision === 'Marked Duplicate' || conf.resolution_decision === 'Surrender Claim')
    );
    if (isLosing) return false;

    // 3. RBAC checks matching viewability
    if (currentProfile.role === 'Admin') return true;
    if (currentProfile.role === 'Broker') {
      if (c.created_by === currentProfile.id) return true;
      const subAgents = profiles.filter((p: Profile) => p.parent_broker_id === currentProfile.id).map((p: Profile) => p.id);
      return subAgents.includes(c.created_by);
    }
    return c.created_by === currentProfile.id; // Agent
  });

  // Group eligible clients and sort alphabetically
  const myEligibleClients = eligibleClients.filter(c => c.created_by === currentProfile.id);
  const otherEligibleClients = eligibleClients.filter(c => c.created_by !== currentProfile.id);

  const sortClientsAlphabetically = (a: Client, b: Client) => {
    const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
    const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
    return nameA.localeCompare(nameB);
  };

  const sortedMyClients = [...myEligibleClients].sort(sortClientsAlphabetically);
  const sortedOtherClients = [...otherEligibleClients].sort(sortClientsAlphabetically);

  // Sort active projects alphabetically
  const sortedActiveProjects = [...projects.filter(p => p.status === 'Active')].sort((a, b) => a.name.localeCompare(b.name));

  // Visibility Filter for Listings
  const visibleAppointments = appointments.filter(a => {
    if (currentProfile.role === 'Admin') return true;
    if (currentProfile.role === 'Broker') {
      if (a.agent_id === currentProfile.id) return true;
      const subAgents = profiles.filter((p: Profile) => p.parent_broker_id === currentProfile.id).map((p: Profile) => p.id);
      return subAgents.includes(a.agent_id);
    }
    if (currentProfile.role === 'Agent') {
      return a.agent_id === currentProfile.id;
    }
    return false;
  }).filter(a => {
    const client = clients.find(c => c.id === a.client_id);
    const clientName = client ? `${client.first_name} ${client.last_name}`.toLowerCase() : '';
    const proj = projects.find(p => p.id === a.project_id);
    const projName = proj ? proj.name.toLowerCase() : '';
    const query = searchTerm.toLowerCase();

    const matchesSearch = clientName.includes(query) || 
                          projName.includes(query) || 
                          a.appointment_type.toLowerCase().includes(query) ||
                          a.id.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getClientName = (id: string) => {
    const found = clients.find(c => c.id === id);
    return found ? `${found.first_name} ${found.middle_name ? found.middle_name + ' ' : ''}${found.last_name}` : `Client ID (${id})`;
  };

  const getProjectName = (id?: string | null) => {
    if (!id) return '';
    const found = projects.find(p => p.id === id);
    return found ? found.name : '';
  };

  const getProjectAddress = (id?: string | null) => {
    if (!id) return '';
    const found = projects.find(p => p.id === id);
    return found ? found.address : '';
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId || !apptTime) {
      toast('Please supply both prospective client node and scheduled date variables.', 'error');
      return;
    }

    // 1. Time restriction check: appointment must be between 7:00 AM and 6:00 PM
    const localTime = new Date(apptTime);
    const hours = localTime.getHours();
    const minutes = localTime.getMinutes();
    if (hours < 7 || hours > 18 || (hours === 18 && minutes > 0)) {
      toast('Operation Prohibited: Appointments must be booked within business hours (7:00 AM to 6:00 PM).', 'error');
      return;
    }

    // 2. Future requirement check: date and time must be in the future
    if (localTime <= new Date()) {
      toast('Operation Prohibited: Appointment schedule date and time must be in the future.', 'error');
      return;
    }

    // 3. Freeze claim check: No scheduling for challenger-locked profiles
    const conflictState = getClientConflictState(selectedClientId);
    if (conflictState === 'Challenger-Locked') {
      toast('Operation Prohibited: This client file is locked under conflicting registry claim.', 'error');
      return;
    }

    const finalProjectId = apptType === 'Site Visit' ? selectedProjectId : null;

    // Get the agent that owns the client record
    const chosenClient = clients.find(c => c.id === selectedClientId);
    const assignedAgentId = chosenClient ? chosenClient.created_by : (editingAppt ? editingAppt.agent_id : currentProfile.id);

    // 4. DUPLICATE CHECK: No exact duplicate schedules
    if (!editingAppt) {
      const hasDuplicate = appointments.some(a => 
        a.client_id === selectedClientId &&
        a.agent_id === assignedAgentId &&
        a.project_id === finalProjectId &&
        a.appointment_type === apptType &&
        new Date(a.appointment_time).getTime() === localTime.getTime() &&
        a.status !== 'Cancelled'
      );
      if (hasDuplicate) {
        toast('Error: An identical active appointment schedule already exists with these exact details.', 'error');
        return;
      }
    } else {
      const hasDuplicate = appointments.some(a => 
        a.id !== editingAppt.id &&
        a.client_id === selectedClientId &&
        a.agent_id === assignedAgentId &&
        a.project_id === finalProjectId &&
        a.appointment_type === apptType &&
        new Date(a.appointment_time).getTime() === localTime.getTime() &&
        a.status !== 'Cancelled'
      );
      if (hasDuplicate) {
        toast('Error: An identical active appointment schedule already exists with these exact details.', 'error');
        return;
      }
    }

    const payload: Appointment = {
      id: editingAppt ? editingAppt.id : generateAlphaId('APT-'),
      client_id: selectedClientId,
      agent_id: assignedAgentId,
      project_id: finalProjectId,
      appointment_type: apptType,
      status: editingAppt ? editingAppt.status : 'Open',
      notes: apptNotes.trim() || undefined,
      address: apptType === 'Site Visit' ? getProjectAddress(selectedProjectId) : undefined,
      appointment_time: localTime.toISOString(),
      created_at: editingAppt ? editingAppt.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const actionText = editingAppt ? 'Revise' : 'Book';

    setDialogConfig({
      title: `${actionText} Site Engagement Appointment?`,
      description: `Confirm scheduling "${payload.appointment_type}" on ${new Date(payload.appointment_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}. Validates client ownership constraints dynamically.`,
      isDestructive: false,
      onConfirm: async () => {
        setDialogOpen(false);
        try {
          await db.saveAppointment(payload);
          toast(`Appointment successfully scheduled! Ref ID: ${payload.id}.`, 'success');
          
          setIsCreating(false);
          setEditingAppt(null);
          setSelectedClientId('');
          setSelectedProjectId('');
          setApptType('Meeting');
          setApptNotes('');
          setApptTime('');
          onRefresh();
        } catch (err: any) {
          toast(err.message || 'Validation error saving appointment.', 'error');
        }
      }
    });

    setDialogOpen(true);
  };

  const triggerEdit = (appt: Appointment) => {
    setEditingAppt(appt);
    setSelectedClientId(appt.client_id);
    setSelectedProjectId(appt.project_id || '');
    setApptType(appt.appointment_type);
    setApptNotes(appt.notes || '');
    
    // ISO parsing to compliant YYYY-MM-DDThh:mm format
    const localDate = new Date(appt.appointment_time);
    const tzOffset = localDate.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(localDate.getTime() - tzOffset)).toISOString().slice(0, 16);
    setApptTime(localISOTime);
    
    setIsCreating(true);
  };

  const triggerStatusChange = (appt: Appointment, nextStatus: AppointmentStatus) => {
    if (appt.status !== 'Open') {
      toast('Operation Prohibited: Cannot change status of finalized file.', 'error');
      return;
    }

    setDialogConfig({
      title: `Finalize Appointment Status?`,
      description: `Rule appointment "${appt.id}" as ${nextStatus}. This transaction is irreversible and permanently locks notes and schedules.`,
      isDestructive: nextStatus === 'Cancelled',
      onConfirm: async () => {
        setDialogOpen(false);
        const updated = { ...appt, status: nextStatus, updated_at: new Date().toISOString() };
        await db.saveAppointment(updated);
        toast(`Appointment ${appt.id} successfully registered as: ${nextStatus}.`, 'success');
        onRefresh();
      }
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/60 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Operational Engagement Scheduler
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track site tours, reservation schedules, and payments. Completed or Cancelled items are locked permanently.
          </p>
        </div>

        {currentProfile.role !== 'Treasurer' && (
          <button
            onClick={() => {
              setIsCreating(true);
              setEditingAppt(null);
              setSelectedClientId('');
              setSelectedProjectId('');
              setApptType('Meeting');
              setApptNotes('');
              setApptTime('');
            }}
            className="self-start sm:self-center bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-slate-100 px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-950/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Book Appointment
          </button>
        )}
      </div>

      {/* Scheduler search input & Status filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search matching schedules, active prospective buyer names, projects, schedule codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-805 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans cursor-pointer"
          >
            <option value="All">All statuses</option>
            <option value="Open">Open</option>
            <option value="Done">Done</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Lists display table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-5">APT Ref</th>
                <th className="py-4 px-5">Target Client Node</th>
                <th className="py-4 px-5">Appointment Category</th>
                <th className="py-4 px-5">Timestamps</th>
                <th className="py-4 px-5">Assigned Agent</th>
                <th className="py-4 px-5">Progress Status</th>
                {currentProfile.role !== 'Treasurer' && <th className="py-4 px-5 text-right font-medium">Settle Status</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {(() => {
                const sorted = [...visibleAppointments].sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime());
                const totalPages = Math.ceil(sorted.length / recordsPerPage);
                const paginated = sorted.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

                if (paginated.length === 0) {
                  return (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-slate-500 italic">
                        No active scheduling rosters listed in your visible segment.
                      </td>
                    </tr>
                  );
                }

                return (
                  <>
                    {paginated.map((appt) => {
                      const isOpen = appt.status === 'Open';
                      const isSiteVisit = appt.appointment_type === 'Site Visit';
                      
                      // Lookup assigned agent full name
                      const agentProfile = profiles.find(p => p.id === appt.agent_id);
                      const agentFullName = agentProfile 
                        ? `${agentProfile.first_name} ${agentProfile.middle_name ? agentProfile.middle_name + ' ' : ''}${agentProfile.last_name}` 
                        : 'Unspecified Agent';

                      return (
                        <tr key={appt.id} className="hover:bg-slate-950/20 transition-colors">
                          <td className="py-4 px-5 font-mono font-bold tracking-wider text-slate-300">
                            {/* Make the appointment ID clickable, opening edit modal */}
                            <button
                              onClick={() => triggerEdit(appt)}
                              className="hover:text-indigo-400 text-left font-semibold text-xs tracking-wider transition-colors cursor-pointer"
                            >
                              {appt.id}
                            </button>
                          </td>
                          <td className="py-4 px-5">
                            <div className="font-semibold text-slate-205 text-sm">
                              {getClientName(appt.client_id)}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">ID Reference: {appt.client_id}</div>
                          </td>
                          <td className="py-4 px-5">
                            <div className="font-semibold text-slate-200">
                              {appt.appointment_type}
                            </div>
                            {/* If site visit, show project and address in description */}
                            {isSiteVisit && appt.project_id && (
                              <div className="text-[10px] text-indigo-400 font-medium mt-1 leading-relaxed">
                                Site Visit - <strong className="text-slate-300">{getProjectName(appt.project_id)}</strong> ({getProjectAddress(appt.project_id)})
                              </div>
                            )}
                            <div className="text-[10px] text-slate-500 max-w-xs overflow-hidden text-ellipsis mt-1.5 leading-relaxed">
                              {appt.notes || <span className="italic opacity-60">No notes provided</span>}
                            </div>
                          </td>
                          <td className="py-4 px-5 space-y-1">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>
                                {new Date(appt.appointment_time).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono ml-5">
                              {new Date(appt.appointment_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (PST)
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <div className="space-y-1">
                              <code className="font-mono text-[10px] bg-slate-950/80 border border-slate-805 text-slate-400 px-2 py-0.5 rounded font-bold">
                                {appt.agent_id}
                              </code>
                              {/* Assigned agent's full name under ID in the owner node */}
                              <div className="text-xs font-semibold text-slate-200">
                                {agentFullName}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                              appt.status === 'Open'
                                ? 'bg-blue-950/60 border border-blue-900/40 text-blue-400'
                                : appt.status === 'Done'
                                ? 'bg-emerald-950/60 border border-emerald-900/40 text-emerald-400'
                                : 'bg-rose-950/65 border border-rose-900/40 text-rose-400'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                appt.status === 'Open' ? 'bg-blue-400' :
                                appt.status === 'Done' ? 'bg-emerald-400' :
                                'bg-rose-400'
                              }`} />
                              {appt.status}
                            </span>
                          </td>
                          {currentProfile.role !== 'Treasurer' && (
                            <td className="py-3 px-5 text-right whitespace-nowrap">
                              {isOpen ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => triggerStatusChange(appt, 'Done')}
                                    className="p-1.5 px-2.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 font-semibold rounded-lg border border-emerald-808/40 transition-all text-[10px] uppercase flex items-center gap-1 cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Done
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => triggerStatusChange(appt, 'Cancelled')}
                                    className="p-1.5 px-2.5 bg-rose-955 hover:bg-rose-900 text-rose-300 font-semibold rounded-lg border border-rose-808/40 transition-all text-[10px] uppercase flex items-center gap-1 cursor-pointer"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    Cancel
                                  </button>
                                  {/* Edit Action Button */}
                                  <button
                                    type="button"
                                    onClick={() => triggerEdit(appt)}
                                    className="p-1.5 rounded-lg bg-indigo-950/45 border border-indigo-900/35 text-indigo-400 hover:bg-indigo-900/30 transition-all cursor-pointer flex items-center justify-center"
                                    title="Edit Appointment"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => triggerEdit(appt)}
                                  className="text-[11px] text-slate-400 hover:text-indigo-400 font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                                  title="View Closed/Cancelled Appointment Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  View Details
                                </button>
                              )}
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
          const sorted = [...visibleAppointments].sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime());
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

      {/* Book / Edit Appointment Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in origin-center overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl relative shadow-2xl my-8">
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingAppt(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-base font-bold text-slate-100 tracking-tight uppercase tracking-wider mb-5 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              {editingAppt ? (editingAppt.status !== 'Open' ? `View Appointment Ticket (${editingAppt.id})` : `Revise Appointment Ticket (${editingAppt.id})`) : 'Schedule Operations Engagement'}
            </h3>

            {editingAppt && editingAppt.status !== 'Open' && (
              <div className="mb-5 p-3.5 bg-indigo-950/30 border border-indigo-900/40 rounded-xl text-indigo-300 text-xs font-medium flex items-center gap-2.5 animate-fade-in">
                <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Finalized State: This appointment has been resolved as <strong>{editingAppt.status}</strong>. It is presented in Read-Only mode.</span>
              </div>
            )}

            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Client selection menu */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center justify-between">
                    <span>Select Client (Active Clear Claims Only) *</span>
                    <span className="text-[9px] text-indigo-400 font-mono">(Role-Based Sorting Loaded)</span>
                  </label>
                  
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    required
                    disabled={editingAppt ? editingAppt.status !== 'Open' : false}
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl py-2 px-3 text-xs text-slate-200 cursor-pointer outline-none focus:border-indigo-500 font-sans font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Choose client --</option>
                    {sortedMyClients.length > 0 && (
                      <optgroup label="My Registered Clients">
                        {sortedMyClients.map(client => (
                          <option key={client.id} value={client.id}>
                            {client.first_name} {client.middle_name ? client.middle_name + ' ' : ''}{client.last_name} ({client.id}) [Agent/Broker ID: {client.created_by}]
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {sortedOtherClients.length > 0 && (
                      <optgroup label="Other Corporate Team Clients">
                        {sortedOtherClients.map(client => {
                          const owner = profiles.find(p => p.id === client.created_by);
                          const ownerLabel = owner ? `${owner.first_name} ${owner.last_name}` : client.created_by;
                          return (
                            <option key={client.id} value={client.id}>
                              {client.first_name} {client.middle_name ? client.middle_name + ' ' : ''}{client.last_name} ({client.id}) - Owner: {ownerLabel} [Agent/Broker ID: {client.created_by}]
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                    {eligibleClients.length === 0 && (
                      <option disabled>No clear-claim clients are available</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Engagement Category *</label>
                  <select
                    value={apptType}
                    onChange={(e) => {
                      setApptType(e.target.value as AppointmentType);
                      setSelectedProjectId('');
                    }}
                    disabled={editingAppt ? editingAppt.status !== 'Open' : false}
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 outline-none focus:border-indigo-500 transition-all cursor-pointer font-sans disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="Site Visit">Site Visit (Property Tour)</option>
                    <option value="Reservation">Reservation (Equity Booking)</option>
                    <option value="Payment">Payment (Downpayment / Dues Settle)</option>
                    <option value="Meeting">Meeting (Consult / Briefing)</option>
                    <option value="Submit Requirement">Submit Requirement (KYC / Docs Verification)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Scheduled Date & Time (7AM - 6PM) *</label>
                  <input
                    type="datetime-local"
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    required
                    disabled={editingAppt ? editingAppt.status !== 'Open' : false}
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-mono cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Project selector */}
                {apptType === 'Site Visit' && (
                  <div className="sm:col-span-2 space-y-2 animate-fade-in">
                    <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                      Estate Project selection * (Only active listing projects)
                    </label>

                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      required
                      disabled={editingAppt ? editingAppt.status !== 'Open' : false}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-slate-200 cursor-pointer outline-none font-sans disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Choose active project --</option>
                      {sortedActiveProjects.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.id}) - {p.address}</option>
                      ))}
                      {sortedActiveProjects.length === 0 && (
                        <option disabled>No active projects found</option>
                      )}
                    </select>
                  </div>
                )}

                {apptType === 'Site Visit' && selectedProjectId && (
                  <div className="sm:col-span-2 animate-fade-in space-y-1">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Estate Location verified details (Read-Only)</label>
                    <div className="bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-400 font-sans leading-relaxed">
                      {getProjectAddress(selectedProjectId)}
                    </div>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Strategic Notes / Instructions</label>
                  <textarea
                    value={apptNotes}
                    onChange={(e) => setApptNotes(e.target.value)}
                    rows={4}
                    placeholder="Describe specific properties of interest, client budget, site preparation checklists..."
                    disabled={editingAppt ? editingAppt.status !== 'Open' : false}
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingAppt(null);
                  }}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-all animate-fade-in"
                >
                  {editingAppt && editingAppt.status !== 'Open' ? 'Close View' : 'Cancel'}
                </button>
                {(!editingAppt || editingAppt.status === 'Open') && (
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-450 text-slate-950 px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer font-sans"
                  >
                    Save Schedule Time
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified overlay warning alert */}
      <AlertDialog
        isOpen={dialogOpen}
        title={dialogConfig.title}
        description={dialogConfig.description}
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogOpen(false)}
        isDestructive={dialogConfig.isDestructive}
      />
    </div>
  );
}

export default AppointmentsManager;
