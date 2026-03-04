<script setup lang="ts">
import { toRefs } from 'vue';
import { useVirtualList, useInfiniteScroll } from '@vueuse/core';
import type { Song, RecentSong } from '@/types';
import { Play, Pause, Clock, MoreHorizontal, Loader2, AlertCircle, RefreshCw, Inbox } from 'lucide-vue-next';
import { usePlayerStore } from '@/stores/player';
import { useLibraryStore } from '@/stores/library';
import { useI18n } from 'vue-i18n';
import dayjs from 'dayjs';
import CoverImage from '@/components/common/CoverImage.vue';

const props = withDefaults(defineProps<{
  songs: (Song | RecentSong)[];
  isLoading?: boolean;
  hasMore?: boolean;
  hasError?: boolean;
  showArtist?: boolean;
  showAlbum?: boolean;
  showPlayedAt?: boolean;
  showIndex?: boolean;
  itemHeight?: number;
}>(), {
  isLoading: false,
  hasMore: false,
  hasError: false,
  showArtist: true,
  showAlbum: true,
  showPlayedAt: false,
  showIndex: true,
  itemHeight: 64
});

const emit = defineEmits<{
  (e: 'loadMore'): void;
  (e: 'play', song: Song): void;
  (e: 'retry'): void;
}>();

const { songs } = toRefs(props);
const playerStore = usePlayerStore();
const libraryStore = useLibraryStore();
const { t } = useI18n();

const { list, containerProps, wrapperProps } = useVirtualList(songs, {
  itemHeight: props.itemHeight,
  overscan: 5, // 减少预渲染数量，优化性能
});

const containerRef = containerProps.ref;

// Infinite scroll
useInfiniteScroll(containerRef, () => {
  if (props.hasMore && !props.isLoading) {
    emit('loadMore');
  }
}, { distance: 50 });

