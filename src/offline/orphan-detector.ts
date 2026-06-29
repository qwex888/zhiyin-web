import { ref } from 'vue';
import { getCachedSongIds, removeCachedAudio } from './media-cache';
import { offlineDb, removeCacheAccessRecords } from './db';
import { musicApi } from '@/api/music';
import { isAppOnline } from './network';

export interface OrphanDetectResult {
  valid: Set<number>;
  orphan: Set<number>;
}

export const orphanIds = ref<Set<number>>(new Set());
export const orphanDetected = ref(false);
export const orphanCheckDone = ref(false);

/**
 * 检测前端 CacheStorage 中缓存的歌曲 ID 哪些在后端已不存在（孤儿缓存）。
 * 分批调用 /api/songs/batch 验证，每批最多 500 个。
 */
export async function detectOrphans(): Promise<OrphanDetectResult> {
  const result: OrphanDetectResult = { valid: new Set(), orphan: new Set() };

  if (!isAppOnline()) {
    orphanCheckDone.value = true;
    return result;
  }

  const cachedIds = await getCachedSongIds();
  if (cachedIds.size === 0) {
    orphanCheckDone.value = true;
    return result;
  }

  const allIds = Array.from(cachedIds);

  try {
    const { data: existingSongs } = await musicApi.getBatchSongs(allIds);
    const existingIdSet = new Set(existingSongs.map(s => s.id));

    for (const id of allIds) {
      if (existingIdSet.has(id)) {
        result.valid.add(id);
      } else {
        result.orphan.add(id);
      }
    }
  } catch {
    // 请求失败（后端不可达等），视所有缓存为有效以避免误删
    for (const id of allIds) {
      result.valid.add(id);
    }
  }

  orphanIds.value = result.orphan;
  orphanDetected.value = result.orphan.size > 0;
  orphanCheckDone.value = true;

  if (result.orphan.size > 0) {
    console.warn(`[OrphanDetector] 检测到 ${result.orphan.size} 首孤儿缓存歌曲`, Array.from(result.orphan));
  }

  return result;
}

/** 清理单首孤儿缓存 */
export async function removeOrphanSong(songId: number): Promise<void> {
  await removeCachedAudio(songId);
  await offlineDb.songs.delete(songId);
  await removeCacheAccessRecords([songId]);
  orphanIds.value = new Set([...orphanIds.value].filter(id => id !== songId));
  orphanDetected.value = orphanIds.value.size > 0;
}

/** 清理所有孤儿缓存 */
export async function removeAllOrphans(): Promise<void> {
  const ids = Array.from(orphanIds.value);
  await Promise.all(ids.map(id => removeCachedAudio(id)));
  await offlineDb.songs.bulkDelete(ids);
  await removeCacheAccessRecords(ids);
  orphanIds.value = new Set();
  orphanDetected.value = false;
}
