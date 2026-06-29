export type UserRole = 'Admin' | 'Broker' | 'Agent' | 'Treasurer';

export interface Profile {
  id: string; // AD-XXXX1111, BR-XXXX1111, etc.
  user_id?: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  address?: string;
  prc_license?: string;
  birthdate?: string;
  contact_number?: string;
  role: UserRole;
  parent_broker_id?: string | null;
  is_active: boolean;
  is_temporary: boolean;
  temp_password?: string;
  password?: string;
  created_at: string;
  updated_at: string;
}

export interface Developer {
  id: string; // DEV-XXXX1111
  name: string;
  contact_person?: string;
  contact_email?: string;
  contact_number?: string;
  office_address?: string;
  status: 'Active' | 'Inactive';
  created_at: string;
}

export interface Project {
  id: string; // PRJ-XXXX1111
  developer_id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  status: 'Active' | 'Sold Out' | 'Inactive';
  created_at: string;
}

export interface Client {
  id: string; // CL-XXXX1111
  first_name: string;
  last_name: string;
  middle_name?: string;
  contact_number: string;
  address: string;
  notes?: string;
  facebook_link?: string;
  is_deleted?: boolean;
  is_access_lost?: boolean;
  duplicateStatus?: boolean;
  created_by: string; // profile ID representing the creator
  created_at: string;
  updated_at: string;
}

export interface DuplicateConflict {
  id: string; // DUP-XXXX1111
  original_client_id: string;
  challenged_client_id: string;
  original_encoder_id: string;
  challenging_encoder_id: string;
  status: 'Pending' | 'Resolved' | 'Dismissed';
  resolution?: 'Pending' | 'Marked False Positive' | 'Marked Duplicate' | 'Awarded To Challenger' | 'Surrendered Claim';
  resolution_decision?: 'Pending' | 'Marked False Positive' | 'Marked Duplicate' | 'Awarded To Challenger' | 'Surrendered Claim';
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export type AppointmentType = 'Site Visit' | 'Reservation' | 'Payment' | 'Meeting' | 'Submit Requirement';
export type AppointmentStatus = 'Open' | 'Done' | 'Cancelled';

export interface Appointment {
  id: string; // APT-XXXX1111
  client_id: string;
  agent_id: string;
  project_id?: string | null;
  appointment_type: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
  address?: string; // Auto-populated or manual
  appointment_time: string;
  notified1Hr?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  action: string;
  affected_record_id: string;
}

