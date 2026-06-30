import { supabase } from './supabaseClient';
import { Profile, Developer, Project, Client, DuplicateConflict, Appointment, AuditLog } from './types';
import { sendEmail } from './resend';
import { AppProperties } from './appProperties';

// Seed Initial Data Helpers for Bootstrapping
const INITIAL_PROFILES: Profile[] = [
  {
    id: 'AD-SEED9000',
    email: 'admin@aspire88.netlify.app',
    first_name: 'Super',
    last_name: 'Admin',
    role: 'Admin',
    is_active: true,
    is_temporary: true,
    temp_password: 'AspireAdmin2026!',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'BR-ROXA5678',
    email: 'broker.roxas@aspire88.netlify.app',
    first_name: 'Vicente',
    last_name: 'Roxas',
    role: 'Broker',
    is_active: true,
    is_temporary: false,
    created_at: new Date('2026-01-02').toISOString(),
    updated_at: new Date('2026-01-02').toISOString(),
  },
  {
    id: 'AG-MARI1234',
    email: 'agent.maria@aspire88.netlify.app',
    first_name: 'Maria',
    last_name: 'Clara',
    role: 'Agent',
    parent_broker_id: 'BR-ROXA5678',
    is_active: true,
    is_temporary: false,
    created_at: new Date('2026-01-03').toISOString(),
    updated_at: new Date('2026-01-03').toISOString(),
  },
  {
    id: 'AG-RIZA9012',
    email: 'agent.jose@aspire88.netlify.app',
    first_name: 'Jose',
    last_name: 'Rizal',
    role: 'Agent',
    parent_broker_id: 'BR-ROXA5678',
    is_active: true,
    is_temporary: false,
    created_at: new Date('2026-01-04').toISOString(),
    updated_at: new Date('2026-01-04').toISOString(),
  },
  {
    id: 'TR-MAGB3456',
    email: 'treasurer.teresa@aspire88.netlify.app',
    first_name: 'Teresa',
    last_name: 'Magbanua',
    role: 'Treasurer',
    is_active: true,
    is_temporary: false,
    created_at: new Date('2026-01-05').toISOString(),
    updated_at: new Date('2026-01-05').toISOString(),
  },
];

const INITIAL_DEVELOPERS: Developer[] = [
  {
    id: 'DEV-MEGA7777',
    name: 'Megaworld Corporation',
    contact_person: 'Andrew Tan',
    contact_email: 'info@megaworldcorp.com',
    contact_number: '+63288880000',
    office_address: 'Alliance Global Tower, Uptown Bonifacio, Taguig, Philippines',
    status: 'Active',
    created_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'DEV-AYAL8888',
    name: 'Ayala Land Premier',
    contact_person: 'Jaime Zobel',
    contact_email: 'premier@ayalaland.com.ph',
    contact_number: '+63279083000',
    office_address: 'Tower One & Exchange Plaza, Ayala Triangle, Makati City',
    status: 'Active',
    created_at: new Date('2026-01-05').toISOString(),
  }
];

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'PRJ-RITZ8888',
    developer_id: 'DEV-MEGA7777',
    name: 'Uptown Ritz Residence',
    address: '36th Street, Uptown Bonifacio, Taguig, Metro Manila, Philippines',
    latitude: 14.5574,
    longitude: 121.0549,
    status: 'Active',
    created_at: new Date('2026-01-02').toISOString(),
  },
  {
    id: 'PRJ-SMAN3333',
    developer_id: 'DEV-AYAL8888',
    name: 'Park Central Towers',
    address: 'Paseo de Roxas cor. Makati Avenue, Makati, Metro Manila, Philippines',
    latitude: 14.5552,
    longitude: 121.0254,
    status: 'Active',
    created_at: new Date('2026-01-06').toISOString(),
  }
];

const INITIAL_CLIENTS: Client[] = [
  {
    id: 'CL-DELA1111',
    first_name: 'Juan',
    last_name: 'Dela Cruz',
    middle_name: 'Santos',
    contact_number: '09171234567',
    address: '123 Rizal Street, Barangay San Lorenzo, Makati City',
    created_by: 'AG-MARI1234',
    created_at: new Date('2026-02-10').toISOString(),
    updated_at: new Date('2026-02-10').toISOString(),
  },
  {
    id: 'CL-SILA2222',
    first_name: 'Gabriela',
    last_name: 'Silang',
    middle_name: 'Cariño',
    contact_number: '09187654321',
    address: '456 Bonifacio Drive, Vigan City, Ilocos Sur',
    created_by: 'AG-RIZA9012',
    created_at: new Date('2026-02-15').toISOString(),
    updated_at: new Date('2026-02-15').toISOString(),
  }
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'APT-VISI1234',
    client_id: 'CL-DELA1111',
    agent_id: 'AG-MARI1234',
    project_id: 'PRJ-RITZ8888',
    appointment_type: 'Site Visit',
    status: 'Open',
    notes: 'Primary site briefing for 3 Bedroom Exec suite.',
    address: '36th Street, Uptown Bonifacio, Taguig, Metro Manila, Philippines',
    appointment_time: new Date('2026-07-10T14:00:00+08:00').toISOString(),
    created_at: new Date('2026-06-20').toISOString(),
    updated_at: new Date('2026-06-20').toISOString(),
  },
  {
    id: 'APT-MEET5678',
    client_id: 'CL-SILA2222',
    agent_id: 'AG-RIZA9012',
    project_id: null,
    appointment_type: 'Meeting',
    status: 'Cancelled',
    notes: 'Initial requirement gathering.',
    appointment_time: new Date('2026-06-15T10:00:00+08:00').toISOString(),
    created_at: new Date('2026-06-10').toISOString(),
    updated_at: new Date('2026-06-10').toISOString(),
  }
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'LOG-ABCD0001',
    timestamp: new Date('2026-06-21T09:12:00Z').toISOString(),
    user_id: 'AD-SEED9000',
    action: 'Enterprise database seeded successfully.',
    affected_record_id: 'SYSTEM'
  },
  {
    id: 'LOG-EFGH0002',
    timestamp: new Date('2026-06-22T14:30:15Z').toISOString(),
    user_id: 'AD-SEED9000',
    action: 'Seeded core land developers and executive broker profiles.',
    affected_record_id: 'BR-ROXA5678'
  },
  {
    id: 'LOG-IJKL0003',
    timestamp: new Date('2026-06-22T15:00:20Z').toISOString(),
    user_id: 'BR-ROXA5678',
    action: 'Agent profile Clara Maria onboarded successfully.',
    affected_record_id: 'AG-MARI1234'
  }
];

// Unified Alphanumeric Key Generator
export function generateAlphaId(prefix: string): string {
  const letters = Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
  const digits = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
  return `${prefix}${letters}${digits}`;
}

/**
 * Computes Jaro-Winkler distance between two strings (0.0 to 1.0)
 */
