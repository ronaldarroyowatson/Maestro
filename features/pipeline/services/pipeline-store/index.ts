import Database from 'better-sqlite3';
import type { Pipeline } from '../../../../src/shared/index.js';

/** SQLite store for immutable pipeline version history. */
export class PipelineStore {
  private readonly db: Database.Database;

  constructor(dbPath = ':memory:') {
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pipeline_versions (
        pipelineId TEXT NOT NULL,
        version TEXT NOT NULL,
        status TEXT NOT NULL,
        serializedPipeline TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        PRIMARY KEY (pipelineId, version)
      );
      CREATE INDEX IF NOT EXISTS idx_pipeline_active ON pipeline_versions(pipelineId, status);
    `);
  }

  /** Saves a new immutable pipeline version row. */
  save(pipeline: Pipeline): void {
    this.db
      .prepare(
        `INSERT INTO pipeline_versions (pipelineId, version, status, serializedPipeline, createdAt)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(pipeline.id, pipeline.version, pipeline.status, JSON.stringify(pipeline), pipeline.createdAt.toISOString());
  }

  /** Returns currently active pipeline version. */
  getActive(pipelineId: string): Pipeline {
    const row = this.db
      .prepare(
        `SELECT serializedPipeline FROM pipeline_versions
         WHERE pipelineId = ? AND status = 'active'
         ORDER BY createdAt DESC LIMIT 1`
      )
      .get(pipelineId) as { serializedPipeline: string } | undefined;

    if (!row) {
      throw new Error(`Active pipeline not found for ${pipelineId}`);
    }

    return JSON.parse(row.serializedPipeline) as Pipeline;
  }

  /** Returns all pipeline versions ordered by createdAt asc. */
  getAll(pipelineId: string): Pipeline[] {
    const rows = this.db
      .prepare(`SELECT serializedPipeline FROM pipeline_versions WHERE pipelineId = ? ORDER BY createdAt ASC`)
      .all(pipelineId) as Array<{ serializedPipeline: string }>;

    return rows.map((row) => JSON.parse(row.serializedPipeline) as Pipeline);
  }

  /** Promotes one pipeline version as active and demotes previous active versions. */
  activate(pipelineId: string, version: string): void {
    const trx = this.db.transaction(() => {
      this.db.prepare(`UPDATE pipeline_versions SET status = 'deprecated' WHERE pipelineId = ? AND status = 'active'`).run(pipelineId);
      this.db.prepare(`UPDATE pipeline_versions SET status = 'active' WHERE pipelineId = ? AND version = ?`).run(pipelineId, version);
    });
    trx();
  }
}
