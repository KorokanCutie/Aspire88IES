import React, { useState, useEffect } from 'react';
import { Appointment, Profile, Client, Project, AppointmentType, AppointmentStatus } from '../types';
import { db, generateAlphaId } from '../db';
import { useToast } from './Toast';
import { AlertDialog } from './AlertDialog';
import { Calendar, Plus, Search, Building, Clock, Lock, CheckCircle2, XCircle, X, Edit, Eye, ChevronLeft, ChevronRight, Printer, CalendarDays, Table, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';

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
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [clientSearch, setClientSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const recordsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, startDate, endDate]);

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

  const filteredMyClients = sortedMyClients.filter(client => {
    const term = clientSearch.toLowerCase();
    const fullName = `${client.first_name} ${client.middle_name ? client.middle_name + ' ' : ''}${client.last_name}`.toLowerCase();
    return fullName.includes(term) || client.id.toLowerCase().includes(term);
  });

  const filteredOtherClients = sortedOtherClients.filter(client => {
    const term = clientSearch.toLowerCase();
    const fullName = `${client.first_name} ${client.middle_name ? client.middle_name + ' ' : ''}${client.last_name}`.toLowerCase();
    return fullName.includes(term) || client.id.toLowerCase().includes(term);
  });

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

    let matchesDate = true;
    if (startDate || endDate) {
      const apptDate = new Date(a.appointment_time);
      const apptDateOnly = new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate()).getTime();
      
      if (startDate) {
        const start = new Date(startDate);
        const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
        if (apptDateOnly < startOnly) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
        if (apptDateOnly > endOnly) matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
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

  const todayStr = new Date().toISOString().split('T')[0];
  const next7Str = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  })();
  const next30Str = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  })();
  const prev30Str = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  })();

  const isTodayActive = startDate === todayStr && endDate === todayStr;
  const isNext7Active = startDate === todayStr && endDate === next7Str;
  const isNext30Active = startDate === todayStr && endDate === next30Str;
  const isPast30Active = startDate === prev30Str && endDate === todayStr;

  const getSelectedTimeframeLabel = () => {
    if (isTodayActive) return 'Today';
    if (isNext7Active) return 'Next 7 Days';
    if (isNext30Active) return 'Next 30 Days';
    if (isPast30Active) return 'Past 30 Days';
    if (!startDate && !endDate) return 'All-Time';
    
    const format = (dStr: string) => {
      if (!dStr) return 'Anytime';
      const d = new Date(dStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    return `${format(startDate)} to ${format(endDate)}`;
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Page setup
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Document Header Accent Banner
      doc.setFillColor(15, 23, 42); // slate-900 background
      doc.rect(0, 0, pageWidth, 24, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('ASPIRE88 ESTATES CORPORATION', 14, 15);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text('INTEGRATED ENTERPRISE SYSTEM • SCHEDULING DIVISION', 14, 20);
      
      // Report Meta
      const reportRef = `SEC-${new Date().getTime().toString().slice(-6)}`;
      const generatedAt = new Date().toLocaleString();
      doc.text(`REF: ${reportRef}`, pageWidth - 14, 13, { align: 'right' });
      doc.text(`GENERATED: ${generatedAt}`, pageWidth - 14, 18, { align: 'right' });
      
      // Body Header
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('OFFICIAL APPOINTMENTS SUMMARY REPORT', 14, 34);
      
      // Horizontal separator line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 38, pageWidth - 14, 38);
      
      // Report filters block
      doc.setFillColor(248, 250, 252); // soft grey bg
      doc.rect(14, 42, pageWidth - 28, 18, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, 42, pageWidth - 28, 18, 'S');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Requested By: ${currentProfile.first_name} ${currentProfile.last_name} (${currentProfile.role})`, 18, 48);
      doc.text(`Active Timeframe: ${getSelectedTimeframeLabel()}`, 18, 54);
      doc.text(`Status Filter: ${statusFilter}`, pageWidth / 2 + 10, 48);
      doc.text(`Search Term: ${searchTerm || 'None'}`, pageWidth / 2 + 10, 54);
      
      // Stats Block
      const statW = (pageWidth - 28 - 8) / 3;
      doc.setDrawColor(226, 232, 240);
      
      // Stat 1: Total
      doc.rect(14, 64, statW, 14, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL SCHEDULED', 14 + statW/2, 69, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(String(visibleAppointments.length), 14 + statW/2, 75, { align: 'center' });
      
      // Stat 2: Open
      doc.rect(14 + statW + 4, 64, statW, 14, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('OPEN STATUS', 14 + statW + 4 + statW/2, 69, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(79, 70, 229); // Indigo
      doc.text(String(visibleAppointments.filter(a => a.status === 'Open').length), 14 + statW + 4 + statW/2, 75, { align: 'center' });
      
      // Stat 3: Completed
      doc.rect(14 + statW * 2 + 8, 64, statW, 14, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('COMPLETED STATUS', 14 + statW * 2 + 8 + statW/2, 69, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(5, 150, 105); // Emerald
      doc.text(String(visibleAppointments.filter(a => a.status === 'Done').length), 14 + statW * 2 + 8 + statW/2, 75, { align: 'center' });
      
      // Table Header
      let currentY = 86;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, currentY, pageWidth - 28, 8, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(14, currentY, pageWidth - 28, 8, 'S');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      
      doc.text('APT REF', 18, currentY + 5.5);
      doc.text('CLIENT NAME', 38, currentY + 5.5);
      doc.text('CATEGORY & PROJECT', 76, currentY + 5.5);
      doc.text('DATE & TIME', 124, currentY + 5.5);
      doc.text('ASSIGNED AGENT', 160, currentY + 5.5);
      doc.text('STATUS', 186, currentY + 5.5);
      
      currentY += 8;
      
      // Table Body
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      
      visibleAppointments.forEach((appt) => {
        // Page break safety check
        if (currentY > pageHeight - 32) {
          doc.addPage();
          currentY = 20;
          
          // Re-draw small header on new pages
          doc.setFillColor(15, 23, 42);
          doc.rect(0, 0, pageWidth, 12, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text('ASPIRE88 ESTATES CORPORATION — SCHEDULING REPORT', 14, 8);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          
          currentY = 22;
          
          // Draw table headers again on new page
          doc.setFillColor(241, 245, 249);
          doc.rect(14, currentY, pageWidth - 28, 8, 'F');
          doc.setDrawColor(203, 213, 225);
          doc.rect(14, currentY, pageWidth - 28, 8, 'S');
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(71, 85, 105);
          doc.text('APT REF', 18, currentY + 5.5);
          doc.text('CLIENT NAME', 38, currentY + 5.5);
          doc.text('CATEGORY & PROJECT', 76, currentY + 5.5);
          doc.text('DATE & TIME', 124, currentY + 5.5);
          doc.text('ASSIGNED AGENT', 160, currentY + 5.5);
          doc.text('STATUS', 186, currentY + 5.5);
          
          currentY += 8;
          doc.setFont('helvetica', 'normal');
        }
        
        const client = clients.find(c => c.id === appt.client_id);
        const clientName = client ? `${client.first_name} ${client.last_name}` : 'Unknown Client';
        const proj = projects.find(p => p.id === appt.project_id);
        const projName = proj ? proj.name : 'Unknown Project';
        const agent = profiles.find(p => p.id === appt.agent_id);
        const agentName = agent ? `${agent.first_name} ${agent.last_name}` : 'Unknown';
        const apptDate = new Date(appt.appointment_time).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        // Draw grid row lines
        doc.setDrawColor(241, 245, 249);
        doc.line(14, currentY + 10, pageWidth - 14, currentY + 10);
        
        doc.setTextColor(15, 23, 42);
        // APT Ref
        doc.setFont('courier', 'bold');
        doc.text(appt.id, 18, currentY + 6);
        doc.setFont('helvetica', 'normal');
        
        // Client Name
        doc.text(clientName.length > 20 ? clientName.slice(0, 18) + '..' : clientName, 38, currentY + 6);
        
        // Category / Project details
        doc.setFont('helvetica', 'bold');
        doc.text(appt.appointment_type, 76, currentY + 4.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(projName.length > 30 ? projName.slice(0, 28) + '..' : projName, 76, currentY + 8);
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        
        // Date & Time
        doc.text(apptDate, 124, currentY + 6);
        
        // Assigned Agent
        doc.text(agentName.length > 16 ? agentName.slice(0, 14) + '..' : agentName, 160, currentY + 6);
        
        // Status with color coding
        if (appt.status === 'Open') {
          doc.setTextColor(79, 70, 229); // Indigo
          doc.setFont('helvetica', 'bold');
        } else if (appt.status === 'Done') {
          doc.setTextColor(5, 150, 105); // Emerald
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setTextColor(220, 38, 38); // Rose
          doc.setFont('helvetica', 'bold');
        }
        doc.text(appt.status, 186, currentY + 6);
        
        // Restore styling defaults
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        
        currentY += 10;
      });
      
      if (visibleAppointments.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184);
        doc.text('No appointments found matching the selected filter criteria.', pageWidth/2, currentY + 8, { align: 'center' });
        currentY += 14;
      }
      
      // Footer and Sign-off
      if (currentY > pageHeight - 36) {
        doc.addPage();
        currentY = 25;
      } else {
        currentY = Math.max(currentY + 10, pageHeight - 45);
      }
      
      doc.setDrawColor(226, 232, 240);
      doc.line(14, currentY, pageWidth - 14, currentY);
      
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text('This document represents an official administrative report of Aspire88 Estates Corporation.', 14, currentY + 5);
      doc.text('All entries are subject to strict compliance rules under active Row Level Security.', 14, currentY + 8);
      
      // Signature Line
      doc.setDrawColor(148, 163, 184);
      doc.line(pageWidth - 62, currentY + 12, pageWidth - 14, currentY + 12);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`${currentProfile.first_name} ${currentProfile.last_name}`, pageWidth - 38, currentY + 16, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(currentProfile.role.toUpperCase(), pageWidth - 38, currentY + 20, { align: 'center' });
      
      // Save PDF
      doc.save(`Aspire88-Schedule-${new Date().toISOString().split('T')[0]}.pdf`);
      toast('Printable PDF Report successfully compiled and downloaded.', 'success');
    } catch (err: any) {
      console.error('Error compiling PDF:', err);
      toast('Failed to compile PDF. Reverting to printer stream.', 'error');
      window.print();
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: prevMonthTotalDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthTotalDays - i)
      });
    }
    
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }
    
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }
    
    return days;
  };

  const getAppointmentsForDay = (dayDate: Date) => {
    return visibleAppointments.filter(appt => {
      const apptDate = new Date(appt.appointment_time);
      return apptDate.getDate() === dayDate.getDate() &&
             apptDate.getMonth() === dayDate.getMonth() &&
             apptDate.getFullYear() === dayDate.getFullYear();
    });
  };

  const prevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div>
      <div className="space-y-6 print:hidden">
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

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* Export PDF Button */}
          <button
            type="button"
            onClick={handleExportPDF}
            className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-950/20 transition-all cursor-pointer"
            title="Export currently filtered appointments list directly to a clean PDF report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          {/* Toggle Calendar View Button */}
          <button
            type="button"
            onClick={() => setViewMode(prev => prev === 'table' ? 'calendar' : 'table')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer border ${
              viewMode === 'calendar'
                ? 'bg-indigo-950/50 text-indigo-400 border-indigo-900/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
            }`}
            title="Switch between table list and month grid view"
          >
            {viewMode === 'table' ? (
              <>
                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                <span>Calendar View</span>
              </>
            ) : (
              <>
                <Table className="w-3.5 h-3.5 text-slate-400" />
                <span>Table View</span>
              </>
            )}
          </button>

          {currentProfile.role !== 'Treasurer' && (
            <button
              type="button"
              onClick={() => {
                setIsCreating(true);
                setEditingAppt(null);
                setSelectedClientId('');
                setSelectedProjectId('');
                setApptType('Meeting');
                setApptNotes('');
                setApptTime('');
              }}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-slate-100 px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-950/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Book Appointment</span>
            </button>
          )}
        </div>
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

      {/* Date Range Picker Row */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block sm:inline shrink-0">
            Appointment Timeframe:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-300 outline-none focus:border-indigo-500 font-sans cursor-pointer"
              />
              <span className="text-slate-500 text-xs font-medium">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-300 outline-none focus:border-indigo-500 font-sans cursor-pointer"
              />
            </div>

            {/* Selected active timeframe display badge */}
            <span className="px-2 py-1 bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 rounded-lg text-[10px] font-bold font-mono">
              Active: {getSelectedTimeframeLabel()}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const todayStr = new Date().toISOString().split('T')[0];
              setStartDate(todayStr);
              setEndDate(todayStr);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
              isTodayActive
                ? 'bg-indigo-600 border border-indigo-500 text-white shadow-sm shadow-indigo-950/20'
                : 'bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-300'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              const todayObj = new Date();
              const next7 = new Date();
              next7.setDate(todayObj.getDate() + 7);
              setStartDate(todayObj.toISOString().split('T')[0]);
              setEndDate(next7.toISOString().split('T')[0]);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
              isNext7Active
                ? 'bg-indigo-600 border border-indigo-500 text-white shadow-sm shadow-indigo-950/20'
                : 'bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-300'
            }`}
          >
            Next 7 Days
          </button>
          <button
            type="button"
            onClick={() => {
              const todayObj = new Date();
              const next30 = new Date();
              next30.setDate(todayObj.getDate() + 30);
              setStartDate(todayObj.toISOString().split('T')[0]);
              setEndDate(next30.toISOString().split('T')[0]);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
              isNext30Active
                ? 'bg-indigo-600 border border-indigo-500 text-white shadow-sm shadow-indigo-950/20'
                : 'bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-300'
            }`}
          >
            Next 30 Days
          </button>
          <button
            type="button"
            onClick={() => {
              const todayObj = new Date();
              const prev30 = new Date();
              prev30.setDate(todayObj.getDate() - 30);
              setStartDate(prev30.toISOString().split('T')[0]);
              setEndDate(todayObj.toISOString().split('T')[0]);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
              isPast30Active
                ? 'bg-indigo-600 border border-indigo-500 text-white shadow-sm shadow-indigo-950/20'
                : 'bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-300'
            }`}
          >
            Past 30 Days
          </button>
          <button
            type="button"
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-950/60 border border-rose-900/30 text-rose-400 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Calendar View Component */}
      {viewMode === 'calendar' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 print:hidden animate-fade-in">
          {/* Calendar Month Navigation Sub-Header */}
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date())}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-300 rounded-lg text-[10px] font-bold font-mono transition-colors cursor-pointer"
              >
                Today Month
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Weekdays Header Grid */}
          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider py-1 border-b border-slate-800/30">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Calendar Day Grid (42 cells) */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {getDaysInMonth(currentDate).map(({ day, isCurrentMonth, date: dayDate }, index) => {
              const dayAppts = getAppointmentsForDay(dayDate);
              const isToday = dayDate.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={index}
                  className={`min-h-[85px] sm:min-h-[120px] p-1 sm:p-2 border rounded-xl flex flex-col justify-between transition-all relative ${
                    isCurrentMonth 
                      ? 'bg-slate-950/40 border-slate-850' 
                      : 'bg-slate-950/10 border-slate-900/40 opacity-40'
                  } ${
                    isToday
                      ? 'ring-1 ring-indigo-500/80 border-indigo-500/50 bg-indigo-950/10 shadow-md shadow-indigo-950/20'
                      : 'hover:border-slate-800'
                  }`}
                >
                  {/* Day Number */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] sm:text-xs font-bold font-mono ${
                      isToday ? 'text-indigo-400 font-extrabold' : isCurrentMonth ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                      {day}
                    </span>
                    {dayAppts.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse sm:hidden" />
                    )}
                    {dayAppts.length > 0 && (
                      <span className="hidden sm:inline text-[9px] px-1.5 py-0.2 bg-slate-900 border border-slate-800 text-slate-400 font-mono font-bold rounded-full">
                        {dayAppts.length}
                      </span>
                    )}
                  </div>

                  {/* Appointments Mini List */}
                  <div className="flex-1 mt-1 sm:mt-1.5 space-y-1 overflow-y-auto max-h-[50px] sm:max-h-[80px] custom-scrollbar">
                    {dayAppts.map(appt => {
                      let badgeColors = 'bg-slate-900/65 border-slate-800 text-slate-300';
                      if (appt.appointment_type === 'Site Visit') {
                        badgeColors = 'bg-amber-950/40 border-amber-900/30 text-amber-400';
                      } else if (appt.appointment_type === 'Payment' || appt.appointment_type === 'Submit Requirement') {
                        badgeColors = 'bg-emerald-950/40 border-emerald-900/30 text-emerald-400';
                      } else if (appt.appointment_type === 'Meeting') {
                        badgeColors = 'bg-indigo-950/40 border-indigo-900/30 text-indigo-400';
                      } else if (appt.appointment_type === 'Reservation') {
                        badgeColors = 'bg-purple-950/40 border-purple-900/30 text-purple-400';
                      }

                      const timeStr = new Date(appt.appointment_time).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      });

                      const client = clients.find(c => c.id === appt.client_id);
                      const clientName = client ? `${client.first_name} ${client.last_name}` : 'Unknown';

                      return (
                        <button
                          key={appt.id}
                          type="button"
                          onClick={() => triggerEdit(appt)}
                          className={`w-full text-left truncate text-[8px] sm:text-[10px] px-1.5 py-0.5 sm:py-1 rounded border font-sans font-semibold transition-all cursor-pointer block hover:scale-[1.02] active:scale-[0.98] ${badgeColors}`}
                          title={`${timeStr} • ${appt.appointment_type} with ${clientName}`}
                        >
                          <span className="font-mono font-bold opacity-80 mr-1">{timeStr}</span>
                          <span className="hidden sm:inline font-sans font-medium text-[9px] opacity-90">{appt.appointment_type} • </span>
                          <span className="font-sans truncate">{clientName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lists display table */}
      {viewMode === 'table' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl print:hidden">
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
                            <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm ${
                              appt.status === 'Open'
                                ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400'
                                : appt.status === 'Done'
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                            }`}>
                              <span className={`w-2 h-2 rounded-full animate-pulse ${
                                appt.status === 'Open' ? 'bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.6)]' :
                                appt.status === 'Done' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]' :
                                'bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.6)]'
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
      )}

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
                    <span className="text-[9px] text-indigo-400 font-mono">(Role-Based Sorting & Searching Loaded)</span>
                  </label>
                  
                  {/* Client search text box */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                      <Search className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="Type name, ID, or agent ID to filter client drop-down list below..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      disabled={editingAppt ? editingAppt.status !== 'Open' : false}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-8 text-xs text-slate-200 outline-none focus:border-indigo-500 font-sans"
                    />
                    {clientSearch && (
                      <button
                        type="button"
                        onClick={() => setClientSearch('')}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 text-xs font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    required
                    disabled={editingAppt ? editingAppt.status !== 'Open' : false}
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl py-2 px-3 text-xs text-slate-200 cursor-pointer outline-none focus:border-indigo-500 font-sans font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Choose client --</option>
                    {filteredMyClients.length > 0 && (
                      <optgroup label="My Registered Clients">
                        {filteredMyClients.map(client => (
                          <option key={client.id} value={client.id}>
                            {client.first_name} {client.middle_name ? client.middle_name + ' ' : ''}{client.last_name} ({client.id}) [Agent/Broker ID: {client.created_by}]
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {filteredOtherClients.length > 0 && (
                      <optgroup label="Other Corporate Team Clients">
                        {filteredOtherClients.map(client => {
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
                    {filteredMyClients.length === 0 && filteredOtherClients.length === 0 && (
                      <option disabled>No matching clear-claim clients available</option>
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

              <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                {/* Direct Finalize/Cancel Actions for Open Tickets */}
                {editingAppt && editingAppt.status === 'Open' && currentProfile.role !== 'Treasurer' ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => triggerStatusChange(editingAppt, 'Done')}
                      className="flex-1 sm:flex-none p-2 px-3 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 font-bold rounded-xl border border-emerald-800/40 transition-all text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      title="Mark appointment as Done"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerStatusChange(editingAppt, 'Cancelled')}
                      className="flex-1 sm:flex-none p-2 px-3 bg-rose-955 hover:bg-rose-900 text-rose-300 font-bold rounded-xl border border-rose-808/40 transition-all text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      title="Cancel this appointment"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="hidden sm:block" />
                )}

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setEditingAppt(null);
                    }}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-all animate-fade-in"
                  >
                    {editingAppt && editingAppt.status !== 'Open' ? 'Close View' : 'Close'}
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

      {/* Professional Printable Summary Report */}
      <div className="print-only-report bg-white text-slate-900 p-8 font-serif leading-relaxed">
        <div className="border-b-4 border-slate-900 pb-4 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight font-sans text-slate-900">
              Aspire88 Estates Corporation
            </h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase mt-1">
              Integrated Enterprise Systems • Scheduling Division
            </p>
          </div>
          <div className="text-right text-[10px] font-mono text-slate-600">
            <p>Report Ref: SEC-{new Date().getTime().toString().slice(-6)}</p>
            <p>Generated: {new Date().toLocaleString()}</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-base font-bold uppercase tracking-wider font-sans text-slate-800">
            Official Appointments Summary Report
          </h2>
          <div className="grid grid-cols-2 gap-4 mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-sans">
            <div>
              <p><strong className="text-slate-700">Requested By:</strong> {currentProfile.first_name} {currentProfile.last_name} ({currentProfile.role})</p>
              <p><strong className="text-slate-700">Active Timeframe:</strong> {getSelectedTimeframeLabel()}</p>
            </div>
            <div>
              <p><strong className="text-slate-700">Status Filter:</strong> {statusFilter}</p>
              <p><strong className="text-slate-700">Search Filter:</strong> {searchTerm || 'None'}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6 text-center font-sans">
          <div className="p-3 border border-slate-200 rounded-lg">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Scheduled</div>
            <div className="text-lg font-bold mt-1 text-slate-800">{visibleAppointments.length}</div>
          </div>
          <div className="p-3 border border-slate-200 rounded-lg">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Open Status</div>
            <div className="text-lg font-bold mt-1 text-indigo-600">
              {visibleAppointments.filter(a => a.status === 'Open').length}
            </div>
          </div>
          <div className="p-3 border border-slate-200 rounded-lg">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Completed Status</div>
            <div className="text-lg font-bold mt-1 text-emerald-600">
              {visibleAppointments.filter(a => a.status === 'Done').length}
            </div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-left text-[10px] border-collapse border border-slate-300 font-sans">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase text-[8px] font-bold tracking-wider">
              <th className="p-2.5 border-r border-slate-300">APT Ref</th>
              <th className="p-2.5 border-r border-slate-300">Client Name</th>
              <th className="p-2.5 border-r border-slate-300">Category & Project</th>
              <th className="p-2.5 border-r border-slate-300">Date & Time</th>
              <th className="p-2.5 border-r border-slate-300">Assigned Agent</th>
              <th className="p-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {visibleAppointments.map(appt => {
              const client = clients.find(c => c.id === appt.client_id);
              const clientName = client ? `${client.first_name} ${client.last_name}` : 'Unknown Client';
              const proj = projects.find(p => p.id === appt.project_id);
              const projName = proj ? proj.name : 'Unknown Project';
              const agent = profiles.find(p => p.id === appt.agent_id);
              const agentName = agent ? `${agent.first_name} ${agent.last_name}` : 'Unknown';
              const apptDate = new Date(appt.appointment_time).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <tr key={appt.id} className="text-slate-800">
                  <td className="p-2.5 border-r border-slate-200 font-mono font-bold">{appt.id}</td>
                  <td className="p-2.5 border-r border-slate-200 font-medium">{clientName}</td>
                  <td className="p-2.5 border-r border-slate-200">
                    <span className="font-semibold text-slate-700">{appt.appointment_type}</span>
                    {appt.appointment_type === 'Site Visit' && appt.project_id && (
                      <span className="block text-[8px] text-slate-500">{projName} — {getProjectAddress(appt.project_id)}</span>
                    )}
                    {appt.appointment_type !== 'Site Visit' && (
                      <span className="block text-[8px] text-slate-500">{projName}</span>
                    )}
                  </td>
                  <td className="p-2.5 border-r border-slate-200 font-medium">{apptDate}</td>
                  <td className="p-2.5 border-r border-slate-200">{agentName}</td>
                  <td className={`p-2.5 font-bold ${appt.status === 'Open' ? 'text-indigo-600' : appt.status === 'Done' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {appt.status}
                  </td>
                </tr>
              );
            })}
            {visibleAppointments.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400 italic font-sans">
                  No records match the current filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer Sign-off */}
        <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs font-sans">
          <div>
            <p className="italic text-slate-500 text-[10px]">
              This document represents an official administrative report of Aspire88 Estates Corporation. All entries are subject to corporate compliance rules and regulations.
            </p>
          </div>
          <div className="flex flex-col items-end justify-end">
            <div className="border-t border-slate-400 w-48 pt-1 text-center mt-4">
              <p className="font-bold text-slate-700">{currentProfile.first_name} {currentProfile.last_name}</p>
              <p className="text-[9px] text-slate-500 uppercase">{currentProfile.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppointmentsManager;
