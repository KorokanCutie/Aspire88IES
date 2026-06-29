import { Profile, Client, Project, DuplicateConflict, Appointment } from '../types';
import { Shield, Building, Users, Calendar, TrendingUp, Sparkles, Scale, Landmark } from 'lucide-react';

interface DashboardStatsProps {
  currentProfile: Profile;
  profiles: Profile[];
  clients: Client[];
  projects: Project[];
  conflicts: DuplicateConflict[];
  appointments: Appointment[];
}

export function DashboardStats({ currentProfile, profiles, clients, projects, conflicts, appointments }: DashboardStatsProps) {
  // Compute numbers based on visibility guidelines
  const totalAgents = profiles.filter(p => p.role === 'Agent').length;
  const totalBrokers = profiles.filter(p => p.role === 'Broker').length;

  const mySubAgents = profiles.filter(p => p.parent_broker_id === currentProfile.id).map(p => p.id);

  const visibleClients = clients.filter(c => {
    if (currentProfile.role === 'Admin') return true;
    if (currentProfile.role === 'Broker') {
      return c.created_by === currentProfile.id || mySubAgents.includes(c.created_by);
    }
    if (currentProfile.role === 'Agent') {
      return c.created_by === currentProfile.id;
    }
    return false;
  });

  const visibleConflicts = conflicts.filter(c => {
    if (currentProfile.role === 'Admin') return true;
    if (currentProfile.role === 'Broker') {
      return c.original_encoder_id === currentProfile.id || 
             c.challenging_encoder_id === currentProfile.id ||
             mySubAgents.includes(c.original_encoder_id) || 
             mySubAgents.includes(c.challenging_encoder_id);
    }
    if (currentProfile.role === 'Agent') {
      return c.original_encoder_id === currentProfile.id || c.challenging_encoder_id === currentProfile.id;
    }
    return false;
  });

  const visibleAppointments = appointments.filter(a => {
    if (currentProfile.role === 'Admin') return true;
    if (currentProfile.role === 'Broker') {
      return a.agent_id === currentProfile.id || mySubAgents.includes(a.agent_id);
    }
    if (currentProfile.role === 'Agent') {
      return a.agent_id === currentProfile.id;
    }
    return false;
  });

  const activeProjects = projects.filter(p => p.status === 'Active').length;

  const r = currentProfile.role;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-fade-in">
      
      {/* Stat Card 1 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all shadow-lg">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
        
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
            {r === 'Admin' || r === 'Treasurer' ? 'Registry Personnel' : r === 'Broker' ? 'My Sales Team' : 'My Onboarded Base'}
          </span>
          <div className="p-2 bg-indigo-950/60 text-indigo-400 border border-indigo-900/40 rounded-xl">
            {r === 'Admin' || r === 'Treasurer' ? <Users className="w-5 h-5" /> : <Users className="w-5 h-5" />}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-3xl font-black text-slate-100 tracking-tight leading-none font-sans">
            {r === 'Admin' && `${totalBrokers + totalAgents}`}
            {r === 'Broker' && `${mySubAgents.length}`}
            {r === 'Agent' && `${visibleClients.length}`}
            {r === 'Treasurer' && `${totalBrokers + totalAgents}`}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            {r === 'Admin' && `${totalBrokers} Brokers & ${totalAgents} Agents active`}
            {r === 'Broker' && `${mySubAgents.length} downline agents authorized`}
            {r === 'Agent' && `Verified leads in directory`}
            {r === 'Treasurer' && `${totalBrokers} Brokers & ${totalAgents} Agents registered`}
          </p>
        </div>
      </div>

      {/* Stat Card 2 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all shadow-lg">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
        
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
            {r === 'Admin' || r === 'Broker' || r === 'Agent' ? 'Directory Clients' : 'Verified Properties'}
          </span>
          <div className="p-2 bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 rounded-xl">
            {r === 'Admin' || r === 'Broker' || r === 'Agent' ? <TrendingUp className="w-5 h-5" /> : <Building className="w-5 h-5" />}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-3xl font-black text-slate-100 tracking-tight leading-none font-sans">
            {(() => {
              if (r === 'Agent') {
                return clients.filter(c => c.created_by === currentProfile.id && c.duplicateStatus !== true && !c.is_deleted).length;
              }
              if (r === 'Broker') {
                const ownCount = clients.filter(c => c.created_by === currentProfile.id && c.duplicateStatus !== true && !c.is_deleted).length;
                const subCount = clients.filter(c => mySubAgents.includes(c.created_by) && c.duplicateStatus !== true && !c.is_deleted).length;
                return ownCount + subCount;
              }
              if (r === 'Admin') {
                return clients.filter(c => c.duplicateStatus !== true && !c.is_deleted).length;
              }
              return activeProjects;
            })()}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-medium space-y-0.5">
            {(() => {
              if (r === 'Agent') {
                const conflictCount = clients.filter(c => c.created_by === currentProfile.id && c.duplicateStatus === true && !c.is_deleted).length;
                return (
                  <div>
                    <span className="text-slate-400">Own clients with clean record.</span>
                    {conflictCount > 0 && <span className="text-rose-400 block text-[10px] mt-0.5">{conflictCount} locked in conflict</span>}
                  </div>
                );
              }
              if (r === 'Broker') {
                const ownCount = clients.filter(c => c.created_by === currentProfile.id && c.duplicateStatus !== true && !c.is_deleted).length;
                const subCount = clients.filter(c => mySubAgents.includes(c.created_by) && c.duplicateStatus !== true && !c.is_deleted).length;
                return (
                  <div>
                    <span className="text-slate-300 font-semibold">Breakdown:</span> {ownCount} own, {subCount} sub-agent
                  </div>
                );
              }
              if (r === 'Admin') {
                const brokerIds = profiles.filter(p => p.role === 'Broker').map(p => p.id);
                const agentIds = profiles.filter(p => p.role === 'Agent').map(p => p.id);
                const brokerClientsCount = clients.filter(c => brokerIds.includes(c.created_by) && c.duplicateStatus !== true && !c.is_deleted).length;
                const agentClientsCount = clients.filter(c => agentIds.includes(c.created_by) && c.duplicateStatus !== true && !c.is_deleted).length;
                return (
                  <div>
                    <span className="text-slate-300 font-semibold">Breakdown:</span> {brokerClientsCount} broker, {agentClientsCount} agent
                  </div>
                );
              }
              return <div>Active listed high-end estate catalogs</div>;
            })()}
          </div>
        </div>
      </div>

      {/* Stat Card 3 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all shadow-lg">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
        
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
            {r === 'Admin' || r === 'Broker' || r === 'Agent' ? 'Dispute claims' : 'Strict Auditing Node'}
          </span>
          <div className="p-2 bg-amber-950/60 text-amber-500 border border-amber-900/40 rounded-xl">
            {r === 'Admin' || r === 'Broker' || r === 'Agent' ? <Scale className="w-5 h-5" /> : <Landmark className="w-5 h-5" />}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-3xl font-black text-slate-100 tracking-tight leading-none font-sans">
            {r !== 'Treasurer' && visibleConflicts.filter(c => c.status === 'Pending').length}
            {r === 'Treasurer' && 'PST SECURE'}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            {r !== 'Treasurer' && `${visibleConflicts.filter(c => c.status === 'Resolved').length} historic dispute cases settled`}
            {r === 'Treasurer' && 'Zero access to properties & clients'}
          </p>
        </div>
      </div>

      {/* Stat Card 4 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all shadow-lg">
        <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl group-hover:bg-teal-500/10 transition-colors" />
        
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
            {r === 'Admin' || r === 'Broker' || r === 'Agent' ? 'Engagement schedule' : 'Mappable catalog'}
          </span>
          <div className="p-2 bg-teal-950/60 text-teal-400 border border-teal-900/40 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4">
          <div className="text-3xl font-black text-slate-100 tracking-tight leading-none font-sans font-sans">
            {r !== 'Treasurer' && visibleAppointments.filter(a => a.status === 'Open').length}
            {r === 'Treasurer' && projects.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            {r !== 'Treasurer' && `${visibleAppointments.filter(a => a.status === 'Done').length} tours completed, ${visibleAppointments.filter(a => a.status === 'Cancelled').length} cancelled`}
            {r === 'Treasurer' && 'Total estates catalogued'}
          </p>
        </div>
      </div>

    </div>
  );
}
export default DashboardStats;
