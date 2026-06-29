/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Edit2, 
  Power, 
  Copy, 
  Check, 
  UserPlus, 
  Search, 
  UserCheck, 
  UserX,
  AlertCircle
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { generateTemporaryPassword, encryptPassword } from '../db';

interface UsersTabProps {
  currentUser: UserProfile;
  profiles: UserProfile[];
  onAddUser: (userData: Omit<UserProfile, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateUser: (id: string, updatedData: Partial<UserProfile>) => void;
  onRequestConfirm: (title: string, msg: string, type: 'danger' | 'warning' | 'info' | 'success', onConfirm: () => void) => void;
  onShowSuccessToast: (text: string) => void;
}

export default function UsersTab({
  currentUser,
  profiles,
  onAddUser,
  onUpdateUser,
  onRequestConfirm,
  onShowSuccessToast
}: UsersTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Copy-able temp password state
  const [generatedTempPass, setGeneratedTempPass] = useState('');
  const [isPassCopied, setIsPassCopied] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [address, setAddress] = useState('');
  const [birthday, setBirthday] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Agent');

  // Filter visible users based on logged-in user role
  const getFilteredProfiles = () => {
    let list = [...profiles];

    if (currentUser.role === 'Admin') {
      // Admin can view all users, but exclude Admin details from list (as requested)
      list = list.filter(p => p.role !== 'Admin');
    } else if (currentUser.role === 'Broker') {
      // Broker can view a list of own agents
      list = list.filter(p => p.role === 'Agent' && p.brokerId === currentUser.id);
    } else if (currentUser.role === 'Treasurer') {
      // Treasurer can only view agents and brokers, cannot edit
      list = list.filter(p => p.role === 'Agent' || p.role === 'Broker');
    } else {
      // Agent has no user view privileges
      list = [];
    }

    // Apply search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        p =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
      );
    }

