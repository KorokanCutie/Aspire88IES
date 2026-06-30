import React, { useState, useEffect } from 'react';
import { Profile } from '../types';
import { db } from '../db';
import { useToast } from './Toast';
import { User, ShieldCheck, Mail, Phone, Award } from 'lucide-react';
import { AlertDialog } from './AlertDialog';

interface MyProfileManagerProps {
  currentProfile: Profile;
  profiles: Profile[];
  onRefresh: () => void;
}

export function MyProfileManager({ currentProfile, profiles, onRefresh }: MyProfileManagerProps) {
  const { toast } = useToast();

  // Profile Details State
  const [firstName, setFirstName] = useState(currentProfile.first_name || '');
  const [lastName, setLastName] = useState(currentProfile.last_name || '');
  const [middleName, setMiddleName] = useState(currentProfile.middle_name || '');
  const [email, setEmail] = useState(currentProfile.email || '');
  const [contactNumber, setContactNumber] = useState(currentProfile.contact_number || '');
  const [address, setAddress] = useState(currentProfile.address || '');
  const [prcLicense, setPrcLicense] = useState(currentProfile.prc_license || '');
  const [birthdate, setBirthdate] = useState(currentProfile.birthdate || '');
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Sync state if current profile updates from props
  useEffect(() => {
    setFirstName(currentProfile.first_name || '');
    setLastName(currentProfile.last_name || '');
    setMiddleName(currentProfile.middle_name || '');
    setEmail(currentProfile.email || '');
    setContactNumber(currentProfile.contact_number || '');
    setAddress(currentProfile.address || '');
    setPrcLicense(currentProfile.prc_license || '');
    setBirthdate(currentProfile.birthdate || '');
  }, [currentProfile]);

  // Handle saving details
  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast('First name, last name, and email address are required fields.', 'error');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = contactNumber.trim().toLowerCase();

    // Check if email has changed and already exists in other profiles
    if (trimmedEmail !== currentProfile.email.toLowerCase()) {
      const emailExists = profiles.some(p => p.id !== currentProfile.id && p.email.toLowerCase() === trimmedEmail);
      if (emailExists) {
        toast('The email address you entered is already registered to another profile.', 'error');
        return;
      }
    }

    // Check if contact number has changed and already exists in other profiles
    if (trimmedPhone && trimmedPhone !== (currentProfile.contact_number || '').trim().toLowerCase()) {
      const phoneExists = profiles.some(p => p.id !== currentProfile.id && p.contact_number && p.contact_number.trim().toLowerCase() === trimmedPhone);
      if (phoneExists) {
        toast('The contact number you entered is already registered to another profile.', 'error');
        return;
      }
    }

    setIsConfirmOpen(true);
  };

  const executeSaveDetails = async () => {
    setIsConfirmOpen(false);
    setIsSavingDetails(true);

    const trimmedEmail = email.trim().toLowerCase();

    try {
      const updatedProfile: Profile = {
        ...currentProfile,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        middle_name: middleName.trim() || undefined,
        email: trimmedEmail,
        contact_number: contactNumber.trim() || undefined,
        address: address.trim() || undefined,
        prc_license: prcLicense.trim() || undefined,
        birthdate: birthdate || undefined,
        updated_at: new Date().toISOString()
      };

      await db.saveProfile(updatedProfile);
      toast('Personal coordinates updated successfully!', 'success');
      onRefresh();
    } catch (err: any) {
      toast(err.message || 'Failed to save profile details.', 'error');
    } finally {
      setIsSavingDetails(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tab Header bar */}
      <div className="border-b border-slate-800/60 pb-5">
        <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-400" />
          Profile Coordinates
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-sans">
          Manage your personal identifiers, contact networks, and regulatory licensing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PROFILE GENERAL OVERVIEW CARD */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5 h-fit select-none relative overflow-hidden">
          <div className="absolute top-0 left-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />
          
          <div className="flex items-center gap-4 border-b border-slate-805 pb-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 flex items-center justify-center text-slate-950 font-black text-xl">
              {currentProfile.first_name[0]}{currentProfile.last_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                  {currentProfile.first_name} {currentProfile.last_name}
                </h3>
                <span className="px-1.5 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-900/40 text-[9px] font-bold text-indigo-400 uppercase tracking-wide">
                  {currentProfile.role}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-1">Registry ID: {currentProfile.id}</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs text-slate-400">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Email Address</p>
                <p className="text-slate-300 font-semibold">{currentProfile.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Contact Number</p>
                <p className="text-slate-300 font-semibold">{currentProfile.contact_number || 'No contact set'}</p>
              </div>
            </div>

            {currentProfile.prc_license && (
              <div className="flex items-center gap-2.5">
                <Award className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">PRC License Status</p>
                  <p className="text-slate-300 font-semibold">{currentProfile.prc_license}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Security Compliance Status</p>
                {currentProfile.is_temporary ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-900/40 text-[10px] font-bold text-amber-400 uppercase mt-0.5 animate-pulse">
                    Temporary Session Password
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/40 text-[10px] font-bold text-emerald-400 uppercase mt-0.5">
                    Identity Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PROFILE DETAILS UPDATE FORM */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5 lg:col-span-2">
          <div className="border-b border-slate-850 pb-3">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Personal Credentials & Coordinates
            </h3>
          </div>

          <form onSubmit={handleSaveDetails} className="space-y-4 text-xs text-slate-350">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-slate-200 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-slate-200 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-slate-200 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-slate-200 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Contact Number
                </label>
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="e.g., +63 917 123 4567"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-slate-200 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Birthdate
                </label>
                <input
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-slate-200 outline-none transition-colors font-sans"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  PRC Professional License Number
                </label>
                <input
                  type="text"
                  value={prcLicense}
                  onChange={(e) => setPrcLicense(e.target.value)}
                  placeholder="e.g., REB No. 12345"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-slate-200 outline-none transition-colors"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Verified Contact Address
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, Barangay, City, Province, ZIP"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-slate-200 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-850">
              <button
                type="submit"
                disabled={isSavingDetails}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-450 text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingDetails ? 'Saving Coordinates...' : 'Update Details'}
              </button>
            </div>
          </form>
        </div>

      </div>

      <AlertDialog
        isOpen={isConfirmOpen}
        title="Confirm Profile Updates?"
        description="Are you sure you want to update your registered profile details? This will modify your official coordinate records in the system."
        confirmText="Yes, Update"
        cancelText="Cancel"
        onConfirm={executeSaveDetails}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}

export default MyProfileManager;
