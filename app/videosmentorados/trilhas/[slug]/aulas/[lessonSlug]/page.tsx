import MentorContentDetailClient from '@/components/mentorados/MentorContentDetailClient';

export default async function VideosMentoradosTrailLessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonSlug: string }>;
}) {
  const { slug, lessonSlug } = await params;
  return <MentorContentDetailClient slug={lessonSlug} trailSlug={slug} />;
}