    return list;
  };

  const filteredUsers = getFilteredProfiles();

  // Handle Add User Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !address || !birthday || !contactNumber || !email) {
      alert("Please fill in all required fields.");
      return;
    }

    const tempPass = generateTemporaryPassword();
    const actionText = `Create user ${firstName} ${lastName} as ${currentUser.role === 'Broker' ? 'Agent' : role}?`;

    onRequestConfirm(
      "Confirm User Registration",
      actionText,
      "info",
      () => {
        // Build object
        const newProfileData: Omit<UserProfile, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> = {
          firstName,
          lastName,
          middleName: middleName || undefined,
          address,
          birthday,
          contactNumber,
          email,
          role: currentUser.role === 'Broker' ? 'Agent' : role,
          isTemporaryPassword: true,
          passwordHash: encryptPassword(tempPass),
          brokerId: currentUser.role === 'Broker' ? currentUser.id : undefined,
        };

        onAddUser(newProfileData);
        setGeneratedTempPass(tempPass); // Store to show
        onShowSuccessToast(`Successfully registered user! Temporary password generated.`);
        resetForm();
      }
    );
  };

  // Handle Edit User Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    onRequestConfirm(
      "Confirm Profile Changes",
      `Save modifications to user ${selectedUser.firstName} ${selectedUser.lastName}?`,
      "info",
      () => {
        const updateData: Partial<UserProfile> = {
          firstName,
          lastName,
          middleName: middleName || undefined,
          address,
          birthday,
          contactNumber,
          email,
          role: currentUser.role === 'Admin' ? role : selectedUser.role, // Only Admin can change role
        };

        onUpdateUser(selectedUser.id, updateData);
        setIsEditOpen(false);
        onShowSuccessToast(`User profile updated successfully.`);
        resetForm();
      }
    );
  };

  // Toggle user active status
  const handleToggleActive = (user: UserProfile) => {
    if (user.isActive) {
      // Deactivate flow
      onRequestConfirm(
        "Deactivate User Access",
        `Are you sure you want to suspend user ${user.firstName} ${user.lastName}? They will be completely locked out from security, profile edits, and system access.`,
        "danger",
        () => {
          onUpdateUser(user.id, { isActive: false });
          onShowSuccessToast(`User account suspended.`);
        }
      );
    } else {
      // Reactivate flow -> Generates a temporary password & displays it
      const tempPass = generateTemporaryPassword();
      onRequestConfirm(
        "Reactivate User Access",
        `Reactivate account for ${user.firstName} ${user.lastName}? A new temporary password will be generated for security purposes.`,
        "success",
        () => {
          onUpdateUser(user.id, { 
            isActive: true, 
            isTemporaryPassword: true, 
            passwordHash: encryptPassword(tempPass) 
          });
          setGeneratedTempPass(tempPass);
          onShowSuccessToast(`User account reactivated! New temporary password generated.`);
        }
      );
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedTempPass);
    setIsPassCopied(true);
    setTimeout(() => setIsPassCopied(false), 2000);
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setMiddleName('');
    setAddress('');
    setBirthday('');
    setContactNumber('');
    setEmail('');
    setRole('Agent');
    setSelectedUser(null);
  };

  const openEditModal = (user: UserProfile) => {
    setSelectedUser(user);
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setMiddleName(user.middleName || '');
    setAddress(user.address);
    setBirthday(user.birthday);
    setContactNumber(user.contactNumber);
    setEmail(user.email);
    setRole(user.role);
    setIsEditOpen(true);
  };

  const canAdd = currentUser.role === 'Admin' || currentUser.role === 'Broker';
  const canEdit = currentUser.role === 'Admin' || currentUser.role === 'Broker';
  const canDeactivate = currentUser.role === 'Admin' || currentUser.role === 'Broker';

  return (
    <div className="space-y-6" id="users-tab-root">
      {/* Title & Action Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="users-header">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight" id="users-title">
            Roster & Corporate Identity
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {currentUser.role === 'Admin' && "Complete overview of company personnel accounts."}
            {currentUser.role === 'Broker' && "View and register certified agents reporting to your team."}
            {currentUser.role === 'Treasurer' && "Financial transparency. Viewing broker and sales directories only."}
          </p>
        </div>

        {canAdd && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setGeneratedTempPass('');
              setIsAddOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-semibold transition shadow-lg shadow-amber-500/10"
            id="add-user-btn"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Register User
          </button>
        )}
      </div>

      {/* Generated Temp Password Display Jumbotron */}
      {generatedTempPass && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl"
          id="temp-password-banner"
        >
          <div className="flex items-center gap-3" id="banner-text-block">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl" id="banner-icon">
              <UserPlus className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">
                SECURITY REGISTRATION SUCCESSFUL
              </p>
              <p className="text-sm text-slate-200 mt-1">
                Please copy and provide the temporary password to the user. They will be forced to change it on their first login.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800 w-full sm:w-auto justify-between" id="temp-password-actions">
            <span className="font-mono text-slate-100 font-bold px-3 text-base tracking-wider selection:bg-amber-500 selection:text-slate-900" id="raw-temp-password">
              {generatedTempPass}
            </span>
            <button
              onClick={copyToClipboard}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
              id="copy-password-btn"
            >
              {isPassCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {isPassCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Roster Search Bar */}
      {currentUser.role !== 'Agent' && (
        <div className="relative max-w-md" id="search-container">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roster by name, email, or ID..."
            className="w-full bg-slate-900 border border-slate-800 pl-10 pr-4 py-2 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            id="user-search-input"
          />
        </div>
      )}

      {/* Roster Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="users-cards-grid">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className={`p-5 rounded-2xl bg-slate-900 border transition relative overflow-hidden flex flex-col justify-between h-56 ${
              user.isActive 
                ? 'border-slate-800/80 hover:border-slate-700/80 shadow-md' 
                : 'border-rose-950/40 bg-slate-950/60 opacity-80'
            }`}
            id={`user-card-${user.id}`}
          >
            {/* Upper half: Header */}
            <div>
              <div className="flex items-start justify-between" id={`user-card-header-${user.id}`}>
                <div>
                  <h3 className="font-semibold text-slate-200 text-base" id={`user-card-fullname-${user.id}`}>
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono" id={`user-card-id-${user.id}`}>
                    ID: {user.id}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border uppercase ${
                  user.role === 'Broker' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  user.role === 'Agent' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`} id={`user-card-role-${user.id}`}>
                  {user.role}
                </span>
              </div>

              {/* User details */}
              <div className="mt-4 space-y-1.5 text-xs text-slate-400" id={`user-card-details-${user.id}`}>
                <p className="truncate" id={`user-card-email-${user.id}`}><strong className="font-mono text-slate-500">EMAIL:</strong> {user.email}</p>
                <p id={`user-card-phone-${user.id}`}><strong className="font-mono text-slate-500">PHONE:</strong> {user.contactNumber}</p>
                <p id={`user-card-bday-${user.id}`}><strong className="font-mono text-slate-500">BDAY:</strong> {user.birthday}</p>
              </div>
            </div>

            {/* Lower half: Actions */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between mt-auto" id={`user-card-actions-row-${user.id}`}>
              {/* Account Status */}
              <div className="flex items-center gap-1.5" id={`user-card-status-block-${user.id}`}>
                <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase">
                  {user.isActive ? 'Active Access' : 'Suspended'}
                </span>
              </div>

              {/* Operational Buttons */}
              <div className="flex items-center gap-2" id={`user-card-buttons-${user.id}`}>
                {canEdit && (
                  <button
                    type="button"
                    disabled={!user.isActive}
                    onClick={() => openEditModal(user)}
                    className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                      user.isActive 
                        ? 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-100 hover:bg-slate-800' 
                        : 'border-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                    title="Edit Profile"
                    id={`user-edit-${user.id}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {canDeactivate && (
                  <button
                    type="button"
                    onClick={() => handleToggleActive(user)}
                    className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                      user.isActive 
                        ? 'border-rose-950/30 bg-rose-950/20 text-rose-400 hover:bg-rose-950/50 hover:text-rose-300' 
                        : 'border-emerald-950/30 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/50 hover:text-emerald-300'
                    }`}
                    title={user.isActive ? 'Suspend Access' : 'Activate & Reset Password'}
                    id={`user-suspend-${user.id}`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-slate-900 border border-slate-800 rounded-2xl" id="empty-users-state">
            <UserX className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-300">No matching personnel records found</p>
            <p className="text-xs text-slate-500 mt-1">Refine your search parameters or register a new team member.</p>
          </div>
        )}
      </div>

      {/* ADD USER MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" id="add-user-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative"
            id="add-user-box"
          >
            <h3 className="text-lg font-bold text-slate-100 tracking-tight" id="add-user-modal-title">
              Register New Personnel
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              All accounts start in temporary password state. System enforces change upon login.
            </p>

            <form onSubmit={handleAddSubmit} className="mt-5 space-y-4" id="add-user-form">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Contact Number *</label>
                  <input
                    type="text"
                    required
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="+639..."
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Permanent Address *</label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              {currentUser.role === 'Admin' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Corporate Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="Broker">Broker</option>
                    <option value="Agent">Agent</option>
                    <option value="Treasurer">Treasurer</option>
                  </select>
                </div>
              )}

              {currentUser.role === 'Broker' && (
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850 text-xs text-slate-400 font-mono">
                  Role forced: <strong>Agent</strong> • Automatically under your broker portfolio.
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
                  Generate Credentials
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" id="edit-user-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative"
            id="edit-user-box"
          >
            <h3 className="text-lg font-bold text-slate-100 tracking-tight" id="edit-user-modal-title">
              Modify Personnel Profile
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Editing profile parameters for user {selectedUser.id}
            </p>

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4" id="edit-user-form">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Contact Number *</label>
                  <input
                    type="text"
                    required
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Address *</label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              {currentUser.role === 'Admin' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="Broker">Broker</option>
                    <option value="Agent">Agent</option>
                    <option value="Treasurer">Treasurer</option>
                  </select>
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
                  Save Profile
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
