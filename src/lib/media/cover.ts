export const coverMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const coverFileLimit = 5 * 1024 ** 2;

export function coverContentType(name: string, type: string): string {
  if (type && type !== 'application/octet-stream') return type;
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
  };
  return types[name.split('.').pop()?.toLowerCase() || ''] || '';
}

export function coverFileError(file: { name: string; type: string; size: number }): string | null {
  if (!file.size) return 'La imagen está vacía. Elegí otra portada.';
  if (file.size > coverFileLimit)
    return 'La portada supera los 5 MB. Elegí una imagen más liviana.';
  if (!coverMimeTypes.includes(coverContentType(file.name, file.type)))
    return 'Usá una imagen JPG, PNG, WebP o AVIF.';
  return null;
}
