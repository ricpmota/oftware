'use client';

import React, { createContext, useContext, useState } from 'react';
import { PatientData } from '../types/clinical';

// Contexto para gerenciar o paciente atual
interface PatientContextType {
  currentPatient: PatientData | null;
  setCurrentPatient: (patient: PatientData | null) => void;
  isPatientInEdit: boolean;
  setIsPatientInEdit: (inEdit: boolean) => void;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const usePatientContext = () => {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatientContext must be used within a PatientProvider');
  }
  return context;
};

interface PatientProviderProps {
  children: React.ReactNode;
}

export const PatientProvider: React.FC<PatientProviderProps> = ({ children }) => {
  const [currentPatient, setCurrentPatient] = useState<PatientData | null>(null);
  const [isPatientInEdit, setIsPatientInEdit] = useState(false);

  return (
    <PatientContext.Provider value={{
      currentPatient,
      setCurrentPatient,
      isPatientInEdit,
      setIsPatientInEdit
    }}>
      {children}
    </PatientContext.Provider>
  );
}; 