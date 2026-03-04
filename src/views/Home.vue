<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { statsApi } from '@/api/stats';
import { historyApi } from '@/api/history';
import { musicApi } from '@/api/music';
import type { Stats, Song, RecentSong } from '@/types';
import { Play, Clock, BarChart3, Disc, Music2, Users, Inbox, AlertCircle, RefreshCw } from 'lucide-vue-next';
import { usePlayerStore } from '@/stores/player';
import { useI18n } from 'vue-i18n';
import CoverImage from '@/components/common/CoverImage.vue';
import dayjs from 'dayjs';

const playerStore = usePlayerStore();
const { t } = useI18n();
const router = useRouter();

const stats = ref<Stats | null>(null);
const recentSongs = ref<RecentSong[]>([]);
const recommendations = ref<Song[]>([]);
const isLoading = ref(true);
const hasError = ref(false);

const formatTimeAgo = (date: string | undefined) => {
  if (!date) return t('common.just_now');
  return dayjs(date).fromNow();
};

const fetchData = async () => {
  isLoading.value = true;
  hasError.value = false;
  try {
    const { data: statsData } = await statsApi.getStats();
    stats.value = statsData;

    const { data: historyList } = await historyApi.getRecentSongs();
    if (historyList && historyList.length > 0) {
      recentSongs.value = historyList;
    }

    const { data: recs } = await musicApi.getRecommendations();
    if (recs && recs.length > 0) {
      recommendations.value = recs;
    }
  } catch (error) {
    console.error(t('common.error'), error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchData();
});

const playSong = (song: Song) => {
  playerStore.play(song);
};

const playAllRecommendations = () => {
  if (recommendations.value.length > 0) {
    // 1. Add all songs to queue
    playerStore.setQueue(recommendations.value);
    // 2. Play the first one
    playerStore.play(recommendations.value[0]);
  }
};

const goViewAllRecent = () => {
  router.push({ name: 'History' });
}
</script>

<template>
  <div class="p-4 md:p-8 space-y-10 pb-24">
    <!-- 头部 -->
    <header class="flex items-center justify-between">
      <h1 class="text-3xl font-bold text-text-primary tracking-tight">
        <span class="text-transparent bg-clip-text bg-primary-gradient">ZHIYIN</span>
      </h1>
      <div class="flex items-center gap-4">
        <!-- 搜索框预留 -->
      </div>
    </header>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="hasError && !stats" class="flex flex-col items-center justify-center py-20 text-text-secondary">
      <AlertCircle class="w-12 h-12 mb-3 text-red-400 opacity-60" />
      <p class="text-sm font-medium mb-4">{{ t('common.error') }}</p>
      <button
        @click="fetchData"
        class="flex items-center gap-2 px-4 py-2 bg-bg-elevate hover:bg-bg-surface border border-border rounded-lg text-sm text-text-primary hover:text-primary transition-colors"
      >
        <RefreshCw class="w-4 h-4" />
        {{ t('common.retry') }}
      </button>
    </div>

    <template v-else>
    <!-- 统计卡片 -->
    <section v-if="stats" class="space-y-4">
      <h2 class="text-xl font-bold text-text-primary flex items-center gap-2">
        <BarChart3 class="w-5 h-5 text-primary" />
        {{ t('home.stats.today') }}
      </h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div @click="router.push({ name: 'History' })" class="bg-bg-surface p-5 rounded-xl border border-border flex items-center gap-4 shadow-sm hover:border-primary/30 transition-all hover:bg-bg-elevate cursor-pointer">
          <div class="p-3 rounded-full bg-primary/10 text-primary">
            <Music2 class="w-6 h-6" />
          </div>
          <div>
            <div class="text-2xl font-bold text-text-primary">{{ stats.playback.total_plays.toLocaleString() }}</div>
            <div class="text-sm text-text-secondary">{{ t('home.stats.total_plays') }}</div>
          </div>
        </div>
        <div @click="router.push({ name: 'Songs' })" class="bg-bg-surface p-5 rounded-xl border border-border flex items-center gap-4 shadow-sm hover:border-pink-500/30 transition-all hover:bg-bg-elevate cursor-pointer">
          <div class="p-3 rounded-full bg-pink-500/10 text-pink-500">
            <Disc class="w-6 h-6" />
          </div>
          <div>
            <div class="text-2xl font-bold text-text-primary">{{ stats?.library.total_songs?.toLocaleString() }}</div>
            <div class="text-sm text-text-secondary">{{ t('home.stats.total_songs') }}</div>
          </div>
        </div>
         <div @click="router.push({ name: 'Stats' })" class="bg-bg-surface p-5 rounded-xl border border-border flex items-center gap-4 shadow-sm hover:border-emerald-500/30 transition-all hover:bg-bg-elevate cursor-pointer">
          <div class="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
            <BarChart3 class="w-6 h-6" />
          </div>
          <div>
            <div class="text-2xl font-bold text-text-primary">{{ stats?.playback.plays_last_7_days?.toLocaleString() }}</div>
            <div class="text-sm text-text-secondary">{{ t('home.stats.recent_7days') }}</div>
          </div>
        </div>
         <div @click="router.push({ name: 'Artists' })" class="bg-bg-surface p-5 rounded-xl border border-border flex items-center gap-4 shadow-sm hover:border-orange-500/30 transition-all hover:bg-bg-elevate cursor-pointer">
          <div class="p-3 rounded-full bg-orange-500/10 text-orange-500">
            <Users class="w-6 h-6" />
          </div>
          <div>
            <div class="text-2xl font-bold text-text-primary">{{ stats?.library.total_artists?.toLocaleString() }}</div>
            <div class="text-sm text-text-secondary">{{ t('home.stats.total_artists') }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 最近播放 -->
    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-text-primary flex items-center gap-2">
          <Clock class="w-5 h-5 text-primary" />
          {{ t('home.recent') }}
        </h2>
        <button class="text-sm text-primary hover:text-primary-hover transition-colors font-medium" @click="goViewAllRecent">{{ t('home.view_all') }}</button>
      </div>
      
      <div v-if="recentSongs.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          v-for="(song, index) in recentSongs" 
          :key="song.id || index"
          class="bg-bg-surface hover:bg-bg-elevate group rounded-lg p-3 flex items-center gap-4 transition-all cursor-pointer border border-border hover:border-primary/20"
          @click="playSong(song)"
        >
          <div class="relative w-14 h-14 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-md overflow-hidden flex-shrink-0 shadow-md">
             <CoverImage
               :cover-id="song.cover_id"
               size="small"
               lazy
               img-class="transition-transform duration-300 group-hover:scale-110"
             >
               <template #fallback>
                 <div class="w-full h-full flex items-center justify-center bg-bg-elevate">
                   <Music2 class="w-6 h-6 text-text-tertiary" />
                 </div>
               </template>
             </CoverImage>
             <!-- 悬停播放遮罩 -->
             <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <Play class="w-6 h-6 text-white fill-current" />
             </div>
          </div>
          <div class="overflow-hidden">
            <div class="font-medium text-text-primary truncate group-hover:text-primary transition-colors">{{ song.title }}</div>
            <div class="text-sm text-text-secondary truncate">{{ song.artist }}</div>
            <div class="text-xs text-text-tertiary mt-1">{{ formatTimeAgo(song.played_at) }}</div>
          </div>
        </div>
      </div>
      <div v-else class="flex flex-col items-center justify-center py-12 text-text-secondary border border-dashed border-border rounded-xl bg-bg-surface/50">
        <Inbox class="w-12 h-12 mb-3 text-text-tertiary" />
        <p class="text-sm font-medium">{{ t('common.no_data') }}</p>
      </div>
    </section>

    <!-- 为你推荐 -->
    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-text-primary flex items-center gap-2">
          <Disc class="w-5 h-5 text-accent" />
          {{ t('home.recommend') }}
        </h2>
        <button 
          @click="playAllRecommendations" 
          class="text-sm text-primary hover:text-primary-hover transition-colors font-medium"
        >
          {{ t('common.listen_now') }}
        </button>
      </div>
      
      <div v-if="recommendations.length > 0" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        <div 
          v-for="song in recommendations" 
          :key="song.id"
          class="group space-y-3 cursor-pointer"
          @click="playSong(song)"
        >
          <div class="relative aspect-square bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-xl overflow-hidden shadow-lg border border-border group-hover:border-primary/50 transition-all">
             <CoverImage
               :cover-id="song.cover_id"
               size="medium"
               lazy
               img-class="transition-transform duration-500 group-hover:scale-110"
             >
               <template #fallback>
                 <div class="w-full h-full flex items-center justify-center bg-bg-elevate">
                   <Music2 class="w-12 h-12 text-text-tertiary" />
                 </div>
               </template>
             </CoverImage>
             
             <button class="absolute bottom-3 right-3 w-12 h-12 bg-primary-gradient rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-110">
               <Play class="w-6 h-6 text-white fill-current ml-1" />
             </button>
          </div>
          <div class="px-1">
            <div class="font-semibold text-text-primary truncate group-hover:text-primary transition-colors">{{ song.title }}</div>
            <div class="text-sm text-text-secondary truncate">{{ song.artist }}</div>
          </div>
        </div>
      </div>
      <div v-else class="flex flex-col items-center justify-center py-12 text-text-secondary border border-dashed border-border rounded-xl bg-bg-surface/50">
        <Inbox class="w-12 h-12 mb-3 text-text-tertiary" />
        <p class="text-sm font-medium">{{ t('common.no_data') }}</p>
      </div>
    </section>
    </template>
  </div>
</template>
