/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Admin' | 'Broker' | 'Agent' | 'Treasurer';

export interface UserProfile {
  id: string; // Format: AD-XXXX1234, BR-XXXX1234, AG-XXXX1234, TR-XXXX1234
  firstName: string;
  lastName: string;
  middleName?: string;
  address: string;
  birthday: string; // YYYY-MM-DD
  contactNumber: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  isTemporaryPassword: boolean;
  passwordHash: string; // Mock salted hash or encrypted password
  brokerId?: string; // For Agent: who is their Broker?
  createdAt: string;
  updatedAt: string;
}

export interface Developer {
  id: string; // Format: DEV-XXXX1234
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string; // Format: PRJ-XXXX1234
  developerId: string;
  name: string;
  address: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ConflictStatus = 
  | 'None' 
  | 'Pending' 
  | 'Resolved_Duplicate' 
  | 'Resolved_FalsePositive' 
  | 'Resolved_ChangeOwnership' 
  | 'Surrendered';

export interface Client {
  id: string; // Format: CL-XXXX1234
  firstName: string;
  lastName: string;
  middleName?: string;
  contactNumber: string;
  address: string;
  createdBy: string; // User ID of creator
  isActive: boolean; // For soft-deletion
  conflictStatus: ConflictStatus;
  originalClientId?: string; // Reference to original client in case of resolution
  createdAt: string;
  updatedAt: string;
}

export type DuplicateStatus = 
  | 'Pending' 
  | 'Resolved_Duplicate' 
  | 'Resolved_FalsePositive' 
  | 'Resolved_ChangeOwnership' 
  | 'Surrendered_Original' 
  | 'Surrendered_Challenger';

export interface DuplicateConflict {
  id: string; // Format: DUP-XXXX1234
  originalClientId: string;
  originalAgentId: string;
  challengingClientId: string;
  challengingAgentId: string;
  status: DuplicateStatus;
  resolvedBy?: string; // User ID
  resolvedAt?: string;
  createdAt: string;
}

export type AppointmentType = 'Site Visit' | 'Reservation' | 'Payment' | 'Meeting' | 'Submit Requirement';
export type AppointmentStatus = 'Open' | 'Done' | 'Cancelled';

export interface Appointment {
  id: string; // Format: APT-XXXX1234
  clientId: string;
  agentId: string;
  type: AppointmentType;
  projectId?: string; // Optional (Required only if type is 'Site Visit')
  status: AppointmentStatus;
  datetime: string; // ISO string
  createdAt: string;
  updatedAt: string;
}

// Log or Audit trail (optional helper for quality, not bloated)
export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
}
