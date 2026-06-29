/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Edit3, 
  Building,
  User,
  Filter,
  Eye,
  CalendarCheck2
} from 'lucide-react';
import { 
  Appointment, 
  UserProfile, 
  Client, 
  Project, 
  AppointmentType, 
  AppointmentStatus 
} from '../types';

interface AppointmentsTabProps {
  currentUser: UserProfile;
  appointments: Appointment[];
  clients: Client[];
  projects: Project[];
  profiles: UserProfile[];
  onAddAppointment: (aptData: Omit<Appointment, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateAppointment: (id: string, updatedData: Partial<Appointment>) => void;
  onRequestConfirm: (title: string, msg: string, type: 'danger' | 'warning' | 'info' | 'success', onConfirm: () => void) => void;
  onShowSuccessToast: (text: string) => void;
  onViewProjectMap: (project: Project) => void; // Trigger Map modal from list!
}

export default function AppointmentsTab({
  currentUser,
  appointments,
  clients,
  projects,
  profiles,
  onAddAppointment,
  onUpdateAppointment,
  onRequestConfirm,
  onShowSuccessToast,
  onViewProjectMap
}: AppointmentsTabProps) {
  const [filterType, setFilterType] = useState<AppointmentType | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'All'>('All');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);

  // Form states
  const [clientId, setClientId] = useState('');
  const [type, setType] = useState<AppointmentType>('Meeting');
  const [projectId, setProjectId] = useState('');
  const [datetime, setDatetime] = useState('');

  // Filtering visibility
  const getFilteredAppointments = () => {
    let list = [...appointments];

    if (currentUser.role === 'Admin') {
      // Admin sees all
    } else if (currentUser.role === 'Broker') {
      // See own + own agents
      const agentIds = profiles.filter(p => p.brokerId === currentUser.id).map(p => p.id);
      list = list.filter(a => a.agentId === currentUser.id || agentIds.includes(a.agentId));
    } else if (currentUser.role === 'Agent') {
      list = list.filter(a => a.agentId === currentUser.id);
    } else {
      list = [];
    }

    if (filterType !== 'All') {
      list = list.filter(a => a.type === filterType);
    }
    if (filterStatus !== 'All') {
      list = list.filter(a => a.status === filterStatus);
    }

    // Sort by datetime ascending
    return list.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  };

  const filteredApts = getFilteredAppointments();

  // Determine selectable clients based on role permissions
  // Prohibit clients with conflicts or duplicate restrictions
  const getSelectableClients = () => {
    let list = clients.filter(c => c.isActive && c.conflictStatus !== 'Pending' && c.conflictStatus !== 'Surrendered');
    
    if (currentUser.role === 'Broker') {
      // Brokers can set appointments for own clients and other agent's clients
      // So they have access to all vetted clients
    } else if (currentUser.role === 'Agent') {
      // Agents can only set for own client
      list = list.filter(c => c.createdBy === currentUser.id);
    } else if (currentUser.role === 'Admin') {
      // Admin sees all
    } else {
      list = [];
    }

    // Filter out clients that lost ownership
    list = list.filter(c => {
      if ((c.conflictStatus === 'Resolved_Duplicate' || c.conflictStatus === 'Resolved_ChangeOwnership') && c.originalClientId) {
        // Lost dispute
        return c.createdBy !== currentUser.id;
      }
      return true;
    });

    return list;
  };

  const selectableClients = getSelectableClients();

  // Fetch address of selected project
  const getProjectAddress = (pid: string) => {
    const proj = projects.find(p => p.id === pid);
    return proj ? proj.address : 'Select a project to view address';
  };

