
<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { systemApi, type DirEntry } from '@/api/system';
import { useToast } from '@/composables/useToast';
import { FolderOpen, FolderPlus, ArrowLeft, ChevronRight, X, Check, Loader2, Home } from 'lucide-vue-next';

const props = defineProps<{
  visible: boolean;
  initialPath?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', path: string): void;
}>();

const { t } = useI18n();
const toast = useToast();

const currentPath = ref('/');
const parentPath = ref<string | null>(null);
const entries = ref<DirEntry[]>([]);
const isLoading = ref(false);
const showNewFolder = ref(false);
const newFolderName = ref('');
const isCreating = ref(false);

const browse = async (path: string) => {
  isLoading.value = true;
  try {
    const { data } = await systemApi.browseDir(path);
    currentPath.value = data.current;
    parentPath.value = data.parent;
    entries.value = data.entries;
  } catch (e: any) {
    toast.error(e.response?.data?.message || t('common.error'));
  } finally {
    isLoading.value = false;
  }
};

const goUp = () => {
  if (parentPath.value) {
    browse(parentPath.value);
  }
};

const enterDir = (entry: DirEntry) => {
  browse(entry.path);
};

const confirmSelect = () => {
  emit('select', currentPath.value);
  emit('close');
};

const createFolder = async () => {
  if (!newFolderName.value.trim()) return;
  isCreating.value = true;
  try {
    const fullPath = currentPath.value === '/'
      ? `/${newFolderName.value.trim()}`
      : `${currentPath.value}/${newFolderName.value.trim()}`;
    await systemApi.mkdir(fullPath);
    toast.success(t('settings.dir_created'));
    newFolderName.value = '';
    showNewFolder.value = false;
    await browse(currentPath.value);
  } catch (e: any) {
    toast.error(e.response?.data?.message || t('common.error'));
  } finally {
    isCreating.value = false;
  }
};

watch(() => props.visible, (v) => {
  if (v) {
    showNewFolder.value = false;
    newFolderName.value = '';
    const startPath = props.initialPath || '/';
    browse(startPath);
  }
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div class="bg-bg-surface sm:rounded-2xl rounded-t-2xl border border-border shadow-2xl w-full sm:max-w-lg sm:mx-4 flex flex-col max-h-[90vh] sm:max-h-[80vh] animate-fade-in">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 sm:p-4 border-b border-border flex-shrink-0">
          <div class="flex items-center gap-2 min-w-0">
            <FolderOpen class="w-5 h-5 text-primary flex-shrink-0" />
            <h3 class="text-base font-semibold text-text-primary truncate">{{ t('settings.select_directory') }}</h3>
          </div>
          <button @click="emit('close')" class="p-2 -mr-1 rounded-lg hover:bg-bg-elevate text-text-secondary hover:text-text-primary transition-colors flex-shrink-0">
            <X class="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        <!-- Current path bar -->
        <div class="px-4 py-2.5 bg-bg-elevate/50 border-b border-border flex items-center gap-2 text-sm flex-shrink-0 min-w-0">
          <button
            @click="browse('/')"
            class="p-1.5 rounded hover:bg-bg-elevate text-text-secondary hover:text-primary transition-colors flex-shrink-0"
            :title="t('settings.go_root')"
          >
            <Home class="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
          <span class="text-text-primary font-mono text-xs truncate flex-1 select-all" :title="currentPath">{{ currentPath }}</span>
        </div>

        <!-- Directory list -->
        <div class="flex-1 overflow-y-auto min-h-0 overscroll-contain">
          <div v-if="isLoading" class="flex items-center justify-center py-16">
            <Loader2 class="w-6 h-6 animate-spin text-primary" />
          </div>

          <div v-else>
            <!-- Go up -->
            <button
              v-if="parentPath"
              @click="goUp"
              class="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 hover:bg-bg-elevate active:bg-bg-elevate transition-colors text-left border-b border-border/50"
            >
              <ArrowLeft class="w-5 h-5 sm:w-4 sm:h-4 text-text-secondary flex-shrink-0" />
              <span class="text-sm text-text-secondary">..</span>
            </button>

            <!-- Directories -->
            <button
              v-for="entry in entries"
              :key="entry.path"
              @click="enterDir(entry)"
              class="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 hover:bg-bg-elevate active:bg-bg-elevate transition-colors text-left group border-b border-border/30 last:border-b-0"
            >
              <FolderOpen class="w-5 h-5 sm:w-4 sm:h-4 text-amber-500 flex-shrink-0" />
              <span class="text-sm text-text-primary truncate flex-1">{{ entry.name }}</span>
              <ChevronRight class="w-4 h-4 sm:w-3.5 sm:h-3.5 text-text-tertiary sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>

            <!-- Empty state -->
            <div v-if="entries.length === 0 && !isLoading" class="py-12 text-center text-text-tertiary text-sm">
              {{ t('settings.dir_empty') }}
            </div>
          </div>
        </div>

        <!-- New folder row -->
        <div v-if="showNewFolder" class="px-4 py-3 border-t border-border flex items-center gap-2 flex-shrink-0">
          <input
            v-model="newFolderName"
            type="text"
            :placeholder="t('settings.new_folder_name')"
            class="flex-1 min-w-0 p-2.5 sm:p-2 bg-bg-elevate rounded-lg border border-border text-text-primary text-sm focus:border-primary outline-none"
            @keyup.enter="createFolder"
            autofocus
          />
          <button
            @click="createFolder"
            :disabled="!newFolderName.trim() || isCreating"
            class="p-2.5 sm:px-3 sm:py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Loader2 v-if="isCreating" class="w-4 h-4 animate-spin" />
            <Check v-else class="w-4 h-4" />
          </button>
          <button
            @click="showNewFolder = false; newFolderName = ''"
            class="p-2.5 sm:px-3 sm:py-2 rounded-lg bg-bg-elevate text-text-secondary text-sm hover:bg-bg-surface border border-border transition-colors flex-shrink-0"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-border bg-bg-elevate/30 flex-shrink-0 space-y-3 sm:space-y-0">
          <!-- Mobile: stacked layout / Desktop: horizontal layout -->
          <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-between gap-2 sm:gap-3">
            <button
              @click="showNewFolder = !showNewFolder"
              class="flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2.5 sm:py-2 rounded-lg text-sm text-text-secondary hover:text-primary hover:bg-bg-elevate border border-border transition-colors"
            >
              <FolderPlus class="w-4 h-4" />
              {{ t('settings.new_folder') }}
            </button>
            <div class="flex items-center gap-2">
              <button
                @click="emit('close')"
                class="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium bg-bg-elevate text-text-secondary hover:bg-bg-surface border border-border transition-colors"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                @click="confirmSelect"
                class="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover shadow-sm transition-colors"
              >
                {{ t('settings.select_this_dir') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
