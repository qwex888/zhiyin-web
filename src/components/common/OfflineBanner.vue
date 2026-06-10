<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { CloudOff, WifiOff } from 'lucide-vue-next';
import { useAppConnectivity } from '@/offline/network';

const { t } = useI18n();
const { isOffline, statusLabel } = useAppConnectivity();
</script>

<template>
  <div
    v-if="isOffline"
    class="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-amber-500/15 border-b border-amber-500/25 text-amber-100"
    role="status"
  >
    <WifiOff v-if="statusLabel === 'offline'" class="w-4 h-4 flex-shrink-0" />
    <CloudOff v-else class="w-4 h-4 flex-shrink-0" />
    <span>
      {{
        statusLabel === 'offline'
          ? t('offline.banner_no_network')
          : t('offline.banner_backend_down')
      }}
    </span>
  </div>
</template>
