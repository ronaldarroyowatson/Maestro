import Database from 'better-sqlite3';
import type { VersionedArtifact } from '../../shared/index.js';
import type { ArtifactType, RegistryEntry } from '../types.js';

/** SQLite-backed storage for immutable versioned artifacts. */
export class RegistryStore {
  private readonly db: Database.Database;

  constructor(dbPath = ':memory:') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS registry_entries (
        artifactId TEXT NOT NULL,
        version TEXT NOT NULL,
        contentHash TEXT NOT NULL,
        artifactType TEXT NOT NULL,
        status TEXT NOT NULL,
        serializedArtifact TEXT NOT NULL,
        registeredAt TEXT NOT NULL,
        activatedAt TEXT,
        activatedBy TEXT,
        updatedAt TEXT NOT NULL,
        PRIMARY KEY (artifactId, artifactType, version)
      );
      CREATE INDEX IF NOT EXISTS idx_registry_type ON registry_entries(artifactType);
      CREATE INDEX IF NOT EXISTS idx_registry_active ON registry_entries(artifactId, artifactType, status);
    `);
  }

  /** Registers a new immutable artifact version row. */
  register(artifact: VersionedArtifact, artifactType: ArtifactType): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO registry_entries
        (artifactId, version, contentHash, artifactType, status, serializedArtifact, registeredAt, updatedAt)
        VALUES (@artifactId, @version, @contentHash, @artifactType, @status, @serializedArtifact, @registeredAt, @updatedAt)`
      )
      .run({
        artifactId: artifact.id,
        version: artifact.version,
        contentHash: artifact.contentHash,
        artifactType,
        status: artifact.status,
        serializedArtifact: JSON.stringify(artifact),
        registeredAt: now,
        updatedAt: now
      });
  }

  /** Activates a target version and atomically deactivates peers. */
  activate(artifactId: string, artifactType: ArtifactType, version?: string, activatedBy = 'manual'): void {
    const trx = this.db.transaction(() => {
      const target = version
        ? this.db
            .prepare(
              `SELECT version FROM registry_entries WHERE artifactId = ? AND artifactType = ? AND version = ? LIMIT 1`
            )
            .get(artifactId, artifactType, version)
        : this.db
            .prepare(
              `SELECT version FROM registry_entries WHERE artifactId = ? AND artifactType = ?
               ORDER BY registeredAt DESC LIMIT 1`
            )
            .get(artifactId, artifactType);

      if (!target) {
        throw new Error(`No target version found for ${artifactType}:${artifactId}`);
      }

      const now = new Date().toISOString();
      this.db
        .prepare(
          `UPDATE registry_entries
           SET status = 'deprecated', updatedAt = ?
           WHERE artifactId = ? AND artifactType = ? AND status = 'active'`
        )
        .run(now, artifactId, artifactType);

      this.db
        .prepare(
          `UPDATE registry_entries
           SET status = 'active', activatedAt = ?, activatedBy = ?, updatedAt = ?
           WHERE artifactId = ? AND artifactType = ? AND version = ?`
        )
        .run(now, activatedBy, now, artifactId, artifactType, (target as { version: string }).version);
    });

    trx();
  }

  /** Archives all versions for an artifact bucket. */
  archive(artifactId: string, artifactType: ArtifactType): void {
    this.db
      .prepare(
        `UPDATE registry_entries
         SET status = 'archived', updatedAt = ?
         WHERE artifactId = ? AND artifactType = ?`
      )
      .run(new Date().toISOString(), artifactId, artifactType);
  }

  /** Queries all entries for a given artifact type. */
  queryByType(artifactType: ArtifactType): RegistryEntry[] {
    return this.db
      .prepare(`SELECT * FROM registry_entries WHERE artifactType = ? ORDER BY registeredAt ASC`)
      .all(artifactType) as RegistryEntry[];
  }

  /** Fetches active artifact for id and type. */
  getActive<T extends VersionedArtifact>(artifactId: string, artifactType: ArtifactType): T {
    const row = this.db
      .prepare(
        `SELECT serializedArtifact FROM registry_entries
         WHERE artifactId = ? AND artifactType = ? AND status = 'active'
         ORDER BY updatedAt DESC LIMIT 1`
      )
      .get(artifactId, artifactType) as { serializedArtifact: string } | undefined;

    if (!row) {
      throw new Error(`Active artifact not found for ${artifactType}:${artifactId}`);
    }

    return JSON.parse(row.serializedArtifact) as T;
  }

  /** Lists all immutable versions for an artifact id and type. */
  getAll<T extends VersionedArtifact>(artifactId: string, artifactType: ArtifactType): T[] {
    const rows = this.db
      .prepare(
        `SELECT serializedArtifact FROM registry_entries
         WHERE artifactId = ? AND artifactType = ? ORDER BY registeredAt ASC`
      )
      .all(artifactId, artifactType) as Array<{ serializedArtifact: string }>;

    return rows.map((row) => JSON.parse(row.serializedArtifact) as T);
  }

  /** Exposes DB handle for transactional collaborators. */
  get database(): Database.Database {
    return this.db;
  }
}
