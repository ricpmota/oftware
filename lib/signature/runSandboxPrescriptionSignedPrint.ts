import {
  runPrescriptionSignedPrint,
  type RunPrescriptionSignedPrintParams,
} from '@/lib/signature/runPrescriptionSignedPrint';

/** @deprecated Use {@link runPrescriptionSignedPrint} com `providerConfig` do médico. */
export async function runSandboxPrescriptionSignedPrint(
  params: Omit<RunPrescriptionSignedPrintParams, 'providerConfig'>
): Promise<void> {
  await runPrescriptionSignedPrint({
    ...params,
    providerConfig: {
      provider: 'sandbox_mock',
      providerLabel: 'Sandbox',
      providerCategory: 'sandbox',
      status: 'connected',
    },
  });
}

export { arrayBufferToBase64 } from '@/lib/signature/requestSandboxPrescriptionSignature';
