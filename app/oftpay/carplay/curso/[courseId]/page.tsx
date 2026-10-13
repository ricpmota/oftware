import { redirect } from 'next/navigation';

export default async function OftpayCarplayCursoRedirectPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  redirect(`/carplay/curso/${courseId}`);
}
