import React, { useState } from 'react';
import { Profile } from '../types';
import { db } from '../db';
import { useToast } from './Toast';
import { KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { supabase } from '../supabaseClient';

interface ForcePasswordChangeProps {
  currentProfile: Profile;
  onPasswordChanged: (updatedProfile: Profile) => void;
}

export function ForcePasswordChange({ currentProfile, onPasswordChanged }: ForcePasswordChangeProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long to align with enterprise security protocols.');
      return;
    }

    if (newPassword === confirmPassword) {
      try {
        // Encrypt password using bcrypt
        const hashedPassword = bcrypt.hashSync(newPassword, 10);

        // Update / register user with Supabase Auth
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Logged in via Supabase Auth already -> Update password
            const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
            if (updateErr) console.warn('Supabase Auth update user password error:', updateErr.message);
          } else {
            // Not registered / logged in via Supabase Auth -> Auto-sign up to establish Auth mapping
            const { error: signUpErr } = await supabase.auth.signUp({
              email: currentProfile.email,
              password: newPassword,
            });
            if (signUpErr) console.warn('Supabase Auth auto sign up warning:', signUpErr.message);
          }
        } catch (authErr: any) {
          console.warn('Supabase Auth synchronization skipped:', authErr.message || authErr);
        }

        const updatedProfile = {
          ...currentProfile,
          is_temporary: false,
          temp_password: '', // Clear the temporary password flag & value
          password: hashedPassword, // Store the custom secure password
          updated_at: new Date().toISOString()
        };

        const result = await db.saveProfile(updatedProfile);
        toast('Security credentials updated. Welcome to Aspire88 Estates Corporation Integrated Enterprise System.', 'success');
        setSuccess(true);
        setTimeout(() => {
          onPasswordChanged(result);
        }, 1200);
      } catch (err: any) {
        setError(err.message || 'Failed to update credentials.');
      }
    } else {
      setError('Passwords do not match. Verify your inputs.');
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500" />
      
      <div className="flex items-center gap-2.5 mb-5 select-none">
        <div className="p-2 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-800/40">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-widest leading-none">Security Mandate</h2>
          <span className="text-[10px] text-emerald-500 font-medium font-mono uppercase tracking-wider">Aspire88 Estates Corporation Integrated Enterprise System</span>
        </div>
      </div>

      <div className="p-4 bg-amber-950/25 border border-amber-800/30 rounded-xl flex items-start gap-3 mb-5">
        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xs font-bold text-amber-200">Temporary Password Intercept</h3>
          <p className="text-[11px] text-amber-400/90 leading-relaxed mt-1">
            Your profile has been flagged as having a temporary password. You must configure a new, secure password to unlock administrative and operational views.
          </p>
        </div>
      </div>

      {success ? (
        <div className="text-center py-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-200">Credentials Confirmed</h4>
          <p className="text-xs text-slate-400 mt-1">Establishing secure portal connection...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs tracking-wider uppercase rounded-xl shadow-lg hover:shadow-teal-900/30 transition-all"
          >
            Apply Security Credentials
          </button>
        </form>
      )}
    </div>
  );
}
export default ForcePasswordChange;
