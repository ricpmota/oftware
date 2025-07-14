export interface DoctorProfile {
  uid: string;
  name: string;
  crm: string;
  specialty: string;
  digitalSignature: string;
  gender?: 'male' | 'female' | 'other';
  createdAt: string;
  updatedAt: string;
}

export interface DoctorProfileFormData {
  name: string;
  crm: string;
  specialty: string;
  digitalSignature: string;
  gender?: 'male' | 'female' | 'other';
} 