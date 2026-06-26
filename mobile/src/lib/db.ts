import * as SQLite from "expo-sqlite";

import type { BestTime, Coordinate, Gate, Mode, Track, TrackType } from "@/models/track";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("raceline.db").then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS tracks (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          mode TEXT NOT NULL,
          type TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          coordinates TEXT NOT NULL,
          startGate TEXT NOT NULL,
          finishGate TEXT,
          distanceMeters REAL NOT NULL,
          thumbnailUrl TEXT
        );
        CREATE TABLE IF NOT EXISTS best_times (
          id TEXT PRIMARY KEY NOT NULL,
          trackId TEXT NOT NULL,
          durationMs INTEGER NOT NULL,
          date TEXT NOT NULL,
          splits TEXT,
          FOREIGN KEY (trackId) REFERENCES tracks (id) ON DELETE CASCADE
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

interface TrackRow {
  id: string;
  name: string;
  mode: string;
  type: string;
  createdAt: string;
  coordinates: string;
  startGate: string;
  finishGate: string | null;
  distanceMeters: number;
  thumbnailUrl: string | null;
}

function rowToTrack(r: TrackRow): Track {
  return {
    id: r.id,
    name: r.name,
    mode: r.mode as Mode,
    type: r.type as TrackType,
    createdAt: r.createdAt,
    coordinates: JSON.parse(r.coordinates) as Coordinate[],
    startGate: JSON.parse(r.startGate) as Gate,
    finishGate: r.finishGate ? (JSON.parse(r.finishGate) as Gate) : undefined,
    distanceMeters: r.distanceMeters,
    thumbnailUrl: r.thumbnailUrl ?? undefined,
  };
}

/** Insert or replace a track. */
export async function saveTrack(track: Track): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO tracks
       (id, name, mode, type, createdAt, coordinates, startGate, finishGate, distanceMeters, thumbnailUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    track.id,
    track.name,
    track.mode,
    track.type,
    track.createdAt,
    JSON.stringify(track.coordinates),
    JSON.stringify(track.startGate),
    track.finishGate ? JSON.stringify(track.finishGate) : null,
    track.distanceMeters,
    track.thumbnailUrl ?? null
  );
}

export async function getTracks(): Promise<Track[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TrackRow>(
    `SELECT * FROM tracks ORDER BY createdAt DESC`
  );
  return rows.map(rowToTrack);
}

export async function getTrack(id: string): Promise<Track | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TrackRow>(
    `SELECT * FROM tracks WHERE id = ?`,
    id
  );
  return row ? rowToTrack(row) : null;
}

export async function deleteTrack(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM tracks WHERE id = ?`, id);
}

interface BestTimeRow {
  id: string;
  trackId: string;
  durationMs: number;
  date: string;
  splits: string | null;
}

function rowToBestTime(r: BestTimeRow): BestTime {
  return {
    id: r.id,
    trackId: r.trackId,
    durationMs: r.durationMs,
    date: r.date,
    splits: r.splits ? (JSON.parse(r.splits) as number[]) : undefined,
  };
}

export async function addBestTime(bt: BestTime): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO best_times (id, trackId, durationMs, date, splits)
     VALUES (?, ?, ?, ?, ?)`,
    bt.id,
    bt.trackId,
    bt.durationMs,
    bt.date,
    bt.splits ? JSON.stringify(bt.splits) : null
  );
}

/** All recorded times for a track, fastest first. */
export async function getBestTimes(trackId: string): Promise<BestTime[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BestTimeRow>(
    `SELECT * FROM best_times WHERE trackId = ? ORDER BY durationMs ASC`,
    trackId
  );
  return rows.map(rowToBestTime);
}

/** The personal-best (fastest) time for a track, or null if none recorded. */
export async function getPersonalBest(trackId: string): Promise<BestTime | null> {
  const times = await getBestTimes(trackId);
  return times[0] ?? null;
}
