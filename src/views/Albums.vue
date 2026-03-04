<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { musicApi } from '@/api/music';
import type { Album } from '@/types';
import { Disc, Play, Search, Grid, List, AlertCircle, RefreshCw, Inbox } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import CoverImage from '@/components/common/CoverImage.vue';

const { t } = useI18n();
const albums = ref<Album[]>([]);
const isLoading = ref(false);
const hasError = ref(false);

const fetchAlbums = async () => {
  isLoading.value = true;
  hasError.value = false;
  try {
    const { data } = await musicApi.getAlbums({ limit: 50 });
    albums.value = data.items;
  } catch (e) {
    console.error(t('common.error'), e);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchAlbums();
});
</script>

<template>
  <div class="p-4 md:p-8 pb-24">
    <header class="flex items-center justify-between mb-8">
      <h1 class="text-3xl font-bold text-text-primary">{{ t('albums.title') }}</h1>
      
      <div class="flex items-center gap-3">
         <div class="relative hidden md:block">
           <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
           <input 
             type="text" 
             :placeholder="t('common.search')" 
             class="bg-bg-surface border border-border rounded-full py-2 pl-10 pr-4 text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-colors"
           />
         </div>
         <div class="flex bg-bg-surface rounded-lg p-1 border border-border">
           <button class="p-1.5 rounded bg-bg-elevate text-text-primary shadow-sm">
             <Grid class="w-4 h-4" />
           </button>
           <button class="p-1.5 rounded text-text-secondary hover:text-text-primary transition-colors">
             <List class="w-4 h-4" />
           </button>
         </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="hasError" class="flex flex-col items-center justify-center py-20 text-text-secondary">
      <AlertCircle class="w-12 h-12 mb-3 text-red-400 opacity-60" />
      <p class="text-sm font-medium mb-4">{{ t('common.error') }}</p>
      <button
        @click="fetchAlbums"
        class="flex items-center gap-2 px-4 py-2 bg-bg-elevate hover:bg-bg-surface border border-border rounded-lg text-sm text-text-primary hover:text-primary transition-colors"
      >
        <RefreshCw class="w-4 h-4" />
        {{ t('common.retry') }}
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="albums.length === 0" class="flex flex-col items-center justify-center py-20 text-text-secondary">
      <Inbox class="w-12 h-12 mb-3 text-text-tertiary opacity-40" />
      <p class="text-sm font-medium">{{ t('common.no_data') }}</p>
    </div>

    <!-- Album Grid -->
    <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      <div 
        v-for="album in albums" 
        :key="album.id"
        class="group cursor-pointer p-4 rounded-xl hover:bg-bg-elevate transition-colors border border-transparent hover:border-border"
      >
        <div class="relative aspect-square mb-4 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-lg shadow-lg overflow-hidden border border-border">
          <CoverImage
            :cover-id="album.cover_id"
            size="medium"
            lazy
            img-class="group-hover:scale-105 transition-transform duration-500"
          >
            <template #fallback>
              <div class="w-full h-full flex items-center justify-center bg-bg-elevate text-text-tertiary">
                <Disc class="w-16 h-16" />
              </div>
            </template>
          </CoverImage>
          
          <button class="absolute bottom-3 right-3 w-12 h-12 bg-primary-gradient rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-110">
            <Play class="w-6 h-6 text-white fill-current ml-1" />
          </button>
        </div>

        <div class="text-center md:text-left">
          <div class="font-bold text-text-primary truncate text-base mb-1 group-hover:text-primary transition-colors" alt="{{ album.name }}">{{ album.name }}</div>
          <div class="text-sm text-text-secondary truncate">{{ album.artist_name || t('common.unknown') }}</div>
          <div class="text-xs text-text-tertiary mt-1">{{ album.year || t('albums.unknown_year') }} • {{ t('albums.count', { count: album.song_ids?.length || 0 }) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
