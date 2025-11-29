// File type detection utilities

export type FileType = 'markdown' | 'image' | 'pdf' | 'canvas' | 'other';

const EXTENSIONS: Record<FileType, string[]> = {
  markdown: ['.md'],
  image: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'],
  pdf: ['.pdf'],
  canvas: ['.canvas'],
  other: [],
};

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.canvas': 'application/json',
  '.md': 'text/markdown',
};

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.substring(lastDot).toLowerCase();
}

export function getFileType(filename: string): FileType {
  const ext = getFileExtension(filename);

  for (const [type, extensions] of Object.entries(EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return type as FileType;
    }
  }

  return 'other';
}

export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename);
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export function isViewableFile(filename: string): boolean {
  const type = getFileType(filename);
  return type !== 'other';
}

export function isBinaryFile(filename: string): boolean {
  const type = getFileType(filename);
  return type === 'image' || type === 'pdf';
}

export function getFileIcon(filename: string): string {
  const type = getFileType(filename);
  switch (type) {
    case 'markdown': return 'file-text';
    case 'image': return 'image';
    case 'pdf': return 'file-text';
    case 'canvas': return 'layout-dashboard';
    default: return 'file';
  }
}
