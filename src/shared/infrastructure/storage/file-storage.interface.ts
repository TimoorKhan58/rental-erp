import type {
  DeleteResult,
  SignedUrlResult,
  StoredFile,
  UploadInput,
} from "./storage-types";

export interface IFileStorage {
  upload(input: UploadInput): Promise<StoredFile>;
  delete(key: string): Promise<DeleteResult>;
  getSignedUrl(
    key: string,
    expiresInSeconds: number,
  ): Promise<SignedUrlResult>;
}
