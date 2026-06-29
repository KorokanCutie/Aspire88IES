/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  UserProfile, 
  Developer, 
  Project, 
  Client, 
  DuplicateConflict, 
  Appointment,
  UserRole,
  AppointmentType,
  AppointmentStatus,
  ConflictStatus,
  DuplicateStatus
} from './types';

// Helper to generate unique ID with strict formatting
// Format: PREFIX-4Letters4Numbers (e.g., BR-ABCD1234)
export function generateUniqueId(prefix: string): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  let randLetters = '';
  let randDigits = '';
  for (let i = 0; i < 4; i++) {
    randLetters += letters.charAt(Math.floor(Math.random() * letters.length));
    randDigits += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return `${prefix}-${randLetters}${randDigits}`;
}

// Simple cryptographically secure imitation hash or mock SHA256 helper
export function encryptPassword(password: string): string {
  // In real production this matches bcrypt or SHA-256 with salt.
  // We'll use a clean representation that looks like a salted hash
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `$2b$10$C82D7kLqS73v7gE2fIuEpeF1SjD/${Math.abs(hash).toString(16)}`;
}

// Generate an 8-character secure random temporary password
export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
  let tempPass = '';
  for (let i = 0; i < 8; i++) {
    tempPass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return tempPass;
}

// Seed Data
const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: 'AD-AAAA1000',
    firstName: 'System',
    lastName: 'Administrator',
    middleName: 'Main',
    address: 'Aspire88 Estates Headquarters, Metro Manila, Philippines',
    birthday: '1990-01-01',
    contactNumber: '+639171234567',
    email: 'nari.casama.developer@gmail.com', // Seeded with user email
    role: 'Admin',
    isActive: true,
    isTemporaryPassword: true, // Forces password change on first login
    passwordHash: encryptPassword('Admin@Aspire88'), // Standard starting password
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'BR-VALE8801',
    firstName: 'Vivian',
    lastName: 'Alexandre',
    middleName: 'Reyes',
    address: 'Greenhills, San Juan, Metro Manila',
    birthday: '1982-05-14',
    contactNumber: '+639189998822',
    email: 'vivian.broker@aspire88.com',
    role: 'Broker',
    isActive: true,
    isTemporaryPassword: false,
    passwordHash: encryptPassword('Broker@123'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'AG-MARC2201',
    firstName: 'Marcus',
    lastName: 'Castillo',
    middleName: 'Santos',
    address: 'BGC, Taguig City, Philippines',
    birthday: '1995-10-23',
    contactNumber: '+639171112233',
    email: 'marcus.agent@aspire88.com',
    role: 'Agent',
    isActive: true,
    isTemporaryPassword: false,
    passwordHash: encryptPassword('Agent@123'),
    brokerId: 'BR-VALE8801', // Agent under Vivian
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'AG-SOFI1502',
    firstName: 'Sofia',
    lastName: 'Ilagan',
    middleName: 'Cruz',
    address: 'Ortigas Center, Pasig City',
    birthday: '1997-02-15',
    contactNumber: '+639158883344',
    email: 'sofia.agent@aspire88.com',
    role: 'Agent',
    isActive: true,
    isTemporaryPassword: false,
    passwordHash: encryptPassword('Agent@123'),
    brokerId: 'BR-VALE8801', // Agent under Vivian
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TR-LUCA9901',
    firstName: 'Lucas',
    lastName: 'Perez',
    middleName: 'Gomez',
    address: 'Quezon City, Metro Manila',
    birthday: '1988-12-01',
    contactNumber: '+639207775566',
    email: 'lucas.treasurer@aspire88.com',
    role: 'Treasurer',
    isActive: true,
    isTemporaryPassword: false,
    passwordHash: encryptPassword('Treasurer@123'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const DEFAULT_DEVELOPERS: Developer[] = [
  {
    id: 'DEV-AYAL2021',
    name: 'Ayala Land Premier',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'DEV-MEGA2022',
    name: 'Megaworld Corporation',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'DEV-SMDC2023',
    name: 'SM Development Corp (SMDC)',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'PRJ-SUIT4001',
    developerId: 'DEV-AYAL2021',
    name: 'The Suites BGC',
    address: 'One Bonifacio High Street, 28th Street, Bonifacio Global City, Taguig, Metro Manila',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRJ-UPTO4002',
    developerId: 'DEV-MEGA2022',
    name: 'Uptown Parksuites',
    address: 'Uptown Bonifacio, 9th Avenue, Taguig, Metro Manila',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRJ-SAIL4003',
    developerId: 'DEV-SMDC2023',
    name: 'Sail Residences',
    address: 'Mall of Asia Complex, Pasay City, Metro Manila',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const DEFAULT_CLIENTS: Client[] = [
  {
    id: 'CL-JOHN3001',
    firstName: 'John',
    lastName: 'Doe',
    middleName: 'William',
    contactNumber: '+639179991111',
    address: 'Makati City, Metro Manila',
    createdBy: 'AG-MARC2201', // Created by Marcus Castillo (Agent)
    isActive: true,
    conflictStatus: 'None',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'CL-MARI3002',
    firstName: 'Maria',
    lastName: 'Santos',
    middleName: 'Del',
    contactNumber: '+639204445555',
    address: 'Quezon City, Metro Manila',
    createdBy: 'AG-SOFI1502', // Created by Sofia Ilagan (Agent)
    isActive: true,
    conflictStatus: 'None',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const DEFAULT_CONFLICTS: DuplicateConflict[] = [];

const DEFAULT_APPOINTMENTS: Appointment[] = [
  {
    id: 'APT-SITV5001',
    clientId: 'CL-JOHN3001',
    agentId: 'AG-MARC2201',
    type: 'Site Visit',
    projectId: 'PRJ-SUIT4001',
    status: 'Open',
    datetime: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'APT-MEET5002',
    clientId: 'CL-MARI3002',
    agentId: 'AG-SOFI1502',
    type: 'Meeting',
    status: 'Open',
    datetime: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// Database state container (LocalStorage synced)
class DatabaseEngine {
  private profiles: UserProfile[] = [];
  private developers: Developer[] = [];
  private projects: Project[] = [];
  private clients: Client[] = [];
  private conflicts: DuplicateConflict[] = [];
  private appointments: Appointment[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedProfiles = localStorage.getItem('aspire_profiles');
      const storedDevelopers = localStorage.getItem('aspire_developers');
      const storedProjects = localStorage.getItem('aspire_projects');
      const storedClients = localStorage.getItem('aspire_clients');
      const storedConflicts = localStorage.getItem('aspire_conflicts');
      const storedAppointments = localStorage.getItem('aspire_appointments');

      if (storedProfiles) this.profiles = JSON.parse(storedProfiles);
      else {
        this.profiles = DEFAULT_PROFILES;
        this.saveProfiles();
      }

      if (storedDevelopers) this.developers = JSON.parse(storedDevelopers);
      else {
        this.developers = DEFAULT_DEVELOPERS;
        this.saveDevelopers();
      }

      if (storedProjects) this.projects = JSON.parse(storedProjects);
      else {
        this.projects = DEFAULT_PROJECTS;
        this.saveProjects();
      }

      if (storedClients) this.clients = JSON.parse(storedClients);
      else {
        this.clients = DEFAULT_CLIENTS;
        this.saveClients();
      }

      if (storedConflicts) this.conflicts = JSON.parse(storedConflicts);
      else {
        this.conflicts = DEFAULT_CONFLICTS;
        this.saveConflicts();
      }

      if (storedAppointments) this.appointments = JSON.parse(storedAppointments);
      else {
        this.appointments = DEFAULT_APPOINTMENTS;
        this.saveAppointments();
      }
    } catch (e) {
      console.error("Error loading database engine", e);
      // Fallback
      this.profiles = DEFAULT_PROFILES;
      this.developers = DEFAULT_DEVELOPERS;
      this.projects = DEFAULT_PROJECTS;
      this.clients = DEFAULT_CLIENTS;
      this.conflicts = DEFAULT_CONFLICTS;
      this.appointments = DEFAULT_APPOINTMENTS;
    }
  }

  // Persistence triggers
  private saveProfiles() { localStorage.setItem('aspire_profiles', JSON.stringify(this.profiles)); }
  private saveDevelopers() { localStorage.setItem('aspire_developers', JSON.stringify(this.developers)); }
  private saveProjects() { localStorage.setItem('aspire_projects', JSON.stringify(this.projects)); }
  private saveClients() { localStorage.setItem('aspire_clients', JSON.stringify(this.clients)); }
  private saveConflicts() { localStorage.setItem('aspire_conflicts', JSON.stringify(this.conflicts)); }
  private saveAppointments() { localStorage.setItem('aspire_appointments', JSON.stringify(this.appointments)); }

  // PROFILE OPERATIONS
  public getProfiles(): UserProfile[] { return this.profiles; }
  
  public addProfile(profileData: Omit<UserProfile, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>): UserProfile {
    const prefix = 
      profileData.role === 'Admin' ? 'AD' : 
      profileData.role === 'Broker' ? 'BR' : 
      profileData.role === 'Agent' ? 'AG' : 'TR';
    
    const id = generateUniqueId(prefix);
    const newProfile: UserProfile = {
      ...profileData,
      id,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.profiles.push(newProfile);
    this.saveProfiles();
    return newProfile;
  }

  public updateProfile(id: string, updatedData: Partial<UserProfile>): UserProfile {
    const idx = this.profiles.findIndex(p => p.id === id);
    if (idx === -1) throw new Error("Profile not found");
    const current = this.profiles[idx];
    const updated = {
      ...current,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    this.profiles[idx] = updated;
    this.saveProfiles();
    return updated;
  }

  // DEVELOPER OPERATIONS
  public getDevelopers(): Developer[] { return this.developers; }
  public addDeveloper(name: string): Developer {
    const id = generateUniqueId('DEV');
    const newDev: Developer = {
      id,
      name,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.developers.push(newDev);
    this.saveDevelopers();
    return newDev;
  }
  public updateDeveloper(id: string, name: string, isActive: boolean): Developer {
    const idx = this.developers.findIndex(d => d.id === id);
    if (idx === -1) throw new Error("Developer not found");
    this.developers[idx].name = name;
    this.developers[idx].isActive = isActive;
    this.developers[idx].updatedAt = new Date().toISOString();
    this.saveDevelopers();
    return this.developers[idx];
  }

  // PROJECT OPERATIONS
  public getProjects(): Project[] { return this.projects; }
  public addProject(developerId: string, name: string, address: string): Project {
    const id = generateUniqueId('PRJ');
    const newProject: Project = {
      id,
      developerId,
      name,
      address,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.projects.push(newProject);
    this.saveProjects();
    return newProject;
  }
  public updateProject(id: string, data: Partial<Project>): Project {
    const idx = this.projects.findIndex(p => p.id === id);
    if (idx === -1) throw new Error("Project not found");
    this.projects[idx] = {
      ...this.projects[idx],
      ...data,
      updatedAt: new Date().toISOString()
    };
    this.saveProjects();
    return this.projects[idx];
  }

  // CLIENT OPERATIONS
  public getClients(): Client[] { return this.clients; }
  
  // Duplicate client detection algorithm
  // Checks first name, last name, middle name, and contact number.
  // If matched, flags duplicate conflict.
  public addClient(clientData: Omit<Client, 'id' | 'isActive' | 'conflictStatus' | 'createdAt' | 'updatedAt'>): { client: Client; duplicateConflict?: DuplicateConflict } {
    const id = generateUniqueId('CL');
    
    // Check for exact duplicate criteria:
    // Standard duplicate matching: Last Name + First Name + Middle Name OR matching contact number
    const normalizedName = (c: Client) => 
      `${c.lastName.trim().toLowerCase()}_${c.firstName.trim().toLowerCase()}_${(c.middleName || '').trim().toLowerCase()}`;
    const newNameKey = `${clientData.lastName.trim().toLowerCase()}_${clientData.firstName.trim().toLowerCase()}_${(clientData.middleName || '').trim().toLowerCase()}`;
    const newContact = clientData.contactNumber.trim().replace(/\s+/g, '');

    const existingMatch = this.clients.find(c => 
      c.isActive && 
      (normalizedName(c) === newNameKey || c.contactNumber.trim().replace(/\s+/g, '') === newContact)
    );

    let conflictStatus: ConflictStatus = 'None';
    let newConflict: DuplicateConflict | undefined;

    if (existingMatch) {
      conflictStatus = 'Pending';
      // Put existingMatch conflictStatus to Pending as well
      existingMatch.conflictStatus = 'Pending';
      existingMatch.updatedAt = new Date().toISOString();
      
      const dupId = generateUniqueId('DUP');
      newConflict = {
        id: dupId,
        originalClientId: existingMatch.id,
        originalAgentId: existingMatch.createdBy,
        challengingClientId: id,
        challengingAgentId: clientData.createdBy,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };
      this.conflicts.push(newConflict);
    }

    const newClient: Client = {
      ...clientData,
      id,
      isActive: true,
      conflictStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.clients.push(newClient);
    this.saveClients();
    if (newConflict) {
      this.saveConflicts();
    }
    
    return { client: newClient, duplicateConflict: newConflict };
  }

  public updateClient(id: string, updatedData: Partial<Client>): Client {
    const idx = this.clients.findIndex(c => c.id === id);
    if (idx === -1) throw new Error("Client not found");
    
    // Cannot edit client if it has duplicate conflict unless resolving
    const current = this.clients[idx];
    if (current.conflictStatus === 'Pending' && !updatedData.conflictStatus) {
      throw new Error("Client profile cannot be edited due to duplicate conflict. Admin or Broker must decide first.");
    }

    this.clients[idx] = {
      ...current,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    this.saveClients();
    return this.clients[idx];
  }

  // DUPLICATE CONFLICT RESOLUTION
  public getConflicts(): DuplicateConflict[] { return this.conflicts; }

  public resolveConflict(conflictId: string, action: 'FalsePositive' | 'Duplicate' | 'ChangeOwnership', resolverId: string): void {
    const conflictIdx = this.conflicts.findIndex(c => c.id === conflictId);
    if (conflictIdx === -1) throw new Error("Conflict not found");
    const conflict = this.conflicts[conflictIdx];

    const originalClient = this.clients.find(c => c.id === conflict.originalClientId);
    const challengingClient = this.clients.find(c => c.id === conflict.challengingClientId);

    if (!originalClient || !challengingClient) throw new Error("Involved client records are missing");

    if (action === 'FalsePositive') {
      conflict.status = 'Resolved_FalsePositive';
      originalClient.conflictStatus = 'Resolved_FalsePositive';
      challengingClient.conflictStatus = 'Resolved_FalsePositive';
    } 
    else if (action === 'Duplicate') {
      conflict.status = 'Resolved_Duplicate';
      originalClient.conflictStatus = 'Resolved_Duplicate';
      challengingClient.conflictStatus = 'Resolved_Duplicate';
      challengingClient.originalClientId = originalClient.id;

      // Duplicate - retains access to original agent. Recording remains to losing agent but cannot do anything
      // All open appointments for challenging agent (losing agent) will automatically be updated to Cancelled
      this.cancelOpenAppointments(challengingClient.id, conflict.challengingAgentId);
    } 
    else if (action === 'ChangeOwnership') {
      conflict.status = 'Resolved_ChangeOwnership';
      // Change ownership gives all access to the challenging agent.
      // Record remains with losing agent (original) but cannot do anything
      originalClient.conflictStatus = 'Resolved_ChangeOwnership';
      challengingClient.conflictStatus = 'Resolved_ChangeOwnership';
      originalClient.originalClientId = challengingClient.id;

      // Cancel open appointments for losing agent (original agent)
      this.cancelOpenAppointments(originalClient.id, conflict.originalAgentId);
    }

    conflict.resolvedBy = resolverId;
    conflict.resolvedAt = new Date().toISOString();

    originalClient.updatedAt = new Date().toISOString();
    challengingClient.updatedAt = new Date().toISOString();

    this.saveConflicts();
    this.saveClients();
    this.saveAppointments();
  }

  // Surrender Claim by Agent/Broker in a duplicate conflict
  public surrenderClaim(conflictId: string, surrenderingAgentId: string): void {
    const conflictIdx = this.conflicts.findIndex(c => c.id === conflictId);
    if (conflictIdx === -1) throw new Error("Conflict not found");
    const conflict = this.conflicts[conflictIdx];

    const originalClient = this.clients.find(c => c.id === conflict.originalClientId);
    const challengingClient = this.clients.find(c => c.id === conflict.challengingClientId);

    if (!originalClient || !challengingClient) throw new Error("Involved client records are missing");

    if (conflict.originalAgentId === surrenderingAgentId) {
      // Original surrenders
      conflict.status = 'Surrendered_Original';
      originalClient.conflictStatus = 'Surrendered';
      challengingClient.conflictStatus = 'Resolved_ChangeOwnership'; // Challenger gets access
      this.cancelOpenAppointments(originalClient.id, conflict.originalAgentId);
    } else if (conflict.challengingAgentId === surrenderingAgentId) {
      // Challenger surrenders
      conflict.status = 'Surrendered_Challenger';
      challengingClient.conflictStatus = 'Surrendered';
      originalClient.conflictStatus = 'Resolved_Duplicate'; // Original retains
      this.cancelOpenAppointments(challengingClient.id, conflict.challengingAgentId);
    } else {
      throw new Error("You are not part of this conflict");
    }

    originalClient.updatedAt = new Date().toISOString();
    challengingClient.updatedAt = new Date().toISOString();

    this.saveConflicts();
    this.saveClients();
    this.saveAppointments();
  }

  private cancelOpenAppointments(clientId: string, agentId: string) {
    this.appointments = this.appointments.map(apt => {
      if (apt.clientId === clientId && apt.agentId === agentId && apt.status === 'Open') {
        return {
          ...apt,
          status: 'Cancelled',
          updatedAt: new Date().toISOString()
        };
      }
      return apt;
    });
  }

  // APPOINTMENT OPERATIONS
  public getAppointments(): Appointment[] { return this.appointments; }
  
  public addAppointment(aptData: Omit<Appointment, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Appointment {
    // Check if client has a pending duplicate conflict
    const client = this.clients.find(c => c.id === aptData.clientId);
    if (!client) throw new Error("Client not found");
    
    // Prohibited if duplicate conflict is Pending
    if (client.conflictStatus === 'Pending') {
      throw new Error("Cannot set appointments for a client with duplicate conflicts until it is resolved.");
    }

    // First user to encode can manage client, duplicate user are prohibited:
    // If conflict resolved as Duplicate, or ChangeOwnership, losing agent is prohibited.
    if (client.conflictStatus === 'Resolved_Duplicate' && client.originalClientId) {
      // Challenging client has an originalClientId, meaning they lost the dispute. Prohibited.
      if (client.createdBy === aptData.agentId) {
        throw new Error("You lost ownership of this client. You are prohibited from setting appointments.");
      }
    }
    if (client.conflictStatus === 'Resolved_ChangeOwnership' && client.originalClientId) {
      // Original client lost ownership to challenger. Original agent is prohibited.
      if (client.createdBy === aptData.agentId) {
        throw new Error("You lost ownership of this client. You are prohibited from setting appointments.");
      }
    }
    if (client.conflictStatus === 'Surrendered') {
      throw new Error("You surrendered claim to this client. You cannot set appointments.");
    }

    const id = generateUniqueId('APT');
    const newApt: Appointment = {
      ...aptData,
      id,
      status: 'Open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.appointments.push(newApt);
    this.saveAppointments();
    return newApt;
  }

  public updateAppointment(id: string, data: Partial<Appointment>): Appointment {
    const idx = this.appointments.findIndex(a => a.id === id);
    if (idx === -1) throw new Error("Appointment not found");
    const apt = this.appointments[idx];

    // Only open appointments can be edited
    if (apt.status !== 'Open' && data.status === undefined) {
      throw new Error("No action can be done if an appointment is Done or Cancelled.");
    }

    this.appointments[idx] = {
      ...apt,
      ...data,
      updatedAt: new Date().toISOString()
    };
    this.saveAppointments();
    return this.appointments[idx];
  }
}

export const db = new DatabaseEngine();
