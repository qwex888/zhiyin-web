import { ref, watch, onUnmounted } from 'vue';
import {
  getCachedCoverObjectUrl,
  cacheCoverInBackground,
} from '@/offline/media-cache';

export function useCoverUrl(coverId: () => number | null | undefined) {
  const displayUrl = ref('');
  let activeObjectUrl: string | null = null;
  let currentId: number | null | undefined = null;

  const revokeActive = () => {
    if (activeObjectUrl) {
      URL.revokeObjectURL(activeObjectUrl);
      activeObjectUrl = null;
    }
  };

  const resolve = async (id: number | null | undefined) => {
    currentId = id;
    if (!id) {
      revokeActive();
      displayUrl.value = '';
      return;
    }

    displayUrl.value = `/api/covers/${id}`;

    const cached = await getCachedCoverObjectUrl(id);
    if (currentId !== id) return;

    if (cached) {
      revokeActive();
      activeObjectUrl = cached;
      displayUrl.value = cached;
    } else {
      cacheCoverInBackground(id);
    }
  };

  watch(coverId, (id) => void resolve(id), { immediate: true });

  onUnmounted(() => revokeActive());

  return { displayUrl, refresh: () => resolve(coverId()) };
}
