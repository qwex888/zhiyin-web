<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { historyApi } from '@/api/history';
import type { Song, RecentSong } from '@/types';
import { usePlayerStore } from '@/stores/player';
import { Calendar } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import VirtualSongList from '@/components/common/VirtualSongList.vue';

const playerStore = usePlayerStore();
const { t } = useI18n();
const songs = ref<RecentSong[]>([]);
const isLoading = ref(false);
const hasError = ref(false);

const fetchHistory = async () => {
  isLoading.value = true;
  hasError.value = false;
  try {
    const { data: historyList } = await historyApi.getRecentSongs();
    songs.value = historyList;
  } catch (e) {
    console.error(t('common.error'), e);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const playSong = (song: Song) => {
  playerStore.play(song);
};

onMounted(() => {
  fetchHistory();
});
</script>

<template>
  <div class="flex flex-col h-full p-4 md:p-8 overflow-hidden">
    <header class="flex-none flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold text-text-primary flex items-center gap-3">
        <Calendar class="w-8 h-8 text-primary" />
        {{ t('nav.history') }}
      </h1>
    </header>

    <div class="flex-1 overflow-hidden">
      <VirtualSongList 
        :songs="songs" 
        :is-loading="isLoading"
        :has-error="hasError"
        :show-album="false"
        :show-played-at="true"
        @play="playSong"
        @retry="fetchHistory"
      />
    </div>
  </div>
</template>
