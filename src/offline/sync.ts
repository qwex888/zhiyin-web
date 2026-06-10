import { musicApi } from '@/api/music';
import type { PaginatedResponse } from '@/types';
import type { Song, Album, Artist } from '@/types';
import {
  offlineDb,
  upsertSongs,
  upsertAlbums,
  upsertArtists,
  setLibraryMeta,
} from './db';
import { isBrowserOnline } from './network';

const PAGE_SIZE = 500;

async function fetchAllPages<T>(
  fetchPage: (offset: number) => Promise<{ data: PaginatedResponse<T> }>
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  let hasNext = true;

  while (hasNext) {
    const { data } = await fetchPage(offset);
    all.push(...data.items);
    hasNext = data.has_next;
    offset += data.limit || PAGE_SIZE;
    if (data.items.length === 0) break;
  }

  return all;
}

export interface LibrarySyncResult {
  songCount: number;
  albumCount: number;
  artistCount: number;
  syncedAt: string;
}

export async function syncFullLibrary(): Promise<LibrarySyncResult> {
  if (!isBrowserOnline()) {
    throw new Error('OFFLINE');
  }

  const [songs, albums, artists] = await Promise.all([
    fetchAllPages<Song>((offset) =>
      musicApi.getSongs({ limit: PAGE_SIZE, offset })
    ),
    fetchAllPages<Album>((offset) =>
      musicApi.getAlbums({ limit: PAGE_SIZE, offset })
    ),
    fetchAllPages<Artist>((offset) =>
      musicApi.getArtists({ limit: PAGE_SIZE, offset })
    ),
  ]);

  await offlineDb.transaction('rw', offlineDb.songs, offlineDb.albums, offlineDb.artists, async () => {
    await offlineDb.songs.clear();
    await offlineDb.albums.clear();
    await offlineDb.artists.clear();
    await upsertSongs(songs);
    await upsertAlbums(albums);
    await upsertArtists(artists);
  });

  const syncedAt = new Date().toISOString();
  await setLibraryMeta({
    lastSyncedAt: syncedAt,
    songCount: songs.length,
    albumCount: albums.length,
    artistCount: artists.length,
  });

  return {
    songCount: songs.length,
    albumCount: albums.length,
    artistCount: artists.length,
    syncedAt,
  };
}
