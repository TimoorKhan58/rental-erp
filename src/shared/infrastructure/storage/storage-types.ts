export interface UploadInput {
  key: string;
  buffer: Buffer;
  mimeType: string;
  size: number;
}

export interface StoredFile {
  key: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface DeleteResult {
  key: string;
}

export interface SignedUrlResult {
  url: string;
  expiresAt: Date;
}

export type StorageKey = string;

export type SignedUrlExpirySeconds = number;