  // Submit appointment creation
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !datetime) {
      alert("Please fill in client and date.");
      return;
    }
    if (type === 'Site Visit' && !projectId) {
      alert("Project selection is required for Site Visits.");
      return;
    }

    onRequestConfirm(
      "Confirm Appointment Date",
      `Schedule a ${type} appointment on ${new Date(datetime).toLocaleString()}?`,
      "info",
      () => {
        try {
          onAddAppointment({
            clientId,
            agentId: currentUser.id,
            type,
            projectId: type === 'Site Visit' ? projectId : undefined,
            datetime: new Date(datetime).toISOString()
          });
          setIsAddOpen(false);
          onShowSuccessToast("Appointment successfully booked.");
          resetForm();
        } catch (err: any) {
          alert(err.message);
        }
      }
    );
  };

  // Submit appointment edit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApt) return;

    onRequestConfirm(
      "Confirm Schedule Reschedule",
      `Update this appointment's parameters?`,
      "info",
      () => {
        onUpdateAppointment(selectedApt.id, {
          clientId,
          type,
          projectId: type === 'Site Visit' ? projectId : undefined,
          datetime: new Date(datetime).toISOString()
        });
        setIsEditOpen(false);
        onShowSuccessToast("Appointment details updated.");
        resetForm();
      }
    );
  };

  // Mark status Done or Cancelled
  const handleStatusUpdate = (apt: Appointment, status: AppointmentStatus) => {
    // Permission check
    // Broker can mark own & agent's appointments
    // Agent can only mark own appointments
    const agentProfile = profiles.find(p => p.id === apt.agentId);
    const isOwnAgent = agentProfile && agentProfile.brokerId === currentUser.id;

    const allowed = 
      currentUser.role === 'Admin' || 
      currentUser.role === 'Broker' && (apt.agentId === currentUser.id || isOwnAgent) ||
      currentUser.role === 'Agent' && apt.agentId === currentUser.id;

    if (!allowed) {
      alert("Permission denied. You can only update appointments belonging to your portfolio hierarchy.");
      return;
    }

    onRequestConfirm(
      `Mark Appointment as ${status}`,
      `Are you sure you want to transition this appointment's status? This action is irreversible.`,
      status === 'Done' ? 'success' : 'danger',
      () => {
        onUpdateAppointment(apt.id, { status });
        onShowSuccessToast(`Appointment marked as ${status}.`);
      }
    );
  };

  const resetForm = () => {
    setClientId('');
    setType('Meeting');
    setProjectId('');
    setDatetime('');
    setSelectedApt(null);
  };

  const openEditModal = (apt: Appointment) => {
    setSelectedApt(apt);
    setClientId(apt.clientId);
    setType(apt.type);
    setProjectId(apt.projectId || '');
    // Convert to datetime-local format
    const localDate = new Date(apt.datetime);
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    setDatetime(localDate.toISOString().slice(0, 16));
    setIsEditOpen(true);
  };

  const canAdd = currentUser.role === 'Broker' || currentUser.role === 'Agent';

  return (
    <div className="space-y-6" id="appointments-tab-root">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="appointments-header">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight" id="appointments-title">
            Corporate Events & Engagements
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track and log developer site visits, down payments, and client contract signatures.
          </p>
        </div>

        {canAdd && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-semibold transition shadow-lg shadow-amber-500/10"
            id="book-appointment-btn"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Book Appointment
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl" id="appointments-filters-bar">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-mono font-bold uppercase">
          <Filter className="w-3.5 h-3.5" /> Filter Calendar:
        </div>

        {/* Appointment Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="bg-slate-950 border border-slate-800 text-xs text-slate-300 px-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-500/50"
          id="filter-type-dropdown"
        >
          <option value="All">All Types</option>
          <option value="Site Visit">Site Visit</option>
          <option value="Reservation">Reservation</option>
          <option value="Payment">Payment</option>
          <option value="Meeting">Meeting</option>
          <option value="Submit Requirement">Submit Requirement</option>
        </select>

        {/* Appointment Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="bg-slate-950 border border-slate-800 text-xs text-slate-300 px-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-500/50"
          id="filter-status-dropdown"
        >
          <option value="All">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Done">Done</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Appointments List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="appointments-cards-grid">
        {filteredApts.map((apt) => {
          const client = clients.find(c => c.id === apt.clientId);
          const project = projects.find(p => p.id === apt.projectId);
          const agentProfile = profiles.find(p => p.id === apt.agentId);

          const clientName = client ? `${client.firstName} ${client.lastName}` : 'Archived Client';
          const agentName = agentProfile ? `${agentProfile.firstName} ${agentProfile.lastName}` : 'Unknown Agent';

          const isEditable = apt.status === 'Open';

          // Permission to Done/Cancel checks
          const isOwnAgent = agentProfile && agentProfile.brokerId === currentUser.id;
          const allowedToComplete = 
            currentUser.role === 'Admin' || 
            currentUser.role === 'Broker' && (apt.agentId === currentUser.id || isOwnAgent) ||
            currentUser.role === 'Agent' && apt.agentId === currentUser.id;

          return (
            <div
              key={apt.id}
              className={`p-5 rounded-2xl bg-slate-900 border flex flex-col justify-between h-[300px] transition ${
                apt.status === 'Done' ? 'border-emerald-950/40 bg-emerald-950/5 opacity-80' :
                apt.status === 'Cancelled' ? 'border-slate-950 bg-slate-950/40 opacity-60' :
                'border-slate-800/80 hover:border-slate-700/80 shadow-md'
              }`}
              id={`apt-card-${apt.id}`}
            >
              {/* Upper Portion */}
              <div>
                <div className="flex items-start justify-between" id={`apt-header-${apt.id}`}>
                  <div>
                    <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase">
                      ID: {apt.id}
                    </span>
                    <h3 className="font-semibold text-slate-200 text-sm mt-0.5" id={`apt-client-name-${apt.id}`}>
                      Client: {clientName}
                    </h3>
                  </div>

                  {/* Status Indicator Pill */}
                  <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase border ${
                    apt.status === 'Open' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    apt.status === 'Done' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`} id={`apt-status-${apt.id}`}>
                    {apt.status}
                  </span>
                </div>

                {/* Main Content Info */}
                <div className="mt-4 space-y-2.5" id={`apt-details-${apt.id}`}>
                  {/* Appointment Type Badge */}
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950/60 border border-slate-800 text-xs font-semibold text-slate-300 uppercase">
                    {apt.type}
                  </span>

                  {/* Datetime stamp */}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{new Date(apt.datetime).toLocaleString()}</span>
                  </div>

                  {/* Custody agent */}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Assigned: {agentName} ({apt.agentId})</span>
                  </div>

                  {/* Associated site visit project address */}
                  {apt.type === 'Site Visit' && project && (
                    <div className="mt-2 p-2.5 bg-slate-950/60 border border-slate-850 rounded-xl space-y-1.5">
                      <p className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                        <Building className="w-3 h-3 text-amber-500" />
                        Project: {project.name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono leading-normal truncate">
                        Address: {project.address}
                      </p>
                      <button
                        onClick={() => onViewProjectMap(project)}
                        className="text-[10px] text-amber-500 hover:text-amber-400 font-bold font-mono uppercase flex items-center gap-1 mt-1 hover:underline cursor-pointer"
                        id={`btn-view-map-${apt.id}`}
                      >
                        <MapPin className="w-2.5 h-2.5" /> View Project Map
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Lower Actions section */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between mt-auto" id={`apt-actions-${apt.id}`}>
                {/* Editing permissions info */}
                {!isEditable && (
                  <span className="text-[10px] text-slate-500 font-mono italic">
                    Historical Log Archive
                  </span>
                )}

                {/* Edit & Transmutation buttons */}
                {isEditable && (
                  <div className="flex items-center gap-2 w-full justify-between" id={`apt-actions-container-${apt.id}`}>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(apt)}
                        className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                        title="Reschedule Event"
                        id={`apt-edit-${apt.id}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {allowedToComplete && (
                      <div className="flex items-center gap-1.5">
                        {/* Done status button */}
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(apt, 'Done')}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg transition"
                          id={`apt-done-${apt.id}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
                        </button>

                        {/* Cancel status button */}
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(apt, 'Cancelled')}
                          className="flex items-center gap-1 px-2 py-1 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-lg transition"
                          id={`apt-cancel-${apt.id}`}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredApts.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-slate-900 border border-slate-800 rounded-2xl" id="empty-appointments-state">
            <CalendarCheck2 className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-300">No matching scheduled events</p>
            <p className="text-xs text-slate-500 mt-1">Book a new appointment with matching active clients.</p>
          </div>
        )}
      </div>

      {/* BOOK APPOINTMENT MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" id="book-appointment-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative"
            id="book-apt-box"
          >
            <h3 className="text-lg font-bold text-slate-100 tracking-tight" id="book-apt-title">
              Schedule Client Engagement
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Add reservations, site visits, or payment updates to corporate calendar.
            </p>

            <form onSubmit={handleAddSubmit} className="mt-5 space-y-4" id="book-apt-form">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Select Client Lead *</label>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="">-- Choose Vetted Client --</option>
                  {selectableClients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.id})
                    </option>
                  ))}
                </select>
                {selectableClients.length === 0 && (
                  <p className="text-[10px] text-rose-400 font-mono mt-1 leading-normal">
                    * No vetted clients available under your custody. Make sure leads are cleared of duplicate conflicts.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Engagement Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AppointmentType)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="Meeting">Meeting</option>
                    <option value="Site Visit">Site Visit</option>
                    <option value="Reservation">Reservation</option>
                    <option value="Payment">Payment</option>
                    <option value="Submit Requirement">Submit Requirement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Engagement Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={datetime}
                    onChange={(e) => setDatetime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* SITE VISIT SPECIFICS */}
              {type === 'Site Visit' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3" id="site-visit-section">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Select Property Project *</label>
                    <select
                      required
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="">-- Choose Project Property --</option>
                      {projects.filter(p => p.isActive).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                      Project GPS Address (Uneditable)
                    </label>
                    <textarea
                      readOnly
                      rows={2}
                      value={projectId ? getProjectAddress(projectId) : 'Address auto-populates upon selection.'}
                      className="w-full bg-slate-950 text-xs text-slate-400 border border-slate-850 rounded-lg px-3 py-2 leading-relaxed resize-none cursor-not-allowed select-none outline-none"
                    />
                  </div>
                </div>
              )}

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
                  Secure Schedule
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* EDIT APPOINTMENT MODAL */}
      {isEditOpen && selectedApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" id="edit-appointment-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative"
            id="edit-apt-box"
          >
            <h3 className="text-lg font-bold text-slate-100 tracking-tight" id="edit-apt-title">
              Reschedule Appointment {selectedApt.id}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Modify scheduling and property selection.
            </p>

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4" id="edit-apt-form">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Select Client Lead *</label>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  {selectableClients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Engagement Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AppointmentType)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="Meeting">Meeting</option>
                    <option value="Site Visit">Site Visit</option>
                    <option value="Reservation">Reservation</option>
                    <option value="Payment">Payment</option>
                    <option value="Submit Requirement">Submit Requirement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Engagement Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={datetime}
                    onChange={(e) => setDatetime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {type === 'Site Visit' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3" id="edit-site-visit-section">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Select Property Project *</label>
                    <select
                      required
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="">-- Choose Project Property --</option>
                      {projects.filter(p => p.isActive).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                      Project GPS Address (Uneditable)
                    </label>
                    <textarea
                      readOnly
                      rows={2}
                      value={projectId ? getProjectAddress(projectId) : 'Address auto-populates.'}
                      className="w-full bg-slate-950 text-xs text-slate-400 border border-slate-850 rounded-lg px-3 py-2 leading-relaxed resize-none cursor-not-allowed select-none outline-none"
                    />
                  </div>
                </div>
              )}

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
                  Update Schedule
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
