import React, { useState, useEffect } from 'react';
import { Appointment, Client, Project, Profile, AppointmentType } from '../types';
import { Calendar, Clock, ArrowRight, CheckCircle2, Check, X, Edit2, AlertCircle } from 'lucide-react';
import { db } from '../db';
import { useToast } from './Toast';

interface TodayAppointmentsProps {
  currentProfile: Profile;
  profiles: Profile[];
  appointments: Appointment[];
  clients: Client[];
  projects: Project[];
  onViewAllClick: () => void;
  onRefresh: () => void;
  startDateFilter?: string;
  endDateFilter?: string;
}

export function TodayAppointments({
  currentProfile,
  profiles,
  appointments,
  clients,
  projects,
  onViewAllClick,
  onRefresh,
  startDateFilter,
  endDateFilter,
}: TodayAppointmentsProps) {
  const { toast } = useToast();

  // State for Edit Modal
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  
  // Edit Form Fields
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [apptType, setApptType] = useState<AppointmentType>('Meeting');
  const [apptNotes, setApptNotes] = useState('');
  const [apptTime, setApptTime] = useState('');

  // Sync edit form fields when editingAppt is set
  useEffect(() => {
    if (editingAppt) {
      setSelectedProjectId(editingAppt.project_id || '');
      setApptType(editingAppt.appointment_type);
      setApptNotes(editingAppt.notes || '');
      
      // Convert ISO string to datetime-local format (YYYY-MM-DDThh:mm)
      if (editingAppt.appointment_time) {
        const d = new Date(editingAppt.appointment_time);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setApptTime(formatted);
      } else {
        setApptTime('');
      }
    }
  }, [editingAppt]);

  // Get active downline agent IDs if current profile is a Broker
  const mySubAgents = profiles
    .filter(p => p.parent_broker_id === currentProfile.id)
    .map(p => p.id);

  // Filter to today's appointments for this specific Broker or Agent
  const today = new Date();
  const todayAppts = appointments.filter(appt => {
    // Must be OPEN status
    if (appt.status !== 'Open') return false;

    // 1. Role-based view logic
    let isRoleMatch = false;
    if (currentProfile.role === 'Broker') {
      isRoleMatch = appt.agent_id === currentProfile.id || mySubAgents.includes(appt.agent_id);
    } else if (currentProfile.role === 'Agent') {
      isRoleMatch = appt.agent_id === currentProfile.id;
    }
    if (!isRoleMatch) return false;

    // 2. Date match or Range match
    const apptDate = new Date(appt.appointment_time);
    
    if (startDateFilter || endDateFilter) {
      const apptDateOnly = new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate()).getTime();
      if (startDateFilter) {
        const start = new Date(startDateFilter);
        const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
        if (apptDateOnly < startOnly) return false;
      }
      if (endDateFilter) {
        const end = new Date(endDateFilter);
        const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
        if (apptDateOnly > endOnly) return false;
      }
      return true;
    } else {
      return (
        apptDate.getFullYear() === today.getFullYear() &&
        apptDate.getMonth() === today.getMonth() &&
        apptDate.getDate() === today.getDate()
      );
    }
  });

  // Sort them chronologically by time
  const sortedTodayAppts = [...todayAppts].sort(
    (a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime()
  );

  const getClientName = (cid: string) => {
    const found = clients.find(c => c.id === cid);
    return found ? `${found.first_name} ${found.last_name}` : cid;
  };

  const getProjectName = (pid?: string | null) => {
    if (!pid) return null;
    const found = projects.find(p => p.id === pid);
    return found ? found.name : pid;
  };

  const getProjectAddress = (id?: string | null) => {
    if (!id) return '';
    const found = projects.find(p => p.id === id);
    return found ? found.address : '';
  };

  // Quick Action: Mark Done
  const handleMarkDone = async (appt: Appointment) => {
    try {
      const updated: Appointment = {
        ...appt,
        status: 'Done'
      };
      await db.saveAppointment(updated);
      toast(`Appointment ${appt.id} successfully completed!`, 'success');
      onRefresh();
    } catch (e) {
      toast('Failed to update appointment status.', 'error');
    }
  };

  // Quick Action: Cancel
  const handleCancel = async (appt: Appointment) => {
    try {
      const updated: Appointment = {
        ...appt,
        status: 'Cancelled'
      };
      await db.saveAppointment(updated);
      toast(`Appointment ${appt.id} successfully cancelled.`, 'info');
      onRefresh();
    } catch (e) {
      toast('Failed to cancel appointment.', 'error');
    }
  };

  // Submit Edit Form
  const handleUpdateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppt) return;

    if (!apptTime) {
      toast('Please supply scheduled date and time variables.', 'error');
      return;
    }

    const localTime = new Date(apptTime);
    const hours = localTime.getHours();
    const minutes = localTime.getMinutes();
    if (hours < 7 || hours > 18 || (hours === 18 && minutes > 0)) {
      toast('Operation Prohibited: Appointments must be booked within business hours (7:00 AM to 6:00 PM).', 'error');
      return;
    }

    const finalProjectId = apptType === 'Site Visit' ? selectedProjectId : null;

    try {
      const updated: Appointment = {
        ...editingAppt,
        appointment_type: apptType,
        appointment_time: localTime.toISOString(),
        notes: apptNotes,
        project_id: finalProjectId,
      };

      await db.saveAppointment(updated);
      toast(`Appointment ${editingAppt.id} successfully updated!`, 'success');
      setEditingAppt(null);
      onRefresh();
    } catch (e) {
      toast('Failed to update appointment details.', 'error');
    }
  };

  // Only render on Broker or Agent dashboard
  if (currentProfile.role !== 'Broker' && currentProfile.role !== 'Agent') {
    return null;
  }

  return (
    <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-5 shadow-2xl animate-fade-in space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-rose-500 animate-pulse" />
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            {startDateFilter || endDateFilter ? 'Scheduled Appointments' : "Today's Scheduled Appointments"} ({sortedTodayAppts.length})
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          {startDateFilter || endDateFilter ? `${startDateFilter || 'All-Time'} to ${endDateFilter || 'All-Time'}` : today.toLocaleDateString('en-US', { dateStyle: 'medium' })}
        </span>
      </div>

      {sortedTodayAppts.length === 0 ? (
        <div className="py-8 text-center bg-slate-950/30 border border-slate-850/40 rounded-xl">
          <CheckCircle2 className="w-7 h-7 text-emerald-500/80 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-400">
            {startDateFilter || endDateFilter ? 'No open appointments found for the selected timeframe.' : 'No open appointments booked for today.'}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Enjoy your schedule, or view your wider client pipelines.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-fade-in">
                    <th className="py-4 px-5">APT Ref</th>
                    <th className="py-4 px-5">Target Client Node</th>
                    <th className="py-4 px-5">Appointment Category</th>
                    <th className="py-4 px-5">Timestamps</th>
                    <th className="py-4 px-5">Assigned Agent</th>
                    <th className="py-4 px-5">Progress Status</th>
                    <th className="py-4 px-5 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {sortedTodayAppts.map((appt) => {
                    const isSiteVisit = appt.appointment_type === 'Site Visit';
                    
                    // Lookup assigned agent full name
                    const agentProfile = profiles.find(p => p.id === appt.agent_id);
                    const agentFullName = agentProfile 
                      ? `${agentProfile.first_name} ${agentProfile.middle_name ? agentProfile.middle_name + ' ' : ''}${agentProfile.last_name}` 
                      : 'Unspecified Agent';

                    return (
                      <tr key={appt.id} className="hover:bg-slate-950/20 transition-colors">
                        <td className="py-4 px-5">
                          <button
                            onClick={() => setEditingAppt(appt)}
                            title="Click to edit appointment details"
                            className="font-mono font-bold tracking-wider text-indigo-400 hover:text-indigo-350 underline cursor-pointer text-left focus:outline-none flex items-center gap-1 group"
                          >
                            <span>{appt.id}</span>
                            <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                            <div className="text-xs font-semibold text-slate-205">
                              {agentFullName}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                            <span className="w-2 h-2 rounded-full animate-pulse bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.6)]" />
                            {appt.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleMarkDone(appt)}
                              title="Mark appointment as Completed (Done)"
                              className="p-1.5 bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-950 rounded-lg cursor-pointer transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCancel(appt)}
                              title="Cancel Appointment"
                              className="p-1.5 bg-rose-950/60 border border-rose-800/40 text-rose-400 hover:bg-rose-950 rounded-lg cursor-pointer transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onViewAllClick}
              className="group text-[11px] text-indigo-400 hover:text-indigo-300 font-bold tracking-wide uppercase flex items-center gap-1 cursor-pointer transition-all hover:translate-x-0.5"
            >
              View All Operational Appointments
            </button>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {editingAppt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950/40 border-b border-slate-800/80">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                Edit Appointment {editingAppt.id}
              </h3>
              <button
                onClick={() => setEditingAppt(null)}
                className="text-slate-500 hover:text-slate-350 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleUpdateAppointment} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Target Client Node
                </label>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/60 font-medium text-slate-300">
                  {getClientName(editingAppt.client_id)}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Appointment Category
                </label>
                <select
                  value={apptType}
                  onChange={(e) => setApptType(e.target.value as AppointmentType)}
                  className="w-full bg-slate-950 rounded-xl border border-slate-800/60 p-3 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="Meeting">Meeting</option>
                  <option value="Site Visit">Site Visit</option>
                  <option value="Reservation Sign-off">Reservation Sign-off</option>
                  <option value="Contract Signing">Contract Signing</option>
                </select>
              </div>

              {apptType === 'Site Visit' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Select Target Project Map
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    required
                    className="w-full bg-slate-950 rounded-xl border border-slate-800/60 p-3 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="">-- Choose Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.address})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Scheduled Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={apptTime}
                  onChange={(e) => setApptTime(e.target.value)}
                  className="w-full bg-slate-950 rounded-xl border border-slate-800/60 p-3 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Meeting Notes & Coordinates
                </label>
                <textarea
                  value={apptNotes}
                  onChange={(e) => setApptNotes(e.target.value)}
                  placeholder="Insert schedule notes, directions, or contact guidelines here..."
                  rows={3}
                  className="w-full bg-slate-950 rounded-xl border border-slate-800/60 p-3 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setEditingAppt(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-350 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-450 text-slate-950 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TodayAppointments;
