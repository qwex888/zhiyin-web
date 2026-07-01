<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Users, Plus, Trash2, Shield, RefreshCw, Eye, EyeOff, AlertTriangle } from 'lucide-vue-next';
import { usersApi } from '@/api/users';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import type { AuthUser } from '@/api/auth';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const users = ref<AuthUser[]>([]);
const isLoading = ref(false);
const isCreating = ref(false);
const isDeleting = ref<number | null>(null);
const showCreateForm = ref(false);
const showPassword = ref(false);
const showTransferModal = ref(false);
const transferTarget = ref<AuthUser | null>(null);
const isTransferring = ref(false);

const createForm = ref({
  username: '',
  password: '',
  display_name: '',
});

const fetchUsers = async () => {
  isLoading.value = true;
  try {
    const { data } = await usersApi.list();
    users.value = data;
  } catch {
    toast.error(t('common.error'));
  } finally {
    isLoading.value = false;
  }
};

const handleCreate = async () => {
  if (!createForm.value.username.trim() || !createForm.value.password) {
    toast.error(t('users.fields_required'));
    return;
  }
  isCreating.value = true;
  try {
    await usersApi.create({
      username: createForm.value.username.trim(),
      password: createForm.value.password,
      display_name: createForm.value.display_name.trim() || undefined,
    });
    toast.success(t('users.create_success'));
    createForm.value = { username: '', password: '', display_name: '' };
    showCreateForm.value = false;
    await fetchUsers();
  } catch (e: any) {
    toast.error(e.response?.data?.message || t('common.error'));
  } finally {
    isCreating.value = false;
  }
};

const handleDelete = async (user: AuthUser) => {
  if (user.role === 'admin') return;
  if (!confirm(t('users.delete_confirm', { name: user.username }))) return;
  isDeleting.value = user.id;
  try {
    await usersApi.delete(user.id);
    toast.success(t('users.delete_success'));
    await fetchUsers();
  } catch (e: any) {
    toast.error(e.response?.data?.message || t('common.error'));
  } finally {
    isDeleting.value = null;
  }
};

const openTransferModal = (user: AuthUser) => {
  transferTarget.value = user;
  showTransferModal.value = true;
};

const handleTransfer = async () => {
  if (!transferTarget.value) return;
  isTransferring.value = true;
  try {
    await usersApi.transferAdmin(transferTarget.value.id);
    toast.success(t('users.transfer_success'));
    showTransferModal.value = false;
    authStore.logout();
    router.replace({ name: 'Login' });
  } catch (e: any) {
    toast.error(e.response?.data?.message || t('common.error'));
  } finally {
    isTransferring.value = false;
  }
};

const regularUsers = computed(() => users.value.filter(u => u.role !== 'admin'));
const adminUser = computed(() => users.value.find(u => u.role === 'admin'));

onMounted(() => {
  if (!authStore.isAdmin) {
    router.replace({ name: 'Home' });
    return;
  }
  fetchUsers();
});
</script>

<template>
  <div class="p-4 md:p-8 pb-24 max-w-4xl mx-auto animate-fade-in">
    <header class="mb-8">
      <h1 class="text-2xl md:text-3xl font-bold text-text-primary tracking-tight mb-2 flex items-center gap-3">
        <Users class="w-8 h-8 text-primary" />
        {{ t('users.title') }}
      </h1>
      <p class="text-text-secondary text-sm">{{ t('users.subtitle') }}</p>
    </header>

    <div class="flex items-center justify-between mb-6">
      <button
        @click="showCreateForm = !showCreateForm"
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary hover:bg-primary-hover text-white transition-colors"
      >
        <Plus class="w-4 h-4" />
        {{ t('users.add_user') }}
      </button>
      <button
        @click="fetchUsers"
        :disabled="isLoading"
        class="p-2 rounded-lg hover:bg-bg-elevate text-text-secondary hover:text-primary transition-colors"
        :class="{ 'animate-spin': isLoading }"
      >
        <RefreshCw class="w-4 h-4" />
      </button>
    </div>

    <div
      v-if="showCreateForm"
      class="mb-6 bg-bg-surface rounded-2xl border border-border p-6 space-y-4"
    >
      <h3 class="text-sm font-medium text-text-primary">{{ t('users.add_user') }}</h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs text-text-secondary mb-1">{{ t('users.username') }}</label>
          <input v-model="createForm.username" type="text"
            class="w-full p-2.5 bg-bg-elevate rounded-lg border border-border text-text-primary text-sm focus:border-primary outline-none" />
        </div>
        <div>
          <label class="block text-xs text-text-secondary mb-1">{{ t('users.password') }}</label>
          <div class="relative">
            <input v-model="createForm.password" :type="showPassword ? 'text' : 'password'"
              class="w-full p-2.5 pr-10 bg-bg-elevate rounded-lg border border-border text-text-primary text-sm focus:border-primary outline-none" />
            <button type="button" @click="showPassword = !showPassword"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary">
              <EyeOff v-if="showPassword" class="w-4 h-4" />
              <Eye v-else class="w-4 h-4" />
            </button>
          </div>
        </div>
        <div>
          <label class="block text-xs text-text-secondary mb-1">{{ t('users.display_name') }}</label>
          <input v-model="createForm.display_name" type="text"
            class="w-full p-2.5 bg-bg-elevate rounded-lg border border-border text-text-primary text-sm focus:border-primary outline-none" />
        </div>
      </div>
      <button
        @click="handleCreate"
        :disabled="isCreating"
        class="px-6 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
      >
        {{ isCreating ? t('common.loading') : t('users.create') }}
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-12 text-text-secondary">
      <RefreshCw class="w-6 h-6 animate-spin mx-auto mb-2" />
      {{ t('common.loading') }}
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="user in users"
        :key="user.id"
        class="bg-bg-surface rounded-2xl border border-border p-4 flex items-center gap-4"
      >
        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Shield v-if="user.role === 'admin'" class="w-5 h-5 text-primary" />
          <span v-else class="text-sm font-bold text-primary uppercase">{{ user.username.charAt(0) }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-text-primary truncate">{{ user.display_name || user.username }}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full"
              :class="user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-bg-elevate text-text-secondary'">
              {{ user.role }}
            </span>
          </div>
          <p class="text-xs text-text-secondary truncate">{{ user.username }}</p>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            v-if="user.role !== 'admin' && adminUser?.id === authStore.user?.id"
            @click="openTransferModal(user)"
            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20"
          >
            {{ t('users.transfer_admin') }}
          </button>
          <button
            v-if="user.role !== 'admin'"
            @click="handleDelete(user)"
            :disabled="isDeleting === user.id"
            class="p-2 rounded-lg hover:bg-red-500/10 text-text-tertiary hover:text-red-500 transition-colors"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showTransferModal && transferTarget"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="showTransferModal = false"
      >
        <div class="bg-bg-surface rounded-2xl border border-amber-500/30 shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle class="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h4 class="text-lg font-semibold text-text-primary">{{ t('users.transfer_title') }}</h4>
              <p class="text-xs text-text-secondary">{{ t('users.transfer_desc', { name: transferTarget.username }) }}</p>
            </div>
          </div>
          <div class="flex gap-3">
            <button
              @click="showTransferModal = false"
              class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-bg-elevate text-text-secondary border border-border"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              @click="handleTransfer"
              :disabled="isTransferring"
              class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {{ isTransferring ? t('common.loading') : t('users.transfer_confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
