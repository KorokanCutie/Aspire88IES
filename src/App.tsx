import { useEffect, useState } from 'react';
import { Profile, Developer, Project, Client, DuplicateConflict, Appointment } from './types';
import { db } from './db';
import { sendEmail } from './resend';
import { ToastProvider, useToast } from './components/Toast';
import { PstClock } from './components/PstClock';
import { AlertDialog } from './components/AlertDialog';
import { LoginForm } from './components/LoginForm';
import { ForcePasswordChange } from './components/ForcePasswordChange';
import { DashboardStats } from './components/DashboardStats';
import { ProfilesManager } from './components/ProfilesManager';
import { ClientsManager } from './components/ClientsManager';
import { ConflictsManager } from './components/ConflictsManager';
import { ProjectsManager } from './components/ProjectsManager';
import { AppointmentsManager } from './components/AppointmentsManager';
import { AuditLogsManager } from './components/AuditLogsManager';
import { TodayAppointments } from './components/TodayAppointments';
import { MyProfileManager } from './components/MyProfileManager';
import { SecurityAndNotificationsManager } from './components/SecurityAndNotificationsManager';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building,
  KeyRound,
  Shield,
  Users,
  UserCheck,
  Scale,
  Calendar,
  Grid,
  Database,
  Terminal,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Menu,
  X,
  Sparkles,
  HelpCircle,
  BarChart3,
  Sun,
  Moon,
  Settings,
  User,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AppProperties, updateAppProperties } from './appProperties';