export function getJaroWinklerDistance(s1: string, s2: string): number {
  const str1 = s1.trim().toLowerCase();
  const str2 = s2.trim().toLowerCase();
  
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const maxDist = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
  const match1 = new Array(str1.length).fill(false);
  const match2 = new Array(str2.length).fill(false);

  let matches = 0;
  for (let i = 0; i < str1.length; i++) {
    const start = Math.max(0, i - maxDist);
    const end = Math.min(str2.length - 1, i + maxDist);
    for (let j = start; j <= end; j++) {
      if (match2[j]) continue;
      if (str1[i] === str2[j]) {
        match1[i] = true;
        match2[j] = true;
        matches++;
        break;
      }
    }
  }

  if (matches === 0) return 0.0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < str1.length; i++) {
    if (!match1[i]) continue;
    while (!match2[k]) k++;
    if (str1[i] !== str2[k]) {
      transpositions++;
    }
    k++;
  }

  const jaro = (matches / str1.length + matches / str2.length + (matches - transpositions / 2) / matches) / 3.0;

  // Winkler enhancement
  let prefix = 0;
  const maxPrefix = 4;
  for (let i = 0; i < Math.min(maxPrefix, Math.min(str1.length, str2.length)); i++) {
    if (str1[i] === str2[i]) {
      prefix++;
    } else {
      break;
    }
  }

  return jaro + prefix * 0.1 * (1.0 - jaro);
}

/**
 * Computes Cosine Similarity between two addresses on a bag-of-words representation (0.0 to 1.0)
 */
export function getCosineAddressSimilarity(addr1: string, addr2: string): number {
  const normalize = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // remove punctuations
      .replace(/\s+/g, ' ')    // collapse extra spaces
      .trim();
  };

  const norm1 = normalize(addr1);
  const norm2 = normalize(addr2);

  if (norm1 === norm2) return 1.0;
  if (norm1 === '' || norm2 === '') return 0.0;

  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');

  const freq1: { [word: string]: number } = {};
  const freq2: { [word: string]: number } = {};

  for (const w of words1) {
    if (w) freq1[w] = (freq1[w] || 0) + 1;
  }
  for (const w of words2) {
    if (w) freq2[w] = (freq2[w] || 0) + 1;
  }

  const allWords = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);

  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (const w of allWords) {
    const f1 = freq1[w] || 0;
    const f2 = freq2[w] || 0;
    dotProduct += f1 * f2;
    mag1 += f1 * f1;
    mag2 += f2 * f2;
  }

  if (mag1 === 0 || mag2 === 0) return 0.0;
  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

/**
 * Computes the multi-layered deduplication score between two client profiles
 * Combined Score = (JaroWinklerNameSimilarity * 40%) + (PhoneExactMatchScore * 40%) + (CosineAddressSimilarity * 20%)
 */
export function computeDeduplicationScore(c1: Client, c2: Client): number {
  // Layer 1: Exact Match Check
  const phone1 = c1.contact_number.replace(/\D/g, '');
  const phone2 = c2.contact_number.replace(/\D/g, '');

  const fb1 = c1.facebook_link ? c1.facebook_link.trim().toLowerCase() : '';
  const fb2 = c2.facebook_link ? c2.facebook_link.trim().toLowerCase() : '';

  const exactPhone = phone1 !== '' && phone2 !== '' && phone1 === phone2;
  const exactFb = fb1 !== '' && fb2 !== '' && fb1 === fb2;

  if (exactPhone || exactFb) {
    return 1.0; // 100% duplicate score immediately
  }

  // Layer 2: Hybrid Fuzzy Match
  const name1 = `${c1.first_name.trim()}${c1.middle_name ? ' ' + c1.middle_name.trim() : ''} ${c1.last_name.trim()}`;
  const name2 = `${c2.first_name.trim()}${c2.middle_name ? ' ' + c2.middle_name.trim() : ''} ${c2.last_name.trim()}`;

  const jaroWinklerName = getJaroWinklerDistance(name1, name2);
  const cosineAddress = getCosineAddressSimilarity(c1.address, c2.address);

  // Weighted score aggregation (PhoneExactMatchScore is 0 because exact match was not hit)
  return (jaroWinklerName * 0.40) + (0 * 0.40) + (cosineAddress * 0.20);
}

class ERPDatabase {
  public getJaroWinklerDistance(s1: string, s2: string): number {
    return getJaroWinklerDistance(s1, s2);
  }

  public getCosineAddressSimilarity(addr1: string, addr2: string): number {
    return getCosineAddressSimilarity(addr1, addr2);
  }

  public computeDeduplicationScore(c1: Client, c2: Client): number {
    return computeDeduplicationScore(c1, c2);
  }

  private dbStatusLog: string[] = [];
  private hasCheckedSeedCount = false;

  constructor() {
    this.addLog('Initializing Aspire88 Estates Corporation Integrated Enterprise System Database Engine...');
    this.addLog('Live Supabase API active with fallback client offline database schema.');
    this.initLocalStorageIfNeeded();
  }

  private initLocalStorageIfNeeded() {
    try {
      if (!localStorage.getItem('aspire88_profiles')) {
        localStorage.setItem('aspire88_profiles', JSON.stringify(INITIAL_PROFILES));
      }
      if (!localStorage.getItem('aspire88_developers')) {
        localStorage.setItem('aspire88_developers', JSON.stringify(INITIAL_DEVELOPERS));
      }
      if (!localStorage.getItem('aspire88_projects')) {
        localStorage.setItem('aspire88_projects', JSON.stringify(INITIAL_PROJECTS));
      }
      if (!localStorage.getItem('aspire88_clients')) {
        localStorage.setItem('aspire88_clients', JSON.stringify(INITIAL_CLIENTS));
      }
      if (!localStorage.getItem('aspire88_duplicate_conflicts')) {
        localStorage.setItem('aspire88_duplicate_conflicts', JSON.stringify([]));
      }
      if (!localStorage.getItem('aspire88_appointments')) {
        localStorage.setItem('aspire88_appointments', JSON.stringify(INITIAL_APPOINTMENTS));
      }
      if (!localStorage.getItem('aspire88_audit_logs')) {
        localStorage.setItem('aspire88_audit_logs', JSON.stringify(INITIAL_AUDIT_LOGS));
      }
    } catch (e) {
      this.addLog(`Local storage initialization error: ${e}`);
    }
  }

