import React, { useState, useEffect } from 'react';
import { Profile } from '../types';
import { db, INITIAL_PROFILES } from '../db';
import { KeyRound, Shield, User, Building, Landmark, Mail, ChevronLeft, Send, Check, X, Eye, EyeOff, AlertCircle, MailOpen } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { supabase } from '../supabaseClient';
import { AppProperties } from '../appProperties';

interface LoginFormProps {
  onLoginSuccess: (profile: Profile, rememberMe: boolean) => void;
  profiles: Profile[];
}

export function LoginForm({ onLoginSuccess, profiles }: LoginFormProps) {
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('aspire88_remembered_email') || '';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('aspire88_remember_me_checked') === 'true';
  });
  const [showQuickAccounts, setShowQuickAccounts] = useState(AppProperties.enableQuickTestingAccounts);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password Mode
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [isSubmittingRecovery, setIsSubmittingRecovery] = useState(false);

  // Email template simulation modal
  const [simulatedEmailDetails, setSimulatedEmailDetails] = useState<{
    recipientName: string;
    recipientEmail: string;
    profileId: string;
    tempPassword: string;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    const handlePropsChange = () => {
      setShowQuickAccounts(AppProperties.enableQuickTestingAccounts);
    };
    window.addEventListener('app-properties-changed', handlePropsChange);
    return () => {
      window.removeEventListener('app-properties-changed', handlePropsChange);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.toLowerCase().trim();

    // Search profile list
    const found = profiles.find(p => p.email.toLowerCase().trim() === trimmedEmail);
    if (!found) {
      setError('No profile coordinates registered with this email address.');
      return;
    }

    if (!found.is_active) {
      setError('This account has been deactivated by the brokerage administrator.');
      return;
    }

    try {
      // 1. Try to sign in using Supabase Auth (wrapped individually to prevent network blockages like "Failed to fetch")
      try {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: password,
        });

        if (!authErr && authData?.user) {
          onLoginSuccess(found, rememberMe);
          return;
        }
      } catch (authErr: any) {
        console.warn('Supabase Auth connection offline or unreachable:', authErr.message || authErr);
      }

      // 2. Fall back to secure database credentials verification (bcrypt encryption)
      const expectedPw = found.password || found.temp_password || '';
      let isMatch = false;

      if (expectedPw.startsWith('$2a$') || expectedPw.startsWith('$2b$')) {
        isMatch = bcrypt.compareSync(password, expectedPw);
      } else {
        // Direct match for legacy / newly seeded unhashed item fallbacks
        isMatch = (password === expectedPw) || (expectedPw === 'password' && password === 'password') || (found.id === 'AD-SEED9000' && password === 'AspireAdmin2026!');
      }

      if (!isMatch) {
        setError('Authentication failed: Invalid secure credentials.');
        return;
      }

      // Auto-register/sync on Supabase Auth to establish connection for future sessions
      try {
        const { error: signUpErr } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: password,
        });
        if (signUpErr) console.warn('Supabase Auth auto-signup mapping warning:', signUpErr.message);
      } catch (authErr) {
        console.warn('Supabase Auth registration check skipped:', authErr);
      }

      onLoginSuccess(found, rememberMe);
    } catch (err: any) {
      setError(err.message || 'An error occurred during portal authentication.');
    }
  };

  const handleQuickLogin = async (prof: Profile) => {
    setError('');
    let defaultPw = 'password';
    if (prof.id === 'AD-SEED9000') {
      defaultPw = 'AspireAdmin2026!';
    }
    setEmail(prof.email);
    setPassword(defaultPw);
    
    // Trigger login with a slight delay so user can see coordinates autofilled
    setTimeout(() => {
      const form = document.getElementById('login-form-main') as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 100);
  };

  // Forgot password generator helper
  const generateTempPassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const symbols = '!@#$%^&*';
    const getChar = (str: string) => str[Math.floor(Math.random() * str.length)];
    return `AspireTemp${getChar(uppercase)}${getChar(lowercase)}${getChar(digits)}${getChar(symbols)}${Math.floor(1000 + Math.random() * 9000)}`;
  };

  // Submit Forgot Password request
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoverySuccess(false);
    setIsSubmittingRecovery(true);

    const trimmedEmail = recoveryEmail.toLowerCase().trim();
    const found = profiles.find(p => p.email.toLowerCase().trim() === trimmedEmail);

    if (!found) {
      setRecoveryError('No profile coordinates registered with this email address.');
      setIsSubmittingRecovery(false);
      return;
    }

    if (!found.is_active) {
      setRecoveryError('This account is locked. Please contact the administrator.');
      setIsSubmittingRecovery(false);
      return;
    }

    try {
      // Generate secure temporary password
      const tempPass = generateTempPassword();
      const hashedTempPass = bcrypt.hashSync(tempPass, 10);

      // Create updated profile state
      const updatedProfile: Profile = {
        ...found,
        password: '', // Clear old permanent password
        temp_password: hashedTempPass,
        is_temporary: true,
        updated_at: new Date().toISOString()
      };

      // Save to Supabase / Local Storage
      await db.saveProfile(updatedProfile);

      // Load simulated email details
      setSimulatedEmailDetails({
        recipientName: `${found.first_name} ${found.last_name}`,
        recipientEmail: found.email,
        profileId: found.id,
        tempPassword: tempPass,
        timestamp: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      });

      setRecoverySuccess(true);
      setRecoveryEmail('');
    } catch (e: any) {
      setRecoveryError(e.message || 'Failed to process recovery credentials.');
    } finally {
      setIsSubmittingRecovery(false);
    }
  };

  // Filter current active profiles for quick login list
  const currentProfiles = profiles.filter((p) => p.is_active);

  return (
    <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/95 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
      {/* Background Decorative Accent */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />

      {/* Brand logo headers */}
      <div className="mb-6">
        <div>
          <h1 className="text-sm font-black text-slate-100 tracking-wider uppercase">Aspire88 Estates Corporation IES</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold">Integrated Enterprise System</p>
        </div>
      </div>

      {!isForgotPasswordMode ? (
        // --- NORMAL LOGIN VIEW ---
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Portal Authentication</h2>
          <p className="text-xs text-slate-400 mt-1">Provide your credentials or select a role to authenticate.</p>

          <form id="login-form-main" onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 tracking-wide uppercase">Email Address</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="broker.roxas@aspire88.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-400 tracking-wide uppercase">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordMode(true);
                    setRecoverySuccess(false);
                    setRecoveryError('');
                  }}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-350 underline cursor-pointer focus:outline-none"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative mt-1">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-11 text-sm text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-350 focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center pb-1">
              <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-4 h-4 rounded border border-slate-800 bg-slate-950 flex items-center justify-center text-slate-950 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 peer-checked:text-slate-100 transition-all duration-150">
                  <Check className="w-3 h-3 stroke-[3.5]" />
                </div>
                <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-300 transition-colors">
                  Remember Me
                </span>
              </label>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
                <Shield className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 py-3 rounded-xl font-bold text-sm tracking-wide shadow-xl shadow-teal-950/20 active:scale-[0.99] hover:scale-[1.01] transition-all cursor-pointer"
            >
              Authenticate Portal
            </button>
          </form>

          {/* Quick Testing Sandbox Accounts */}
          {showQuickAccounts && (
            <div className="mt-8 pt-6 border-t border-slate-800/80">
              <div className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase mb-3">
                Quick Testing Accounts Sandbox
              </div>
              <div className="grid grid-cols-2 gap-2">
                {currentProfiles.map((p) => {
                  let roleLabel = p.role;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleQuickLogin(p)}
                      className="text-left bg-slate-950/50 hover:bg-slate-950 border border-slate-800/60 hover:border-slate-700/80 rounded-xl p-2.5 transition-all text-[11px] group cursor-pointer hover:scale-[1.02] duration-200"
                    >
                      <div className="font-semibold text-slate-300 group-hover:text-slate-100 flex items-center justify-between">
                        <span className="truncate max-w-[100px]">{p.first_name} {p.last_name}</span>
                        <span className="text-[8px] uppercase px-1 py-0.2 rounded-md bg-slate-800 text-slate-400 group-hover:text-indigo-300">
                          {roleLabel}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-500 truncate mt-0.5 font-mono">{p.email}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        // --- FORGOT PASSWORD VIEW ---
        <div className="animate-fade-in">
          <button
            type="button"
            onClick={() => setIsForgotPasswordMode(false)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 hover:border-indigo-500/50 text-slate-300 hover:text-slate-100 text-xs font-semibold rounded-xl mb-5 transition-all cursor-pointer hover:shadow-lg shadow-indigo-500/5 group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Login Page</span>
          </button>

          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Access Recovery Request</h2>
          <p className="text-xs text-slate-400 mt-1">
            Input your registered email coordinates to generate a single-session temporary password credentials set.
          </p>

          <form onSubmit={handleForgotPasswordSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 tracking-wide uppercase">Registered Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="your.email@aspire88.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            {recoveryError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{recoveryError}</span>
              </div>
            )}

            {recoverySuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>New temporary credentials generated and queued for transmission!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingRecovery}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-450 hover:to-purple-550 text-slate-100 py-3 rounded-xl font-bold text-sm tracking-wide shadow-xl shadow-indigo-950/20 active:scale-[0.99] hover:scale-[1.01] transition-all cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmittingRecovery ? 'Generating Credentials...' : 'Send Recovery Credentials'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Nice and Professional Email Template Simulation Modal */}
      {simulatedEmailDetails && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in origin-center overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-8">
            {/* Simulator Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="font-mono text-slate-400 font-semibold uppercase tracking-wider">Outgoing Mail Delivery Queue (SIMULATED)</span>
              </div>
              <button
                onClick={() => setSimulatedEmailDetails(null)}
                className="text-slate-500 hover:text-slate-300 p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Close simulator view"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Email Metadata */}
            <div className="p-4 bg-slate-950/40 border-b border-slate-800/60 font-sans text-[11px] text-slate-400 space-y-1.5">
              <div><span className="font-bold text-slate-500">From:</span> Aspire88 Estates Corporation Integrated Enterprise System Security <code className="bg-slate-900 text-indigo-400 px-1.5 py-0.2 rounded">no-reply@aspire88.com</code></div>
              <div><span className="font-bold text-slate-500">To:</span> {simulatedEmailDetails.recipientName} <code className="bg-slate-900 text-indigo-400 px-1.5 py-0.2 rounded">{simulatedEmailDetails.recipientEmail}</code></div>
              <div><span className="font-bold text-slate-500">Subject:</span> 🔒 Aspire88 Estates Corporation Integrated Enterprise System - Security Credentials Reset</div>
              <div><span className="font-bold text-slate-500">Timestamp:</span> {simulatedEmailDetails.timestamp} PST</div>
            </div>

            {/* --- THE PROFESSIONAL EMAIL TEMPLATE --- */}
            <div className="p-6 bg-slate-950 font-sans leading-relaxed text-slate-300">
              {/* Email Content Container */}
              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 sm:p-7 max-w-md mx-auto space-y-6 shadow-xl relative overflow-hidden">
                {/* Visual top border indicator matching brand */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-teal-500 to-purple-600" />
                
                {/* Email Header */}
                <div className="border-b border-slate-800/50 pb-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-100 uppercase tracking-widest">Aspire88 Estates Corporation Integrated Enterprise System</h4>
                    <p className="text-[8px] text-slate-500 font-mono font-bold uppercase tracking-widest">Portal Delivery Agent</p>
                  </div>
                </div>

                {/* Email Body */}
                <div className="space-y-4 text-xs text-slate-300">
                  <p className="font-semibold text-slate-100 text-sm">SYSTEM SECURITY NOTICE - RESET CREDENTIALS</p>
                  
                  <p>Dear <strong className="text-indigo-300">{simulatedEmailDetails.recipientName}</strong>,</p>
                  
                  <p className="leading-relaxed">
                    A temporary password credentials reset has been authorized for your Aspire88 Estates Corporation Integrated Enterprise System portal account. To protect your access integrity and maintain secure records, please utilize the single-session temporary password credentials supplied below.
                  </p>

                  {/* Credentials Box */}
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 font-sans space-y-2">
                    <div className="flex justify-between items-center text-[10px] border-b border-slate-800 pb-1.5">
                      <span className="font-bold text-slate-500 uppercase tracking-wider">User Identity</span>
                      <span className="font-bold text-slate-300 font-mono">{simulatedEmailDetails.recipientName}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] border-b border-slate-800 pb-1.5">
                      <span className="font-bold text-slate-500 uppercase tracking-wider">Registry ID</span>
                      <span className="font-bold text-indigo-400 font-mono">{simulatedEmailDetails.profileId}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-500 uppercase tracking-wider">Temporary Password</span>
                      <span className="font-bold text-emerald-400 font-mono tracking-wider bg-slate-900 border border-slate-800 px-2 py-0.5 rounded select-all text-xs">{simulatedEmailDetails.tempPassword}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        // Autofill credentials on login form and close modal
                        setEmail(simulatedEmailDetails.recipientEmail);
                        setPassword(simulatedEmailDetails.tempPassword);
                        setSimulatedEmailDetails(null);
                        setIsForgotPasswordMode(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-550/10 cursor-pointer hover:scale-[1.01]"
                    >
                      <MailOpen className="w-3.5 h-3.5" />
                      <span>Authorize Security Login</span>
                    </button>
                  </div>

                  {/* Compliance Notice */}
                  <div className="p-3 bg-slate-950 border-l-2 border-amber-500 text-slate-400 text-[10px] leading-relaxed rounded-r-xl">
                    <strong className="text-amber-500 uppercase font-bold tracking-wide">⚠️ Mandatory Compliance Check:</strong> For your identity security, this temporary credentials reset is valid for a single session. You are required to replace it with a personalized, high-strength password immediately upon successful portal authentication.
                  </div>
                </div>

                {/* Email Footer */}
                <div className="text-[9px] text-slate-500 text-center border-t border-slate-800/50 pt-4 font-mono space-y-1">
                  <p>This is an automated system security transmission. Do not reply to this email.</p>
                  <p>Netlify & Supabase Cloud-Native Core Workspace. Manila, Philippines.</p>
                </div>
              </div>
            </div>

            {/* Simulated Mailbox Action */}
            <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">Tip: Click "Authorize Security Login" to auto-fill the form!</span>
              <button
                type="button"
                onClick={() => setSimulatedEmailDetails(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
