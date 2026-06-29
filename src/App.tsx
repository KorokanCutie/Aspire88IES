/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  LayoutDashboard, 
  Users, 
  Building, 
  UserCheck, 
  ShieldAlert, 
  Calendar, 
  Settings, 
  LogOut, 
  Lock, 
  Menu, 
  X,
  User,
  Eye,
  EyeOff,
  Briefcase
} from 'lucide-react';

import { db, encryptPassword } from './db';
import { UserProfile, Developer, Project, Client, DuplicateConflict, Appointment, UserRole } from './types';

// Subcomponents
import DashboardOverview from './components/DashboardOverview';
import UsersTab from './components/UsersTab';
import ClientsTab from './components/ClientsTab';
import ConflictsTab from './components/ConflictsTab';
import AppointmentsTab from './components/AppointmentsTab';
import DevelopersProjectsTab from './components/DevelopersProjectsTab';

import ConfirmModal from './components/ConfirmModal';
import MapModal from './components/MapModal';
import Notification, { ToastMessage } from './components/Notification';

export default function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loginEmail, setLoginEmail] = useState('nari.casama.developer@gmail.com'); // Autofills standard admin for ease of test/review
  const [loginPassword, setLoginPassword] = useState('Admin@Aspire88');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  // Local database states synchronized with db engine
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [conflicts, setConflicts] = useState<DuplicateConflict[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Navigation state
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global modals and toast arrays
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info' | 'success';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);

  const [mapConfig, setMapConfig] = useState<{
    isOpen: boolean;
    project: Project | null;
  }>({ isOpen: false, project: null });

  // Forced password change form states (for temporary password state)
  const [forcedNewPass, setForcedNewPass] = useState('');
  const [forcedConfirmPass, setForcedConfirmPass] = useState('');
  const [forcedError, setForcedError] = useState('');

  // Self Settings screen states
  const [selfFirstName, setSelfFirstName] = useState('');
  const [selfLastName, setSelfLastName] = useState('');
  const [selfMiddleName, setSelfMiddleName] = useState('');
  const [selfAddress, setSelfAddress] = useState('');
  const [selfBirthday, setSelfBirthday] = useState('');
  const [selfContactNumber, setSelfContactNumber] = useState('');
  const [selfEmail, setSelfEmail] = useState('');
  const [selfOldPassword, setSelfOldPassword] = useState('');
  const [selfNewPassword, setSelfNewPassword] = useState('');
  const [selfConfirmPassword, setSelfConfirmPassword] = useState('');

  // Initialize and synchronize state
  useEffect(() => {
    refreshLocalStates();
  }, []);

  const refreshLocalStates = () => {
    setProfiles([...db.getProfiles()]);
    setDevelopers([...db.getDevelopers()]);
    setProjects([...db.getProjects()]);
    setClients([...db.getClients()]);
    setConflicts([...db.getConflicts()]);
    setAppointments([...db.getAppointments()]);
  };

  // Toast Helpers
  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString();
    setToasts(prev => [...prev, { id, text, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const found = db.getProfiles().find(p => p.email.toLowerCase() === loginEmail.trim().toLowerCase());
    if (!found) {
      setAuthError("No personnel account found matching this email.");
      return;
    }

    if (!found.isActive) {
      setAuthError("Account suspended. Please reach out to administrative management.");
      return;
    }

    // Verify Password Hash
    if (found.passwordHash !== encryptPassword(loginPassword)) {
      setAuthError("Invalid credentials. Please verify your email and password.");
      return;
    }

    // Authenticated!
    setCurrentUser(found);
    addToast(`Successfully logged in as ${found.firstName}!`, 'success');
    
    // Seed Settings fields
    setSelfFirstName(found.firstName);
    setSelfLastName(found.lastName);
    setSelfMiddleName(found.middleName || '');
    setSelfAddress(found.address);
    setSelfBirthday(found.birthday);
    setSelfContactNumber(found.contactNumber);
    setSelfEmail(found.email);

    // Default tab depending on role
    if (found.role === 'Treasurer') {
      setActiveTab('roster');
    } else {
      setActiveTab('dashboard');
    }
  };

  // Logout handler
  const handleLogout = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Confirm Log Out",
      message: "Are you sure you want to terminate your active dashboard session?",
      type: "warning",
      confirmText: "Log Out",
      onConfirm: () => {
        setCurrentUser(null);
        setLoginPassword('');
        setConfirmConfig(null);
        addToast("Logged out successfully.", 'info');
      },
      onCancel: () => setConfirmConfig(null)
    });
  };

  // Forced password change submit
  const handleForcedPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForcedError('');

    if (forcedNewPass.length < 6) {
      setForcedError("Password must consist of at least 6 characters.");
      return;
    }

    if (forcedNewPass !== forcedConfirmPass) {
      setForcedError("Passwords do not match.");
      return;
    }

    if (!currentUser) return;

    // Save and clear temporary password state
    const updated = db.updateProfile(currentUser.id, {
      isTemporaryPassword: false,
      passwordHash: encryptPassword(forcedNewPass)
    });

    setCurrentUser(updated);
    refreshLocalStates();
    addToast("Security credentials verified! Access granted.", 'success');
    setForcedNewPass('');
    setForcedConfirmPass('');
  };

  // Change self password submit (Security Settings)
  const handleSelfPasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (currentUser.passwordHash !== encryptPassword(selfOldPassword)) {
      addToast("Current password verification failed.", 'error');
      return;
    }

    if (selfNewPassword.length < 6) {
      addToast("New password must be at least 6 characters long.", 'error');
      return;
    }

    if (selfNewPassword !== selfConfirmPassword) {
      addToast("New passwords do not match.", 'error');
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: "Update Password",
      message: "Change your security settings now? You will need your new password for your next login.",
      type: "warning",
      onConfirm: () => {
        db.updateProfile(currentUser.id, {
          passwordHash: encryptPassword(selfNewPassword)
        });
        refreshLocalStates();
        setSelfOldPassword('');
        setSelfNewPassword('');
        setSelfConfirmPassword('');
        setConfirmConfig(null);
        addToast("Password updated successfully.", 'success');
      },
      onCancel: () => setConfirmConfig(null)
    });
  };

  // Edit own profile details
  const handleSelfProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setConfirmConfig({
      isOpen: true,
      title: "Update Personal Details",
      message: "Are you sure you want to save modifications to your user profile?",
      type: "info",
      onConfirm: () => {
        const updated = db.updateProfile(currentUser.id, {
          firstName: selfFirstName,
          lastName: selfLastName,
          middleName: selfMiddleName || undefined,
          address: selfAddress,
          birthday: selfBirthday,
          contactNumber: selfContactNumber,
          email: selfEmail
        });
        setCurrentUser(updated);
        refreshLocalStates();
        setConfirmConfig(null);
        addToast("Personal details updated successfully.", 'success');
      },
      onCancel: () => setConfirmConfig(null)
    });
  };

  // Global action wrapper: confirm wrapper
  const triggerConfirmation = (
    title: string, 
    msg: string, 
    type: 'danger' | 'warning' | 'info' | 'success', 
    onConfirmCallback: () => void
  ) => {
    setConfirmConfig({
      isOpen: true,
      title,
      message: msg,
      type,
      onConfirm: () => {
        onConfirmCallback();
        refreshLocalStates();
        setConfirmConfig(null);
      },
      onCancel: () => setConfirmConfig(null)
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950" id="aspire88-saas-root">
      
      {/* 1. SIGN IN PORTAL */}
      {!currentUser && (
        <div className="flex-1 flex items-center justify-center p-4 min-h-screen relative overflow-hidden" id="auth-portal">
          {/* Visual Ambient Circles */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl relative z-10"
            id="login-card"
          >
            {/* Branding */}
            <div className="text-center" id="branding-header">
              <div className="inline-flex p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-4" id="branding-icon-container">
                <Building2 className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-100" id="branding-name">
                Aspire88 Estates Corporation
              </h2>
              <p className="text-[10px] text-amber-500 mt-1.5 uppercase font-mono tracking-widest">
                Integrated Enterprise System
              </p>
            </div>

            {authError && (
              <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex gap-2.5 items-start text-xs text-rose-400 font-medium" id="auth-error-block">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{authError}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="mt-6 space-y-4" id="login-form">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-mono tracking-wide">
                  Corporate Email
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
                  placeholder="name@aspire88.com"
                  id="email-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-mono tracking-wide flex items-center justify-between">
                  <span>Passphrase</span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] text-amber-500 hover:text-amber-400 font-bold capitalize cursor-pointer outline-none"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 font-mono tracking-widest"
                  placeholder="••••••••"
                  id="password-input"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-xl shadow-amber-500/10 cursor-pointer"
                id="login-btn"
              >
                Sign In to Vault
              </button>
            </form>

            {/* Credentials note */}
            <div className="mt-6 pt-5 border-t border-slate-800/60 text-center" id="credentials-note">
              <p className="text-[11px] text-slate-500 font-mono leading-relaxed">
                Superuser Seed credentials preloaded.<br />
                Email: <strong className="text-slate-400">nari.casama.developer@gmail.com</strong><br />
                Pass: <strong className="text-amber-500/90">Admin@Aspire88</strong>
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* 2. FORCED CHANGE PASSWORD FIRST STATE */}
      {currentUser && currentUser.isTemporaryPassword && (
        <div className="flex-1 flex items-center justify-center p-4 min-h-screen relative overflow-hidden bg-slate-950 z-50" id="force-password-portal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl relative"
            id="force-password-card"
          >
            <div className="text-center">
              <div className="inline-flex p-3 bg-amber-500/10 rounded-2xl mb-4 text-amber-500" id="lock-icon-container">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-slate-100">
                Action Required: Secure Passphrase
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Your account is currently in a temporary password state. The security framework of Aspire88 requires password configuration before granting access to client registries and dashboards.
              </p>
            </div>

            {forcedError && (
              <p className="mt-4 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-center font-medium">
                {forcedError}
              </p>
            )}

            <form onSubmit={handleForcedPasswordSubmit} className="mt-6 space-y-4" id="forced-password-form">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-mono tracking-wide">
                  New Secure Password *
                </label>
                <input
                  type="password"
                  required
                  value={forcedNewPass}
                  onChange={(e) => setForcedNewPass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                  placeholder="Min 6 characters..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-mono tracking-wide">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={forcedConfirmPass}
                  onChange={(e) => setForcedConfirmPass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                  placeholder="Retype password..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-amber-500/10 mt-2"
                id="submit-forced-password-btn"
              >
                Establish Secure Vault Access
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* 3. MAIN DASHBOARD ACCESS WRAPPER */}
      {currentUser && !currentUser.isTemporaryPassword && (
        <div className="flex-1 flex flex-col lg:flex-row h-screen overflow-hidden" id="main-panel-wrapper">
          
          {/* Sidebar / Drawer Navigation */}
          <aside className="w-full lg:w-72 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between shrink-0 z-30" id="saas-sidebar">
            
            {/* Header branding */}
            <div>
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/60" id="sidebar-header">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <Building2 className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-[13px] tracking-tight leading-none">
                      Aspire88 Estates Corp
                    </h3>
                    <span className="text-[9px] text-amber-500/90 font-mono tracking-wider mt-1.5 block uppercase">
                      Enterprise System
                    </span>
                  </div>
                </div>

                {/* Mobile menu toggle */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg lg:hidden transition"
                  id="mobile-hamburger"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>

              {/* Navigation Items */}
              <nav className={`px-4 py-6 space-y-1.5 lg:block ${mobileMenuOpen ? 'block' : 'hidden'}`} id="sidebar-navigation">
                {/* Standard tabs dependent on roles */}
                
                {currentUser.role !== 'Treasurer' && (
                  <button
                    onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                      activeTab === 'dashboard' 
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                    id="nav-dashboard"
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    Dashboard
                  </button>
                )}

                {currentUser.role !== 'Agent' && (
                  <button
                    onClick={() => { setActiveTab('roster'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                      activeTab === 'roster' 
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                    id="nav-roster"
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    Roster Personnel
                  </button>
                )}

                {currentUser.role === 'Admin' && (
                  <button
                    onClick={() => { setActiveTab('developers'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                      activeTab === 'developers' 
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                    id="nav-developers"
                  >
                    <Building className="w-4 h-4 shrink-0" />
                    Developers & Projects
                  </button>
                )}

                {currentUser.role !== 'Treasurer' && (
                  <button
                    onClick={() => { setActiveTab('clients'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                      activeTab === 'clients' 
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                    id="nav-clients"
                  >
                    <UserCheck className="w-4 h-4 shrink-0" />
                    Clients Custody
                  </button>
                )}

                {(currentUser.role === 'Admin' || currentUser.role === 'Broker') && (
                  <button
                    onClick={() => { setActiveTab('conflicts'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition relative ${
                      activeTab === 'conflicts' 
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                    id="nav-conflicts"
                  >
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Dispute Hub</span>
                    {clients.filter(c => c.conflictStatus === 'Pending').length > 0 && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    )}
                  </button>
                )}

                {currentUser.role !== 'Treasurer' && (
                  <button
                    onClick={() => { setActiveTab('appointments'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                      activeTab === 'appointments' 
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                    id="nav-appointments"
                  >
                    <Calendar className="w-4 h-4 shrink-0" />
                    Appointments
                  </button>
                )}

                <button
                  onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                    activeTab === 'settings' 
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                  id="nav-settings"
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  Self & Security Settings
                </button>
              </nav>
            </div>

            {/* User Session Footer inside sidebar */}
            <div className="p-4 border-t border-slate-800/60 bg-slate-950/20 lg:block hidden" id="sidebar-footer">
              <div className="flex items-center gap-3" id="user-pill">
                <div className="p-2 bg-slate-800 rounded-xl text-slate-400 shrink-0">
                  <User className="w-4 h-4 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {currentUser.firstName} {currentUser.lastName}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono truncate uppercase mt-0.5">
                    {currentUser.role} Account
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 text-slate-500 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
                  title="Secure Terminate Session"
                  id="logout-btn-sidebar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

          </aside>

          {/* Core App View Stage */}
          <main className="flex-1 flex flex-col h-full overflow-hidden" id="saas-view-stage">
            <div className="flex-1 overflow-y-auto px-6 py-8" id="view-scroller">
              <div className="max-w-6xl mx-auto space-y-8" id="scroller-layout">
                
                {activeTab === 'dashboard' && currentUser.role !== 'Treasurer' && (
                  <DashboardOverview
                    currentUser={currentUser}
                    profiles={profiles}
                    clients={clients}
                    appointments={appointments}
                    projects={projects}
                    developers={developers}
                  />
                )}

                {activeTab === 'roster' && currentUser.role !== 'Agent' && (
                  <UsersTab
                    currentUser={currentUser}
                    profiles={profiles}
                    onAddUser={(data) => {
                      db.addProfile(data);
                      refreshLocalStates();
                    }}
                    onUpdateUser={(id, data) => {
                      db.updateProfile(id, data);
                      refreshLocalStates();
                    }}
                    onRequestConfirm={triggerConfirmation}
                    onShowSuccessToast={(text) => addToast(text, 'success')}
                  />
                )}

                {activeTab === 'developers' && currentUser.role === 'Admin' && (
                  <DevelopersProjectsTab
                    currentUser={currentUser}
                    developers={developers}
                    projects={projects}
                    onAddDeveloper={(name) => {
                      db.addDeveloper(name);
                      refreshLocalStates();
                    }}
                    onUpdateDeveloper={(id, name, active) => {
                      db.updateDeveloper(id, name, active);
                      refreshLocalStates();
                    }}
                    onAddProject={(id, name, address) => {
                      db.addProject(id, name, address);
                      refreshLocalStates();
                    }}
                    onUpdateProject={(id, data) => {
                      db.updateProject(id, data);
                      refreshLocalStates();
                    }}
                    onViewMap={(proj) => setMapConfig({ isOpen: true, project: proj })}
                    onRequestConfirm={triggerConfirmation}
                    onShowSuccessToast={(text) => addToast(text, 'success')}
                  />
                )}

                {activeTab === 'clients' && currentUser.role !== 'Treasurer' && (
                  <ClientsTab
                    currentUser={currentUser}
                    clients={clients}
                    profiles={profiles}
                    conflicts={conflicts}
                    onAddClient={(data) => {
                      const { duplicateConflict } = db.addClient(data);
                      refreshLocalStates();
                      if (duplicateConflict) {
                        addToast(`Lead duplicate flagged! ID ${duplicateConflict.id} put under pending dispute review.`, 'info');
                      } else {
                        addToast(`Client successfully encoded under your primary custody.`, 'success');
                      }
                    }}
                    onUpdateClient={(id, data) => {
                      db.updateClient(id, data);
                      refreshLocalStates();
                    }}
                    onSurrenderClaim={(confId, agentId) => {
                      db.surrenderClaim(confId, agentId);
                      refreshLocalStates();
                    }}
                    onRequestConfirm={triggerConfirmation}
                    onShowSuccessToast={(text) => addToast(text, 'success')}
                  />
                )}

                {activeTab === 'conflicts' && (currentUser.role === 'Admin' || currentUser.role === 'Broker') && (
                  <ConflictsTab
                    currentUser={currentUser}
                    conflicts={conflicts}
                    clients={clients}
                    profiles={profiles}
                    onResolveConflict={(confId, action) => {
                      db.resolveConflict(confId, action, currentUser.id);
                      refreshLocalStates();
                    }}
                    onRequestConfirm={triggerConfirmation}
                    onShowSuccessToast={(text) => addToast(text, 'success')}
                  />
                )}

                {activeTab === 'appointments' && currentUser.role !== 'Treasurer' && (
                  <AppointmentsTab
                    currentUser={currentUser}
                    appointments={appointments}
                    clients={clients}
                    projects={projects}
                    profiles={profiles}
                    onAddAppointment={(data) => {
                      db.addAppointment(data);
                      refreshLocalStates();
                    }}
                    onUpdateAppointment={(id, data) => {
                      db.updateAppointment(id, data);
                      refreshLocalStates();
                    }}
                    onRequestConfirm={triggerConfirmation}
                    onShowSuccessToast={(text) => addToast(text, 'success')}
                    onViewProjectMap={(proj) => setMapConfig({ isOpen: true, project: proj })}
                  />
                )}

                {/* SELF SETTINGS TAB (My Profile, change password) */}
                {activeTab === 'settings' && (
                  <div className="space-y-6" id="settings-tab-root">
                    <div>
                      <h2 className="text-xl font-bold text-slate-100 tracking-tight" id="settings-title">
                        Vault Profile & Security Credentials
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Modify your standard personal profile data and configure system authentication passphrases.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="settings-panels">
                      {/* Left Side: Profile Information */}
                      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4" id="settings-profile-pane">
                        <h3 className="text-sm font-semibold text-slate-200 uppercase font-mono tracking-wider pb-3 border-b border-slate-800/80">
                          Personal Profile details
                        </h3>

                        <form onSubmit={handleSelfProfileUpdate} className="space-y-4" id="settings-profile-form">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">First Name</label>
                              <input
                                type="text"
                                required
                                value={selfFirstName}
                                onChange={(e) => setSelfFirstName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-xs text-slate-200 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Last Name</label>
                              <input
                                type="text"
                                required
                                value={selfLastName}
                                onChange={(e) => setSelfLastName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-xs text-slate-200 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Middle Name</label>
                            <input
                              type="text"
                              value={selfMiddleName}
                              onChange={(e) => setSelfMiddleName(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-xs text-slate-200 focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Contact Number</label>
                              <input
                                type="text"
                                required
                                value={selfContactNumber}
                                onChange={(e) => setSelfContactNumber(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-xs text-slate-200 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Birthday</label>
                              <input
                                type="date"
                                required
                                value={selfBirthday}
                                onChange={(e) => setSelfBirthday(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-xs text-slate-200 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Email Address</label>
                            <input
                              type="email"
                              required
                              value={selfEmail}
                              onChange={(e) => setSelfEmail(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-xs text-slate-200 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Address</label>
                            <textarea
                              required
                              rows={2}
                              value={selfAddress}
                              onChange={(e) => setSelfAddress(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-xs text-slate-200 focus:outline-none resize-none"
                            />
                          </div>

                          <button
                            type="submit"
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition shadow cursor-pointer"
                          >
                            Save Personal Profile
                          </button>
                        </form>
                      </div>

                      {/* Right Side: Passphrase Security */}
                      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4" id="settings-pass-pane">
                        <h3 className="text-sm font-semibold text-slate-200 uppercase font-mono tracking-wider pb-3 border-b border-slate-800/80">
                          Passphrase Authentication Vault
                        </h3>

                        <form onSubmit={handleSelfPasswordChange} className="space-y-4" id="settings-pass-form">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Current Passphrase *</label>
                            <input
                              type="password"
                              required
                              value={selfOldPassword}
                              onChange={(e) => setSelfOldPassword(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-xs text-slate-200 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-slate-400 mb-1">New Passphrase *</label>
                            <input
                              type="password"
                              required
                              value={selfNewPassword}
                              onChange={(e) => setSelfNewPassword(e.target.value)}
                              placeholder="Min 6 characters..."
                              className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-xs text-slate-200 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Confirm New Passphrase *</label>
                            <input
                              type="password"
                              required
                              value={selfConfirmPassword}
                              onChange={(e) => setSelfConfirmPassword(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-xs text-slate-200 focus:outline-none"
                            />
                          </div>

                          <button
                            type="submit"
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition cursor-pointer border border-slate-700"
                          >
                            Transition Passphrase
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </main>
        </div>
      )}

      {/* 4. CONFIRMATION AND UTILITY DIALOGS */}
      {confirmConfig && (
        <ConfirmModal
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          type={confirmConfig.type}
          confirmText={confirmConfig.confirmText}
          cancelText={confirmConfig.cancelText}
          onConfirm={confirmConfig.onConfirm}
          onCancel={confirmConfig.onCancel}
        />
      )}

      {mapConfig.isOpen && (
        <MapModal
          isOpen={mapConfig.isOpen}
          project={mapConfig.project}
          onClose={() => setMapConfig({ isOpen: false, project: null })}
        />
      )}

      {/* Persistent Toasts */}
      <Notification toasts={toasts} onClose={removeToast} />
    </div>
  );
}
