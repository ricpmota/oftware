export interface PatientData {
  id: string;
  name: string;
  birthDate: string;
  age: number;
  gender: 'male' | 'female' | 'other' | '';
  usesGlasses: boolean;
  phone?: string;
  email?: string;
  arMeasurements: {
    od: Array<{ s: number; c: number; e: number }>;
    oe: Array<{ s: number; c: number; e: number }>;
  };
  symptoms: string[];
  knownDiagnoses: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalResult {
  averageMeasurements: {
    od: { s: number; c: number; e: number };
    oe: { s: number; c: number; e: number };
  };
  variability: {
    od: { s: number; c: number; e: number };
    oe: { s: number; c: number; e: number };
  };
  stability: {
    od: boolean;
    oe: boolean;
  };
  ametropiaType: {
    od: string;
    oe: string;
  };
  pathologyPattern: string[];
  subjectiveTestStart: {
    od: { s: number; c: number; e: number };
    oe: { s: number; c: number; e: number };
  };
  clinicalSteps: string[];
  clinicalSuggestions: string[];
  subjectivePath: {
    od: {
      start: string;
      path: string[];
      maxAdjustment?: string;
    };
    oe: {
      start: string;
      path: string[];
      maxAdjustment?: string;
    };
    recommendations: string[];
    specialConsiderations: string[];
  };
}

export interface FinalPrescriptionData {
  finalPrescription: {
    od: { s: number; c: number; e: number; av: string };
    oe: { s: number; c: number; e: number; av: string };
  };
  nearPrescription: {
    od: { s: number; c: number; e: number; av: string };
    oe: { s: number; c: number; e: number; av: string };
  };
  nearAcuity: {
    od: string;
    oe: string;
  };
  suggestedLensType: string;
  subjectiveImprovement: boolean;
  addition: number;
  prescriptionDate: string;
} 