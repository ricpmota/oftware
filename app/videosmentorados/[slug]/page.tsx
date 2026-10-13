import MentorContentDetailClient from '@/components/mentorados/MentorContentDetailClient';

export default async function VideosMentoradosSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <MentorContentDetailClient slug={slug} />;
}
