import MentorTrailPageClient from '@/components/mentorados/MentorTrailPageClient';

export default async function VideosMentoradosTrailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <MentorTrailPageClient slug={slug} />;
}
