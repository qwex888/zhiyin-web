<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import dayjs from 'dayjs';
import MainLayout from '@/components/layout/MainLayout.vue';
import ToastContainer from '@/components/common/ToastContainer.vue';
import { systemApi } from '@/api/system';
import { useToast } from '@/composables/useToast';
import { useSystemStore } from '@/stores/system';
import { useAuthStore } from '@/stores/auth';
import { useTheme } from '@/composables/useTheme';
import { usePlayerStore } from '@/stores/player';

const route = useRoute();
const toast = useToast();
const systemStore = useSystemStore();
const authStore = useAuthStore();
const playerStore = usePlayerStore();
const { locale, t } = useI18n();

useTheme();

const showMainLayout = computed(() => authStore.isAuthenticated && route.name !== 'Login');

watch(locale, (newLocale) => {
  if (newLocale === 'zh-CN') {
    dayjs.locale('zh-cn');
  } else {
    dayjs.locale('en');
  }
});

const checkHealth = async () => {
  try {
    await systemApi.getHealth();
    systemStore.setConnected(true);
  } catch (e) {
    systemStore.setConnected(false);
    toast.error(t('settings.backend_connect_failed'));
  }
};

onMounted(() => {
  if (authStore.isAuthenticated) {
    checkHealth();
  }
  playerStore.isPlaying = false;
});
</script>

<template>
  <MainLayout v-if="showMainLayout" />
  <router-view v-else />
  <ToastContainer />
</template>