function DashboardShell() {
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Auth Session Variables
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  
  // Database Tables Lists
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [conflicts, setConflicts] = useState<DuplicateConflict[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Developer UI Variables
  const [showConfigTerminal, setShowConfigTerminal] = useState(false);

  // Tab View state
  const [activeTab, setActiveTab] = useState('Overview');

  // Defensive Alert dialogue
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    title: '',
    description: '',
    onConfirm: () => {}
  });

  // Mobile navigation overlay
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theme Switching State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('aspire88_theme') as 'dark' | 'light') || 'dark';
  });

  // Overview Tab Date Range States
  const [overviewStartDate, setOverviewStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [overviewEndDate, setOverviewEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Filter helper for date range
  const filterByDateRange = <T extends { created_at?: string; appointment_time?: string }>(
    list: T[],
    startDateStr: string,
    endDateStr: string,
    dateKey: 'created_at' | 'appointment_time' = 'created_at'
  ): T[] => {
    if (!startDateStr && !endDateStr) return list;
    return list.filter(item => {
      const itemDateStr = item[dateKey] || item['created_at'];
      if (!itemDateStr) return true;
      const date = new Date(itemDateStr);
      const itemVal = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

      if (startDateStr) {
        const start = new Date(startDateStr);
        const startVal = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
        if (itemVal < startVal) return false;
      }
      if (endDateStr) {
        const end = new Date(endDateStr);
        const endVal = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
        if (itemVal > endVal) return false;
      }
      return true;
    });
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('aspire88_theme', nextTheme);
  };

  // Check and send email reminders for upcoming appointments
  const checkUpcomingAppointments = async (currentAppts: Appointment[], currentProfiles: Profile[]) => {
    const now = Date.now();
    const oneHourMs = 60 * 60 * 1000;
    
    // Find open appointments that are scheduled between now and 1 hour from now, and have not been notified yet.
    const upcoming = currentAppts.filter(appt => {
      if (appt.status !== 'Open' || appt.notified1Hr) return false;
      const apptTime = new Date(appt.appointment_time).getTime();
      const diff = apptTime - now;
      // 1 hour reminder triggers when the appointment is within 1 hour in the future
      return diff > 0 && diff <= oneHourMs;
    });

    if (upcoming.length === 0) return;

    for (const appt of upcoming) {
      const agent = currentProfiles.find(p => p.id === appt.agent_id);
      if (agent && agent.email) {
        const apptDate = new Date(appt.appointment_time);
        
        // 12-hour format scheduled time as requested
        const timeStr = apptDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        const dateStr = apptDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });

        const clientObj = clients.find(c => c.id === appt.client_id);
        const clientName = clientObj ? `${clientObj.first_name} ${clientObj.last_name}` : 'Unknown Client';

        const subject = `[Reminder] Upcoming Appointment - ${appt.appointment_type} in Less Than 1 Hour`;
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #334155; line-height: 1.6; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <!-- Brand Header -->
            <div style="border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; text-align: left;">
              <h2 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 800; letter-spacing: -0.025em;">ASPIRE88 ESTATES CORPORATION INTEGRATED ENTERPRISE SYSTEM</h2>
              <span style="font-size: 11px; color: #4f46e5; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">Integrated Enterprise System</span>
            </div>

            <!-- Main Content -->
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 14px; color: #0f172a; font-weight: 600;">
              Dear ${agent.first_name} ${agent.last_name},
            </p>
            <p style="margin-top: 0; margin-bottom: 20px; font-size: 14px; color: #475569;">
              This is an automated operational alert reminding you that you have an upcoming client engagement scheduled to begin in less than <strong>one (1) hour</strong>.
            </p>

            <!-- Details Block -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <h4 style="margin-top: 0; margin-bottom: 14px; font-size: 12px; font-weight: 700; color: #475569; letter-spacing: 0.05em; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                Engagement Details
              </h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500; width: 35%; vertical-align: top;">Appointment ID:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: 600;">${appt.id}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500; vertical-align: top;">Client:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${clientName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500; vertical-align: top;">Engagement Type:</td>
                  <td style="padding: 6px 0; color: #4f46e5; font-weight: 700;">${appt.appointment_type}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500; vertical-align: top;">Scheduled Time:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${dateStr} at ${timeStr}</td>
                </tr>
                ${appt.address ? `
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500; vertical-align: top;">Location:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 500;">${appt.address}</td>
                </tr>` : ''}
                ${appt.notes ? `
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500; vertical-align: top;">Preparatory Notes:</td>
                  <td style="padding: 6px 0; color: #475569; font-weight: 500; font-style: italic;">${appt.notes}</td>
                </tr>` : ''}
              </table>
            </div>

            <!-- Call to Action -->
            <p style="font-size: 14px; color: #475569; margin-bottom: 24px;">
              Please review your client's files, prepare any necessary marketing literature, and ensure you arrive on schedule to maintain professional standards.
            </p>

            <div style="text-align: center; margin-bottom: 28px;">
              <a href="https://aspire88.netlify.app" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;">
                Access ERP Portal
              </a>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0 0 4px 0;">This is an automated operational alert from the Aspire88 Estates Corporation Integrated Enterprise System schedule tracker.</p>
              <p style="margin: 0;">&copy; 2026 Aspire88 Estates Corporation Integrated Enterprise System. All rights reserved.</p>
            </div>
          </div>
        `;

        console.log(`[Reminder Check] Sending reminder to ${agent.email} for appointment ${appt.id}`);
        
        // Mark as notified first to prevent double-sending
        appt.notified1Hr = true;
        await db.saveAppointment(appt);
        
        sendEmail(agent.email, subject, html).catch(err => {
          console.error(`Failed to send reminder email for ${appt.id}:`, err);
        });
      } else {
        // If agent doesn't have email or is not found, we still mark it notified to avoid repeatedly checking
        appt.notified1Hr = true;
        await db.saveAppointment(appt);
      }
    }
  };

  // Load and refresh dataset
  const reloadData = async () => {
    const p = await db.getProfiles();
    const d = await db.getDevelopers();
    const pr = await db.getProjects();
    const c = await db.getClients();
    const cf = await db.getConflicts();
    const ap = await db.getAppointments();

    setProfiles(p);
    setDevelopers(d);
    setProjects(pr);
    setClients(c);
    setConflicts(cf);
    setAppointments(ap);

    // Run the appointment reminder check
    await checkUpcomingAppointments(ap, p);

    // Lockout trigger check: Check if current active user was deactivated in background
    if (currentUser) {
      const activeCurrent = p.find(prof => prof.id === currentUser.id);
      if (activeCurrent) {
        if (!activeCurrent.is_active) {
          toast('Authentication Failure: This account has been deactivated by administration.', 'error');
          setCurrentUser(null);
        } else {
          // Sync current profile changes immediately if any field differs to avoid infinite loop
          if (
            activeCurrent.first_name !== currentUser.first_name ||
            activeCurrent.last_name !== currentUser.last_name ||
            activeCurrent.middle_name !== currentUser.middle_name ||
            activeCurrent.email !== currentUser.email ||
            activeCurrent.contact_number !== currentUser.contact_number ||
            activeCurrent.address !== currentUser.address ||
            activeCurrent.prc_license !== currentUser.prc_license ||
            activeCurrent.birthdate !== currentUser.birthdate ||
            activeCurrent.password !== currentUser.password ||
            activeCurrent.temp_password !== currentUser.temp_password ||
            activeCurrent.is_temporary !== currentUser.is_temporary ||
            activeCurrent.role !== currentUser.role
          ) {
            setCurrentUser(activeCurrent);
          }
        }
      }
    }
  };

  useEffect(() => {
    reloadData();
    const interval = setInterval(() => {
      reloadData();
    }, 20000); // refresh every 20 seconds
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLoginSuccess = (profile: Profile) => {
    setCurrentUser(profile);
    reloadData();
    toast(`Authenticated as ${profile.first_name} ${profile.last_name} (${profile.role}).`, 'success');
  };

  const handlePasswordChanged = (updatedProfile: Profile) => {
    setCurrentUser(updatedProfile);
    reloadData();
  };

  const handleLogout = () => {
    setDialogConfig({
      title: 'Deauthorize Secure ERP Session?',
      description: 'You will be logged out of your active workstation segment. All non-committed database queues remain fully safeguarded.',
      onConfirm: () => {
        setDialogOpen(false);
        setMobileMenuOpen(false);
        setCurrentUser(null);
        setActiveTab('Overview');
        toast('Identity segment successfully decommissioned.', 'info');
      }
    });
    setDialogOpen(true);
  };

  // Visibility filters on tab views:
  // - Admin: see all
  // - Broker: see Overview, Sub-agents, Clients, Conflicts, Projects, Appointments
  // - Agent: see Overview, Clients, Conflicts, Projects, Appointments
  // - Treasurer: see Overview, Personnel Directory (Profiles)
  const getAllowedTabs = () => {
    if (!currentUser) return [];
    const r = currentUser.role;
    if (r === 'Admin') {
      return ['Overview', 'Staff Segment', 'Clients Segment', 'Resolution Panel', 'Estates Catalog', 'Appointments Segment', 'Audit Logs', 'My Profile', 'Security & Notifications'];
    }
    if (r === 'Broker') {
      return ['Overview', 'My Downline Agents', 'Clients Segment', 'Resolution Panel', 'Estates Catalog', 'Appointments Segment', 'My Profile', 'Security & Notifications'];
    }
    if (r === 'Agent') {
      return ['Overview', 'Clients Segment', 'Resolution Panel', 'Estates Catalog', 'Appointments Segment', 'My Profile', 'Security & Notifications'];
    }
    if (r === 'Treasurer') {
      return ['Overview', 'Personnel Directory', 'Estates Catalog', 'My Profile', 'Security & Notifications'];
    }
    return ['Overview', 'My Profile', 'Security & Notifications'];
  };

  const tabIcons: Record<string, any> = {
    'Overview': Grid,
    'Staff Segment': Shield,
    'My Downline Agents': Users,
    'Personnel Directory': Users,
    'Clients Segment': UserCheck,
    'Resolution Panel': Scale,
    'Estates Catalog': Building,
    'Appointments Segment': Calendar,
    'Audit Logs': ShieldCheck,
    'My Profile': User,
    'Security & Notifications': ShieldAlert,
  };

  const allowedTabs = getAllowedTabs();

  // If loading...
  if (currentUser === null) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        {/* Absolute Background Mesh */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#020617_1px,transparent_1px),linear-gradient(to_bottom,#020617_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
        
        <LoginForm
          onLoginSuccess={handleLoginSuccess}
          profiles={profiles}
        />


      </div>
    );
  }

  // FORCE CHANGE PASSWORD INTERCEPT
  if (currentUser.is_temporary) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <ForcePasswordChange
          currentProfile={currentUser}
          onPasswordChanged={handlePasswordChanged}
        />
      </div>
    );
  }

  // Monthly Closed Appointments Chart Data
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const closedApptsThisMonth = appointments.filter(appt => {
    if (appt.status !== 'Done') return false;
    const date = new Date(appt.appointment_time);
    
    if (overviewStartDate || overviewEndDate) {
      const dateVal = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      if (overviewStartDate) {
        const start = new Date(overviewStartDate);
        const startVal = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
        if (dateVal < startVal) return false;
      }
      if (overviewEndDate) {
        const end = new Date(overviewEndDate);
        const endVal = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
        if (dateVal > endVal) return false;
      }
      return true;
    } else {
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }
  });

  const getChartData = () => {
    if (!currentUser) return [];
    
    if (currentUser.role === 'Admin') {
      const countByAgent: { [agentId: string]: number } = {};
      closedApptsThisMonth.forEach(appt => {
        countByAgent[appt.agent_id] = (countByAgent[appt.agent_id] || 0) + 1;
      });
      return profiles
        .filter(p => p.role === 'Agent' || p.role === 'Broker')
        .map(profile => ({
          name: `${profile.first_name} ${profile.last_name} (${profile.id})`,
          closedCount: countByAgent[profile.id] || 0,
        }));
    }
    
    if (currentUser.role === 'Broker') {
      const countByAgent: { [agentId: string]: number } = {};
      closedApptsThisMonth.forEach(appt => {
        countByAgent[appt.agent_id] = (countByAgent[appt.agent_id] || 0) + 1;
      });
      // Show broker themselves and their sub-agents
      return profiles
        .filter(p => p.id === currentUser.id || p.parent_broker_id === currentUser.id)
        .map(profile => ({
          name: `${profile.first_name} ${profile.last_name} (${profile.id})`,
          closedCount: countByAgent[profile.id] || 0,
        }));
    }
    
    if (currentUser.role === 'Agent') {
      // Filter closed appointments to own agent only
      const myClosedAppts = closedApptsThisMonth.filter(appt => appt.agent_id === currentUser.id);
      const types: string[] = ['Meeting', 'Site Visit', 'Reservation Sign-off', 'Contract Signing'];
      return types.map(t => ({
        name: t,
        closedCount: myClosedAppts.filter(appt => appt.appointment_type === t).length
      }));
    }
    
    return [];
  };

  const chartData = getChartData();

  const todayStr = new Date().toISOString().split('T')[0];
  const last7Str = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  })();
  const last30Str = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  })();
  const thisMonthStr = (() => {
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    return {
      first: firstDay.toISOString().split('T')[0],
      last: lastDay.toISOString().split('T')[0]
    };
  })();

  const isTodayActive = overviewStartDate === todayStr && overviewEndDate === todayStr;
  const isPast7Active = overviewStartDate === last7Str && overviewEndDate === todayStr;
  const isThisMonthActive = overviewStartDate === thisMonthStr.first && overviewEndDate === thisMonthStr.last;
  const isPast30Active = overviewStartDate === last30Str && overviewEndDate === todayStr;

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col ${theme === 'light' ? 'theme-light' : 'theme-dark'}`}>
      {/* Visual Mesh Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_0.5px,transparent_0.5px),linear-gradient(to_bottom,#0f172a_0.5px,transparent_0.5px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* Enterprise Upper Navigation bar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-lg relative">
        <div className="flex items-center gap-3">
          {/* Logo Frame */}
          <div className="p-2 bg-emerald-950 border border-emerald-800/40 text-emerald-400 rounded-xl">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-100 flex items-center gap-1.5 leading-none">
              Aspire88 Estates Corporation Integrated Enterprise System
              <span className="text-[9px] font-sans px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold uppercase scale-90">
                Integrated Enterprise
              </span>
              {AppProperties.useTestDatabase && (
                <span className="text-[8px] font-sans px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60 font-bold uppercase tracking-wide">
                  Test DB
                </span>
              )}
              {AppProperties.mode === 'sandbox' && (
                <span className="text-[8px] font-sans px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 font-bold uppercase tracking-wide">
                  Sandbox
                </span>
              )}
            </h1>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mt-1">
              {currentUser.role} Control Portal
            </span>
          </div>
        </div>

        {/* Global Desktop Header Operations */}
        <div className="hidden lg:flex items-center gap-6">
          {/* Digital Clock synced PST */}
          <PstClock />

          {/* Current user info */}
          <div className="border-l border-slate-800/80 pl-6 flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-200">
                {currentUser.first_name} {currentUser.last_name}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">{currentUser.id}</div>
            </div>
            
            {/* Theme switcher */}
            <button
              onClick={toggleTheme}
              className="p-2.5 bg-slate-950 border border-slate-805 hover:bg-slate-900 text-indigo-400 hover:text-indigo-300 rounded-xl transition-all cursor-pointer shadow-inner"
              title="Toggle high-contrast light mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={handleLogout}
              className="p-2.5 bg-slate-950 border border-slate-805 hover:bg-slate-900 text-rose-400 hover:text-rose-300 rounded-xl transition-all cursor-pointer shadow-inner"
              title="Deauthorize session segment"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile menu toggle */}
        <div className="flex items-center gap-4 lg:hidden">
          <PstClock />
          {/* Mobile Theme switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 bg-slate-950 border border-slate-805 text-indigo-400 hover:text-indigo-300 rounded-xl transition-all cursor-pointer"
            title="Toggle high-contrast light mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 bg-slate-950 border border-slate-805 text-slate-300 hover:text-slate-100 rounded-xl transition-all cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Slideout */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[69px] z-30 bg-slate-900 border-b border-slate-800 p-5 shadow-2xl flex flex-col gap-4 animate-fade-in">
          <div className="text-xs text-slate-400 border-b border-slate-805 pb-2">
            Logged in as: <span className="text-slate-100 font-bold">{currentUser.first_name} {currentUser.last_name} ({currentUser.id})</span>
          </div>

          <div className="flex flex-col gap-1.5">
            {allowedTabs.map(tab => {
              const Icon = tabIcons[tab] || Grid;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-left transition-all cursor-pointer ${
                    activeTab === tab
                      ? 'bg-slate-950 border border-slate-800 text-indigo-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-850 pt-4 flex flex-col gap-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-3 bg-rose-950/20 border border-rose-900/30 text-rose-400 hover:bg-rose-950/50 font-bold rounded-xl text-xs uppercase"
            >
              <LogOut className="w-4 h-4" />
              Deauthorize workstation
            </button>
          </div>
        </div>
      )}

      {/* Main Structural segmentation (Sidebar + Content Workspace canvas) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Desktop Sidebar Rail */}
        <aside className="hidden lg:flex flex-col w-64 bg-slate-900/45 border-r border-slate-800/80 p-5 shrink-0 justify-between">
          <div className="space-y-6">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-3 select-none">
              Navigation Workspace
            </div>

            <nav className="space-y-1.5">
              {allowedTabs.map(tab => {
                const Icon = tabIcons[tab] || Grid;
                const isSelected = activeTab === tab;

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left text-xs font-bold transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-slate-900 border border-slate-800 text-indigo-400'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="active-nav bg"
                        className="absolute left-0 w-[3px] h-5 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-r-md"
                      />
                    )}
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-350'}`} />
                    <span>{tab}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer Details */}
          <div className="border-t border-slate-805 pt-5 space-y-3">
            <div className="text-[10px] text-slate-500 font-medium px-1 select-none">
              v1.88.2 • Secure SSL active
            </div>
          </div>
        </aside>

        {/* Content Workspace Canvas */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 relative">

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-8"
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'Overview' && (
                <div className="space-y-8">
                  {/* Greeting header card */}
                  <div className="p-6 md:p-8 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/30 border border-slate-800 rounded-2xl relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl" />
                    <div className="max-w-2xl">
                      <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest pl-0.5">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        Brokerage segment active
                      </div>
                      <h2 className="text-2xl font-black text-slate-100 tracking-tight leading-snug mt-2">
                        Welcome, {currentUser.first_name} {currentUser.last_name}
                      </h2>
                      <p className="text-xs text-slate-400 leading-relaxed mt-2.5">
                        Aspire88 Estates Corporation Integrated Enterprise System segment. Managing {currentUser.role === 'Admin' ? 'all administrative clusters and duplicate dispute records.' : currentUser.role === 'Broker' ? 'downline sales listings and client identity channels.' : currentUser.role === 'Agent' ? 'property scheduling coordinates.' : 'read-only directory lists.'} Access keys are restricted dynamically by Postgres Row Level Security.
                      </p>
                    </div>
                  </div>

                  {/* Date Range Picker Component */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block sm:inline shrink-0">
                        Workstation Timeframe Filter:
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={overviewStartDate}
                          onChange={(e) => setOverviewStartDate(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-300 outline-none focus:border-indigo-500 font-sans cursor-pointer"
                        />
                        <span className="text-slate-500 text-xs">to</span>
                        <input
                          type="date"
                          value={overviewEndDate}
                          onChange={(e) => setOverviewEndDate(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-300 outline-none focus:border-indigo-500 font-sans cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const todayStr = new Date().toISOString().split('T')[0];
                          setOverviewStartDate(todayStr);
                          setOverviewEndDate(todayStr);
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
                          const start = new Date();
                          start.setDate(start.getDate() - 7);
                          setOverviewStartDate(start.toISOString().split('T')[0]);
                          setOverviewEndDate(new Date().toISOString().split('T')[0]);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                          isPast7Active
                            ? 'bg-indigo-600 border border-indigo-500 text-white shadow-sm shadow-indigo-950/20'
                            : 'bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-300'
                        }`}
                      >
                        Past 7 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                          const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
                          setOverviewStartDate(firstDay.toISOString().split('T')[0]);
                          setOverviewEndDate(lastDay.toISOString().split('T')[0]);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                          isThisMonthActive
                            ? 'bg-indigo-600 border border-indigo-500 text-white shadow-sm shadow-indigo-950/20'
                            : 'bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-300'
                        }`}
                      >
                        This Month
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const start = new Date();
                          start.setDate(start.getDate() - 30);
                          setOverviewStartDate(start.toISOString().split('T')[0]);
                          setOverviewEndDate(new Date().toISOString().split('T')[0]);
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
                          setOverviewStartDate('');
                          setOverviewEndDate('');
                        }}
                        className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-950/60 border border-rose-900/30 text-rose-400 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Operational Stats indicators */}
                  <DashboardStats
                    currentProfile={currentUser}
                    profiles={profiles}
                    clients={filterByDateRange(clients, overviewStartDate, overviewEndDate, 'created_at')}
                    projects={filterByDateRange(projects, overviewStartDate, overviewEndDate, 'created_at')}
                    conflicts={filterByDateRange(conflicts, overviewStartDate, overviewEndDate, 'created_at')}
                    appointments={filterByDateRange(appointments, overviewStartDate, overviewEndDate, 'appointment_time')}
                  />

                  {/* Today's Appointments List for Broker & Agent */}
                  {(currentUser.role === 'Broker' || currentUser.role === 'Agent') && (
                    <TodayAppointments
                      currentProfile={currentUser}
                      profiles={profiles}
                      appointments={appointments}
                      clients={clients}
                      projects={projects}
                      onViewAllClick={() => setActiveTab('Appointments Segment')}
                      onRefresh={reloadData}
                      startDateFilter={overviewStartDate}
                      endDateFilter={overviewEndDate}
                    />
                  )}

                  {/* Monthly Agent Performance Bar Chart (Closed Appointments) */}
                  {currentUser.role !== 'Treasurer' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                        <BarChart3 className="w-4.5 h-4.5 text-indigo-400" />
                        <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                          {currentUser.role === 'Agent'
                            ? `Closed Appointments per Appointment Type (${overviewStartDate || overviewEndDate ? `${overviewStartDate || 'All-Time'} to ${overviewEndDate || 'All-Time'}` : now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`
                            : `Closed Appointments per Agent (${overviewStartDate || overviewEndDate ? `${overviewStartDate || 'All-Time'} to ${overviewEndDate || 'All-Time'}` : now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`
                          }
                        </h3>
                      </div>
                      
                      {chartData.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-500 italic">
                          {currentUser.role === 'Agent'
                            ? (overviewStartDate || overviewEndDate ? "No closed appointments recorded for your account in the selected timeframe." : "No closed appointments recorded for your account this month.")
                            : "No active agents or brokers registered."
                          }
                        </div>
                      ) : (
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={chartData}
                              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                              <XAxis
                                dataKey="name"
                                stroke="#64748b"
                                fontSize={10}
                                tickLine={false}
                              />
                              <YAxis
                                stroke="#64748b"
                                fontSize={10}
                                tickLine={false}
                                allowDecimals={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#0f172a',
                                  borderColor: '#334155',
                                  borderRadius: '12px',
                                  color: '#f8fafc',
                                  fontSize: '11px',
                                }}
                              />
                              <Bar
                                dataKey="closedCount"
                                fill="#6366f1"
                                radius={[4, 4, 0, 0]}
                                name="Closed Appointments"
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Broker & Agent Performance Playbook Bento Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 select-none opacity-95 hover:opacity-100 transition-opacity">
                    <div className="p-5 bg-gradient-to-br from-slate-900 to-indigo-950/25 border border-slate-800/80 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />
                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-indigo-400" />
                        Operational Performance Playbook
                      </h4>
                      <p className="text-[11px] text-slate-350 leading-relaxed">
                        {currentUser.role === 'Broker' 
                          ? 'Maximize sales commission velocity by reviewing downline agent schedules, resolving registry conflicts in under 24 hours, and maintaining clean, active customer profiles.' 
                          : 'Accelerate real estate lead closures by planning client follow-ups immediately after site visits. Clean client records ensure first-claim priority for commissions.'}
                      </p>
                      <div className="mt-3 flex gap-4 text-[10px] text-slate-400 font-semibold">
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Focus: High Conversion</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Target: 85%+ Site Visits</span>
                      </div>
                    </div>
                    
                    <div className="p-5 bg-gradient-to-br from-slate-900 to-emerald-950/15 border border-slate-800/80 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        Sales Pipeline & Integrity Check
                      </h4>
                      <p className="text-[11px] text-slate-350 leading-relaxed">
                        Avoid dispute resolution locks by checking prospect credentials before saving. Duplicate submissions freeze bookings automatically until administrative arbitration.
                      </p>
                      <div className="mt-3 flex gap-4 text-[10px] text-slate-400 font-semibold">
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> Status: Fully Compliant</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> System: RLS Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Staff Profiles segment */}
              {(activeTab === 'Staff Segment' || activeTab === 'My Downline Agents' || activeTab === 'Personnel Directory') && (
                <ProfilesManager
                  currentProfile={currentUser}
                  profiles={profiles}
                  onRefresh={reloadData}
                />
              )}

              {/* Onboarded Clients segment */}
              {activeTab === 'Clients Segment' && (
                <ClientsManager
                  currentProfile={currentUser}
                  clients={clients}
                  conflicts={conflicts}
                  appointments={appointments}
                  profiles={profiles}
                  onRefresh={reloadData}
                />
              )}

              {/* Conflict Settle section */}
              {activeTab === 'Resolution Panel' && (
                <ConflictsManager
                  currentProfile={currentUser}
                  conflicts={conflicts}
                  clients={clients}
                  profiles={profiles}
                  onRefresh={reloadData}
                />
              )}

              {/* Projects & developers catalog */}
              {activeTab === 'Estates Catalog' && (
                <ProjectsManager
                  currentProfile={currentUser}
                  developers={developers}
                  projects={projects}
                  onRefresh={reloadData}
                />
              )}

              {/* Appointment Engagement roster */}
              {activeTab === 'Appointments Segment' && (
                <AppointmentsManager
                  currentProfile={currentUser}
                  appointments={appointments}
                  clients={clients}
                  projects={projects}
                  conflicts={conflicts}
                  profiles={profiles}
                  onRefresh={reloadData}
                />
              )}

              {/* Security Compliance Audit Logs */}
              {activeTab === 'Audit Logs' && (
                <AuditLogsManager
                  currentProfile={currentUser}
                  profiles={profiles}
                />
              )}

              {/* My Profile Section */}
              {activeTab === 'My Profile' && (
                <MyProfileManager
                  currentProfile={currentUser}
                  profiles={profiles}
                  onRefresh={reloadData}
                />
              )}

              {/* Security & Notifications Section */}
              {activeTab === 'Security & Notifications' && (
                <SecurityAndNotificationsManager
                  currentProfile={currentUser}
                  onRefresh={reloadData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Persistent global confirm dialogue alert */}
      <AlertDialog
        isOpen={dialogOpen}
        title={dialogConfig.title}
        description={dialogConfig.description}
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogOpen(false)}
        isDestructive={true}
        confirmText="Acknowledge & Sign Out"
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <DashboardShell />
    </ToastProvider>
  );
}
