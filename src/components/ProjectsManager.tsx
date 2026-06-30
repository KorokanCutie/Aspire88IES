import React, { useState, useEffect } from 'react';
import { Project, Developer, Profile } from '../types';
import { db, generateAlphaId } from '../db';
import { useToast } from './Toast';
import { AlertDialog } from './AlertDialog';
import { MapModal } from './MapModal';
import { Building2, Plus, Table2, MapPin, Compass, Edit3, ShieldAlert, Sparkles, X, Power, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProjectsManagerProps {
  currentProfile: Profile;
  developers: Developer[];
  projects: Project[];
  onRefresh: () => void;
}

export function ProjectsManager({ currentProfile, developers, projects, onRefresh }: ProjectsManagerProps) {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'projects' | 'developers'>('projects');
  const [currentProjPage, setCurrentProjPage] = useState(1);
  const [currentDevPage, setCurrentDevPage] = useState(1);
  const recordsPerPage = 20;

  useEffect(() => {
    setCurrentProjPage(1);
    setCurrentDevPage(1);
  }, [activeTab]);

  // Modal Control States
  const [isCreatingProj, setIsCreatingProj] = useState(false);
  const [isCreatingDev, setIsCreatingDev] = useState(false);

  // Edit references
  const [editingDev, setEditingDev] = useState<Developer | null>(null);
  const [editingProj, setEditingProj] = useState<Project | null>(null);

  // Map representation states
  const [mapOpen, setMapOpen] = useState(false);
  const [mapProject, setMapProject] = useState<{ name: string; address: string; lat: number; lng: number } | null>(null);

  // Developer Form fields
  const [devName, setDevName] = useState('');
  const [devContactPerson, setDevContactPerson] = useState('');
  const [devContactEmail, setDevContactEmail] = useState('');
  const [devContactNumber, setDevContactNumber] = useState('');
  const [devOfficeAddress, setDevOfficeAddress] = useState('');

  // Project Form fields
  const [projDevId, setProjDevId] = useState('');
  const [projName, setProjName] = useState('');
  const [projAddress, setProjAddress] = useState('');
  const [projLat, setProjLat] = useState('14.5574');
  const [projLng, setProjLng] = useState('121.0549');
  const [projStatus, setProjStatus] = useState<Project['status']>('Active');

  // Confirmation alerting
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

  // Only active developers should be selectable in project creation dropdown, sorted alphabetically
  const activeDevelopersList = developers.filter(d => d.status === 'Active');
  const sortedActiveDevelopers = [...activeDevelopersList].sort((a, b) => a.name.localeCompare(b.name));

  const handleCreateOrUpdateDev = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!devOfficeAddress.trim()) {
      toast('Corporate Head Office Address is required.', 'error');
      return;
    }

    // Duplicate check: checks whether BOTH same developer name and address are already existing in the record
    const hasDuplicate = developers.some(d => 
      (!editingDev || d.id !== editingDev.id) && 
      d.name.toLowerCase().trim() === devName.toLowerCase().trim() &&
      d.office_address?.toLowerCase().trim() === devOfficeAddress.toLowerCase().trim()
    );

    if (hasDuplicate) {
      toast('Error: A developer with this legal company name and registered headquarters address already exists.', 'error');
      return;
    }

    const payload: Developer = {
      id: editingDev ? editingDev.id : generateAlphaId('DEV-'),
      name: devName.trim(),
      contact_person: devContactPerson.trim() || undefined,
      contact_email: devContactEmail.trim() || undefined,
      contact_number: devContactNumber.trim() || undefined,
      office_address: devOfficeAddress.trim(),
      status: editingDev ? editingDev.status : 'Active',
      created_at: editingDev ? editingDev.created_at : new Date().toISOString()
    };

    const actionTitle = editingDev ? 'Save Developer Edits?' : 'Register Land Developer?';
    const actionDesc = editingDev 
      ? `Confirm committing changes to land developer "${payload.name}". This keeps active estate structures fully aligned.`
      : `Confirm registering ${payload.name} as verified land developer in Aspire88 Estates Corporation Integrated Enterprise System records.`;

    setDialogConfig({
      title: actionTitle,
      description: actionDesc,
      isDestructive: false,
      onConfirm: async () => {
        setDialogOpen(false);
        try {
          await db.saveDeveloper(payload);
          toast(`Developer ${payload.name} registration saved successfully.`, 'success');
          
          setDevName('');
          setDevContactPerson('');
          setDevContactEmail('');
          setDevContactNumber('');
          setDevOfficeAddress('');
          setEditingDev(null);
          setIsCreatingDev(false);
          onRefresh();
        } catch (err: any) {
          toast(err.message || 'Error saving developer coordinates.', 'error');
        }
      }
    });
    setDialogOpen(true);
  };

  const handleCreateOrUpdateProj = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projDevId) {
      toast('Please associate an active land developer to continue.', 'error');
      return;
    }

    // Duplicate check: same project name, same developer, and same address already existing in the record
    const hasDuplicate = projects.some(p => 
      (!editingProj || p.id !== editingProj.id) && 
      p.name.toLowerCase().trim() === projName.toLowerCase().trim() &&
      p.developer_id === projDevId &&
      p.address.toLowerCase().trim() === projAddress.toLowerCase().trim()
    );

    if (hasDuplicate) {
      toast('Error: A project with this name, developer, and address already exists.', 'error');
      return;
    }

    const payload: Project = {
      id: editingProj ? editingProj.id : generateAlphaId('PRJ-'),
      developer_id: projDevId,
      name: projName.trim(),
      address: projAddress.trim(),
      latitude: parseFloat(projLat) || 14.5574,
      longitude: parseFloat(projLng) || 121.0549,
      status: projStatus,
      created_at: editingProj ? editingProj.created_at : new Date().toISOString()
    };

    const actionTitle = editingProj ? 'Save Project Edits?' : 'Provision Real Estate Project?';
    const actionDesc = editingProj
      ? `Confirm committing edits onto project "${payload.name}". Outstanding scheduling items remain intact.`
      : `Confirm cataloguing real estate development: "${payload.name}" at listed address.`;

    setDialogConfig({
      title: actionTitle,
      description: actionDesc,
      isDestructive: false,
      onConfirm: async () => {
        setDialogOpen(false);
        try {
          await db.saveProject(payload);
          toast(`Real Estate Project: ${payload.name} successfully updated.`, 'success');

          setProjDevId('');
          setProjName('');
          setProjAddress('');
          setProjLat('14.5574');
          setProjLng('121.0549');
          setProjStatus('Active');
          setEditingProj(null);
          setIsCreatingProj(false);
          onRefresh();
        } catch (err: any) {
          toast(err.message || 'Error writing project data register.', 'error');
        }
      }
    });
    setDialogOpen(true);
  };

  const displayDeveloperName = (id: string) => {
    const found = developers.find(d => d.id === id);
    return found ? found.name : `Unassigned Developer (${id})`;
  };

  const triggerMapView = (proj: Project) => {
    setMapProject({
      name: proj.name,
      address: proj.address,
      lat: proj.latitude || 14.5574,
      lng: proj.longitude || 121.0549
    });
    setMapOpen(true);
  };

  const toggleDeveloperStatus = async (dev: Developer) => {
    const nextStatus: Developer['status'] = dev.status === 'Active' ? 'Inactive' : 'Active';

    setDialogConfig({
      title: `${nextStatus === 'Active' ? 'Reactivate' : 'Deactivate'} Developer Group?`,
      description: `Confirm changing state of "${dev.name}" to ${nextStatus}. ${
        nextStatus === 'Inactive' 
          ? 'Notice: Deactivated developers cannot be assigned to new estate projects.' 
          : 'Reactivated developers are fully restored to system workflows.'
      }`,
      isDestructive: nextStatus === 'Inactive',
      onConfirm: async () => {
        setDialogOpen(false);
        try {
          const updated = { ...dev, status: nextStatus };
          await db.saveDeveloper(updated);
          toast(`Developer ${dev.name} is now ${nextStatus}.`, 'success');
          onRefresh();
        } catch (err: any) {
          toast(err.message || 'Error synchronizing status updates.', 'error');
        }
      }
    });
    setDialogOpen(true);
  };

  const handleCycleStatus = async (proj: Project) => {
    const statuses: Project['status'][] = ['Active', 'Sold Out', 'Inactive'];
    const currentIdx = statuses.indexOf(proj.status);
    const nextStatus = statuses[(currentIdx + 1) % statuses.length];

    setDialogConfig({
      title: 'Update Project Status?',
      description: `Commit changing status of project "${proj.name}" from ${proj.status} to ${nextStatus}?`,
      isDestructive: nextStatus === 'Inactive',
      onConfirm: async () => {
        setDialogOpen(false);
        const updated = { ...proj, status: nextStatus };
        await db.saveProject(updated);
        toast(`Project ${proj.name} status updated to ${nextStatus}.`, 'success');
        onRefresh();
      }
    });
    setDialogOpen(true);
  };

  const triggerEditDev = (dev: Developer) => {
    setEditingDev(dev);
    setDevName(dev.name);
    setDevContactPerson(dev.contact_person || '');
    setDevContactEmail(dev.contact_email || '');
    setDevContactNumber(dev.contact_number || '');
    setDevOfficeAddress(dev.office_address || '');
    setIsCreatingDev(true);
  };

  const triggerEditProj = (proj: Project) => {
    setEditingProj(proj);
    setProjDevId(proj.developer_id);
    setProjName(proj.name);
    setProjAddress(proj.address);
    setProjLat(String(proj.latitude || '14.5574'));
    setProjLng(String(proj.longitude || '121.0549'));
    setProjStatus(proj.status);
    setIsCreatingProj(true);
  };

  const isAdmin = currentProfile.role === 'Admin';
  const isTreasurer = currentProfile.role === 'Treasurer';
  const isBroker = currentProfile.role === 'Broker';
  const isAgent = currentProfile.role === 'Agent';
  const isViewOnly = isTreasurer || isBroker || isAgent;
  const canEditOrViewModal = true;

  return (
    <div className="space-y-6">
      {/* Title Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/60 pb-5 gap-4 animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Land Developer & Project Catalog
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Inventory management, verified developer files, spatial mapping, and project coordinate listings.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingProj(null);
                setProjDevId('');
                setProjName('');
                setProjAddress('');
                setProjLat('14.5574');
                setProjLng('121.0549');
                setProjStatus('Active');
                setIsCreatingProj(true);
              }}
              className="px-3.5 py-1.5 bg-indigo-950 border border-indigo-800 text-indigo-300 font-bold rounded-xl text-xs hover:bg-indigo-900 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Project</span>
            </button>
            <button
              onClick={() => {
                setEditingDev(null);
                setDevName('');
                setDevContactPerson('');
                setDevContactEmail('');
                setDevContactNumber('');
                setDevOfficeAddress('');
                setIsCreatingDev(true);
              }}
              className="px-3.5 py-1.5 bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold rounded-xl text-xs hover:bg-emerald-900 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Developer</span>
            </button>
          </div>
        )}
      </div>

      {/* View Choice Selection tabs */}
      <div className="flex border-b border-slate-800 text-xs gap-3">
        <button
          onClick={() => setActiveTab('projects')}
          className={`py-3.5 px-1 font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border-b-2 ${
            activeTab === 'projects'
              ? 'border-indigo-500 text-indigo-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Table2 className="w-4 h-4" />
          Estate Projects ({projects.length})
        </button>
        <button
          onClick={() => setActiveTab('developers')}
          className={`py-3.5 px-1 font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border-b-2 ${
            activeTab === 'developers'
              ? 'border-indigo-500 text-indigo-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Partner Developers ({developers.length})
        </button>
      </div>

      {/* ESTATE PROJECTS TABLE LIST */}
      {activeTab === 'projects' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-fade-in text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-fade-in">
                  <th className="py-4 px-5">Project Ref</th>
                  <th className="py-4 px-5">Project Name Title</th>
                  <th className="py-4 px-5">Partner Developer</th>
                  <th className="py-4 px-5">Verified Address Location</th>
                  <th className="py-4 px-5">Project Status</th>
                  <th className="py-4 px-5 text-right font-medium">Map / Edit Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {(() => {
                  const sorted = [...projects].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
                  const totalPages = Math.ceil(sorted.length / recordsPerPage);
                  const paginated = sorted.slice((currentProjPage - 1) * recordsPerPage, currentProjPage * recordsPerPage);

                  if (paginated.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                          No estate projects registered currently.
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <>
                      {paginated.map((proj) => (
                        <tr key={proj.id} className="hover:bg-slate-950/20 transition-colors">
                          <td className="py-4 px-5 font-mono font-bold tracking-wider text-slate-300">
                            <button
                              type="button"
                              onClick={() => triggerEditProj(proj)}
                              className="text-indigo-400 hover:text-indigo-300 hover:underline transition-all font-bold cursor-pointer bg-transparent border-0 p-0"
                            >
                              {proj.id}
                            </button>
                          </td>
                          <td className="py-4 px-5 font-bold text-slate-200">
                            {proj.name}
                          </td>
                          <td className="py-4 px-5 font-semibold text-slate-400">
                            <button
                              type="button"
                              onClick={() => {
                                const dev = developers.find(d => d.id === proj.developer_id);
                                if (dev) triggerEditDev(dev);
                              }}
                              className="font-mono text-indigo-400 hover:text-indigo-300 hover:underline text-xs font-bold transition-all text-left cursor-pointer bg-transparent border-0 p-0"
                            >
                              {proj.developer_id} ({displayDeveloperName(proj.developer_id)})
                            </button>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-1.5 font-medium text-slate-350">
                              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="max-w-xs truncate" title={proj.address}>{proj.address}</span>
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <button
                              type="button"
                              onClick={() => isAdmin && handleCycleStatus(proj)}
                              disabled={!isAdmin}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-xl border uppercase tracking-wider inline-flex items-center gap-1.5 transition-all text-left ${
                                isAdmin ? 'hover:scale-[1.01] active:scale-[0.99] cursor-pointer' : 'cursor-default'
                              } ${
                                proj.status === 'Active'
                                  ? 'bg-emerald-950/65 border-emerald-800/60 text-emerald-400'
                                  : proj.status === 'Sold Out'
                                  ? 'bg-amber-950/65 border-amber-800/60 text-amber-505'
                                  : 'bg-slate-950/65 border-slate-800 text-slate-500'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                proj.status === 'Active' ? 'bg-emerald-400' :
                                proj.status === 'Sold Out' ? 'bg-amber-400' :
                                'bg-slate-600'
                              }`} />
                              {proj.status}
                              {isAdmin && <span className="text-[8px] text-slate-500 font-normal ml-0.5 normal-case font-mono">(Toggle)</span>}
                            </button>
                          </td>
                          <td className="py-3 px-5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 ml-auto">
                              <button
                                type="button"
                                onClick={() => triggerMapView(proj)}
                                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 text-indigo-400 hover:text-indigo-300 hover:border-slate-700 transition-all font-bold rounded-xl text-[10px] uppercase flex items-center gap-1 cursor-pointer"
                              >
                                <Compass className="w-3.5 h-3.5 shrink-0" />
                                Map View
                              </button>

                              {canEditOrViewModal && (
                                <button
                                  type="button"
                                  onClick={() => triggerEditProj(proj)}
                                  className="p-1 px-2.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-900/60 rounded-xl text-indigo-300 text-[10px] uppercase font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                                  title={isViewOnly ? "View Project details" : "Edit Project parameters"}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  {isViewOnly ? 'View' : 'Edit'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls for projects */}
          {(() => {
            const sorted = [...projects].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            const totalPages = Math.ceil(sorted.length / recordsPerPage);
            if (totalPages <= 1) return null;
            return (
              <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between">
                <div className="text-[11px] text-slate-400 font-sans">
                  Showing Page <span className="font-semibold text-slate-200">{currentProjPage}</span> of <span className="font-semibold text-slate-200">{totalPages}</span> ({sorted.length} records)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentProjPage === 1}
                    onClick={() => setCurrentProjPage(prev => Math.max(prev - 1, 1))}
                    className="p-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={currentProjPage === totalPages}
                    onClick={() => setCurrentProjPage(prev => Math.min(prev + 1, totalPages))}
                    className="p-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* PARTNER DEVELOPERS TABLE LIST */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-fade-in text-xs animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  <th className="py-4 px-5">ID Ref</th>
                  <th className="py-4 px-5">Developer Company Legal Title</th>
                  <th className="py-4 px-5">Key Accounts Officer</th>
                  <th className="py-4 px-5">Email / Telephone coordinates</th>
                  <th className="py-4 px-5">Head Office Address</th>
                  <th className="py-4 px-5">Filing Status</th>
                  {canEditOrViewModal && <th className="py-4 px-5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {(() => {
                  const sorted = [...developers].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
                  const totalPages = Math.ceil(sorted.length / recordsPerPage);
                  const paginated = sorted.slice((currentDevPage - 1) * recordsPerPage, currentDevPage * recordsPerPage);

                  if (paginated.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 italic">
                          No development groups registered.
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <>
                      {paginated.map((dev) => {
                        const isActive = dev.status === 'Active';
                        return (
                          <tr key={dev.id} className="hover:bg-slate-950/20 transition-colors">
                            <td className="py-4 px-5 font-mono font-bold tracking-wider text-slate-300">
                              <button
                                type="button"
                                onClick={() => triggerEditDev(dev)}
                                className="text-indigo-400 hover:text-indigo-300 hover:underline transition-all font-bold cursor-pointer bg-transparent border-0 p-0"
                              >
                                {dev.id}
                              </button>
                            </td>
                            <td className="py-4 px-5 font-bold text-slate-205 text-sm">
                              {dev.name}
                            </td>
                            <td className="py-4 px-5 font-medium text-slate-400">
                              {dev.contact_person || <span className="text-slate-600 italic">Unspecified</span>}
                            </td>
                            <td className="py-4 px-5">
                              <div className="font-semibold text-slate-300 font-mono">{dev.contact_number || '-'}</div>
                              <div className="text-[10px] text-slate-550 font-mono mt-0.5">{dev.contact_email || '-'}</div>
                            </td>
                            <td className="py-4 px-5 text-slate-400 font-medium">
                              <span className="max-w-xs truncate block" title={dev.office_address}>{dev.office_address || '-'}</span>
                            </td>
                            <td className="py-4 px-5">
                              <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-xl border uppercase tracking-wider inline-flex items-center gap-1 ${
                                isActive
                                  ? 'bg-emerald-950/60 border-emerald-900/40 text-emerald-400'
                                  : 'bg-rose-950/60 border-rose-900/40 text-rose-400'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-rose-450'}`} />
                                {dev.status}
                              </span>
                            </td>
                            {canEditOrViewModal && (
                              <td className="py-3 px-5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5 ml-auto">
                                  {/* Edit/View Developer action */}
                                  <button
                                    type="button"
                                    onClick={() => triggerEditDev(dev)}
                                    className="p-1 px-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-slate-100 text-[10px] uppercase font-bold transition-all cursor-pointer flex items-center gap-1"
                                    title={isViewOnly ? "View Developer" : "Edit Developer"}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    {isViewOnly ? 'View' : 'Edit'}
                                  </button>

                                  {/* Toggle active status developer action */}
                                  {!isViewOnly && (
                                    <button
                                      type="button"
                                      onClick={() => toggleDeveloperStatus(dev)}
                                      className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                                        isActive
                                          ? 'bg-rose-950/45 border-rose-900/45 text-rose-455 hover:bg-rose-900/30'
                                          : 'bg-emerald-950/45 border-emerald-950 border-emerald-900/45 text-emerald-400 hover:bg-emerald-990/30'
                                      }`}
                                      title={isActive ? 'Deactivate Developer Partner' : 'Reactivate Developer Partner'}
                                    >
                                      <Power className="w-3.5 h-3.5" />
                                    </button>
                                  )}
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

          {/* Pagination Controls for developers */}
          {(() => {
            const sorted = [...developers].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            const totalPages = Math.ceil(sorted.length / recordsPerPage);
            if (totalPages <= 1) return null;
            return (
              <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between">
                <div className="text-[11px] text-slate-400 font-sans">
                  Showing Page <span className="font-semibold text-slate-200">{currentDevPage}</span> of <span className="font-semibold text-slate-200">{totalPages}</span> ({sorted.length} records)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentDevPage === 1}
                    onClick={() => setCurrentDevPage(prev => Math.max(prev - 1, 1))}
                    className="p-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={currentDevPage === totalPages}
                    onClick={() => setCurrentDevPage(prev => Math.min(prev + 1, totalPages))}
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

      {/* DEVELOPER CREATION / EDITING MODAL OVERLAY */}
      {isCreatingDev && canEditOrViewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in origin-center overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-xl relative shadow-2xl my-8">
            <button
              onClick={() => {
                setIsCreatingDev(false);
                setEditingDev(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-base font-bold text-slate-100 tracking-tight uppercase tracking-wider mb-5 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              {isViewOnly ? `View Partner Developer Details (${editingDev?.id})` : editingDev ? `Edit Partner Developer File (${editingDev.id})` : 'Register Certified Land Developer'}
            </h3>

            <form onSubmit={handleCreateOrUpdateDev} className="space-y-4 text-xs text-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Developer Legal Company Title *</label>
                  <input
                    type="text"
                    value={devName}
                    onChange={(e) => setDevName(e.target.value)}
                    required
                    disabled={isViewOnly}
                    placeholder="Prime Holdings Development Inc"
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 outline-none focus:border-indigo-505 disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Key Officer Account Contact</label>
                  <input
                    type="text"
                    value={devContactPerson}
                    onChange={(e) => setDevContactPerson(e.target.value)}
                    disabled={isViewOnly}
                    placeholder="E.g. Chief Relations Director"
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 outline-none focus:border-indigo-505 disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Corporate Official hotline</label>
                  <input
                    type="text"
                    value={devContactNumber}
                    onChange={(e) => setDevContactNumber(e.target.value)}
                    disabled={isViewOnly}
                    placeholder="Hotline or mobile digits"
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 outline-none focus:border-indigo-505 font-mono disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono font-sans">Contact Email address</label>
                  <input
                    type="email"
                    value={devContactEmail}
                    onChange={(e) => setDevContactEmail(e.target.value)}
                    disabled={isViewOnly}
                    placeholder="accounts@developer-holding.id"
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 outline-none focus:border-indigo-550 font-mono disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Corporate Head Office Address *</label>
                  <input
                    type="text"
                    value={devOfficeAddress}
                    onChange={(e) => setDevOfficeAddress(e.target.value)}
                    required
                    disabled={isViewOnly}
                    placeholder="Headquarters corporate physical street block, City, Country"
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 outline-none focus:border-indigo-505 disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-850/80 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingDev(false);
                    setEditingDev(null);
                  }}
                  className="px-4 py-2 bg-slate-955 border border-slate-800 text-slate-400 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {isViewOnly ? 'Close' : 'Cancel'}
                </button>
                {!isViewOnly && (
                  <button
                    type="submit"
                    className="bg-emerald-555 hover:bg-emerald-450 bg-emerald-500 text-slate-950 px-5 py-2 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer"
                  >
                    Save Developer
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROJECT CREATION / EDITING MODAL OVERLAY */}
      {isCreatingProj && canEditOrViewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in origin-center overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-xl relative shadow-2xl my-8">
            <button
              onClick={() => {
                setIsCreatingProj(false);
                setEditingProj(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-base font-bold text-slate-100 tracking-tight uppercase tracking-wider mb-5 flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-400" />
              {isViewOnly ? `View Real Estate Project Details (${editingProj?.id})` : editingProj ? `Edit Real Estate Project (${editingProj.id})` : 'Provision Real Estate Estate Project'}
            </h3>

            <form onSubmit={handleCreateOrUpdateProj} className="space-y-4 text-xs text-slate-350">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Associated developer partner */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Associated Developer Group * (Only active developers display)</span>
                    <span className="text-[9px] text-indigo-400 font-mono">(Alphabetically Sorted)</span>
                  </label>

                  <select
                    value={projDevId}
                    onChange={(e) => setProjDevId(e.target.value)}
                    required
                    disabled={isViewOnly}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-slate-200 cursor-pointer outline-none font-sans font-medium disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Choose active developer partner --</option>
                    {sortedActiveDevelopers.map(dev => (
                      <option key={dev.id} value={dev.id}>{dev.name} ({dev.id})</option>
                    ))}
                    {sortedActiveDevelopers.length === 0 && (
                      <option disabled>No active developer found</option>
                    )}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Name Title *</label>
                  <input
                    type="text"
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    required
                    disabled={isViewOnly}
                    placeholder="E.g. Emerald Towers Tower A"
                    className="mt-1.5 w-full bg-slate-950 border border-slate-805 rounded-xl py-2 px-3 text-slate-200 outline-none focus:border-indigo-505 disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Physical Site verified address *</label>
                  <input
                    type="text"
                    value={projAddress}
                    onChange={(e) => setProjAddress(e.target.value)}
                    required
                    disabled={isViewOnly}
                    placeholder="Bonifacio Uptown West, Bonifacio Global City, Metro Manila"
                    className="mt-1.5 w-full bg-slate-950 border border-slate-805 rounded-xl py-2 px-3 text-slate-200 outline-none focus:border-indigo-505 disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider font-mono">Latitude coordinate</label>
                  <input
                    type="text"
                    value={projLat}
                    onChange={(e) => setProjLat(e.target.value)}
                    disabled={isViewOnly}
                    placeholder="14.5574"
                    className="mt-1.5 w-full bg-slate-950 border border-slate-805 rounded-xl py-2 px-3 text-slate-200 outline-none focus:border-indigo-505 font-mono disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider font-mono">Longitude coordinate</label>
                  <input
                    type="text"
                    value={projLng}
                    onChange={(e) => setProjLng(e.target.value)}
                    disabled={isViewOnly}
                    placeholder="121.0549"
                    className="mt-1.5 w-full bg-slate-950 border border-slate-805 rounded-xl py-2 px-3 text-slate-200 outline-none focus:border-indigo-505 font-mono disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Listing Status Category</label>
                  <select
                    value={projStatus}
                    onChange={(e) => setProjStatus(e.target.value as Project['status'])}
                    disabled={isViewOnly}
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 cursor-pointer outline-none focus:border-indigo-505 font-sans disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <option value="Active">Active Listing</option>
                    <option value="Sold Out">Fully Sold Out</option>
                    <option value="Inactive">Hold/Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-850/80 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingProj(false);
                    setEditingProj(null);
                  }}
                  className="px-4 py-2 bg-slate-955 border border-slate-800 text-slate-400 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {isViewOnly ? 'Close' : 'Cancel'}
                </button>
                {!isViewOnly && (
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-450 text-slate-950 px-5 py-2 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer"
                  >
                    Save Project
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spatial verification GMap Mock container */}
      {mapProject && (
        <MapModal
          isOpen={mapOpen}
          onClose={() => setMapOpen(false)}
          projectName={mapProject.name}
          address={mapProject.address}
          lat={mapProject.lat}
          lng={mapProject.lng}
        />
      )}

      {/* Master confirm decree dialog */}
      <AlertDialog
        isOpen={dialogOpen}
        title={dialogConfig.title}
        description={dialogConfig.description}
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogOpen(false)}
        isDestructive={dialogConfig.isDestructive}
      />
    </div>
  );
}

export default ProjectsManager;
