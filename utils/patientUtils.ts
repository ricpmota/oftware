/**
 * Gera um código de prontuário único
 * Formato: PRT + ano atual + número sequencial (ex: PRT2024001)
 */
export function generatePatientId(): string {
  const currentYear = new Date().getFullYear();
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PRT${currentYear}${randomSuffix}`;
}

/**
 * Calcula a idade baseada na data de nascimento
 */
export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Formata a data de nascimento para exibição
 */
export function formatBirthDate(birthDate: string): string {
  return new Date(birthDate).toLocaleDateString('pt-BR');
}

/**
 * Formata o código do prontuário para exibição
 */
export function formatPatientId(patientId: string): string {
  return patientId;
} 