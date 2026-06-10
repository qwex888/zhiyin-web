import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { syncFullLibrary } from '@/offline/sync';
import { getLibraryMeta, clearLocalLibrary, hasLocalLibrary } from '@/offline/db';
import {
  getMediaCacheStats,
  clearAllMediaCache,
  type MediaCacheStats,
} from '@/offline/media-cache';
import { isAppOnline } from '@/offline/network';

export const useOfflineStore = defineStore('offline', () => {
  const isSyncing = ref(false);
  const syncError = ref<string | null>(null);
  const lastSyncedAt = ref<string | null>(null);
  const localSongCount = ref(0);
  const mediaStats = ref<MediaCacheStats>({
    audioCount: 0,
    coverCount: 0,
    estimatedBytes: 0,
  });
  const hasLocalData = ref(false);

  const canSync = computed(() => isAppOnline() && !isSyncing.value);

  async function refreshMeta(): Promise<void> {
    const meta = await getLibraryMeta();
    lastSyncedAt.value = meta?.lastSyncedAt ?? null;
    localSongCount.value = meta?.songCount ?? 0;
    hasLocalData.value = await hasLocalLibrary();
    mediaStats.value = await getMediaCacheStats();
  }

  async function syncLibrary(): Promise<boolean> {
    if (!isAppOnline() || isSyncing.value) return false;
    isSyncing.value = true;
    syncError.value = null;
    try {
      const result = await syncFullLibrary();
      lastSyncedAt.value = result.syncedAt;
      localSongCount.value = result.songCount;
      hasLocalData.value = true;
      await refreshMeta();
      return true;
    } catch (e: unknown) {
      syncError.value = e instanceof Error ? e.message : 'SYNC_FAILED';
      return false;
    } finally {
      isSyncing.value = false;
    }
  }

  async function clearLibrary(): Promise<void> {
    await clearLocalLibrary();
    await refreshMeta();
  }

  async function clearMedia(): Promise<void> {
    await clearAllMediaCache();
    await refreshMeta();
  }

  return {
    isSyncing,
    syncError,
    lastSyncedAt,
    localSongCount,
    mediaStats,
    hasLocalData,
    canSync,
    refreshMeta,
    syncLibrary,
    clearLibrary,
    clearMedia,
  };
});
