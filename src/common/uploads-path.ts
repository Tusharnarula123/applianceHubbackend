import * as fs from 'fs';
import * as path from 'path';

/** Absolute directory for uploaded PDFs/images (same as Express static /uploads/) */
export function getUploadsDir(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
  }
  return path.resolve(process.cwd(), 'uploads');
}

/** Map DB file_url (/uploads/uuid.pdf) to absolute path on disk */
export function resolveDocumentFilePath(fileUrl: string): string {
  return path.join(getUploadsDir(), path.basename(fileUrl));
}

export function documentFileExists(fileUrl: string): boolean {
  try {
    return fs.existsSync(resolveDocumentFilePath(fileUrl));
  } catch {
    return false;
  }
}
