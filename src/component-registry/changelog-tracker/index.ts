import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import type { ChangelogEntry } from '../types.js';

/** Persists and queries version transition changelog entries. */
export class ChangelogTracker {
  constructor(private readonly db: Database.Database) {
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS changelog_entries (
        transitionId TEXT PRIMARY KEY,
        artifactType TEXT NOT NULL,
        artifactId TEXT NOT NULL,
        fromVersion TEXT,
        toVersion TEXT NOT NULL,
        action TEXT NOT NULL,
        triggeredBy TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        reason TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_changelog_artifact ON changelog_entries(artifactId, timestamp);
    `);
  }

  /** Appends a transition record to the changelog. */
  record(entry: Omit<ChangelogEntry, 'transitionId' | 'timestamp'> & Partial<Pick<ChangelogEntry, 'transitionId' | 'timestamp'>>): ChangelogEntry {
    const materialized: ChangelogEntry = {
      transitionId: entry.transitionId ?? randomUUID(),
      artifactType: entry.artifactType,
      artifactId: entry.artifactId,
      fromVersion: entry.fromVersion,
      toVersion: entry.toVersion,
      action: entry.action,
      triggeredBy: entry.triggeredBy,
      timestamp: entry.timestamp ?? new Date().toISOString(),
      reason: entry.reason
    };

    this.db
      .prepare(
        `INSERT INTO changelog_entries
         (transitionId, artifactType, artifactId, fromVersion, toVersion, action, triggeredBy, timestamp, reason)
         VALUES (@transitionId, @artifactType, @artifactId, @fromVersion, @toVersion, @action, @triggeredBy, @timestamp, @reason)`
      )
      .run(materialized);

    return materialized;
  }

  /** Returns changelog transitions for a single artifact id ordered by newest first. */
  queryByArtifact(artifactId: string): ChangelogEntry[] {
    return this.db
      .prepare(`SELECT * FROM changelog_entries WHERE artifactId = ? ORDER BY timestamp DESC`)
      .all(artifactId) as ChangelogEntry[];
  }
}
