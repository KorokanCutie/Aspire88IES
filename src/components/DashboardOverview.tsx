/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign, 
  AlertTriangle,
  Award,
  Building
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { UserProfile, Client, Appointment, Project, Developer } from '../types';

interface DashboardOverviewProps {
  currentUser: UserProfile;
  profiles: UserProfile[];
  clients: Client[];
  appointments: Appointment[];
  projects: Project[];
  developers: Developer[];
}

export default function DashboardOverview({
  currentUser,
  profiles,
  clients,
  appointments,
  projects,
  developers
}: DashboardOverviewProps) {
  const [phTime, setPhTime] = useState('');
  const [phDate, setPhDate] = useState('');

  // Running clock in Philippine Time (PST: UTC+8)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format specifically for Asia/Manila timezone
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      setPhTime(timeFormatter.format(now));
      setPhDate(dateFormatter.format(now));
    };

    updateTime();
    const timerId = setInterval(updateTime, 1000);
    return () => clearInterval(timerId);
  }, []);

  // Compute stats
  const activeClients = clients.filter(c => c.isActive).length;
  const pendingConflictsCount = clients.filter(c => c.conflictStatus === 'Pending').length;
  const activeProjectsCount = projects.filter(p => p.isActive).length;
  const openAppointments = appointments.filter(a => a.status === 'Open').length;

  // Filter lists based on role permissions
  const visibleAgents = profiles.filter(p => p.role === 'Agent' && p.isActive);
  const visibleBrokers = profiles.filter(p => p.role === 'Broker' && p.isActive);

  // Recharts metric arrays
  const appointmentsOverTime = [
    { name: 'Mon', appointments: 3 },
    { name: 'Tue', appointments: 5 },
    { name: 'Wed', appointments: openAppointments + 1 },
    { name: 'Thu', appointments: 4 },
    { name: 'Fri', appointments: 8 },
    { name: 'Sat', appointments: 11 },
    { name: 'Sun', appointments: 2 },
  ];

  const projectsSummary = developers.map((dev, idx) => {
    const devProjects = projects.filter(p => p.developerId === dev.id);
    return {
      name: dev.name.split(' ')[0], // Short name
      count: devProjects.length,
      fill: ['#f59e0b', '#3b82f6', '#10b981', '#a855f7'][idx % 4]
    };
  });

  return (
    <div className="space-y-6" id="dashboard-overview-root">
      {/* Upper header segment: Welcome & PH Time Clock */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl" id="dashboard-clock-header">
        <div id="welcome-text-group">
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight" id="dashboard-greeting">
            Welcome Back, <span className="text-amber-500 font-extrabold">{currentUser.firstName}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider" id="dashboard-role-badge">
            Secure Role Tier: <span className="text-slate-200">{currentUser.role}</span> • {currentUser.id}
          </p>
        </div>

        {/* PH TIME HUB */}
        <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 px-5 py-3 rounded-xl min-w-[280px]" id="ph-time-hub">
          <div className="p-2.5 bg-amber-500/10 rounded-xl" id="clock-icon-bg">
            <Clock className="w-6 h-6 text-amber-500 animate-pulse" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest font-mono">
              Philippine Standard Time (PST)
            </p>
            <p className="text-xl font-bold text-slate-100 font-mono tracking-tight mt-0.5" id="running-time">
              {phTime || '00:00:00 AM'}
            </p>
            <p className="text-[11px] text-slate-400 font-medium font-sans" id="running-date">
              {phDate || 'Loading calendar date...'}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-grid">
        {/* Card 1: Active Clients */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg"
          id="kpi-active-clients"
        >
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Client Base</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1.5 font-mono">{activeClients}</h3>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3 h-3" /> Fully Persistent Portfolio
            </p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl" id="kpi-icon-1">
            <Users className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Card 2: Open Appointments */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg"
          id="kpi-open-appointments"
        >
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Open Appointments</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1.5 font-mono">{openAppointments}</h3>
            <p className="text-[11px] text-amber-500 mt-1 font-medium">
              Active Site Visits & Meetings
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl" id="kpi-icon-2">
            <Calendar className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Card 3: Active Projects */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg"
          id="kpi-active-projects"
        >
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Projects</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1.5 font-mono">{activeProjectsCount}</h3>
            <p className="text-[11px] text-sky-400 mt-1 font-medium">
              From {developers.length} Developers
            </p>
          </div>
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl" id="kpi-icon-3">
            <Building className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Card 4: Pending Conflicts */}
        <motion.div 
          whileHover={{ y: -3 }}
          className={`border p-5 rounded-2xl flex items-center justify-between shadow-lg transition ${
            pendingConflictsCount > 0 
              ? 'bg-rose-500/5 border-rose-500/25 animate-pulse' 
              : 'bg-slate-900 border-slate-800'
          }`}
          id="kpi-duplicate-conflicts"
        >
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Duplicate Disputes</p>
            <h3 className={`text-2xl font-bold mt-1.5 font-mono ${pendingConflictsCount > 0 ? 'text-rose-400' : 'text-slate-100'}`}>
              {pendingConflictsCount}
            </h3>
            <p className={`text-[11px] mt-1 font-medium ${pendingConflictsCount > 0 ? 'text-rose-400 font-semibold' : 'text-slate-500'}`}>
              {pendingConflictsCount > 0 ? 'Needs Decision!' : 'No duplicates flagged'}
            </p>
          </div>
          <div className={`p-3 rounded-xl ${pendingConflictsCount > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-500'}`} id="kpi-icon-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </motion.div>
      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-charts-grid">
        {/* Chart 1: Appointments schedule projection */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between" id="chart-panel-appointments">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 tracking-tight uppercase font-mono">
              Weekly Appointments Volume
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Distribution of scheduled Site Visits, Payments, and Client Meetings.
            </p>
          </div>
          <div className="h-64 mt-6" id="recharts-appointments-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={appointmentsOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorApts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="appointments" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorApts)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Projects per Developer representation */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between" id="chart-panel-developers">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 tracking-tight uppercase font-mono">
              Developer Inventory Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Active projects registered per partner developer corporation.
            </p>
          </div>
          <div className="h-64 mt-6 flex items-center justify-center" id="recharts-projects-container">
            {projectsSummary.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No developers/projects registered</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectsSummary} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {projectsSummary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Roster list representation (Aesthetic section) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl" id="team-roster-overview">
        <div className="flex items-center justify-between" id="roster-header">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 tracking-tight uppercase font-mono">
              Corporate Roster Quick View
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Active real estate brokers and certified sales agents representing Aspire88.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono" id="roster-pills">
            <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold">
              {visibleBrokers.length} Brokers
            </span>
            <span className="px-2 py-1 rounded bg-sky-500/10 text-sky-500 border border-sky-500/20 font-semibold">
              {visibleAgents.length} Agents
            </span>
          </div>
        </div>

        {/* Dynamic Cards Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="roster-cards-container">
          {profiles.filter(p => p.role !== 'Admin' && p.isActive).slice(0, 3).map((profile) => (
            <div 
              key={profile.id}
              className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start gap-3"
              id={`roster-card-${profile.id}`}
            >
              <div className="mt-1 p-2 bg-slate-800 rounded-lg text-slate-400" id={`avatar-roster-${profile.id}`}>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {profile.firstName} {profile.lastName}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  ID: {profile.id} • {profile.role}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {profile.contactNumber}
                </p>
              </div>
            </div>
          ))}
          {profiles.filter(p => p.role !== 'Admin' && p.isActive).length === 0 && (
            <p className="text-xs text-slate-500 italic col-span-full">No active brokers or agents in roster yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
