import React, { useState, useEffect } from 'react';
import { AuditLog, Profile } from '../types';
import { db } from '../db';
import { ShieldCheck, Search, Calendar, User, Database, RefreshCw, Filter, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditLogsManagerProps {
  currentProfile: Profile;
  profiles: Profile[];
}

export function AuditLogsManager({ currentProfile, profiles }: AuditLogsManagerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const dbLogs = await db.getAuditLogs();
      setLogs(dbLogs);
    } catch (err) {
      console.error('Error fetching audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedActionFilter]);

  const getUserDisplay = (uid: string) => {
    const prof = profiles.find(p => p.id === uid);
    if (prof) {
      return (
        <span className="flex items-center gap-1">
          <span className="font-semibold text-slate-100">{prof.first_name} {prof.last_name}</span>
          <span className="text-[10px] bg-indigo-950/70 border border-indigo-900/60 text-indigo-400 px-1.5 py-0.5 rounded-md font-mono">
            {prof.role}
          </span>
        </span>
      );
    }
    return <span className="font-mono text-slate-400 select-all">{uid}</span>;
  };

  const getLogTypeBadge = (action: string) => {
    const actUpper = action.toUpperCase();
    let color = 'bg-slate-950 text-slate-400 border-slate-800';
    if (actUpper.includes('CONFLICT') || actUpper.includes('RESOLVE')) {
      color = 'bg-amber-950/50 text-amber-400 border-amber-800/40';
    } else if (actUpper.includes('DELETE')) {
      color = 'bg-red-950/50 text-red-400 border-red-800/40';
    } else if (actUpper.includes('SAVE') || actUpper.includes('CREATE') || actUpper.includes('ADD')) {
      color = 'bg-emerald-950/50 text-emerald-400 border-emerald-800/40';
    } else if (actUpper.includes('ACCESS') || actUpper.includes('PASSWORD')) {
      color = 'bg-indigo-950/50 text-indigo-400 border-indigo-800/40';
    }

    return (
      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border uppercase tracking-wider ${color}`}>
        {action}
      </span>
    );
  };

  // Get distinct log actions for filtering
  const distinctActions = ['All', ...Array.from(new Set(logs.map(l => l.action)))];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.affected_record_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = selectedActionFilter === 'All' || log.action === selectedActionFilter;

    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/60 pb-5 gap-4 animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Security Audit Logs
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Operational activity logging and administrative trace tracking for strict security compliance.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="self-start sm:self-center bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-400 px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Reload Trail
        </button>
      </div>

      {/* Directory Tabular Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="md:col-span-8 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-550" />
          <input
            type="text"
            placeholder="Search logs by staff ID, action type, or record ID reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 outline-none transition-all placeholder:text-slate-600"
          />
        </div>

        <div className="md:col-span-4 relative flex items-center gap-2">
          <Filter className="h-4 w-4 text-indigo-400 shrink-0" />
          <select
            value={selectedActionFilter}
            onChange={(e) => setSelectedActionFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-slate-200 cursor-pointer outline-none font-sans font-medium"
          >
            <option value="All">Filter by Action (All)</option>
            {distinctActions.filter(a => a !== 'All').map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>
      </div>

      {/* AUDIT LOG TABLE LIST */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-fade-in text-xs animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                <th className="py-4 px-5">Timestamp Reference</th>
                <th className="py-4 px-5">Trigger Personnel</th>
                <th className="py-4 px-5">Action Performed</th>
                <th className="py-4 px-5">Affected ID</th>
                <th className="py-4 px-5 font-mono text-right">Raw Reference ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 italic">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                      <span>Loading compliant trail from central registry...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 italic">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-amber-500/80" />
                      <span>No auditing logs match specified filters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                (() => {
                  const sorted = [...filteredLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                  const paginated = sorted.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

                  return paginated.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-950/20 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2 text-slate-350">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-mono text-[11px] tracking-tight">
                            {new Date(log.timestamp).toLocaleString('en-US', { hour12: false })}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-slate-200">
                        <div className="flex items-center gap-2 text-slate-300">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          {getUserDisplay(log.user_id)}
                        </div>
                      </td>
                      <td className="py-4 px-5 font-semibold">
                        {getLogTypeBadge(log.action)}
                      </td>
                      <td className="py-4 px-5 font-mono text-[11px] text-indigo-400 font-semibold tracking-wider select-all">
                        {log.affected_record_id || <span className="text-slate-600 italic">N/A</span>}
                      </td>
                      <td className="py-4 px-5 text-right font-mono text-[10px] text-slate-500 select-all">
                        {log.id}
                      </td>
                    </tr>
                  ));
                })()
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls for audit logs */}
        {(() => {
          const sorted = [...filteredLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
    </div>
  );
}

export default AuditLogsManager;
