export type AcademicLevel =
  | 'UNDERGRADUATE'
  | 'MASTERS'
  | 'PHD'
  | 'FACULTY'
  | 'INDEPENDENT';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  academic_level: AcademicLevel;
  institution?: string;
  orcid_id?: string;
  is_staff: boolean;
  date_joined: string;
  updated_at: string;
}

export interface RegisterPayload {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirm: string;
  academic_level: AcademicLevel;
  institution?: string;
  orcid_id?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ProfileUpdatePayload {
  first_name?: string;
  last_name?: string;
  academic_level?: AcademicLevel;
  institution?: string;
  orcid_id?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}
