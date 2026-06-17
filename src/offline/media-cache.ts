const AUDIO_CACHE = 'zhiyin-audio-v1';
const COVER_CACHE = 'zhiyin-covers-v1';

export type StreamQuality = 'low' | 'medium' | 'high' | 'lossless' | 'original';

function audioCacheKey(songId: number, quality: StreamQuality): string {
  return `/_c/audio/${songId}/${quality}`;
}

function coverCacheKey(coverId: number): string {
  return `/_c/cover/${coverId}`;
}

function supportsCacheStorage(): boolean {
  return typeof caches !== 'undefined';
}

async function openCache(name: string): Promise<Cache | null> {
  if (!supportsCacheStorage()) return null;
  return caches.open(name);
}

export async function hasCachedAudio(
  songId: number,
  quality: StreamQuality
): Promise<boolean> {
  const cache = await openCache(AUDIO_CACHE);
  if (!cache) return false;
  const res = await cache.match(audioCacheKey(songId, quality));
  return !!res;
}

export async function getCachedAudioBlob(
  songId: number,
  quality: StreamQuality
): Promise<Blob | null> {
  const cache = await openCache(AUDIO_CACHE);
  if (!cache) return null;
  const res = await cache.match(audioCacheKey(songId, quality));
  if (!res) return null;
  return res.blob();
}

export async function getCachedAudioObjectUrl(
  songId: number,
  quality: StreamQuality
): Promise<string | null> {
  const blob = await getCachedAudioBlob(songId, quality);
  if (!blob) return null;
  const { touchCacheAccess } = await import('./db');
  void touchCacheAccess(songId);
  return URL.createObjectURL(blob);
}

export async function putCachedAudio(
  songId: number,
  quality: StreamQuality,
  blob: Blob
): Promise<void> {
  await ensureCacheCapacity();
  const cache = await openCache(AUDIO_CACHE);
  if (!cache) return;
  await cache.put(
    audioCacheKey(songId, quality),
    new Response(blob, {
      headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    })
  );
  const { touchCacheAccess } = await import('./db');
  await touchCacheAccess(songId);
}

export async function fetchAudioBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

export function putCachedAudioInBackground(
  songId: number,
  quality: StreamQuality,
  blob: Blob
): void {
  void putCachedAudio(songId, quality, blob);
}

export async function cacheAudioFromStreamUrl(
  url: string,
  songId: number,
  quality: StreamQuality
): Promise<void> {
  if (await hasCachedAudio(songId, quality)) return;
  const blob = await fetchAudioBlob(url);
  if (blob) await putCachedAudio(songId, quality, blob);
}

export async function hasCachedAudioAnyQuality(songId: number): Promise<boolean> {
  const cache = await openCache(AUDIO_CACHE);
  if (!cache) return false;
  for (const q of ALL_STREAM_QUALITIES) {
    const res = await cache.match(audioCacheKey(songId, q));
    if (res) return true;
  }
  return false;
}

