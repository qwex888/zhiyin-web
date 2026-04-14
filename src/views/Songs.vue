<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { musicApi } from '@/api/music';
import type { Song } from '@/types';
import { usePlayerStore } from '@/stores/player';
import { useLibraryStore } from '@/stores/library';
import { Search, Filter, ArrowUpDown } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { scrapeApi } from '@/api/scrape';
import { useToast } from '@/composables/useToast';
import VirtualSongList from '@/components/common/VirtualSongList.vue';

const playerStore = usePlayerStore();
const libraryStore = useLibraryStore();
const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const songs = ref<Song[]>([]);
const limit = ref(50);
const offset = ref(0);
const isLoading = ref(false);
const hasMore = ref(true);
const hasError = ref(false);

const fetchSongs = async () => {
  isLoading.value = true;
  hasError.value = false;
  try {
    const { data } = await musicApi.getSongs({ limit: limit.value, offset: offset.value });
    songs.value = data.items;
    hasMore.value = data.has_next;
  } catch (e) {
    console.error(t('common.error'), e);
    hasError.value = true;
    hasMore.value = false;
  } finally {
    isLoading.value = false;
  }
};

const loadMore = async () => {
  if (!hasMore.value || isLoading.value || hasError.value) return;
  isLoading.value = true;
  try {
    const nextOffset = offset.value + limit.value;
    const { data } = await musicApi.getSongs({ limit: limit.value, offset: nextOffset });
    songs.value = [...songs.value, ...data.items];
    offset.value = nextOffset;
    hasMore.value = data.has_next;
  } catch (e) {
    console.error(t('common.error'), e);
    hasError.value = true;
    hasMore.value = false;
  } finally {
    isLoading.value = false;
  }
};

const retrySongs = () => {
  hasError.value = false;
  hasMore.value = true;
  if (songs.value.length === 0) {
    offset.value = 0;
    fetchSongs();
  } else {
    loadMore();
  }
};

const playSong = (song: Song) => {
  playerStore.play(song);
};

const playAllSongs = () => {
  if (songs.value.length > 0) {
    playerStore.setQueue(songs.value);
    playerStore.play(songs.value[0]);
  }
};

const handleMenuAction = async (action: string, song: Song) => {
  switch (action) {
    case 'play':
      playerStore.play(song);
      break;
    case 'addToQueue':
      playerStore.addToQueue(song);
      toast.success(t('common.add_to_queue'));
      break;
    case 'scrape':
      try {
        await scrapeApi.batchCreate([song.id]);
        toast.success(t('scrape.batch_created', { count: 1 }));
        router.push('/scrape');
      } catch {
        toast.error(t('common.error'));
      }
      break;
    case 'viewDetails':
      break;
  }
};

onMounted(() => {
  fetchSongs();
  // Fetch more metadata to ensure mapping works for larger libraries
  libraryStore.fetchArtists({ limit: 5000 }); 
  libraryStore.fetchAlbums({ limit: 5000 });
});
</script>

<template>
  <div class="flex flex-col h-full p-4 md:p-8  overflow-hidden">
    <!-- Header -->
    <header class="flex-none flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div class="flex items-center gap-4 md:gap-8">
        <h1 class="text-2xl md:text-3xl font-bold text-text-primary">{{ t('songs.title') }}</h1>
        <button class="text-sm text-primary hover:text-primary-hover transition-colors font-medium whitespace-nowrap" @click="playAllSongs">
          {{ t('songs.play_all') }}
        </button>
      </div>
      <div class="flex items-center gap-2 md:gap-3 w-full md:w-auto">
         <div class="relative flex-1 md:flex-none">
           <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
           <input 
             type="text" 
             :placeholder="t('common.search')" 
             class="w-full md:w-64 bg-bg-surface border border-border rounded-full py-2 pl-10 pr-4 text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-colors"
           />
         </div>
         <button class="p-2 bg-bg-surface border border-border rounded-full hover:bg-bg-elevate transition-colors text-text-secondary hover:text-text-primary flex-shrink-0">
           <Filter class="w-4 h-4" />
         </button>
         <button class="p-2 bg-bg-surface border border-border rounded-full hover:bg-bg-elevate transition-colors text-text-secondary hover:text-text-primary flex-shrink-0">
           <ArrowUpDown class="w-4 h-4" />
         </button>
      </div>
    </header>

    <div class="flex-1 overflow-hidden">
      <VirtualSongList 
        :songs="songs"
        :is-loading="isLoading"
        :has-more="hasMore"
        :has-error="hasError"
        @loadMore="loadMore"
        @play="playSong"
        @retry="retrySongs"
        @menu-action="handleMenuAction"
      />
    </div>
  </div>
</template>