const formatDuration = (seconds: number | undefined) => {
  if (!seconds && seconds !== 0) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatTimeAgo = (date: string | undefined) => {
  if (!date) return t('common.just_now');
  return dayjs(date).fromNow();
};

const isCurrentSong = (song: Song | RecentSong) => {
  return playerStore.currentSong?.id === song.id;
};

const getArtistName = (song: Song | RecentSong) => {
  if ('artist' in song && song.artist) return song.artist;
  if ('artist_name' in song && song.artist_name) return song.artist_name; // Fallback if type differs
  return libraryStore.getArtistName(song.artist_id) || t('common.unknown_artist');
};

const getAlbumName = (song: Song | RecentSong) => {
  if ('album' in song && song.album) return song.album;
  return libraryStore.getAlbumName(song.album_id) || t('common.unknown_album');
};

const handlePlay = (song: Song | RecentSong) => {
  // Convert RecentSong to Song if needed, though they are compatible for play
  emit('play', song as Song);
};

</script>

<template>
  <div class="flex flex-col h-full bg-bg-surface/50 border border-border rounded-xl overflow-hidden backdrop-blur-sm">
    <!-- Table Header -->
    <div class="grid p-4 text-sm font-medium text-text-secondary border-b border-border bg-bg-surface/80 z-10"
         :class="[
           showPlayedAt 
             ? 'gap-4 grid-cols-[40px_minmax(200px,5fr)_minmax(120px,2fr)_minmax(120px,2fr)_minmax(100px,1.5fr)_64px_40px]' 
             : 'gap-3 grid-cols-[32px_1fr_52px_32px] md:gap-4 md:grid-cols-[40px_minmax(200px,5fr)_minmax(150px,3fr)_64px_40px] lg:grid-cols-[40px_minmax(220px,5fr)_minmax(150px,3fr)_minmax(150px,2fr)_64px_40px]'
         ]"
    >
      <div v-if="showIndex" class="text-center">#</div>
      <div class="md:hidden flex-1 min-w-0">{{ t('songs.table.title') }}</div>
      <div class="hidden md:block min-w-0">{{ t('songs.table.title') }}</div>
      <div v-if="showArtist" class="hidden md:block min-w-0">{{ t('songs.table.artist') }}</div>
      <div v-if="showAlbum" class="hidden lg:block min-w-0">{{ t('songs.table.album') }}</div>
      <div v-if="showPlayedAt" class="hidden lg:block min-w-0">{{ t('home.recent') }}</div>
      <div class="text-right"><Clock class="w-4 h-4 ml-auto" /></div>
      <div></div>
    </div>

    <!-- Error State -->
    <div v-if="hasError && songs.length === 0" class="flex-1 flex flex-col items-center justify-center py-16 text-text-secondary">
      <AlertCircle class="w-10 h-10 mb-3 text-red-400 opacity-60" />
      <p class="text-sm font-medium mb-4">{{ t('common.error') }}</p>
      <button 
        @click="emit('retry')"
        class="flex items-center gap-2 px-4 py-2 bg-bg-elevate hover:bg-bg-surface border border-border rounded-lg text-sm text-text-primary hover:text-primary transition-colors"
      >
        <RefreshCw class="w-4 h-4" />
        {{ t('common.retry') }}
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="!isLoading && songs.length === 0" class="flex-1 flex flex-col items-center justify-center py-16 text-text-secondary">
      <Inbox class="w-12 h-12 mb-3 text-text-tertiary opacity-40" />
      <p class="text-sm font-medium">{{ t('common.no_data') }}</p>
    </div>

    <!-- Virtual List Container -->
    <div v-else class="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent" v-bind="containerProps">
      <div class="divide-y divide-border" v-bind="wrapperProps">
        <div 
          v-for="{ data: song, index } in list" 
          :key="song.id"
          class="group grid p-3 items-center hover:bg-bg-elevate transition-colors cursor-default box-border h-[64px]"
          :class="[
             { 'bg-primary/5': isCurrentSong(song) },
             showPlayedAt 
               ? 'gap-4 grid-cols-[40px_minmax(200px,5fr)_minmax(120px,2fr)_minmax(120px,2fr)_minmax(100px,1.5fr)_64px_40px]' 
               : 'gap-3 grid-cols-[32px_1fr_52px_32px] md:gap-4 md:grid-cols-[40px_minmax(200px,5fr)_minmax(150px,3fr)_64px_40px] lg:grid-cols-[40px_minmax(220px,5fr)_minmax(150px,3fr)_minmax(150px,2fr)_64px_40px]'
          ]"
          @dblclick="handlePlay(song)"
        >
          <!-- Play Button / Index -->
          <div v-if="showIndex" class="text-center flex justify-center">
            <button 
              v-if="isCurrentSong(song) && playerStore.isPlaying"
              @click.stop="playerStore.pause()"
              class="text-primary"
            >
               <Pause class="w-4 h-4 fill-current" />
            </button>
            <button 
              v-else
              class="hidden group-hover:block text-text-primary"
              @click.stop="handlePlay(song)"
            >
              <Play class="w-4 h-4 fill-current" />
            </button>
            <span v-if="!isCurrentSong(song)" class="group-hover:hidden text-text-secondary text-sm font-mono">
              {{ index + 1 }}
            </span>
            <span v-else-if="!playerStore.isPlaying" class="group-hover:hidden text-primary">
              <div class="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
            </span>
          </div>

          <!-- Title (优先显示，分配最多空间) -->
          <div class="flex items-center gap-2 md:gap-3 min-w-0 overflow-hidden">
            <div class="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded overflow-hidden flex-shrink-0 shadow-sm relative">
               <CoverImage
                 :cover-id="song.cover_id"
                 size="thumb"
                 lazy
               >
                 <template #fallback>
                   <div class="w-full h-full flex items-center justify-center text-text-tertiary text-xs">
                     <svg class="w-5 h-5 opacity-30" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                     </svg>
                   </div>
                 </template>
               </CoverImage>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-sm md:text-base font-medium truncate" :class="isCurrentSong(song) ? 'text-primary' : 'text-text-primary'">
                {{ song.title }}
              </div>
              <div class="md:hidden text-xs text-text-secondary truncate">
                {{ getArtistName(song) }}
              </div>
            </div>
          </div>

          <!-- Artist (第二优先级) -->
          <div v-if="showArtist" class="hidden md:block text-text-secondary text-sm truncate hover:text-text-primary cursor-pointer hover:underline transition-colors min-w-0">
            {{ getArtistName(song) }}
          </div>

          <!-- Album (可在空间不足时隐藏) -->
          <div v-if="showAlbum" class="hidden lg:block text-text-secondary text-sm truncate hover:text-text-primary cursor-pointer hover:underline transition-colors min-w-0">
            {{ getAlbumName(song) }}
          </div>

          <!-- Played At -->
          <div v-if="showPlayedAt" class="hidden lg:block text-text-tertiary text-sm truncate min-w-0">
            {{ formatTimeAgo((song as RecentSong).played_at) }}
          </div>

          <!-- Duration (固定宽度，不换行) -->
          <div class="text-xs md:text-sm text-text-secondary font-mono text-right tabular-nums">
            {{ formatDuration(song.duration_secs) }}
          </div>

          <!-- Actions (固定宽度) -->
          <div class="flex justify-center md:opacity-0 md:group-hover:opacity-100 transition-opacity">
             <button 
               class="p-1 text-text-secondary hover:text-text-primary active:text-text-primary rounded-full hover:bg-bg-surface active:bg-bg-surface transition-colors"
               @click.stop
             >
               <MoreHorizontal class="w-4 h-4" />
             </button>
          </div>
        </div>
      </div>
      
      <!-- Load More Loading State -->
      <div v-if="isLoading" class="py-4 flex justify-center items-center text-text-secondary gap-2">
        <Loader2 class="w-4 h-4 animate-spin" />
        <span class="text-sm">{{ t('common.loading') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 懒加载图片渐入效果 */
img:not(.loaded) {
  opacity: 0;
}

img.loaded {
  opacity: 1;
  transition: opacity 0.3s ease-in;
}

/* 封面加载动画 */
@keyframes shimmer {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: 200px 0;
  }
}

.bg-gradient-to-br {
  background-image: linear-gradient(
    90deg,
    rgba(39, 39, 42, 0.5) 0px,
    rgba(63, 63, 70, 0.5) 40px,
    rgba(39, 39, 42, 0.5) 80px
  );
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite linear;
}
</style>