export async function getCachedSongIds(): Promise<Set<number>> {
  const cache = await openCache(AUDIO_CACHE);
  if (!cache) return new Set();
  const keys = await cache.keys();
  const ids = new Set<number>();
  for (const req of keys) {
    const url = typeof req === 'string' ? req : req.url;
    const match = url.match(/\/_c\/audio\/(\d+)\//);
    if (match) ids.add(Number(match[1]));
  }
  return ids;
}

const ALL_QUALITIES: StreamQuality[] = [
  'low', 'medium', 'high', 'lossless', 'original',
];
const ALL_STREAM_QUALITIES = ALL_QUALITIES;

export async function removeCachedAudio(
  songId: number,
  quality?: StreamQuality
): Promise<void> {
  const cache = await openCache(AUDIO_CACHE);
  if (!cache) return;
  const targets = quality ? [quality] : ALL_QUALITIES;
  await Promise.all(targets.map((q) => cache.delete(audioCacheKey(songId, q))));
}

export async function clearAudioCache(): Promise<void> {
  if (!supportsCacheStorage()) return;
  await caches.delete(AUDIO_CACHE);
}

export async function hasCachedCover(coverId: number): Promise<boolean> {
  const cache = await openCache(COVER_CACHE);
  if (!cache) return false;
  return !!(await cache.match(coverCacheKey(coverId)));
}

export async function getCachedCoverObjectUrl(coverId: number): Promise<string | null> {
  const cache = await openCache(COVER_CACHE);
  if (!cache) return null;
  const res = await cache.match(coverCacheKey(coverId));
  if (!res) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function cacheCoverFromUrl(url: string, coverId: number): Promise<void> {
  if (await hasCachedCover(coverId)) return;
  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return;
    const blob = await res.blob();
    const cache = await openCache(COVER_CACHE);
    if (!cache) return;
    await cache.put(
      coverCacheKey(coverId),
      new Response(blob, { headers: { 'Content-Type': blob.type || 'image/jpeg' } })
    );
  } catch {
    // ignore
  }
}

export function cacheCoverInBackground(coverId: number): void {
  if (!coverId) return;
  void cacheCoverFromUrl(`/api/covers/${coverId}`, coverId);
}

export async function clearCoverCache(): Promise<void> {
  if (!supportsCacheStorage()) return;
  await caches.delete(COVER_CACHE);
}

export async function clearAllMediaCache(): Promise<void> {
  await Promise.all([clearAudioCache(), clearCoverCache()]);
}

export interface MediaCacheStats {
  audioCount: number;
  coverCount: number;
  estimatedBytes: number;
}

export interface StorageEstimate {
  usage: number;
  quota: number;
  usageRatio: number;
}

export async function getStorageEstimate(): Promise<StorageEstimate> {
  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate();
    const usage = est.usage ?? 0;
    const quota = est.quota ?? 0;
    return { usage, quota, usageRatio: quota > 0 ? usage / quota : 0 };
  }
  return { usage: 0, quota: 0, usageRatio: 0 };
}

const CACHE_USAGE_THRESHOLD = 0.8;
const LRU_EVICT_BATCH = 5;

export async function ensureCacheCapacity(): Promise<void> {
  const est = await getStorageEstimate();
  if (est.quota === 0 || est.usageRatio < CACHE_USAGE_THRESHOLD) return;

  const { getLruSongIds, removeCacheAccessRecords } = await import('./db');
  const evictIds = await getLruSongIds(LRU_EVICT_BATCH);
  if (evictIds.length === 0) return;

  for (const id of evictIds) {
    await removeCachedAudio(id);
  }
  await removeCacheAccessRecords(evictIds);
}

async function measureCache(cacheName: string): Promise<{ count: number; bytes: number }> {
  const cache = await caches.open(cacheName).catch(() => null);
  if (!cache) return { count: 0, bytes: 0 };
  const keys = await cache.keys();
  if (keys.length === 0) return { count: 0, bytes: 0 };

  let bytes = 0;
  await Promise.all(
    keys.map(async (req) => {
      const res = await cache.match(req);
      if (!res) return;
      const cl = res.headers.get('content-length');
      if (cl) {
        bytes += parseInt(cl, 10) || 0;
      } else {
        const blob = await res.blob();
        bytes += blob.size;
      }
    }),
  );
  return { count: keys.length, bytes };
}

export async function getMediaCacheStats(): Promise<MediaCacheStats> {
  if (!supportsCacheStorage()) {
    return { audioCount: 0, coverCount: 0, estimatedBytes: 0 };
  }

  const [audio, cover] = await Promise.all([
    measureCache(AUDIO_CACHE),
    measureCache(COVER_CACHE),
  ]);

  return {
    audioCount: audio.count,
    coverCount: cover.count,
    estimatedBytes: audio.bytes + cover.bytes,
  };
}
