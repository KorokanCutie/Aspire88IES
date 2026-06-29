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
  MapPin, 
  Building, 
  Layers, 
  Search, 
  X,
  Map,
  Compass,
  Briefcase
} from 'lucide-react';
import { Developer, Project, UserProfile } from '../types';

interface DevelopersProjectsTabProps {
  currentUser: UserProfile;
  developers: Developer[];
  projects: Project[];
  onAddDeveloper: (name: string) => void;
  onUpdateDeveloper: (id: string, name: string, isActive: boolean) => void;
  onAddProject: (developerId: string, name: string, address: string) => void;
  onUpdateProject: (id: string, data: Partial<Project>) => void;
  onViewMap: (project: Project) => void;
  onRequestConfirm: (title: string, msg: string, type: 'danger' | 'warning' | 'info' | 'success', onConfirm: () => void) => void;
  onShowSuccessToast: (text: string) => void;
}

export default function DevelopersProjectsTab({
  currentUser,
  developers,
  projects,
  onAddDeveloper,
  onUpdateDeveloper,
  onAddProject,
  onUpdateProject,
  onViewMap,
  onRequestConfirm,
  onShowSuccessToast
}: DevelopersProjectsTabProps) {
  const [isDevOpen, setIsDevOpen] = useState(false);
  const [isProjOpen, setIsProjOpen] = useState(false);
  const [isEditDevOpen, setIsEditDevOpen] = useState(false);
  const [isEditProjOpen, setIsEditProjOpen] = useState(false);

  const [selectedDev, setSelectedDev] = useState<Developer | null>(null);
  const [selectedProj, setSelectedProj] = useState<Project | null>(null);

  // Form states
  const [developerName, setDeveloperName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectAddress, setProjectAddress] = useState('');
  const [targetDeveloperId, setTargetDeveloperId] = useState('');

  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = currentUser.role === 'Admin';

  // Handle Add Developer
  const handleAddDevSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!developerName) return;

    onRequestConfirm(
      "Add Developer",
      `Register developer "${developerName}" inside Aspire88 Enterprise database?`,
      "info",
      () => {
        onAddDeveloper(developerName);
        setIsDevOpen(false);
        setDeveloperName('');
        onShowSuccessToast("Developer registered successfully.");
      }
    );
  };

  // Handle Edit Developer
  const handleEditDevSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDev || !developerName) return;

    onRequestConfirm(
      "Modify Developer Profile",
      `Save modifications to developer "${selectedDev.name}"?`,
      "info",
      () => {
        onUpdateDeveloper(selectedDev.id, developerName, selectedDev.isActive);
        setIsEditDevOpen(false);
        setSelectedDev(null);
        setDeveloperName('');
        onShowSuccessToast("Developer profile updated.");
      }
    );
  };

  // Toggle Developer status
  const handleToggleDevStatus = (dev: Developer) => {
    const nextState = !dev.isActive;
    onRequestConfirm(
      nextState ? "Reactivate Developer" : "Deactivate Developer",
      nextState 
        ? `Reactivate developer "${dev.name}"? All associated project lines will be accessible.`
        : `Deactivate developer "${dev.name}"? This restricts agents from booking new site visits to their properties.`,
      nextState ? "success" : "danger",
      () => {
        onUpdateDeveloper(dev.id, dev.name, nextState);
        onShowSuccessToast(`Developer ${nextState ? 'reactivated' : 'deactivated'}.`);
      }
    );
  };

  // Handle Add Project
  const handleAddProjSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDeveloperId || !projectName || !projectAddress) return;

    onRequestConfirm(
      "Add Property Line",
      `Register project "${projectName}" inside the developer index?`,
      "info",
      () => {
        onAddProject(targetDeveloperId, projectName, projectAddress);
        setIsProjOpen(false);
        setProjectName('');
        setProjectAddress('');
        setTargetDeveloperId('');
        onShowSuccessToast("Project property successfully added.");
      }
    );
  };

  // Handle Edit Project
  const handleEditProjSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProj || !projectName || !projectAddress) return;

    onRequestConfirm(
      "Modify Property Project",
      `Save modifications to project "${selectedProj.name}"?`,
      "info",
      () => {
        onUpdateProject(selectedProj.id, {
          name: projectName,
          address: projectAddress,
          developerId: targetDeveloperId
        });
        setIsEditProjOpen(false);
        setSelectedProj(null);
        setProjectName('');
        setProjectAddress('');
        setTargetDeveloperId('');
        onShowSuccessToast("Project specifications saved.");
      }
    );
  };

  // Toggle Project status
  const handleToggleProjStatus = (proj: Project) => {
    const nextState = !proj.isActive;
    onRequestConfirm(
      nextState ? "Reactivate Property" : "Deactivate Property",
      nextState
        ? `Reactivate project "${proj.name}"?`
        : `Deactivate project "${proj.name}"? This blocks new site visit allocations for this address.`,
      nextState ? "success" : "danger",
      () => {
        onUpdateProject(proj.id, { isActive: nextState });
        onShowSuccessToast(`Project ${nextState ? 'reactivated' : 'deactivated'}.`);
      }
    );
  };

  const openEditDevModal = (dev: Developer) => {
    setSelectedDev(dev);
    setDeveloperName(dev.name);
    setIsEditDevOpen(true);
  };

  const openEditProjModal = (proj: Project) => {
    setSelectedProj(proj);
    setProjectName(proj.name);
    setProjectAddress(proj.address);
    setTargetDeveloperId(proj.developerId);
    setIsEditProjOpen(true);
  };

  // Filtering for Search
  const getFilteredDevelopers = () => {
    let list = [...developers];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q));
    }
    return list;
  };

  const filteredDevs = getFilteredDevelopers();

  return (
    <div className="space-y-6" id="developers-tab-root">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="devs-tab-header">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight" id="devs-tab-title">
            Properties & Developer Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registered corporate partner developers and active real estate project addresses.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2" id="devs-header-actions">
            <button
              onClick={() => {
                setDeveloperName('');
                setIsDevOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition"
              id="btn-add-dev"
            >
              <Plus className="w-4 h-4" />
              Add Developer
            </button>
            <button
              onClick={() => {
                setProjectName('');
                setProjectAddress('');
                setTargetDeveloperId('');
                setIsProjOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition shadow-lg shadow-amber-500/10"
              id="btn-add-proj"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Add Project
            </button>
          </div>
        )}
      </div>

      {/* Search Input bar */}
      <div className="relative max-w-md" id="devs-search-bar">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search developers by name or ID..."
          className="w-full bg-slate-900 border border-slate-800 pl-10 pr-4 py-2 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          id="dev-search-input"
        />
      </div>

      {/* Main Board view: Developers split panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dev-boards-grid">
        {filteredDevs.map((dev) => {
          const devProjects = projects.filter(p => p.developerId === dev.id);

          return (
            <div 
              key={dev.id}
              className={`p-6 rounded-2xl bg-slate-900 border transition flex flex-col justify-between min-h-[320px] ${
                dev.isActive ? 'border-slate-800/80' : 'border-rose-950/40 bg-slate-950/40 opacity-75'
              }`}
              id={`dev-card-${dev.id}`}
            >
              {/* Upper Portion: Dev info & action */}
              <div>
                <div className="flex items-start justify-between" id={`dev-header-block-${dev.id}`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-slate-850 border border-slate-800 rounded-xl text-slate-400">
                      <Briefcase className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-200 text-base">
                        {dev.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        ID: {dev.id}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                    dev.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`} id={`dev-status-tag-${dev.id}`}>
                    {dev.isActive ? 'Active Dev' : 'Suspended'}
                  </span>
                </div>

                {/* Sub projects list nested table inside developer */}
                <div className="mt-5 space-y-3" id={`dev-projects-nested-list-${dev.id}`}>
                  <h4 className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider">
                    Associated Project Lines ({devProjects.length})
                  </h4>

                  <div className="bg-slate-950/60 border border-slate-850 rounded-xl divide-y divide-slate-850/60 overflow-hidden">
                    {devProjects.map((proj) => (
                      <div 
                        key={proj.id}
                        className={`p-3 flex items-center justify-between gap-4 text-xs transition ${
                          proj.isActive ? 'hover:bg-slate-900/40' : 'opacity-60 bg-slate-950/20'
                        }`}
                        id={`project-item-${proj.id}`}
                      >
                        <div className="truncate">
                          <p className="font-semibold text-slate-300 truncate">
                            {proj.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                            {proj.address}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* VIEW MAP TRIGGER (Free map feature!) */}
                          {proj.isActive && (
                            <button
                              type="button"
                              onClick={() => onViewMap(proj)}
                              className="p-1 text-amber-500 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                              title="Locate Address on Interactive Map"
                              id={`proj-map-${proj.id}`}
                            >
                              <Map className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                disabled={!dev.isActive}
                                onClick={() => openEditProjModal(proj)}
                                className={`p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition ${
                                  dev.isActive ? '' : 'cursor-not-allowed opacity-50'
                                }`}
                                id={`proj-edit-${proj.id}`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={!dev.isActive}
                                onClick={() => handleToggleProjStatus(proj)}
                                className={`p-1 rounded transition ${
                                  proj.isActive 
                                    ? 'text-rose-500 hover:bg-rose-950/35 hover:text-rose-400' 
                                    : 'text-emerald-500 hover:bg-emerald-950/35 hover:text-emerald-400'
                                } ${dev.isActive ? '' : 'cursor-not-allowed opacity-50'}`}
                                id={`proj-power-${proj.id}`}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {devProjects.length === 0 && (
                      <p className="p-3 text-[11px] text-slate-500 italic">No project inventory registered under this developer.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Lower Actions portion */}
              {isAdmin && (
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between mt-5" id={`dev-card-actions-${dev.id}`}>
                  <span className="text-[11px] font-mono text-slate-500">
                    ID: {dev.id}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditDevModal(dev)}
                      className="px-2.5 py-1.5 border border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg text-xs font-semibold transition"
                      id={`dev-edit-btn-${dev.id}`}
                    >
                      Edit Name
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleDevStatus(dev)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                        dev.isActive 
                          ? 'border-rose-950/30 bg-rose-950/10 text-rose-400 hover:bg-rose-950/20 hover:text-rose-300' 
                          : 'border-emerald-950/30 bg-emerald-950/10 text-emerald-400 hover:bg-emerald-950/20 hover:text-emerald-300'
                      }`}
                      id={`dev-power-btn-${dev.id}`}
                    >
                      <Power className="w-3 h-3" />
                      {dev.isActive ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredDevs.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-slate-900 border border-slate-800 rounded-2xl" id="empty-devs-state">
            <Building className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-300">No partner developers indexed</p>
            <p className="text-xs text-slate-500 mt-1">Begin by creating partner developer corporations.</p>
          </div>
        )}
      </div>

      {/* ADD DEVELOPER MODAL */}
      {isDevOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" id="add-dev-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl relative"
            id="add-dev-box"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 tracking-tight">
                Add Partner Developer
              </h3>
              <button onClick={() => setIsDevOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDevSubmit} className="mt-5 space-y-4" id="add-dev-form">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Developer Corporation Name *</label>
                <input
                  type="text"
                  required
                  value={developerName}
                  onChange={(e) => setDeveloperName(e.target.value)}
                  placeholder="e.g. Ayala Land Premier"
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsDevOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition"
                >
                  Save Developer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* EDIT DEVELOPER MODAL */}
      {isEditDevOpen && selectedDev && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" id="edit-dev-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl relative"
            id="edit-dev-box"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 tracking-tight">
                Edit Developer Profile
              </h3>
              <button onClick={() => setIsEditDevOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditDevSubmit} className="mt-5 space-y-4" id="edit-dev-form">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Developer Corporation Name *</label>
                <input
                  type="text"
                  required
                  value={developerName}
                  onChange={(e) => setDeveloperName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsEditDevOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ADD PROJECT MODAL */}
      {isProjOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" id="add-proj-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl relative"
            id="add-proj-box"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 tracking-tight">
                Add Property Project
              </h3>
              <button onClick={() => setIsProjOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProjSubmit} className="mt-5 space-y-4" id="add-proj-form">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Select Developer *</label>
                <select
                  required
                  value={targetDeveloperId}
                  onChange={(e) => setTargetDeveloperId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="">-- Choose Partner Developer --</option>
                  {developers.filter(d => d.isActive).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Project Property Name *</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Uptown Parksuites"
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Project Geographic Address *</label>
                <textarea
                  required
                  rows={3}
                  value={projectAddress}
                  onChange={(e) => setProjectAddress(e.target.value)}
                  placeholder="Exact location for free map rendering..."
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsProjOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition"
                >
                  Save Project Property
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* EDIT PROJECT MODAL */}
      {isEditProjOpen && selectedProj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" id="edit-proj-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl relative"
            id="edit-proj-box"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 tracking-tight">
                Edit Property Project
              </h3>
              <button onClick={() => setIsEditProjOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditProjSubmit} className="mt-5 space-y-4" id="edit-proj-form">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Developer Corporation</label>
                <select
                  required
                  value={targetDeveloperId}
                  onChange={(e) => setTargetDeveloperId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  {developers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Project Property Name *</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Project Geographic Address *</label>
                <textarea
                  required
                  rows={3}
                  value={projectAddress}
                  onChange={(e) => setProjectAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsEditProjOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
