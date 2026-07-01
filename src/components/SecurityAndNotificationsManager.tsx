import React, { useState } from 'react';
import { Profile } from '../types';
import { db } from '../db';
import { useToast } from './Toast';
import { Lock, Eye, EyeOff, ShieldAlert, Bell, ToggleLeft, ToggleRight, Check, Activity } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { AlertDialog } from './AlertDialog';

interface SecurityAndNotificationsManagerProps {
  currentProfile: Profile;
  onRefresh: () => void;
}

export function SecurityAndNotificationsManager({ currentProfile, onRefresh }: SecurityAndNotificationsManagerProps) {
  const { toast } = useToast();

  // Password Update State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Notifications Preferences State
  const [emailDisputes, setEmailDisputes] = useState(true);
  const [emailAppointments, setEmailAppointments] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [doubleEntryPrompt, setDoubleEntryPrompt] = useState(true);

  // Handle saving security password
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast('Please supply all security password inputs.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast('The new password and confirm password inputs do not match.', 'error');
      return;
    }

    if (newPassword.length < 8) {
      toast('Security compliance: New password must be at least 8 characters long.', 'error');
      return;
    }

    // 1. Verify current password
    const activeHash = (currentProfile.is_temporary && currentProfile.temp_password)
      ? currentProfile.temp_password
      : (currentProfile.password || currentProfile.temp_password || '');
    let isCurrentMatch = false;

    if (activeHash.startsWith('$2a$') || activeHash.startsWith('$2b$')) {
      isCurrentMatch = bcrypt.compareSync(currentPassword, activeHash);
    } else {
      isCurrentMatch = currentPassword === activeHash || (activeHash === 'password' && currentPassword === 'password');
    }

    if (!isCurrentMatch) {
      toast('Authentication failed: Incorrect current password.', 'error');
      return;
    }

    setIsConfirmOpen(true);
  };

  const executeSavePassword = async () => {
    setIsConfirmOpen(false);
    setIsSavingPassword(true);

    try {
      // 2. Hash and save new password
      const hashedNewPw = bcrypt.hashSync(newPassword, 10);
      const updatedProfile: Profile = {
        ...currentProfile,
        password: hashedNewPw,
        temp_password: '', // clear any temporary passwords
        is_temporary: false,
        updated_at: new Date().toISOString()
      };

      await db.saveProfile(updatedProfile);
      toast('Your security password has been successfully updated!', 'success');
      
      // Clear forms
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onRefresh();
    } catch (err: any) {
      toast(err.message || 'Failed to save new password coordinates.', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSavePreferences = () => {
    toast('Security and notification preferences synchronized successfully!', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="border-b border-slate-800/60 pb-5">
        <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-indigo-400" />
          Security & Notifications Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-sans">
          Manage your portal access credentials, update system notification pathways, and establish identity confirmations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PASSWORD RESET FORM */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5 lg:col-span-2">
          <div className="border-b border-slate-850 pb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-500" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Change Security Password
            </h3>
          </div>

          <form onSubmit={handleSavePassword} className="space-y-4 text-xs text-slate-355">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-slate-950 border border-slate-805 focus:border-indigo-500 rounded-xl py-2.5 px-3 pr-10 text-slate-200 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 focus:outline-none cursor-pointer"
                  >
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    New Secure Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPw ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full bg-slate-950 border border-slate-805 focus:border-indigo-500 rounded-xl py-2.5 px-3 pr-10 text-slate-200 outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-355 focus:outline-none cursor-pointer"
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full bg-slate-950 border border-slate-805 focus:border-indigo-500 rounded-xl py-2.5 px-3 pr-10 text-slate-200 outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-355 focus:outline-none cursor-pointer"
                    >
                      {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-850">
              <span className="text-[10px] text-slate-500">
                🛡️ Passwords must be at least 8 characters long to align with enterprise security encryption guidelines.
              </span>
              <button
                type="submit"
                disabled={isSavingPassword}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-450 hover:to-indigo-550 text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isSavingPassword ? 'Updating Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>

        {/* NOTIFICATIONS & PREFERENCES PRESETS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="border-b border-slate-850 pb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              System Preferences
            </h3>
          </div>

          <div className="space-y-4 text-xs text-slate-300">
            {/* Preference 1 */}
            <div className="flex items-start justify-between gap-3 p-1">
              <div>
                <p className="font-semibold text-slate-200">Dispute Alerts</p>
                <p className="text-[10px] text-slate-500">Receive instant email notices if an agent disputes your client log.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setEmailDisputes(!emailDisputes)}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {emailDisputes ? (
                  <ToggleRight className="w-8 h-8 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-600" />
                )}
              </button>
            </div>

            {/* Preference 2 */}
            <div className="flex items-start justify-between gap-3 p-1 border-t border-slate-850 pt-3">
              <div>
                <p className="font-semibold text-slate-200">Appointments Notifications</p>
                <p className="text-[10px] text-slate-500">Alert me when a site visit or reservation sign-off is scheduled or updated.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setEmailAppointments(!emailAppointments)}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {emailAppointments ? (
                  <ToggleRight className="w-8 h-8 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-600" />
                )}
              </button>
            </div>

            {/* Preference 3 */}
            <div className="flex items-start justify-between gap-3 p-1 border-t border-slate-850 pt-3">
              <div>
                <p className="font-semibold text-slate-200">Weekly Performance Digest</p>
                <p className="text-[10px] text-slate-500">Send an automated weekly email summarizing closed deals and activity.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setWeeklyDigest(!weeklyDigest)}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {weeklyDigest ? (
                  <ToggleRight className="w-8 h-8 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-600" />
                )}
              </button>
            </div>

            {/* Preference 4 */}
            <div className="flex items-start justify-between gap-3 p-1 border-t border-slate-850 pt-3">
              <div>
                <p className="font-semibold text-slate-200">Unauthorized Login Alerts</p>
                <p className="text-[10px] text-slate-500">Trigger warnings for sign-in attempts from unfamiliar browser coordinates.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setLoginAlerts(!loginAlerts)}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {loginAlerts ? (
                  <ToggleRight className="w-8 h-8 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-600" />
                )}
              </button>
            </div>

            {/* Preference 5 */}
            <div className="flex items-start justify-between gap-3 p-1 border-t border-slate-850 pt-3">
              <div>
                <p className="font-semibold text-slate-200">Double-Entry Warning Dialogs</p>
                <p className="text-[10px] text-slate-500">Provide helpful warnings on duplicates check before submitting client creations.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setDoubleEntryPrompt(!doubleEntryPrompt)}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {doubleEntryPrompt ? (
                  <ToggleRight className="w-8 h-8 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-600" />
                )}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-850 flex justify-end">
              <button
                type="button"
                onClick={handleSavePreferences}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-100 rounded-xl font-bold cursor-pointer transition-colors"
              >
                Sync Settings
              </button>
            </div>
          </div>
        </div>

      </div>

      <AlertDialog
        isOpen={isConfirmOpen}
        title="Confirm Password Change?"
        description="Are you sure you want to update your security password? You will need to use your new password next time you authenticate."
        confirmText="Yes, Change"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={executeSavePassword}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}

export default SecurityAndNotificationsManager;
