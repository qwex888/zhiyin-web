<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { musicApi } from '@/api/music';
import type { Artist } from '@/types';
import { Play, Search, Users, AlertCircle, RefreshCw, Inbox, X, Loader2 } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import CoverImage from '@/components/common/CoverImage.vue';
import { usePlayerStore } from '@/stores/player';
import { useToast } from '@/composables/useToast';

const { t } = useI18n();
const playerStore = usePlayerStore();
const toast = useToast();
const artists = ref<Artist[]>([]);
const limit = ref(50);
const offset = ref(0);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const hasMore = ref(true);
const hasError = ref(false);
const searchQuery = ref('');
const scrollContainer = ref<HTMLElement | null>(null);
let fetchId = 0;

const buildParams = (extraOffset?: number) => {
  const params: { limit: number; offset: number; q?: string } = {
    limit: limit.value,
    offset: extraOffset ?? offset.value,
  };
  if (searchQuery.value.trim()) params.q = searchQuery.value.trim();
  return params;
};

const fetchArtists = async () => {
  const currentId = ++fetchId;
  isLoading.value = true;
  hasError.value = false;
  try {
    const { data } = await musicApi.getArtists(buildParams());
    if (currentId !== fetchId) return;
    artists.value = data.items;
    hasMore.value = data.has_next;
  } catch (e) {
    if (currentId !== fetchId) return;
    console.error(t('common.error'), e);
    hasError.value = true;
    hasMore.value = false;
  } finally {
    if (currentId === fetchId) isLoading.value = false;
  }
};

const loadMore = async () => {
  if (!hasMore.value || isLoading.value || isLoadingMore.value || hasError.value) return;
  const currentId = ++fetchId;
  isLoadingMore.value = true;
  try {
    const nextOffset = offset.value + limit.value;
    const { data } = await musicApi.getArtists(buildParams(nextOffset));
    if (currentId !== fetchId) return;
    artists.value = [...artists.value, ...data.items];
    offset.value = nextOffset;
    hasMore.value = data.has_next;
  } catch (e) {
    if (currentId !== fetchId) return;
    console.error(t('common.error'), e);
    hasError.value = true;
    hasMore.value = false;
  } finally {
    if (currentId === fetchId) isLoadingMore.value = false;
  }
};

const onScroll = () => {
  const el = scrollContainer.value;
  if (!el) return;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
    loadMore();
  }
};

const resetAndFetch = () => {
  offset.value = 0;
  artists.value = [];
  hasMore.value = true;
  hasError.value = false;
  fetchArtists();
};

const debouncedSearch = useDebounceFn(() => {
  resetAndFetch();
}, 350);

watch(searchQuery, () => {
  debouncedSearch();
});

const clearSearch = () => {
  searchQuery.value = '';
};

const retryArtists = () => {
  hasError.value = false;
  hasMore.value = true;
  if (artists.value.length === 0) {
    offset.value = 0;
    fetchArtists();
  } else {
    loadMore();
  }
};

const playArtist = async (artist: Artist) => {
  try {
    const songIds = artist.song_ids;
    const { data: songs } = await musicApi.getBatchSongs(songIds || []);
    if (songs && songs.length > 0) {
      playerStore.setQueue(songs);
      playerStore.play(songs[0]);
    } else {
      toast.info(t('common.no_data'));
    }
  } catch (e) {
    console.error(e);
    toast.error(t('common.error'));
  }
};

onMounted(() => {
  fetchArtists();
});

onUnmounted(() => {
  fetchId++;
});
</script>

<template>
  <div ref="scrollContainer" class="p-4 md:p-8 pb-24 h-full overflow-y-auto" @scroll="onScroll">
    <header class="flex items-center justify-between mb-8">
      <h1 class="text-3xl font-bold text-text-primary">{{ t('nav.artists') }}</h1>
      
      <div class="flex items-center gap-3">
         <div class="relative hidden md:block">
           <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
           <input 
             v-model="searchQuery"
             type="text" 
             :placeholder="t('common.search')" 
             class="bg-bg-surface border border-border rounded-full py-2 pl-10 pr-9 text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-colors"
           />
           <button
             v-if="searchQuery"
             class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
             @click="clearSearch"
           >
             <X class="w-4 h-4" />
           </button>
         </div>
      </div>
    </header>

    <!-- Loading (initial) -->
    <div v-if="isLoading && artists.length === 0" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="hasError && artists.length === 0" class="flex flex-col items-center justify-center py-20 text-text-secondary">
      <AlertCircle class="w-12 h-12 mb-3 text-red-400 opacity-60" />
      <p class="text-sm font-medium mb-4">{{ t('common.error') }}</p>
      <button
        @click="retryArtists"
        class="flex items-center gap-2 px-4 py-2 bg-bg-elevate hover:bg-bg-surface border border-border rounded-lg text-sm text-text-primary hover:text-primary transition-colors"
      >
        <RefreshCw class="w-4 h-4" />
        {{ t('common.retry') }}
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="!isLoading && artists.length === 0" class="flex flex-col items-center justify-center py-20 text-text-secondary">
      <Inbox class="w-12 h-12 mb-3 text-text-tertiary opacity-40" />
      <p class="text-sm font-medium">{{ t('common.no_data') }}</p>
    </div>

    <!-- Artist Grid -->
    <template v-else>
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        <div 
          v-for="artist in artists" 
          :key="artist.id"
          class="group cursor-pointer p-4 rounded-xl hover:bg-bg-elevate transition-colors border border-transparent hover:border-border text-center"
        >
          <div class="relative aspect-square mb-4 bg-bg-elevate rounded-full shadow-lg overflow-hidden border border-border mx-auto w-full max-w-[200px]">
            <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 text-text-tertiary group-hover:bg-bg-surface transition-colors">
              <CoverImage
                :cover-id="artist.cover_id"
                size="medium"
                lazy
                img-class="group-hover:scale-105 transition-transform duration-500"
              >
                <template #fallback>
                  <Users class="w-16 h-16 opacity-50" />
                </template>
              </CoverImage>
            </div>
            
            <button 
              @click.stop="playArtist(artist)"
              class="absolute bottom-3 right-3 w-12 h-12 bg-primary-gradient rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-110"
            >
              <Play class="w-6 h-6 text-white fill-current ml-1" />
            </button>
          </div>

          <div class="text-center">
            <div class="font-bold text-text-primary truncate text-base mb-1 group-hover:text-primary transition-colors" alt="{{ artist.name }}">{{ artist.name }}</div>
            <div class="text-xs text-text-tertiary mt-1">{{ t('artists.count', { count: artist.song_ids?.length || 0 }) }} • {{ t('artists.albums', { count: artist.album_count || 0 }) }}</div>
          </div>
        </div>
      </div>

      <!-- Load More -->
      <div v-if="isLoadingMore" class="py-6 flex justify-center items-center text-text-secondary gap-2">
        <Loader2 class="w-5 h-5 animate-spin" />
        <span class="text-sm">{{ t('common.loading') }}</span>
      </div>
    </template>
  </div>
</template>
