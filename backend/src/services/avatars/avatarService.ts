import { nanoid } from 'nanoid';

import type { DB } from '../../db/dbClient.js';

export type StoredAvatar = {
  id: string;
  characterId: string | null;
  statusLabel: string;
  imageUrl: string;
  metadata: Record<string, unknown> | null;
  createdAt: number;
};

export class AvatarService {
  constructor(private readonly dbPromise: Promise<DB>) {}

  private async getDb() {
    return this.dbPromise;
  }

  async createAvatar(params: {
    characterId?: string;
    statusLabel: string;
    imageUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<StoredAvatar> {
    const db = await this.getDb();
    const id = nanoid();
    const createdAt = Date.now();

    if (!db) {
      return {
        id,
        characterId: params.characterId ?? null,
        statusLabel: params.statusLabel,
        imageUrl: params.imageUrl,
        metadata: params.metadata ?? null,
        createdAt
      };
    }

    await db.query(
      `INSERT INTO character_avatars (id, characterId, statusLabel, imageUrl, metadata, createdAt)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, params.characterId ?? null, params.statusLabel, params.imageUrl, JSON.stringify(params.metadata ?? null), createdAt]
    );
    return {
      id,
      characterId: params.characterId ?? null,
      statusLabel: params.statusLabel,
      imageUrl: params.imageUrl,
      metadata: params.metadata ?? null,
      createdAt
    };
  }

  async listAvatars(params?: {
    characterId?: string;
    includeGlobal?: boolean;
  }): Promise<StoredAvatar[]> {
    const db = await this.getDb();
    if (!db) return [];

    const includeGlobal = params?.includeGlobal ?? true;
    const clauses: string[] = [];
    const values: unknown[] = [];

    if (params?.characterId) {
      values.push(params.characterId);
      clauses.push(`characterId = $${values.length}`);
      if (includeGlobal) {
        clauses.push('characterId IS NULL');
      }
    } else if (!includeGlobal) {
      clauses.push('characterId IS NOT NULL');
    }

    const where = clauses.length ? `WHERE ${clauses.join(' OR ')}` : '';
    const res = await db.query<{
      id: string;
      characterid: string | null;
      statuslabel: string;
      imageurl: string;
      metadata: string | null;
      createdat: number;
    }>(
      `SELECT id, characterId, statusLabel, imageUrl, metadata, createdAt
       FROM character_avatars
       ${where}
       ORDER BY createdAt DESC`,
      values
    );

    return res.rows.map((row) => ({
      id: row.id,
      characterId: row.characterid,
      statusLabel: row.statuslabel,
      imageUrl: row.imageurl,
      metadata: deserializeMetadata(row.metadata),
      createdAt: row.createdat
    }));
  }

  async getAvatarOrThrow(id: string): Promise<StoredAvatar> {
    const db = await this.getDb();
    if (!db) {
      throw new Error('Avatar not found (DB unavailable)');
    }
    const res = await db.query<{
      id: string;
      characterid: string | null;
      statuslabel: string;
      imageurl: string;
      metadata: string | null;
      createdat: number;
    }>(
      `SELECT id, characterId, statusLabel, imageUrl, metadata, createdAt
       FROM character_avatars
       WHERE id=$1
       LIMIT 1`,
      [id]
    );

    if (!res.rows.length) {
      throw new Error('Avatar not found');
    }
    const row = res.rows[0];
    return {
      id: row.id,
      characterId: row.characterid,
      statusLabel: row.statuslabel,
      imageUrl: row.imageurl,
      metadata: deserializeMetadata(row.metadata),
      createdAt: row.createdat
    };
  }

  async findLatestAvatarByLabel(characterId: string, statusLabel: string): Promise<StoredAvatar | null> {
    const db = await this.getDb();
    if (!db) return null;

    const res = await db.query<{
      id: string;
      characterid: string | null;
      statuslabel: string;
      imageurl: string;
      metadata: string | null;
      createdat: number;
    }>(
      `SELECT id, characterId, statusLabel, imageUrl, metadata, createdAt
       FROM character_avatars
       WHERE characterId=$1 AND statusLabel=$2
       ORDER BY createdAt DESC
       LIMIT 1`,
      [characterId, statusLabel]
    );

    if (!res.rows.length) {
      return null;
    }
    const row = res.rows[0];
    return {
      id: row.id,
      characterId: row.characterid,
      statusLabel: row.statuslabel,
      imageUrl: row.imageurl,
      metadata: deserializeMetadata(row.metadata),
      createdAt: row.createdat
    };
  }

  async findLatestAvatar(characterId: string): Promise<StoredAvatar | null> {
    const db = await this.getDb();
    if (!db) return null;

    const res = await db.query<{
      id: string;
      characterid: string | null;
      statuslabel: string;
      imageurl: string;
      metadata: string | null;
      createdat: number;
    }>(
      `SELECT id, characterId, statusLabel, imageUrl, metadata, createdAt
       FROM character_avatars
       WHERE characterId=$1
       ORDER BY createdAt DESC
       LIMIT 1`,
      [characterId]
    );

    if (!res.rows.length) {
      return null;
    }
    const row = res.rows[0];
    return {
      id: row.id,
      characterId: row.characterid,
      statusLabel: row.statuslabel,
      imageUrl: row.imageurl,
      metadata: deserializeMetadata(row.metadata),
      createdAt: row.createdat
    };
  }
}

function deserializeMetadata(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return null;
}
