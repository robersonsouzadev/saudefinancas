export interface StoredObjectRef {
  storageKey: string;
  storageDriver: string;
  fileSizeBytes: number;
}

export interface IPrivateObjectStorage {
  putObject(key: string, buffer: Buffer): Promise<StoredObjectRef>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  reconcileOrphans(knownKeys: Set<string>): Promise<string[]>;
}
