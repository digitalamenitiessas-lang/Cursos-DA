export function canPlayLesson({
  isAdmin,
  hasAccess,
  isPreview,
  courseStatus,
}: {
  isAdmin: boolean;
  hasAccess: boolean;
  isPreview: boolean;
  courseStatus: string;
}) {
  return (
    isAdmin ||
    ((courseStatus === 'published' || courseStatus === 'archived') && hasAccess) ||
    (courseStatus === 'published' && isPreview)
  );
}
export function playbackTtl(durationSeconds: number) {
  return Math.min(86400, Math.max(7200, Math.ceil(durationSeconds * 2) + 3600));
}
export function safeUploadName(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (!ext || !/^[a-z0-9]{1,8}$/.test(ext))
    throw new Error('El archivo necesita una extensión válida.');
  return ext;
}
