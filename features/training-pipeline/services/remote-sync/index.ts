import type { PackagedBlob } from '../../models/types.js';

export interface RemoteSync {
  upload(blob: PackagedBlob): Promise<void>;
  listBlobIds(): Promise<string[]>;
  get(blobId: string): Promise<PackagedBlob | undefined>;
}

/** Memory-backed remote sync adapter used for deterministic tests. */
export class InMemoryRemoteSync implements RemoteSync {
  private readonly storage = new Map<string, PackagedBlob>();

  async upload(blob: PackagedBlob): Promise<void> {
    this.storage.set(blob.blobId, blob);
  }

  async listBlobIds(): Promise<string[]> {
    return [...this.storage.keys()];
  }

  async get(blobId: string): Promise<PackagedBlob | undefined> {
    return this.storage.get(blobId);
  }
}