  private addLog(message: string) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    this.dbStatusLog.unshift(`[${time}] ${message}`);
  }

  public getLogs(): string[] {
    return this.dbStatusLog;
  }

  // --- Bootstrapping logic if Supabase is fresh and empty ---
  private async seedDatabaseIfNeeded() {
    if (this.hasCheckedSeedCount) return;
    this.hasCheckedSeedCount = true;
    try {
      this.addLog('Verifying database seeding requirements...');
      const { data: existingProfiles, error } = await supabase.from('profiles').select('id').limit(1);
      if (error) {
        this.addLog(`Verification check encountered database error: ${error.message}`);
        return;
      }
      if (!existingProfiles || existingProfiles.length === 0) {
        this.addLog('EMPTY DB: Detected unseeded database. Initiating enterprise bootstrap...');
        
        // 1. Seed Profiles (insert parents/admins first to respect self-referential relations)
        this.addLog('Seeding profile registry...');
        const nonParents = INITIAL_PROFILES.filter(p => !p.parent_broker_id);
        const { error: pErr1 } = await supabase.from('profiles').insert(nonParents);
        if (pErr1) throw pErr1;

        const withParents = INITIAL_PROFILES.filter(p => p.parent_broker_id);
        const { error: pErr2 } = await supabase.from('profiles').insert(withParents);
        if (pErr2) throw pErr2;

        // 2. Seed Developers
        this.addLog('Seeding developers...');
        const { error: devErr } = await supabase.from('developers').insert(INITIAL_DEVELOPERS);
        if (devErr) throw devErr;

        // 3. Seed Projects
        this.addLog('Seeding projects...');
        const { error: projErr } = await supabase.from('projects').insert(INITIAL_PROJECTS);
        if (projErr) throw projErr;

        // 4. Seed Clients
        this.addLog('Seeding client registry...');
        const { error: clientErr } = await supabase.from('clients').insert(INITIAL_CLIENTS);
        if (clientErr) throw clientErr;

        // 5. Seed Appointments
        this.addLog('Seeding appointments...');
        const { error: apptErr } = await supabase.from('appointments').insert(INITIAL_APPOINTMENTS);
        if (apptErr) throw apptErr;

        this.addLog('Database seeding successfully finalized.');
      } else {
        this.addLog('Database contains registers. Direct live API access active.');
      }
    } catch (e: any) {
      this.addLog(`Automatic indexing seed exception: ${e.message || e}`);
    }
  }

  // --- Profiles Table Support ---
  public async getProfiles(): Promise<Profile[]> {
    await this.seedDatabaseIfNeeded();
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      this.addLog('Profiles fetched successfully from Supabase.');
      try {
        localStorage.setItem('aspire88_profiles', JSON.stringify(data));
      } catch (cacheErr) {}
      return data as Profile[];
    } catch (e: any) {
      this.addLog(`Supabase fetch profiles warning: ${e.message || e}. Using local storage fallback.`);
      const cached = localStorage.getItem('aspire88_profiles');
      return cached ? JSON.parse(cached) : INITIAL_PROFILES;
    }
  }

  public async saveProfile(profile: Profile): Promise<Profile> {
    this.addLog(`Saving profile ID ${profile.id}...`);
    try {
      const cached = localStorage.getItem('aspire88_profiles');
      let arr: Profile[] = cached ? JSON.parse(cached) : INITIAL_PROFILES;
      const index = arr.findIndex(p => p.id === profile.id);
      if (index >= 0) {
        arr[index] = profile;
      } else {
        arr.push(profile);
      }
      localStorage.setItem('aspire88_profiles', JSON.stringify(arr));
    } catch (cacheErr) {}

    // Record system audit log
    this.addAuditLog(profile.id || 'SYSTEM', `Saved/Updated profile: ${profile.email} (${profile.role})`, profile.id);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profile)
        .select()
        .single();
      if (error) throw error;
      this.addLog(`Profile ${profile.id} saved to Supabase.`);
      return data as Profile;
    } catch (e: any) {
      this.addLog(`Supabase save profile exception: ${e.message || e}. Saved to local storage fallback.`);
      return profile;
    }
  }

  // --- Developers Support ---
  public async getDevelopers(): Promise<Developer[]> {
    try {
      const { data, error } = await supabase
        .from('developers')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      try {
        localStorage.setItem('aspire88_developers', JSON.stringify(data));
      } catch (cacheErr) {}
      return data as Developer[];
    } catch (e: any) {
      this.addLog(`Supabase fetch developers warning: ${e.message || e}. Using local storage fallback.`);
      const cached = localStorage.getItem('aspire88_developers');
      return cached ? JSON.parse(cached) : INITIAL_DEVELOPERS;
    }
  }

  public async saveDeveloper(dev: Developer): Promise<Developer> {
    this.addLog(`Saving developer ${dev.name}...`);
    try {
      const cached = localStorage.getItem('aspire88_developers');
      let arr: Developer[] = cached ? JSON.parse(cached) : INITIAL_DEVELOPERS;
      const index = arr.findIndex(d => d.id === dev.id);
      if (index >= 0) {
        arr[index] = dev;
      } else {
        arr.push(dev);
      }
      localStorage.setItem('aspire88_developers', JSON.stringify(arr));
    } catch (cacheErr) {}

    // Record system audit log
    this.addAuditLog('SYSTEM', `Saved/Updated Developer: ${dev.name}`, dev.id);

    try {
      const { data, error } = await supabase
        .from('developers')
        .upsert(dev)
        .select()
        .single();
      if (error) throw error;
      this.addLog(`Developer ${dev.name} saved to Supabase.`);
      return data as Developer;
    } catch (e: any) {
      this.addLog(`Supabase save developer error: ${e.message || e}. Saved to local storage fallback.`);
      return dev;
    }
  }

  // --- Projects Support ---
  public async getProjects(): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      try {
        localStorage.setItem('aspire88_projects', JSON.stringify(data));
      } catch (cacheErr) {}
      return data as Project[];
    } catch (e: any) {
      this.addLog(`Supabase fetch projects warning: ${e.message || e}. Using local storage fallback.`);
      const cached = localStorage.getItem('aspire88_projects');
      return cached ? JSON.parse(cached) : INITIAL_PROJECTS;
    }
  }

  public async saveProject(proj: Project): Promise<Project> {
    this.addLog(`Saving project ${proj.name}...`);
    try {
      const cached = localStorage.getItem('aspire88_projects');
      let arr: Project[] = cached ? JSON.parse(cached) : INITIAL_PROJECTS;
      const index = arr.findIndex(p => p.id === proj.id);
      if (index >= 0) {
        arr[index] = proj;
      } else {
        arr.push(proj);
      }
      localStorage.setItem('aspire88_projects', JSON.stringify(arr));
    } catch (cacheErr) {}

    // Record system audit log
    this.addAuditLog('SYSTEM', `Saved/Updated Project: ${proj.name} under Developer ID: ${proj.developer_id}`, proj.id);

    try {
      const { data, error } = await supabase
        .from('projects')
        .upsert(proj)
        .select()
        .single();
      if (error) throw error;
      this.addLog(`Project ${proj.name} saved to Supabase.`);
      return data as Project;
    } catch (e: any) {
      this.addLog(`Supabase save project error: ${e.message || e}. Saved to local storage fallback.`);
      return proj;
    }
  }

  // --- Clients Support & Auto Duplicate Logic ---
  public async getClients(): Promise<Client[]> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      
      const mapped = data ? data.map((c: any) => ({
        ...c,
        duplicateStatus: c.duplicateStatus === true || c.duplicate_status === true || c.duplicatestatus === true,
        is_access_lost: c.is_access_lost === true || c.isaccesslost === true || c.is_deleted === true
      })) : [];

      try {
        localStorage.setItem('aspire88_clients', JSON.stringify(mapped));
      } catch (cacheErr) {}
      return mapped as Client[];
    } catch (e: any) {
      this.addLog(`Supabase fetch clients warning: ${e.message || e}. Using local storage fallback.`);
      const cached = localStorage.getItem('aspire88_clients');
      const loaded = cached ? JSON.parse(cached) : INITIAL_CLIENTS;
      return loaded.map((c: any) => ({
        ...c,
        duplicateStatus: c.duplicateStatus === true || c.duplicate_status === true || c.duplicatestatus === true,
        is_access_lost: c.is_access_lost === true || c.isaccesslost === true || c.is_deleted === true
      }));
    }
  }

  public async saveClient(client: Client, encoderId: string): Promise<{ client: Client; createdConflict?: DuplicateConflict }> {
    this.addLog(`Saving client ${client.first_name} ${client.last_name}...`);
    let localCreatedConflict: DuplicateConflict | undefined;

    // Explicitly default duplicateStatus to false unless determined otherwise
    if (client.duplicateStatus === undefined) {
      client.duplicateStatus = false;
    }

    try {
      const cached = localStorage.getItem('aspire88_clients');
      let arr: Client[] = cached ? JSON.parse(cached) : INITIAL_CLIENTS;
      const index = arr.findIndex(c => c.id === client.id);

      // Fetch latest active clients from Supabase to avoid stale checks if possible
      let currentClients = arr;
      try {
        const { data: fetchedClients } = await supabase
          .from('clients')
          .select('*');
        if (fetchedClients && fetchedClients.length > 0) {
          currentClients = fetchedClients.map((c: any) => ({
            ...c,
            duplicateStatus: c.duplicateStatus === true || c.duplicate_status === true || c.duplicatestatus === true
          })) as Client[];
        }
      } catch (e) {}

      // Do not duplicate check with client records that are duplicateStatus=True or deleted (is_deleted=TRUE)
      const candidateRecords = currentClients.filter(c => 
        !c.is_deleted && 
        c.duplicateStatus !== true &&
        c.id !== client.id
      );

      // Check for any matching candidates
      let matchedDuplicateClient: Client | null = null;

      for (const candidate of candidateRecords) {
        const score = computeDeduplicationScore(client, candidate);
        const phone1 = client.contact_number.replace(/\D/g, '');
        const phone2 = candidate.contact_number.replace(/\D/g, '');
        const name1 = `${client.first_name.trim().toLowerCase()} ${client.last_name.trim().toLowerCase()}`;
        const name2 = `${candidate.first_name.trim().toLowerCase()} ${candidate.last_name.trim().toLowerCase()}`;

        const isExactPhone = phone1 !== '' && phone2 !== '' && phone1 === phone2;
        const isExactName = name1 === name2;

        if (isExactPhone || isExactName || score >= 0.85) {
          matchedDuplicateClient = candidate;
          break;
        }
      }

      if (matchedDuplicateClient) {
        // If duplicate client record was hit then duplicateStatus=True for the new record. Original record duplicateStatus remains.
        client.duplicateStatus = true;
        const originalClient = matchedDuplicateClient;
        const conflictId = generateAlphaId('CON-');
        localCreatedConflict = {
          id: conflictId,
          challenged_client_id: client.id,
          original_client_id: originalClient.id,
          original_encoder_id: originalClient.created_by,
          challenging_encoder_id: client.created_by,
          status: 'Pending',
          resolution: 'Pending',
          resolution_decision: 'Pending',
          created_at: new Date().toISOString()
        };

        const conflictCache = localStorage.getItem('aspire88_duplicate_conflicts');
        let conflictArr: DuplicateConflict[] = conflictCache ? JSON.parse(conflictCache) : [];
        conflictArr.push(localCreatedConflict);
        localStorage.setItem('aspire88_duplicate_conflicts', JSON.stringify(conflictArr));
        this.addLog(`🚨 Client duplicate verification triggered conflict: ${conflictId}`);

        const profilesCache = localStorage.getItem('aspire88_profiles');
        const profilesArr: Profile[] = profilesCache ? JSON.parse(profilesCache) : [];
        const originalAgent = profilesArr.find(p => p.id === originalClient.created_by);
        const originalAgentName = originalAgent ? `${originalAgent.first_name} ${originalAgent.last_name}` : 'Unknown';
        const challengedAgent = profilesArr.find(p => p.id === client.created_by);
        const challengedAgentName = challengedAgent ? `${challengedAgent.first_name} ${challengedAgent.last_name}` : 'Unknown';

        const originalClientName = `${originalClient.first_name} ${originalClient.last_name}`;
        const challengedClientName = `${client.first_name} ${client.last_name}`;

        // Send email to admin when a duplicate conflict entry is created
        sendEmail('admin@aspire88.netlify.app', `[System Alert] Duplicate Client Conflict Registered - Reference: ${conflictId}`, `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #334155; line-height: 1.6; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <!-- Brand Header -->
            <div style="border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; text-align: left;">
              <h2 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 800; letter-spacing: -0.025em;">ASPIRE88 ESTATES CORPORATION INTEGRATED ENTERPRISE SYSTEM</h2>
              <span style="font-size: 11px; color: #4f46e5; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">Integrated Enterprise System</span>
            </div>

            <!-- Main Content -->
            <h3 style="color: #0f172a; font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 12px; display: flex; items-center: center; gap: 8px;">
              ⚠️ Collision Alert: Duplicate Client Registration
            </h3>
            <p style="margin-top: 0; margin-bottom: 20px; font-size: 14px; color: #475569;">
              A potential duplicate client registration has been detected and logged in the ERP system. This case is currently flagged and requires an immediate administrative review and formal decree inside the Resolution Panel workstation.
            </p>

            <!-- Details Block -->
            <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <h4 style="margin-top: 0; margin-bottom: 14px; font-size: 12px; font-weight: 700; color: #475569; letter-spacing: 0.05em; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                Conflict File Details
              </h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500; width: 35%; vertical-align: top;">Conflict ID:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: 600;">${conflictId}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500; vertical-align: top;">Original Client:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 500;">
                    <strong>${originalClientName}</strong> <span style="color: #64748b; font-size: 11px; font-family: monospace;">(${originalClient.id})</span>
                    <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                      Registered by: <strong>${originalAgentName}</strong> <span style="font-family: monospace; font-size: 11px;">(ID: ${originalClient.created_by})</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500; vertical-align: top;">Challenging Client:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 500;">
                    <strong>${challengedClientName}</strong> <span style="color: #64748b; font-size: 11px; font-family: monospace;">(${client.id})</span>
                    <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                      Registered by: <strong>${challengedAgentName}</strong> <span style="font-family: monospace; font-size: 11px;">(ID: ${client.created_by})</span>
                    </div>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Call to Action -->
            <p style="font-size: 14px; color: #475569; margin-bottom: 24px;">
              Please access the <strong>Resolution Panel</strong> within the ERP workspace to conduct a side-by-side comparative identity audit and issue a final claim decree.
            </p>

            <div style="text-align: center; margin-bottom: 28px;">
              <a href="https://aspire88.netlify.app" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;">
                Access Resolution Workstation
              </a>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0 0 4px 0;">This is an automated system-generated notification from the Aspire88 Estates Corporation Integrated Enterprise System registry engine.</p>
              <p style="margin: 0;">&copy; 2026 Aspire88 Estates Corporation Integrated Enterprise System. All rights reserved.</p>
            </div>
          </div>
        `).catch(e => console.error('Error sending conflict alert email:', e));
      } else {
        client.duplicateStatus = false;
      }

      if (index >= 0) {
        arr[index] = client;
      } else {
        arr.push(client);
      }
      localStorage.setItem('aspire88_clients', JSON.stringify(arr));
    } catch (cacheErr) {}

    // Record system audit log
    this.addAuditLog(encoderId, `Saved/Registered client details for ${client.first_name} ${client.last_name}`, client.id);

    try {
      // Resilient client upsert flow to accommodate different column formats (duplicateStatus, duplicate_status, duplicatestatus)
      let upsertData: any = { ...client };
      delete upsertData.is_access_lost;
      let data: any = null;
      let error: any = null;

      // Try with "duplicateStatus" column
      const res1 = await supabase
        .from('clients')
        .upsert({ ...upsertData, "duplicateStatus": client.duplicateStatus })
        .select()
        .single();
      
      if (res1.error && (res1.error.message.includes('column') || res1.error.code === '42703')) {
        // Try with "duplicate_status" column
        delete upsertData.duplicateStatus;
        const res2 = await supabase
          .from('clients')
          .upsert({ ...upsertData, duplicate_status: client.duplicateStatus })
          .select()
          .single();
        
        if (res2.error && (res2.error.message.includes('column') || res2.error.code === '42703')) {
          // Try with "duplicatestatus" column
          const res3 = await supabase
            .from('clients')
            .upsert({ ...upsertData, duplicatestatus: client.duplicateStatus })
            .select()
            .single();
          
          if (res3.error && (res3.error.message.includes('column') || res3.error.code === '42703')) {
            // Drop duplicate status column entirely and save
            const cleanUpsert = { ...upsertData };
            delete cleanUpsert.duplicateStatus;
            delete cleanUpsert.duplicate_status;
            delete cleanUpsert.duplicatestatus;
            const res4 = await supabase
              .from('clients')
              .upsert(cleanUpsert)
              .select()
              .single();
            if (res4.error) throw res4.error;
            data = res4.data;
          } else {
            if (res3.error) throw res3.error;
            data = res3.data;
          }
        } else {
          if (res2.error) throw res2.error;
          data = res2.data;
        }
      } else {
        if (res1.error) throw res1.error;
        data = res1.data;
      }

      this.addLog(`Client ${client.id} updated on Supabase.`);

      let createdConflict: DuplicateConflict | undefined = localCreatedConflict;

      if (localCreatedConflict) {
        // Resilient insert flow for duplicate conflicts to handle both "resolution" and "resolution_decision"
        const baseConflictInsert = {
          id: localCreatedConflict.id,
          original_client_id: localCreatedConflict.original_client_id,
          challenged_client_id: localCreatedConflict.challenged_client_id,
          original_encoder_id: localCreatedConflict.original_encoder_id,
          challenging_encoder_id: localCreatedConflict.challenging_encoder_id,
          status: localCreatedConflict.status,
          created_at: localCreatedConflict.created_at
        };

        const resConflict1 = await supabase
          .from('duplicate_conflicts')
          .insert({
            ...baseConflictInsert,
            resolution: 'Pending'
          });

        if (resConflict1.error && (resConflict1.error.message.includes('column') || resConflict1.error.code === '42703')) {
          const resConflict2 = await supabase
            .from('duplicate_conflicts')
            .insert({
              ...baseConflictInsert,
              resolution_decision: 'Pending'
            });
          
          if (resConflict2.error) {
            this.addLog(`Error inserting duplicate conflict (fallback) to Supabase: ${resConflict2.error.message}`);
          } else {
            this.addLog(`Successfully inserted duplicate conflict ${localCreatedConflict.id} with resolution_decision fallback.`);
          }
        } else if (resConflict1.error) {
          this.addLog(`Error inserting duplicate conflict to Supabase: ${resConflict1.error.message}`);
        } else {
          this.addLog(`Successfully inserted duplicate conflict ${localCreatedConflict.id} to Supabase.`);
        }

        // Fallback check to verify if conflict already exists in case of failure
        const { data: conflictData } = await supabase
          .from('duplicate_conflicts')
          .select('*')
          .eq('challenged_client_id', client.id)
          .eq('status', 'Pending')
          .limit(1);
        if (conflictData && conflictData.length > 0) {
          createdConflict = {
            ...conflictData[0],
            resolution: conflictData[0].resolution || conflictData[0].resolution_decision || 'Pending',
            resolution_decision: conflictData[0].resolution || conflictData[0].resolution_decision || 'Pending'
          } as DuplicateConflict;
        }
      }

      const returnedClient = data ? {
        ...data,
        duplicateStatus: data.duplicateStatus === true || data.duplicate_status === true || data.duplicatestatus === true
      } as Client : client;

      return { client: returnedClient, createdConflict };
    } catch (e: any) {
      this.addLog(`Supabase save client error: ${e.message || e}. Handled locally.`);
      return { client, createdConflict: localCreatedConflict };
    }
  }

  public async deleteClient(clientId: string, userId?: string): Promise<void> {
    this.addLog(`Soft deleting client ${clientId}...`);
    try {
      const cached = localStorage.getItem('aspire88_clients');
      let arr: Client[] = cached ? JSON.parse(cached) : INITIAL_CLIENTS;
      const index = arr.findIndex(c => c.id === clientId);
      if (index >= 0) {
        arr[index].is_deleted = true;
        arr[index].updated_at = new Date().toISOString();
        localStorage.setItem('aspire88_clients', JSON.stringify(arr));
      }

      const apptCache = localStorage.getItem('aspire88_appointments');
      let apptArr: Appointment[] = apptCache ? JSON.parse(apptCache) : INITIAL_APPOINTMENTS;
      apptArr = apptArr.map(appt => {
        if (appt.client_id === clientId && appt.status === 'Open') {
          const currentNotes = appt.notes ? appt.notes.trim() : '';
          return {
            ...appt,
            status: 'Cancelled',
            notes: currentNotes ? `${currentNotes} - Client Record Deleted` : 'Client Record Deleted',
            updated_at: new Date().toISOString()
          };
        }
        return appt;
      });
      localStorage.setItem('aspire88_appointments', JSON.stringify(apptArr));

      // Automatically resolve pending conflicts where this client is involved
      const conflictCache = localStorage.getItem('aspire88_duplicate_conflicts');
      let conflictArr: DuplicateConflict[] = conflictCache ? JSON.parse(conflictCache) : [];
      const pendingConflicts = conflictArr.filter(
        c => c.status === 'Pending' && (c.original_client_id === clientId || c.challenged_client_id === clientId)
      );

      for (const conf of pendingConflicts) {
        conf.status = 'Resolved';
        conf.resolved_by = userId || 'SYSTEM';
        conf.resolved_at = new Date().toISOString();

        if (conf.original_client_id === clientId) {
          // Original client is deleted, Challenger wins. Swap roles so Challenger remains active as original_client_id
          const origId = conf.original_client_id;
          const chalId = conf.challenged_client_id;
          const origEnc = conf.original_encoder_id;
          const chalEnc = conf.challenging_encoder_id;

          conf.original_client_id = chalId;
          conf.challenged_client_id = origId;
          conf.original_encoder_id = chalEnc;
          conf.challenging_encoder_id = origEnc;
          conf.resolution = 'Marked Duplicate';
          conf.resolution_decision = 'Marked Duplicate';
        } else {
          // Challenged client is deleted, Original wins.
          conf.resolution = 'Marked Duplicate';
          conf.resolution_decision = 'Marked Duplicate';
        }

        try {
          await supabase
            .from('duplicate_conflicts')
            .update({
              original_client_id: conf.original_client_id,
              challenged_client_id: conf.challenged_client_id,
              original_encoder_id: conf.original_encoder_id,
              challenging_encoder_id: conf.challenging_encoder_id,
              status: 'Resolved',
              resolution: 'Marked Duplicate',
              resolved_by: userId || 'SYSTEM',
              resolved_at: new Date().toISOString()
            })
            .eq('id', conf.id);
        } catch (dbErr) {
          this.addLog(`Failed to automatically resolve conflict on Supabase: ${dbErr}`);
        }
      }

      if (pendingConflicts.length > 0) {
        localStorage.setItem('aspire88_duplicate_conflicts', JSON.stringify(conflictArr));
        this.addLog(`Automatically resolved ${pendingConflicts.length} pending conflicts involving deleted client.`);
      }

    } catch (cacheErr) {}

    // Record system audit log
    this.addAuditLog(userId || 'SYSTEM', `Soft deleted Client record`, clientId);

    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', clientId);
      if (error) throw error;

      // Cancel open appointments for this client
      const { data: openAppts, error: apptsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'Open');
      
      if (apptsError) throw apptsError;

      if (openAppts && openAppts.length > 0) {
        this.addLog(`Cancelling ${openAppts.length} open appointments for deleted client...`);
        for (const appt of openAppts) {
          const currentNotes = appt.notes ? appt.notes.trim() : '';
          const updatedNotes = currentNotes ? `${currentNotes} - Client Record Deleted` : 'Client Record Deleted';
          await supabase
            .from('appointments')
            .update({
              status: 'Cancelled',
              notes: updatedNotes,
              updated_at: new Date().toISOString()
            })
            .eq('id', appt.id);
        }
      }
      this.addLog(`Client ${clientId} soft deleted successfully.`);
    } catch (e: any) {
      this.addLog(`Supabase soft delete client error: ${e.message || e}. Deleted locally.`);
    }
  }

  // --- Duplicate Conflicts Support ---
  public async getConflicts(): Promise<DuplicateConflict[]> {
    try {
      const { data, error } = await supabase
        .from('duplicate_conflicts')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      const mapped = data ? data.map((d: any) => ({
        ...d,
        resolution: d.resolution || d.resolution_decision || 'Pending',
        resolution_decision: d.resolution || d.resolution_decision || 'Pending'
      })) : [];
      try {
        localStorage.setItem('aspire88_duplicate_conflicts', JSON.stringify(mapped));
      } catch (cacheErr) {}
      return mapped as DuplicateConflict[];
    } catch (e: any) {
      this.addLog(`Supabase fetch conflicts warning: ${e.message || e}. Using local storage fallback.`);
      const cached = localStorage.getItem('aspire88_duplicate_conflicts');
      const loaded = cached ? JSON.parse(cached) : [];
      return loaded.map((d: any) => ({
        ...d,
        resolution: d.resolution || d.resolution_decision || 'Pending',
        resolution_decision: d.resolution || d.resolution_decision || 'Pending'
      }));
    }
  }

  // Settle Duplicate Claims Transaction
  public async resolveConflict(conflictId: string, decision: DuplicateConflict['resolution_decision'], resolverProfileId: string): Promise<void> {
    this.addLog(`Resolving conflict ${conflictId} with decision: ${decision}...`);
    try {
      const conflictCache = localStorage.getItem('aspire88_duplicate_conflicts');
      let conflictArr: DuplicateConflict[] = conflictCache ? JSON.parse(conflictCache) : [];
      const conflict = conflictArr.find(c => c.id === conflictId);
      if (conflict) {
        // Set conflict status to Resolved and resolution
        conflict.status = 'Resolved';
        conflict.resolution = decision;
        conflict.resolution_decision = decision;
        conflict.resolved_by = resolverProfileId;
        conflict.resolved_at = new Date().toISOString();
        localStorage.setItem('aspire88_duplicate_conflicts', JSON.stringify(conflictArr));

        const clientsCache = localStorage.getItem('aspire88_clients');
        let clientsArr: Client[] = clientsCache ? JSON.parse(clientsCache) : INITIAL_CLIENTS;
        
        const originalClient = clientsArr.find(c => c.id === conflict.original_client_id);
        const challengedClient = clientsArr.find(c => c.id === conflict.challenged_client_id);

        if (originalClient && challengedClient) {
          let losingClientId: string | null = null;
          let cancelNotes = '';

          if (decision === 'Marked False Positive') {
            // Mark False Positive will be no changes for Original Agent's Client duplicate status.
            // Challenger Agent's Client duplicate status will become duplicateStatus=False.
            challengedClient.duplicateStatus = false;
            challengedClient.is_access_lost = false;
          } else if (decision === 'Marked Duplicate') {
            // Original Agent's Client and Challenger Agent's Client duplicate status will remain.
            // Challenger Agent's Client loses access
            challengedClient.is_access_lost = true;
            losingClientId = challengedClient.id;
            cancelNotes = 'Cancelled due to Original Winner';
          } else if (decision === 'Awarded To Challenger') {
            // duplicate status of Challenger Agent's Client will be FALSE 
            // and duplicate status of Original Agent's Client will be TRUE as requested
            challengedClient.duplicateStatus = false;
            challengedClient.is_access_lost = false;

            originalClient.duplicateStatus = true;
            originalClient.is_access_lost = true;
            losingClientId = originalClient.id;
            cancelNotes = 'Awarded to Challenger';
          } else if (decision === 'Surrendered Claim') {
            // Challenger Agent's Client duplicate status becomes true and loses access
            challengedClient.duplicateStatus = true;
            challengedClient.is_access_lost = true;
            losingClientId = challengedClient.id;
            cancelNotes = 'Cancelled due to Surrender';
          }

          originalClient.updated_at = new Date().toISOString();
          challengedClient.updated_at = new Date().toISOString();
          localStorage.setItem('aspire88_clients', JSON.stringify(clientsArr));

          // Cancel open appointments for losing client if applicable
          if (losingClientId) {
            try {
              const apptCache = localStorage.getItem('aspire88_appointments');
              let apptArr: Appointment[] = apptCache ? JSON.parse(apptCache) : [];
              apptArr = apptArr.map(appt => {
                if (appt.client_id === losingClientId && appt.status === 'Open') {
                  return {
                    ...appt,
                    status: 'Cancelled',
                    notes: (appt.notes ? `${appt.notes} - ` : '') + cancelNotes,
                    updated_at: new Date().toISOString()
                  };
                }
                return appt;
              });
              localStorage.setItem('aspire88_appointments', JSON.stringify(apptArr));
            } catch (apptErr) {}
          }

          // Send emails to Agent A (original) and Agent B (challenger)
          try {
            const profilesCache = localStorage.getItem('aspire88_profiles');
            const profilesArr: Profile[] = profilesCache ? JSON.parse(profilesCache) : [];
            const agentA = profilesArr.find(p => p.id === conflict.original_encoder_id);
            const agentB = profilesArr.find(p => p.id === conflict.challenging_encoder_id);

            const clientName = `${challengedClient.first_name} ${challengedClient.last_name}`;

            if (agentA && agentA.email) {
              sendEmail(agentA.email, `[Official Notice] Claim Conflict Settlement Decree: ${clientName}`, `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #334155; line-height: 1.6; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                  <!-- Brand Header -->
                  <div style="border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; text-align: left;">
                    <h2 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 800; letter-spacing: -0.025em;">ASPIRE88 ESTATES CORPORATION INTEGRATED ENTERPRISE SYSTEM</h2>
                    <span style="font-size: 11px; color: #4f46e5; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">Integrated Enterprise System</span>
                  </div>

                  <!-- Main Content -->
                  <p style="margin-top: 0; margin-bottom: 16px; font-size: 14px; color: #0f172a; font-weight: 600;">
                    Dear ${agentA.first_name} ${agentA.last_name},
                  </p>
                  <p style="margin-top: 0; margin-bottom: 20px; font-size: 14px; color: #475569;">
                    The administrative adjudication panel has completed its review and formally decreed a settlement regarding the duplicate client registration conflict for <strong>${clientName}</strong>.
                  </p>

                  <!-- Status Banner -->
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px; border-left: 4px solid #4f46e5;">
                    <div style="font-size: 11px; font-weight: 700; color: #4f46e5; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 6px;">
                      Official Administrative Verdict
                    </div>
                    <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 10px;">
                      ${decision}
                    </div>
                    <p style="margin: 0; font-size: 13px; color: #475569; font-style: italic;">
                      The client registry database, access controls, and active property booking privileges have been updated automatically to enforce this decree.
                    </p>
                  </div>

                  <!-- Details Table -->
                  <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background-color: #ffffff; margin-bottom: 24px;">
                    <h4 style="margin-top: 0; margin-bottom: 14px; font-size: 12px; font-weight: 700; color: #475569; letter-spacing: 0.05em; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                      Case Metadata
                    </h4>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 500; width: 35%;">Conflict ID:</td>
                        <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: 600;">${conflict.id}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Client Subject:</td>
                        <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${clientName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Your Role:</td>
                        <td style="padding: 6px 0; color: #475569; font-weight: 500;">Original Account Creator</td>
                      </tr>
                    </table>
                  </div>

                  <!-- Next Steps Guidance -->
                  <p style="font-size: 14px; color: #475569; margin-bottom: 24px;">
                    If you have any operational inquiries regarding this resolution or require assistance adjusting your active pipelines, please contact the system administrator or your supervising broker.
                  </p>

                  <!-- Footer -->
                  <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
                    <p style="margin: 0 0 4px 0;">This is an automated system-generated notice from the Aspire88 Estates Corporation Integrated Enterprise System engine.</p>
                    <p style="margin: 0;">&copy; 2026 Aspire88 Estates Corporation Integrated Enterprise System. All rights reserved.</p>
                  </div>
                </div>
              `).catch(e => console.error('Error sending email to Agent A:', e));
            }

            if (agentB && agentB.email) {
              sendEmail(agentB.email, `[Official Notice] Claim Conflict Settlement Decree: ${clientName}`, `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #334155; line-height: 1.6; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                  <!-- Brand Header -->
                  <div style="border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; text-align: left;">
                    <h2 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 800; letter-spacing: -0.025em;">ASPIRE88 ESTATES CORPORATION INTEGRATED ENTERPRISE SYSTEM</h2>
                    <span style="font-size: 11px; color: #4f46e5; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">Integrated Enterprise System</span>
                  </div>

                  <!-- Main Content -->
                  <p style="margin-top: 0; margin-bottom: 16px; font-size: 14px; color: #0f172a; font-weight: 600;">
                    Dear ${agentB.first_name} ${agentB.last_name},
                  </p>
                  <p style="margin-top: 0; margin-bottom: 20px; font-size: 14px; color: #475569;">
                    The administrative adjudication panel has completed its review and formally decreed a settlement regarding the duplicate client registration conflict for <strong>${clientName}</strong>.
                  </p>

                  <!-- Status Banner -->
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px; border-left: 4px solid #10b981;">
                    <div style="font-size: 11px; font-weight: 700; color: #10b981; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 6px;">
                      Official Administrative Verdict
                    </div>
                    <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 10px;">
                      ${decision}
                    </div>
                    <p style="margin: 0; font-size: 13px; color: #475569; font-style: italic;">
                      The client registry database, access controls, and active property booking privileges have been updated automatically to enforce this decree.
                    </p>
                  </div>

                  <!-- Details Table -->
                  <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background-color: #ffffff; margin-bottom: 24px;">
                    <h4 style="margin-top: 0; margin-bottom: 14px; font-size: 12px; font-weight: 700; color: #475569; letter-spacing: 0.05em; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                      Case Metadata
                    </h4>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 500; width: 35%;">Conflict ID:</td>
                        <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: 600;">${conflict.id}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Client Subject:</td>
                        <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${clientName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Your Role:</td>
                        <td style="padding: 6px 0; color: #475569; font-weight: 500;">Challenging Account Creator</td>
                      </tr>
                    </table>
                  </div>

                  <!-- Next Steps Guidance -->
                  <p style="font-size: 14px; color: #475569; margin-bottom: 24px;">
                    If you have any operational inquiries regarding this resolution or require assistance adjusting your active pipelines, please contact the system administrator or your supervising broker.
                  </p>

                  <!-- Footer -->
                  <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
                    <p style="margin: 0 0 4px 0;">This is an automated system-generated notice from the Aspire88 Estates Corporation Integrated Enterprise System engine.</p>
                    <p style="margin: 0;">&copy; 2026 Aspire88 Estates Corporation Integrated Enterprise System. All rights reserved.</p>
                  </div>
                </div>
              `).catch(e => console.error('Error sending email to Agent B:', e));
            }
          } catch (emailErr) {
            console.error('Failed to process resolution emails:', emailErr);
          }
        }
      }
    } catch (cacheErr) {}

    // Record system audit log
    this.addAuditLog(resolverProfileId, `Resolved client conflict ${conflictId} via decision: ${decision}`, conflictId);

    // Synchronize to Supabase directly
    try {
      const conflictCache = localStorage.getItem('aspire88_duplicate_conflicts');
      let conflictArr: DuplicateConflict[] = conflictCache ? JSON.parse(conflictCache) : [];
      const conflict = conflictArr.find(c => c.id === conflictId);
      if (conflict) {
        const updateObj: any = {
          status: 'Resolved',
          resolved_by: resolverProfileId,
          resolved_at: new Date().toISOString()
        };

        const resUpdate1 = await supabase
          .from('duplicate_conflicts')
          .update({
            ...updateObj,
            resolution: decision
          })
          .eq('id', conflictId);

        if (resUpdate1.error && (resUpdate1.error.message.includes('column') || resUpdate1.error.code === '42703')) {
          await supabase
            .from('duplicate_conflicts')
            .update({
              ...updateObj,
              resolution_decision: decision
            })
            .eq('id', conflictId);
        }

        const clientsCache = localStorage.getItem('aspire88_clients');
        let clientsArr: Client[] = clientsCache ? JSON.parse(clientsCache) : [];
        const originalClient = clientsArr.find(c => c.id === conflict.original_client_id);
        const challengedClient = clientsArr.find(c => c.id === conflict.challenged_client_id);

        const resilientUpdateClient = async (c: Client) => {
          const baseUpdate: any = {
            is_deleted: c.is_deleted,
            updated_at: c.updated_at
          };
          
          const resC1 = await supabase
            .from('clients')
            .update({ ...baseUpdate, "duplicateStatus": c.duplicateStatus })
            .eq('id', c.id);

          if (resC1.error && (resC1.error.message.includes('column') || resC1.error.code === '42703')) {
            const resC2 = await supabase
              .from('clients')
              .update({ ...baseUpdate, duplicate_status: c.duplicateStatus })
              .eq('id', c.id);

            if (resC2.error && (resC2.error.message.includes('column') || resC2.error.code === '42703')) {
              const resC3 = await supabase
                .from('clients')
                .update({ ...baseUpdate, duplicatestatus: c.duplicateStatus })
                .eq('id', c.id);

              if (resC3.error && (resC3.error.message.includes('column') || resC3.error.code === '42703')) {
                // Update without any duplicateStatus column
                await supabase
                  .from('clients')
                  .update(baseUpdate)
                  .eq('id', c.id);
              }
            }
          }
        };

        if (originalClient) {
          await resilientUpdateClient(originalClient);
        }

        if (challengedClient) {
          await resilientUpdateClient(challengedClient);
        }

        // Synchronize appointment cancellation if applicable
        if (decision === 'Marked Duplicate' || decision === 'Surrendered Claim') {
          await supabase
            .from('appointments')
            .update({
              status: 'Cancelled',
              notes: decision === 'Marked Duplicate' ? 'Cancelled due to Original Winner' : 'Cancelled due to Surrender',
              updated_at: new Date().toISOString()
            })
            .eq('client_id', conflict.challenged_client_id)
            .eq('status', 'Open');
        } else if (decision === 'Awarded To Challenger') {
          await supabase
            .from('appointments')
            .update({
              status: 'Cancelled',
              notes: 'Awarded to Challenger',
              updated_at: new Date().toISOString()
            })
            .eq('client_id', conflict.original_client_id)
            .eq('status', 'Open');
        }
      }
    } catch (e: any) {
      this.addLog(`Supabase update error: ${e.message || e}. Handled locally.`);
    }
  }

  // --- Appointments Support ---
  public async getAppointments(): Promise<Appointment[]> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      try {
        localStorage.setItem('aspire88_appointments', JSON.stringify(data));
      } catch (cacheErr) {}
      return data as Appointment[];
    } catch (e: any) {
      this.addLog(`Supabase fetch appointments warning: ${e.message || e}. Using local storage fallback.`);
      const cached = localStorage.getItem('aspire88_appointments');
      return cached ? JSON.parse(cached) : INITIAL_APPOINTMENTS;
    }
  }

  public async saveAppointment(appt: Appointment): Promise<Appointment> {
    this.addLog(`Saving appointment ${appt.id}...`);
    try {
      const cached = localStorage.getItem('aspire88_appointments');
      let arr: Appointment[] = cached ? JSON.parse(cached) : INITIAL_APPOINTMENTS;
      const index = arr.findIndex(a => a.id === appt.id);
      if (index >= 0) {
        arr[index] = appt;
      } else {
        arr.push(appt);
      }
      localStorage.setItem('aspire88_appointments', JSON.stringify(arr));
    } catch (cacheErr) {}

    // Record system audit log
    this.addAuditLog(appt.agent_id, `Saved/Scheduled Appointment of type ${appt.appointment_type} (Status: ${appt.status})`, appt.id);

    try {
      const { data, error } = await supabase
        .from('appointments')
        .upsert(appt)
        .select()
        .single();
      if (error) throw error;
      this.addLog(`Appointment ${appt.id} successfully synchronized with Supabase.`);
      return data as Appointment;
    } catch (e: any) {
      this.addLog(`Supabase save appointment error: ${e.message || e}. Saved locally.`);
      return appt;
    }
  }

  public async addAuditLog(userId: string, action: string, affectedRecordId?: string): Promise<void> {
    const logId = generateAlphaId('LOG-');
    const newLog: AuditLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      user_id: userId || 'SYSTEM',
      action: action,
      affected_record_id: affectedRecordId || ''
    };

    // Save to localStorage
    try {
      const cached = localStorage.getItem('aspire88_audit_logs');
      const arr: AuditLog[] = cached ? JSON.parse(cached) : INITIAL_AUDIT_LOGS;
      arr.unshift(newLog); // newer first
      localStorage.setItem('aspire88_audit_logs', JSON.stringify(arr));
      this.addLog(`Audit log appended: ${action}`);
    } catch (e) {}

    // Save to Supabase (optional, non-blocking check)
    try {
      await supabase.from('audit_logs').insert([newLog]);
    } catch (e) {}
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      try {
        localStorage.setItem('aspire88_audit_logs', JSON.stringify(data));
      } catch (cacheErr) {}
      return data as AuditLog[];
    } catch (e: any) {
      const cached = localStorage.getItem('aspire88_audit_logs');
      return cached ? JSON.parse(cached) : INITIAL_AUDIT_LOGS;
    }
  }

  // Compatibility methods for removing Toggle buttons gracefully
  public setDatabaseMode(supabaseMode: boolean) {
    this.addLog(`Database shifted based on AppProperties.useTestDatabase.`);
  }

  public getDatabaseMode(): boolean {
    return !AppProperties.useTestDatabase;
  }
}

export const db = new ERPDatabase();
export { INITIAL_PROFILES };
