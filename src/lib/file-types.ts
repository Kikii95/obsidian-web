// File type detection utilities

export type FileType = 'markdown' | 'image' | 'pdf' | 'canvas' | 'video' | 'code' | 'other';

const EXTENSIONS: Record<FileType, string[]> = {
  markdown: ['.md'],
  image: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'],
  pdf: ['.pdf'],
  canvas: ['.canvas'],
  video: ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'],
  code: [
    // C/C++
    '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx',
    // JavaScript/TypeScript
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    // Python
    '.py', '.pyw', '.pyx',
    // Java/Kotlin
    '.java', '.kt', '.kts',
    // Go/Rust
    '.go', '.rs',
    // C#/F#
    '.cs', '.fs',
    // Ruby/PHP/Perl
    '.rb', '.php', '.pl', '.pm',
    // Swift/Objective-C
    '.swift', '.m', '.mm',
    // Shell/Script
    '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
    // Web
    '.html', '.htm', '.css', '.scss', '.sass', '.less',
    // Config/Data
    '.json', '.yaml', '.yml', '.toml', '.xml', '.ini', '.conf',
    // SQL
    '.sql',
    // Lua/Dart
    '.lua', '.dart',
    // Makefile
    '.mk', '.cmake',
  ],
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
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.m4v': 'video/x-m4v',
  // Code files
  '.c': 'text/x-c',
  '.cpp': 'text/x-c++',
  '.h': 'text/x-c',
  '.hpp': 'text/x-c++',
  '.js': 'text/javascript',
  '.jsx': 'text/javascript',
  '.ts': 'text/typescript',
  '.tsx': 'text/typescript',
  '.py': 'text/x-python',
  '.java': 'text/x-java',
  '.go': 'text/x-go',
  '.rs': 'text/x-rust',
  '.cs': 'text/x-csharp',
  '.rb': 'text/x-ruby',
  '.php': 'text/x-php',
  '.swift': 'text/x-swift',
  '.sh': 'text/x-shellscript',
  '.html': 'text/html',
  '.css': 'text/css',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.xml': 'text/xml',
  '.sql': 'text/x-sql',
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
  return type === 'image' || type === 'pdf' || type === 'video';
}

export function getFileIcon(filename: string): string {
  const type = getFileType(filename);
  switch (type) {
    case 'markdown': return 'file-text';
    case 'image': return 'image';
    case 'pdf': return 'file-text';
    case 'canvas': return 'layout-dashboard';
    case 'video': return 'film';
    case 'code': return 'file-code';
    default: return 'file';
  }
}
