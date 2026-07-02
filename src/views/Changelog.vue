<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ArrowUpCircle, RefreshCw, Package } from 'lucide-vue-next';
import { releasesApi, type ReleaseModule } from '@/api/releases';

const { t } = useI18n();

const appVersion = ref('');
const modules = ref<ReleaseModule[]>([]);
const isLoading = ref(false);

const changeTypeKeys = [
  'feature', 'fix', 'perf', 'refactor', 'docs', 'i18n', 'build', 'ci', 'style', 'test', 'chore',
] as const;

const typeColors: Record<string, string> = {
  feature: 'bg-emerald-500/10 text-emerald-600',
  fix: 'bg-red-500/10 text-red-600',
  perf: 'bg-blue-500/10 text-blue-600',
  refactor: 'bg-violet-500/10 text-violet-600',
  docs: 'bg-zinc-500/10 text-zinc-600',
  i18n: 'bg-teal-500/10 text-teal-600',
  build: 'bg-amber-500/10 text-amber-600',
  ci: 'bg-cyan-500/10 text-cyan-600',
  style: 'bg-pink-500/10 text-pink-600',
  test: 'bg-indigo-500/10 text-indigo-600',
  chore: 'bg-slate-500/10 text-slate-600',
};

const fetchReleases = async () => {
  isLoading.value = true;
  try {
    const { data } = await releasesApi.getReleases();
    appVersion.value = data.appVersion || '';
    modules.value = data.modules || [];
  } catch {
    appVersion.value = '';
    modules.value = [];
  } finally {
    isLoading.value = false;
  }
};

const formatDate = (iso: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
};

onMounted(fetchReleases);
</script>

<template>
  <div class="p-4 md:p-8 pb-24 max-w-4xl mx-auto animate-fade-in">
    <header class="mb-8">
      <h1 class="text-2xl md:text-3xl font-bold text-text-primary tracking-tight mb-2 flex items-center gap-3">
        <ArrowUpCircle class="w-8 h-8 text-primary" />
        {{ t('changelog.title') }}
      </h1>
      <p class="text-text-secondary text-sm">{{ t('changelog.settings_desc') }}</p>
    </header>

    <div v-if="isLoading" class="text-center py-16 text-text-secondary">
      <RefreshCw class="w-8 h-8 animate-spin mx-auto mb-3" />
      {{ t('changelog.loading') }}
    </div>

    <div v-else-if="!appVersion && modules.length === 0" class="text-center py-16 text-text-secondary">
      <Package class="w-12 h-12 mx-auto mb-3 text-text-tertiary" />
      {{ t('changelog.empty') }}
    </div>

    <div v-else class="space-y-8">
      <div class="bg-primary/5 rounded-2xl border border-primary/20 p-6 text-center">
        <p class="text-sm text-text-secondary mb-1">{{ t('changelog.app_version') }}</p>
        <p class="text-3xl font-bold text-primary font-mono">{{ appVersion || '-' }}</p>
      </div>

      <div v-for="mod in modules" :key="mod.id" class="bg-bg-surface rounded-2xl border border-border overflow-hidden">
        <div class="p-6 border-b border-border">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-text-primary">{{ mod.name }}</h2>
              <p v-if="mod.summary" class="text-sm text-text-secondary mt-1">{{ mod.summary }}</p>
            </div>
            <div class="text-right flex-shrink-0">
              <span class="font-mono text-sm bg-bg-elevate px-3 py-1 rounded-lg text-text-primary">{{ mod.version }}</span>
              <p v-if="mod.published_at" class="text-xs text-text-tertiary mt-1">{{ formatDate(mod.published_at) }}</p>
            </div>
          </div>
        </div>

        <div class="p-6 space-y-4">
          <template v-for="typeKey in changeTypeKeys" :key="typeKey">
            <div v-if="mod.changes?.[typeKey]?.length">
              <h3 class="text-xs font-semibold uppercase tracking-wider mb-2">
                <span class="px-2 py-0.5 rounded" :class="typeColors[typeKey]">
                  {{ t(`changelog.type.${typeKey}`) }}
                </span>
              </h3>
              <ul class="space-y-1.5">
                <li
                  v-for="(item, idx) in mod.changes[typeKey]"
                  :key="idx"
                  class="text-sm text-text-primary pl-3 border-l-2 border-border"
                >
                  {{ item }}
                </li>
              </ul>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
