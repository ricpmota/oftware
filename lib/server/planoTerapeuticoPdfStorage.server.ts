import { getAdminStorageBucket } from '@/lib/server/firebaseAdminOftware';
import { publicStorageUrl } from '@/lib/signature/sandboxSignatureConstants';

export function planoTerapeuticoPdfStoragePath(pacienteId: string, orcamentoId: string): string {
  return `plano-terapeutico/${pacienteId}/${orcamentoId}.pdf`;
}

export function planoTerapeuticoPdfAssinadoStoragePath(
  pacienteId: string,
  orcamentoId: string,
  suffix: string
): string {
  return `plano-terapeutico/${pacienteId}/${orcamentoId}-assinado-${suffix}.pdf`;
}

export async function uploadPlanoTerapeuticoPdf(args: {
  pacienteId: string;
  orcamentoId: string;
  pdfBuffer: Buffer;
  assinado?: boolean;
  suffix?: string;
}): Promise<string> {
  const storagePath = args.assinado
    ? planoTerapeuticoPdfAssinadoStoragePath(
        args.pacienteId,
        args.orcamentoId,
        args.suffix ?? Date.now().toString()
      )
    : planoTerapeuticoPdfStoragePath(args.pacienteId, args.orcamentoId);

  const bucket = getAdminStorageBucket();
  const fileRef = bucket.file(storagePath);

  await fileRef.save(args.pdfBuffer, {
    metadata: {
      contentType: 'application/pdf',
      cacheControl: 'public, max-age=3600',
    },
  });

  await fileRef.makePublic();
  return publicStorageUrl(bucket.name, storagePath);
}
