import React, { useState, useEffect } from 'react';
import { Profile, UserRole } from '../types';
import { db, generateAlphaId } from '../db';
import { useToast } from './Toast';
import { sendEmail } from '../resend';
import { AlertDialog } from './AlertDialog';
import { Shield, Plus, Copy, Check, Power, Search, ShieldAlert, KeyRound, ArrowRight, X, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import bcrypt from 'bcryptjs';

interface ProfilesManagerProps {
  currentProfile: Profile;
  profiles: Profile[];
  onRefresh: () => void;
}

export function ProfilesManager({ currentProfile, profiles, onRefresh }: ProfilesManagerProps) {
  const { toast } = useToast();
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRoleFilter]);

  // Modal triggers
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Add User Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Agent');
  const [parentBrokerId, setParentBrokerId] = useState('');
  const [address, setAddress] = useState('');
  const [prcLicense, setPrcLicense] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  // Edit User Form State
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editMiddleName, setEditMiddleName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Agent');
  const [editParentBrokerId, setEditParentBrokerId] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPrcLicense, setEditPrcLicense] = useState('');
  const [editBirthdate, setEditBirthdate] = useState('');
  const [editContactNumber, setEditContactNumber] = useState('');

  // Password Generation Visual Support
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [copied, setCopied] = useState(false);

  // Defensive confirmation variables
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

  const generateTempPassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const symbols = '!@#$%^&*';
    const getChar = (str: string) => str[Math.floor(Math.random() * str.length)];
    return `AspireTemp${getChar(uppercase)}${getChar(lowercase)}${getChar(digits)}${getChar(symbols)}${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    toast('Temporary password copied to secure clipboard.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAdminGenerateTempPassword = async (p: Profile) => {
    const temp = generateTempPassword();
    const hashedTemp = bcrypt.hashSync(temp, 10);
    
    // Update profile in database
    const updated: Profile = {
      ...p,
      password: '', // clear old permanent password
      temp_password: hashedTemp,
      is_temporary: true,
      updated_at: new Date().toISOString()
    };

    try {
      await db.saveProfile(updated);
      setGeneratedPassword(temp);
      setRegisteredEmail(p.email);
      toast(`New temporary password generated for ${p.first_name} ${p.last_name}!`, 'success');
      onRefresh();
    } catch (e: any) {
      toast(`Failed to reset password: ${e.message || e}`, 'error');
    }
  };

  const visibleProfiles = profiles.filter(p => {
    // 1. Do not include active user in Staff Segment list table.
    if (p.id === currentProfile.id) return false;

    // Core structural security gating
    if (currentProfile.role === 'Admin') {
      if (p.role === 'Admin') {
        return false; // exclude other admins
      }
    } else if (currentProfile.role === 'Broker') {
      // Brokers see/edit only their own sub-agents
      if (p.role !== 'Agent' || p.parent_broker_id !== currentProfile.id) {
        return false;
      }
    } else if (currentProfile.role === 'Treasurer') {
      // Treasurer sees Agents and Brokers. They cannot see Admins.
      if (p.role === 'Admin') return false;
    } else {
      // Agents cannot see anyone else
      return false;
    }

    const mName = p.middle_name || '';
    const nameStr = `${p.first_name} ${mName} ${p.last_name}`;
    const matchesSearch = nameStr.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = selectedRoleFilter === 'All' || p.role === selectedRoleFilter;

    return matchesSearch && matchesFilter;
  });

  const triggerActivationToggle = (p: Profile) => {
    const actionText = p.is_active ? 'Deactivate' : 'Reactivate';
    
    setDialogConfig({
      title: `${actionText} Staff Member?`,
      description: p.is_active 
        ? `Are you absolutely sure you want to deactivate ${p.first_name} ${p.last_name} (${p.id})? They will be locked out of the ERP dashboard instantly.`
        : `Are you sure you want to reactivate ${p.first_name} ${p.last_name} (${p.id})? A new temporary password credentials set will be generated.`,
      isDestructive: p.is_active,
      onConfirm: async () => {
        setDialogOpen(false);
        const tempPass = !p.is_active ? generateTempPassword() : (p.temp_password || '');
        const hashedTempPass = (!p.is_active && tempPass) ? bcrypt.hashSync(tempPass, 10) : tempPass;
        const updated = {
          ...p,
          is_active: !p.is_active,
          is_temporary: !p.is_active ? true : p.is_temporary,
          temp_password: hashedTempPass,
          updated_at: new Date().toISOString()
        };

        await db.saveProfile(updated);
        toast(`Profile status updated: ${p.first_name} is now ${!p.is_active ? 'Active (Temporary Mode)' : 'Inactive'}.`, 'success');
        
        if (!p.is_active) {
          setRegisteredEmail(p.email);
          setGeneratedPassword(tempPass);
          sendEmail(p.email, `[Security Alert] Account Reactivated - Credentials Assigned`, `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #334155; line-height: 1.6; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <!-- Brand Header -->
              <div style="border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; text-align: left;">
                <h2 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 800; letter-spacing: -0.025em;">ASPIRE88 ESTATES CORPORATION INTEGRATED ENTERPRISE SYSTEM</h2>
                <span style="font-size: 11px; color: #4f46e5; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">Integrated Enterprise System</span>
              </div>

              <!-- Main Content -->
              <p style="margin-top: 0; margin-bottom: 16px; font-size: 14px; color: #0f172a; font-weight: 600;">
                Dear ${p.first_name} ${p.last_name},
              </p>
              <p style="margin-top: 0; margin-bottom: 20px; font-size: 14px; color: #475569;">
                This notification is to confirm that your administrative account for the Aspire88 Estates Corporation Integrated Enterprise System dashboard has been successfully reactivated. As a security measure, a temporary password has been auto-generated for your initial session.
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <h4 style="margin-top: 0; margin-bottom: 12px; font-size: 12px; font-weight: 700; color: #475569; letter-spacing: 0.05em; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                  Access Credentials
                </h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 500; width: 35%;">User ID:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: 600;">${p.id}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Role:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${p.role}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Temp Password:</td>
                    <td style="padding: 6px 0; color: #b91c1c; font-family: monospace; font-weight: 700; background-color: #fef2f2; padding: 4px 8px; border-radius: 4px; display: inline-block;">${tempPass}</td>
                  </tr>
                </table>
              </div>

              <!-- Action Notice -->
              <p style="font-size: 13px; color: #e11d48; font-weight: 600; margin-bottom: 24px;">
                ⚠️ Security Mandate: You will be prompted and required to replace this temporary credential with a new secure password immediately upon logging in.
              </p>

              <div style="text-align: center; margin-bottom: 28px;">
                <a href="https://aspire88.netlify.app" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;">
                  Log In to Dashboard
                </a>
              </div>

              <!-- Footer -->
              <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
                <p style="margin: 0 0 4px 0;">This is an automated security-related message from the Aspire88 Estates Corporation Integrated Enterprise System.</p>
                <p style="margin: 0;">&copy; 2026 Aspire88 Estates Corporation Integrated Enterprise System. All rights reserved.</p>
              </div>
            </div>
          `).catch(e => console.error('Error sending reactivation email:', e));
        } else {
          setRegisteredEmail('');
          setGeneratedPassword('');
        }
        onRefresh();
      }
    });

    setDialogOpen(true);
  };

  const clearAddUserInputs = () => {
    setFirstName('');
    setLastName('');
    setMiddleName('');
    setEmail('');
    setAddress('');
    setPrcLicense('');
    setBirthdate('');
    setContactNumber('');
    setParentBrokerId('');
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: all fields except PRC License are mandatory
    if (
      !firstName.trim() || 
      !lastName.trim() || 
      !middleName.trim() || 
      !email.trim() || 
      !address.trim() || 
      !birthdate || 
      !contactNumber.trim()
    ) {
      toast('All fields except PRC License are mandatory.', 'error');
      return;
    }

    const finalRole = currentProfile.role === 'Broker' ? 'Agent' as const : role;
    const finalParent = currentProfile.role === 'Broker' ? currentProfile.id : (finalRole === 'Agent' ? parentBrokerId : undefined);

    if (finalRole === 'Agent' && !finalParent) {
      toast('Agent role must have a parent team broker.', 'error');
      return;
    }

    // 1. Prompt error message if email add already exist in the database.
    if (profiles.some(p => p.email.toLowerCase() === email.toLowerCase().trim())) {
      toast('Email address is already registered in the database.', 'error');
      return;
    }

    // 1b. Prompt error message if contact number already exists in the database.
    if (profiles.some(p => p.contact_number && p.contact_number.trim().toLowerCase() === contactNumber.trim().toLowerCase())) {
      toast('Contact number is already registered in the database.', 'error');
      return;
    }

    // 2. Prompt error message if same details is already existing in the record. (composite check)
    const duplicateProfile = profiles.some(p => 
      p.first_name.trim().toLowerCase() === firstName.trim().toLowerCase() &&
      (p.middle_name || '').trim().toLowerCase() === middleName.trim().toLowerCase() &&
      p.last_name.trim().toLowerCase() === lastName.trim().toLowerCase() &&
      p.birthdate === birthdate &&
      (p.address || '').trim().toLowerCase() === address.trim().toLowerCase() &&
      (p.contact_number || '').trim().toLowerCase() === contactNumber.trim().toLowerCase() &&
      p.role === finalRole
    );
    if (duplicateProfile) {
      toast('A user with the same name, birthdate, address, contact number, and role is already existing in the record.', 'error');
      return;
    }

    // 3. Prompt error message if new agent name, birthdate, address, contact number and role is already existing for another broker.
    if (finalRole === 'Agent') {
      const existingAgentOtherBroker = profiles.some(p => 
        p.first_name.trim().toLowerCase() === firstName.trim().toLowerCase() &&
        (p.middle_name || '').trim().toLowerCase() === middleName.trim().toLowerCase() &&
        p.last_name.trim().toLowerCase() === lastName.trim().toLowerCase() &&
        p.birthdate === birthdate &&
        (p.address || '').trim().toLowerCase() === address.trim().toLowerCase() &&
        (p.contact_number || '').trim().toLowerCase() === contactNumber.trim().toLowerCase() &&
        p.role === 'Agent' &&
        p.parent_broker_id !== finalParent
      );
      if (existingAgentOtherBroker) {
        toast('An agent with the same name, birthdate, address, contact number, and role is already existing for another broker.', 'error');
        return;
      }
    }

    const tempPass = generateTempPassword();
    const hashedTempPass = bcrypt.hashSync(tempPass, 10);
    let prefix = 'AG-';
    if (finalRole === 'Admin') prefix = 'AD-';
    else if (finalRole === 'Broker') prefix = 'BR-';
    else if (finalRole === 'Treasurer') prefix = 'TR-';

    const newProfile: Profile = {
      id: generateAlphaId(prefix),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      middle_name: middleName.trim(),
      email: email.trim(),
      address: address.trim(),
      prc_license: prcLicense.trim() || undefined,
      birthdate: birthdate,
      contact_number: contactNumber.trim(),
      role: finalRole,
      parent_broker_id: finalParent || null,
      is_active: true,
      is_temporary: true,
      temp_password: hashedTempPass,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.saveProfile(newProfile);
    setRegisteredEmail(newProfile.email);
    setGeneratedPassword(tempPass);
    toast(`Successfully added profile ID ${newProfile.id}.`, 'success');

    sendEmail(newProfile.email, `Welcome to Aspire88 Estates Corporation Integrated Enterprise System - Account Provisioned`, `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #334155; line-height: 1.6; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Brand Header -->
        <div style="border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; text-align: left;">
          <h2 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 800; letter-spacing: -0.025em;">ASPIRE88 ESTATES CORPORATION INTEGRATED ENTERPRISE SYSTEM</h2>
          <span style="font-size: 11px; color: #4f46e5; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">Integrated Enterprise System</span>
        </div>

        <!-- Main Content -->
        <p style="margin-top: 0; margin-bottom: 16px; font-size: 14px; color: #0f172a; font-weight: 600;">
          Dear ${firstName.trim()} ${lastName.trim()},
        </p>
        <p style="margin-top: 0; margin-bottom: 20px; font-size: 14px; color: #475569;">
          Welcome to Aspire88 Estates Corporation Integrated Enterprise System! We are pleased to inform you that your professional ERP user profile has been successfully provisioned on our enterprise platform.
        </p>

        <!-- Profile Details Box -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h4 style="margin-top: 0; margin-bottom: 12px; font-size: 12px; font-weight: 700; color: #475569; letter-spacing: 0.05em; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            Profile Information
          </h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500; width: 35%;">User ID:</td>
              <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: 600;">${newProfile.id}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Role Designation:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${finalRole}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Authorized Email:</td>
              <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: 500;">${newProfile.email}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Temp Password:</td>
              <td style="padding: 6px 0; color: #b91c1c; font-family: monospace; font-weight: 700; background-color: #fef2f2; padding: 4px 8px; border-radius: 4px; display: inline-block;">${tempPass}</td>
            </tr>
          </table>
        </div>

        <!-- Security Mandate Notice -->
        <p style="font-size: 13px; color: #e11d48; font-weight: 600; margin-bottom: 24px;">
          ⚠️ Security Mandate: For confidentiality and identity integrity, you are required to establish a new personalized secure password upon your very first login session.
        </p>

        <div style="text-align: center; margin-bottom: 28px;">
          <a href="https://aspire88.netlify.app" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;">
            Access ERP Portal
          </a>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0 0 4px 0;">This is an automated administrative notification from the Aspire88 Estates Corporation Integrated Enterprise System.</p>
          <p style="margin: 0;">&copy; 2026 Aspire88 Estates Corporation Integrated Enterprise System. All rights reserved.</p>
        </div>
      </div>
    `).catch(e => console.error('Error sending onboarding email:', e));
    
    // Clear inputs and close modal
    clearAddUserInputs();
    setIsCreating(false);
    onRefresh();
  };

  const openEditModal = (p: Profile) => {
    setEditingProfile(p);
    setEditFirstName(p.first_name);
    setEditLastName(p.last_name);
    setEditMiddleName(p.middle_name || '');
    setEditEmail(p.email);
    setEditRole(p.role);
    setEditParentBrokerId(p.parent_broker_id || '');
    setEditAddress(p.address || '');
    setEditPrcLicense(p.prc_license || '');
    setEditBirthdate(p.birthdate || '');
    setEditContactNumber(p.contact_number || '');
    setIsEditing(true);
  };

  const handleEditProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;

    // Validation: all fields except PRC License are mandatory
    if (
      !editFirstName.trim() || 
      !editLastName.trim() || 
      !editMiddleName.trim() || 
      !editEmail.trim() || 
      !editAddress.trim() || 
      !editBirthdate || 
      !editContactNumber.trim()
    ) {
      toast('All fields except PRC License are mandatory.', 'error');
      return;
    }

    const finalRole = editingProfile.role; // keep role unchanged or use state if authorized
    const finalParent = editRole === 'Agent' ? editParentBrokerId : editingProfile.parent_broker_id;

    // Email already registered elsewhere
    if (profiles.some(p => p.id !== editingProfile.id && p.email.toLowerCase() === editEmail.toLowerCase().trim())) {
      toast('Email address is already registered in the database for another user.', 'error');
      return;
    }

    // Name details already existing elsewhere
    const duplicateProfile = profiles.some(p => 
      p.id !== editingProfile.id &&
      p.first_name.trim().toLowerCase() === editFirstName.trim().toLowerCase() &&
      (p.middle_name || '').trim().toLowerCase() === editMiddleName.trim().toLowerCase() &&
      p.last_name.trim().toLowerCase() === editLastName.trim().toLowerCase()
    );
    if (duplicateProfile) {
      toast('Another user already exists with the same name details.', 'error');
      return;
    }

    // Confirmation popup
    setDialogConfig({
      title: 'Save Profile Edits?',
      description: `Are you sure you want to save the changes made to ${editFirstName} ${editLastName}'s profile?`,
      isDestructive: false,
      onConfirm: async () => {
        setDialogOpen(false);
        const updated: Profile = {
          ...editingProfile,
          first_name: editFirstName.trim(),
          last_name: editLastName.trim(),
          middle_name: editMiddleName.trim(),
          email: editEmail.trim(),
          address: editAddress.trim(),
          prc_license: editPrcLicense.trim() || undefined,
          birthdate: editBirthdate,
          contact_number: editContactNumber.trim(),
          parent_broker_id: finalParent || null,
          updated_at: new Date().toISOString()
        };

        await db.saveProfile(updated);
        toast(`Successfully updated profile ${updated.id}.`, 'success');
        setIsEditing(false);
        setEditingProfile(null);
        onRefresh();
      }
    });

    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Structural Headers and Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/60 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            Staff Security Directory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {currentProfile.role === 'Admin' && 'Manage brokerage roles, broker-to-agent branches, and status variables.'}
            {currentProfile.role === 'Broker' && 'Manage your downline listing agents.'}
            {currentProfile.role === 'Treasurer' && 'Directory of registered broker and agent personnel.'}
          </p>
        </div>

        {currentProfile.role !== 'Treasurer' && currentProfile.role !== 'Agent' && (
          <button
            onClick={() => {
              clearAddUserInputs();
              setIsCreating(true);
              setGeneratedPassword('');
            }}
            className="self-start sm:self-center bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-slate-100 px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-950/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        )}
      </div>

      {/* Temporary Password Clipboard Box Modal */}
      {generatedPassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in origin-center">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md relative shadow-2xl text-center">
            <button
              onClick={() => {
                setGeneratedPassword('');
                setRegisteredEmail('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mx-auto w-12 h-12 bg-emerald-950 text-emerald-400 border border-emerald-800/45 rounded-2xl flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-100 tracking-tight">Temporary Password Generated</h3>
            <p className="text-xs text-slate-400 mt-2">
              The user with email <span className="text-indigo-400 font-semibold">{registeredEmail}</span> has been configured with an active temporary state.
            </p>
            <p className="text-[11px] text-amber-500/80 mt-1">
              Provide these temporary credentials to the personnel:
            </p>

            <div className="mt-5 flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-mono text-emerald-300 tracking-wider justify-between">
              <span className="select-all">{generatedPassword}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 rounded-xl transition-all cursor-pointer"
                title="Copy Password"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => {
                setGeneratedPassword('');
                setRegisteredEmail('');
              }}
              className="mt-6 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Confirm and Close
            </button>
          </div>
        </div>
      )}

      {/* Directory Tabular Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search staff, email coordinates, serial IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          {currentProfile.role === 'Admin' && (
            <div className="flex gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-xl">
              {['All', 'Broker', 'Agent', 'Treasurer'].map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRoleFilter(r)}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold rounded-lg transition-colors cursor-pointer ${
                    selectedRoleFilter === r
                      ? 'bg-indigo-950 border border-indigo-800 text-indigo-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Staff Registry */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-5">ID Coordinates</th>
                <th className="py-4 px-5">Staff Identity</th>
                <th className="py-4 px-5">Access Tier</th>
                <th className="py-4 px-5">Team Assignment</th>
                <th className="py-4 px-5">Security Flags</th>
                {currentProfile.role !== 'Treasurer' && <th className="py-4 px-5 text-right">Operational Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(() => {
                const sorted = [...visibleProfiles].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
                const totalPages = Math.ceil(sorted.length / recordsPerPage);
                const paginated = sorted.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

                if (paginated.length === 0) {
                  return (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-slate-500 italic">
                        No matching staff members found in this security cluster.
                      </td>
                    </tr>
                  );
                }

                return (
                  <>
                    {paginated.map((p) => {
                      const mName = p.middle_name || '';
                      const formattedFullName = `${p.first_name} ${mName ? mName + ' ' : ''}${p.last_name}`;
                      
                      // Parent broker name lookup
                      const parentBroker = p.parent_broker_id ? profiles.find(b => b.id === p.parent_broker_id) : null;
                      const parentBrokerName = parentBroker ? `${parentBroker.first_name} ${parentBroker.middle_name ? parentBroker.middle_name + ' ' : ''}${parentBroker.last_name}` : '';

                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-slate-950/35 transition-colors ${
                            !p.is_active ? 'bg-slate-950/20 text-slate-500' : ''
                          }`}
                        >
                          <td className="py-4 px-5 font-mono text-xs font-semibold tracking-wider text-slate-300">
                            <button
                              onClick={() => openEditModal(p)}
                              className="hover:text-indigo-400 text-left font-semibold text-xs tracking-wider transition-colors"
                            >
                              {p.id}
                            </button>
                          </td>
                          <td className="py-4 px-5">
                            {/* User type above name */}
                            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">
                              {p.role}
                            </div>
                            {/* Format is First Name Middle Name Last Name */}
                            <div className="font-semibold text-slate-200">
                              {formattedFullName}
                            </div>
                            {/* Contact number and address under name */}
                            <div className="text-[11px] text-slate-400/90 mt-1 font-sans space-y-0.5">
                              <p><span className="text-slate-500 font-mono text-[10px]">Email:</span> {p.email}</p>
                              <p><span className="text-slate-500 font-mono text-[10px]">Contact:</span> {p.contact_number || 'N/A'}</p>
                              <p><span className="text-slate-500 font-mono text-[10px]">Address:</span> {p.address || 'N/A'}</p>
                              {p.prc_license && <p><span className="text-slate-500 font-mono text-[10px]">PRC Status:</span> {p.prc_license}</p>}
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                              p.role === 'Admin'
                                ? 'bg-amber-950/60 border border-amber-800/40 text-amber-400'
                                : p.role === 'Broker'
                                ? 'bg-blue-950/60 border border-blue-800/40 text-blue-400'
                                : p.role === 'Agent'
                                ? 'bg-emerald-950/60 border border-emerald-800/40 text-emerald-400'
                                : 'bg-purple-950/60 border border-purple-800/40 text-purple-400'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                p.role === 'Admin' ? 'bg-amber-400' :
                                p.role === 'Broker' ? 'bg-blue-400' :
                                p.role === 'Agent' ? 'bg-emerald-400' : 'bg-purple-400'
                              }`} />
                              {p.role}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-xs text-slate-400 font-medium">
                            {p.role === 'Agent' ? (
                              p.parent_broker_id ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-indigo-400 font-mono font-bold text-[10px]">{p.parent_broker_id}</span>
                                    <span className="text-[10px] text-slate-500">(Broker ID)</span>
                                  </div>
                                  {/* Broker full name under ID styling matching full name */}
                                  <div className="font-semibold text-slate-200">
                                    {parentBrokerName}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-rose-500">Unassigned House Broker</span>
                              )
                            ) : (
                              <span className="text-slate-600 font-mono">- Independent Node -</span>
                            )}
                          </td>
                          <td className="py-4 px-5 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${p.is_active ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                              <span className="text-xs font-bold uppercase tracking-wide">
                                {p.is_active ? (
                                  <span className="text-emerald-400">Authorized</span>
                                ) : (
                                  <span className="text-rose-400">Locked</span>
                                )}
                              </span>
                            </div>
                            {p.is_temporary && p.is_active && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/40 border border-amber-900/40 px-1.5 py-0.5 rounded-md w-max">
                                <ShieldAlert className="w-3 h-3 text-amber-400" />
                                <span>Temp Password</span>
                              </div>
                            )}
                          </td>
                          {currentProfile.role !== 'Treasurer' && (
                            <td className="py-4 px-5 text-right font-semibold">
                              <div className="flex items-center justify-end gap-2">
                                {/* Edit Action Button */}
                                <button
                                  type="button"
                                  onClick={() => openEditModal(p)}
                                  title="Edit User Details"
                                  className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 hover:bg-indigo-900/30 transition-all cursor-pointer"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                {/* Generate Temporary Password Button */}
                                {currentProfile.role === 'Admin' && p.is_active && (
                                  <button
                                    type="button"
                                    onClick={() => handleAdminGenerateTempPassword(p)}
                                    title="Generate New Temporary Password"
                                    className="p-2 rounded-lg bg-amber-950/40 border border-amber-900/30 text-amber-400 hover:bg-amber-900/30 transition-all cursor-pointer"
                                  >
                                    <KeyRound className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Activation Action Button */}
                                <button
                                  type="button"
                                  onClick={() => triggerActivationToggle(p)}
                                  title={p.is_active ? "Lock Account" : "Authorize Account"}
                                  className={`p-2 rounded-lg border transition-colors cursor-pointer inline-flex items-center ${
                                    p.is_active
                                      ? 'bg-rose-955 border-rose-900/40 text-rose-400 hover:bg-rose-950/50'
                                      : 'bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 hover:bg-emerald-950/50'
                                  }`}
                                >
                                  <Power className="w-4 h-4" />
                                </button>
                              </div>
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
          const sorted = [...visibleProfiles].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
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

      {/* Add User Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in origin-center overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl relative shadow-2xl my-8">
            <button
              onClick={() => setIsCreating(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-base font-bold text-slate-100 tracking-tight uppercase tracking-wider mb-5 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              Onboard New User
            </h3>

            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">First Name *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="Juan"
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Middle Name *</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    required
                    placeholder="Santos"
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Last Name *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Dela Cruz"
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="juan.delacruz@aspire88.netlify.app"
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Contact Number *</label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    required
                    placeholder="0917XXXXXXX"
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Birthdate *</label>
                  <input
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    required
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans cursor-pointer"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Verified Address *</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    placeholder="123 Rizal St, Makati, NCR, Philippines"
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">PRC License (Optional)</label>
                  <input
                    type="text"
                    value={prcLicense}
                    onChange={(e) => setPrcLicense(e.target.value)}
                    placeholder="PRC-XXXX1111"
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                {currentProfile.role === 'Admin' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Role Access Tier *</label>
                    <select
                      value={role}
                      onChange={(e) => {
                        setRole(e.target.value as UserRole);
                        if (e.target.value !== 'Agent') setParentBrokerId('');
                      }}
                      className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 outline-none focus:border-indigo-500 transition-all cursor-pointer font-sans"
                    >
                      <option value="Broker">Broker (Team Leader)</option>
                      <option value="Agent">Agent (Listing Consultant)</option>
                      <option value="Treasurer">Treasurer (Restricted Auditing)</option>
                    </select>
                  </div>
                )}

                {currentProfile.role === 'Admin' && role === 'Agent' && (
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Parent Team Broker *</label>
                    <select
                      value={parentBrokerId}
                      onChange={(e) => setParentBrokerId(e.target.value)}
                      required
                      className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 outline-none focus:border-indigo-500 transition-all cursor-pointer font-sans"
                    >
                      <option value="">Select Broker...</option>
                      {profiles.filter(p => p.role === 'Broker').map(b => (
                        <option key={b.id} value={b.id}>{b.first_name} {b.last_name} ({b.id})</option>
                      ))}
                    </select>
                  </div>
                )}

                {currentProfile.role === 'Broker' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Assigning Broker</label>
                    <div className="mt-1.5 bg-slate-950 border border-slate-805 text-slate-500 text-xs py-2 px-3 rounded-xl select-none font-medium">
                      {currentProfile.first_name} {currentProfile.last_name} (Permanent Sub-Agent)
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-450 text-slate-950 px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  Create New User
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditing && editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in origin-center overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl relative shadow-2xl my-8">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditingProfile(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-base font-bold text-slate-100 tracking-tight uppercase tracking-wider mb-5 flex items-center gap-2">
              <Edit className="w-5 h-5 text-indigo-400" />
              Edit User Profile ({editingProfile.id})
            </h3>

            <form onSubmit={handleEditProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">First Name *</label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    required
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Middle Name *</label>
                  <input
                    type="text"
                    value={editMiddleName}
                    onChange={(e) => setEditMiddleName(e.target.value)}
                    required
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Last Name *</label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    required
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Email Address *</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Contact Number *</label>
                  <input
                    type="text"
                    value={editContactNumber}
                    onChange={(e) => setEditContactNumber(e.target.value)}
                    required
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Birthdate *</label>
                  <input
                    type="date"
                    value={editBirthdate}
                    onChange={(e) => setEditBirthdate(e.target.value)}
                    required
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans cursor-pointer"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Verified Address *</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    required
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">PRC License (Optional)</label>
                  <input
                    type="text"
                    value={editPrcLicense}
                    onChange={(e) => setEditPrcLicense(e.target.value)}
                    placeholder="PRC-XXXX1111"
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                {currentProfile.role === 'Admin' && editRole === 'Agent' && (
                  <div className="sm:col-span-2 font-sans text-xs">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Parent Team Broker *</label>
                    <select
                      value={editParentBrokerId}
                      onChange={(e) => setEditParentBrokerId(e.target.value)}
                      required
                      className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 outline-none focus:border-indigo-500 transition-all cursor-pointer font-sans"
                    >
                      <option value="">Select Broker...</option>
                      {profiles.filter(p => p.role === 'Broker').map(b => (
                        <option key={b.id} value={b.id}>{b.first_name} {b.last_name} ({b.id})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingProfile(null);
                  }}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-450 text-slate-950 px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer font-sans"
                >
                  Save Changes
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Confirmation Dialog Hook overlay */}
      <AlertDialog
        isOpen={dialogOpen}
        title={dialogConfig.title}
        description={dialogConfig.description}
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogOpen(false)}
        confirmText="Confirm"
        isDestructive={dialogConfig.isDestructive}
      />
    </div>
  );
}

export default ProfilesManager;
