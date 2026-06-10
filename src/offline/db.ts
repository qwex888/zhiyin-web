import Dexie, { type Table } from 'dexie';
import type { Song, Album, Artist } from '@/types';

export interface SyncMeta {
  key: string;
  lastSyncedAt: string | null;
  songCount: number;
  albumCount: number;
  artistCount: number;
}

export interface CacheAccessRecord {
  songId: number;
  lastAccessedAt: number;
}

export class ZhiyinOfflineDB extends Dexie {
  songs!: Table<Song, number>;
  albums!: Table<Album, number>;
  artists!: Table<Artist, number>;
  syncMeta!: Table<SyncMeta, string>;
  cacheAccess!: Table<CacheAccessRecord, number>;

  constructor() {
    super('zhiyin-offline');
    this.version(1).stores({
      songs: 'id, title, artist_id, album_id',
      albums: 'id, name, artist_id',
      artists: 'id, name',
      syncMeta: 'key',
    });
    this.version(2).stores({
      songs: 'id, title, artist_id, album_id',
      albums: 'id, name, artist_id',
      artists: 'id, name',
      syncMeta: 'key',
      cacheAccess: 'songId, lastAccessedAt',
    });
  }
}

export const offlineDb = new ZhiyinOfflineDB();

const LIBRARY_META_KEY = 'library';

export async function getLibraryMeta(): Promise<SyncMeta | undefined> {
  return offlineDb.syncMeta.get(LIBRARY_META_KEY);
}

export async function setLibraryMeta(partial: Partial<SyncMeta>): Promise<void> {
  const existing = await getLibraryMeta();
  await offlineDb.syncMeta.put({
    key: LIBRARY_META_KEY,
    lastSyncedAt: partial.lastSyncedAt ?? existing?.lastSyncedAt ?? null,
    songCount: partial.songCount ?? existing?.songCount ?? 0,
    albumCount: partial.albumCount ?? existing?.albumCount ?? 0,
    artistCount: partial.artistCount ?? existing?.artistCount ?? 0,
  });
}

export async function hasLocalLibrary(): Promise<boolean> {
  const meta = await getLibraryMeta();
  if (meta && meta.songCount > 0) return true;
  const count = await offlineDb.songs.count();
  return count > 0;
}

export async function clearLocalLibrary(): Promise<void> {
  await Promise.all([
    offlineDb.songs.clear(),
    offlineDb.albums.clear(),
    offlineDb.artists.clear(),
    offlineDb.syncMeta.delete(LIBRARY_META_KEY),
  ]);
}

export async function upsertSongs(items: Song[]): Promise<void> {
  if (items.length > 0) await offlineDb.songs.bulkPut(items);
}

export async function upsertAlbums(items: Album[]): Promise<void> {
  if (items.length > 0) await offlineDb.albums.bulkPut(items);
}

export async function upsertArtists(items: Artist[]): Promise<void> {
  if (items.length > 0) await offlineDb.artists.bulkPut(items);
}

export async function touchCacheAccess(songId: number): Promise<void> {
  await offlineDb.cacheAccess.put({ songId, lastAccessedAt: Date.now() });
}

export async function getLruSongIds(count: number): Promise<number[]> {
  const records = await offlineDb.cacheAccess
    .orderBy('lastAccessedAt')
    .limit(count)
    .toArray();
  return records.map((r) => r.songId);
}

export async function removeCacheAccessRecords(songIds: number[]): Promise<void> {
  await offlineDb.cacheAccess.bulkDelete(songIds);
}
