import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type UserRole = 'donor' | 'hospital_admin' | 'admin';

export type Profile = {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  phone: string;
  blood_group: string | null;
  date_of_birth: string | null;
  address: string;
  city: string;
  is_verified: boolean;
  created_at: string;
  completed_donations: number;
  total_units_donated: number;
  reward_points: number;
  donor_level: string;
};

export type Hospital = {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  managed_by: string | null;
  is_approved: boolean;
  created_at: string;
};

export type BloodInventory = {
  id: string;
  hospital_id: string;
  blood_group: string;
  units_available: number;
  updated_at: string;
};

export type Appointment = {
  id: string;
  donor_id: string;
  hospital_id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
  created_at: string;
  completed_at: string | null;
};

export type Certificate = {
  id: string;
  certificate_number: string;
  donor_id: string;
  donor_name: string;
  donor_blood_group: string | null;
  hospital_id: string;
  hospital_name: string;
  appointment_id: string;
  donation_date: string;
  units_collected: number;
  issued_at: string;
};

export type Donation = {
  id: string;
  appointment_id: string;
  donor_id: string;
  hospital_id: string;
  blood_group: string | null;
  units: number;
  donation_date: string;
  status: 'completed' | 'rejected';
  verified: boolean;
  created_at: string;
};

export type RewardRule = {
  id: string;
  donation_count: number;
  points: number;
  title: string;
  description: string;
  badge: string;
  active: boolean;
  created_at: string;
};

export type DonorReward = {
  id: string;
  donor_id: string;
  donation_id: string;
  reward_id: string | null;
  points: number;
  reward_title: string;
  created_at: string;
};

export type EmergencyRequest = {
  id: string;
  requesting_hospital_id: string;
  blood_group: string;
  units_needed: number;
  urgency: 'critical' | 'urgent' | 'moderate';
  status: 'active' | 'fulfilled' | 'closed';
  notes: string;
  created_at: string;
};

export type EmergencyCall = {
  id: string;
  emergency_request_id: string;
  hospital_id: string;
  hospital_name: string;
  hospital_phone: string;
  call_sid: string | null;
  call_status: 'pending' | 'calling' | 'initiated' | 'ringing' | 'answered' | 'completed' | 'no_answer' | 'failed';
  call_duration: number | null;
  called_at: string;
  updated_at: string;
};

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
