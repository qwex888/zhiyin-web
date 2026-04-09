
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { Settings, Globe, Palette, Monitor, Moon, Sun, RefreshCw, CheckCircle2, XCircle, Sliders, Save, HardDrive, Music, Shield, Plus, Trash2, Sparkles, Lock, Eye, EyeOff, KeyRound, ChevronRight } from 'lucide-vue-next';
import { useTheme } from '@/composables/useTheme';
import { usePlayerStore } from '@/stores/player';
import { useSystemStore } from '@/stores/system';
import { useAuthStore } from '@/stores/auth';
import { systemApi, type HealthInfo } from '@/api/system';
import { authApi } from '@/api/auth';
import { useToast } from '@/composables/useToast';
import { ref, onMounted, onUnmounted, reactive, computed } from 'vue';
import type { SystemConfig, UpdateConfigParams } from '@/types/config';
import type { ScanSnapshot } from '@/types';
import dayjs from 'dayjs';
import logoUrl from '@/assets/logo.svg';

const { t, locale } = useI18n();
const { theme, setTheme } = useTheme();
const playerStore = usePlayerStore();
const systemStore = useSystemStore();
const authStore = useAuthStore();

const qualityOptions = [
  { value: 'low', short: '128k' },
  { value: 'medium', short: '192k' },
  { value: 'high', short: '320k' },
  { value: 'lossless', short: 'FLAC' },
  { value: 'original', short: 'ORI' },
] as const;
const toast = useToast();
const isChecking = ref(false);
const healthInfo = ref<HealthInfo | null>(null);
const isLoadingConfig = ref(true);
const isSaving = ref(false);
const scanStatus = ref<ScanSnapshot | null>(null);
let scanPollTimer: ReturnType<typeof setInterval> | null = null;
const config = ref<SystemConfig | null>(null);
const newRootPath = ref('');

const isScanning = computed(() => scanStatus.value?.scanning === true);

const scanProgressPercent = computed(() => {
  if (!scanStatus.value || !isScanning.value) return 0;
  const { processed, files_to_process } = scanStatus.value;
  if (files_to_process <= 0) return 0;
  return Math.min(Math.round((processed / files_to_process) * 100), 100);
});

const lastScanTime = computed(() => {
  if (!scanStatus.value?.finished_at) return t('settings.never');
  return dayjs(scanStatus.value.finished_at).format('YYYY-MM-DD HH:mm:ss');
});

// Form state
const formState = reactive({
  logging: {
    level: 'info',
    modules: [] as string[]
  },
  maintenance: {
    enabled: false,
    enable_vacuum: false,
    history_retention_days: 0,
    interval_hours: 0,
    recommendation_retention_days: 0,
    vacuum_threshold: 0
  },
  recommend: {
    job_interval_hours: 0,
    max_results: 0,
    play_threshold: 0
  },
  scan: {
    interval_hours: 0,
    min_file_size: 1024,
    mode: '',
    roots: [] as string[],
    skip_small_files: true
  },
  security: {
    token_expiry_hours: 168,
    cors_origins: [] as string[],
    login_rate_limit: 10,
    login_rate_window_secs: 300,
    stream_token_ttl_secs: 60
  },
  subsonic: {
    enabled: true
  },
  transcode: {
    cache_strategy: 'smart',
    cache_threshold: 0,
    enabled: false,
    max_concurrent_transcodes: 0
  },
  web: {
    enabled: true
  }
});

const corsOriginsInput = ref('');
const loggingModulesInput = ref('');

const savedFormSnapshot = ref('');

const takeFormSnapshot = () => {
  savedFormSnapshot.value = JSON.stringify({
    logging: formState.logging,
    maintenance: formState.maintenance,
    recommend: formState.recommend,
    scan: formState.scan,
    security: formState.security,
    subsonic: formState.subsonic,
    transcode: formState.transcode,
    web: formState.web,
  });
};

const hasConfigChanged = computed(() => {
  if (!savedFormSnapshot.value) return false;
  const current = JSON.stringify({
    logging: formState.logging,
    maintenance: formState.maintenance,
    recommend: formState.recommend,
    scan: formState.scan,
    security: formState.security,
    subsonic: formState.subsonic,
    transcode: formState.transcode,
    web: formState.web,
  });
  return current !== savedFormSnapshot.value;
});

const changeLanguage = (lang: string) => {
  locale.value = lang;
};

const addRoot = () => {
  if (newRootPath.value && !formState.scan.roots.includes(newRootPath.value)) {
    formState.scan.roots.push(newRootPath.value);
    newRootPath.value = '';
  }
};

const removeRoot = (index: number) => {
  formState.scan.roots.splice(index, 1);
};

const checkHealth = async (showToast = false) => {
  if (isChecking.value) return;
  isChecking.value = true;
  try {
    const { data } = await systemApi.getHealth();
    healthInfo.value = data;
    systemStore.setConnected(true);
    if (showToast) {
      toast.success(t('settings.backend_connected_success'));
    }
  } catch (e) {
    systemStore.setConnected(false);
    healthInfo.value = null;
    if (showToast) {
      toast.error(t('settings.backend_connect_failed'));
    }
  } finally {
    isChecking.value = false;
  }
};

const fetchConfig = async () => {
  isLoadingConfig.value = true;
  try {
    const { data } = await systemApi.getConfig();
    config.value = data;
    
    // Initialize form state
    if (data) {
      Object.assign(formState.logging, data.logging);
      Object.assign(formState.maintenance, data.maintenance);
      Object.assign(formState.recommend, data.recommend);
      Object.assign(formState.scan, data.scan);
      Object.assign(formState.security, data.security);
      Object.assign(formState.subsonic, data.subsonic);
      Object.assign(formState.transcode, data.transcode);
      Object.assign(formState.web, data.web);

      corsOriginsInput.value = (data.security?.cors_origins || []).join(', ');
      loggingModulesInput.value = (data.logging?.modules || []).join(', ');
      takeFormSnapshot();
    }
  } catch (e) {
    console.error(e);
    toast.error(t('common.error'));
  } finally {
    isLoadingConfig.value = false;
  }
};

const saveConfig = async () => {
  isSaving.value = true;
  try {
    const updateParams: UpdateConfigParams = {
      logging: {
        ...formState.logging,
        modules: loggingModulesInput.value
          .split(',')
          .map(v => v.trim())
          .filter(Boolean)
      },
      maintenance: formState.maintenance,
      recommend: formState.recommend,
      scan: formState.scan,
      security: {
        ...formState.security,
        cors_origins: corsOriginsInput.value
          .split(',')
          .map(v => v.trim())
          .filter(Boolean)
      },
      subsonic: formState.subsonic,
      transcode: formState.transcode,
      web: formState.web
    };
    
    await systemApi.updateConfig(updateParams);
    toast.success(t('settings.config_saved'));
    await fetchConfig(); // Refresh config to get updated state
  } catch (e) {
    console.error(e);
    toast.error(t('common.error'));
  } finally {
    isSaving.value = false;
  }
};

const fetchScanStatus = async () => {
  try {
    const { data } = await systemApi.getScanStatus();
    scanStatus.value = data;
    if (data.scanning) {
      startScanPolling();
    } else {
      stopScanPolling();
    }
  } catch (e) {
    console.error(e);
  }
};

const startScanPolling = () => {
  if (scanPollTimer) return;
  scanPollTimer = setInterval(fetchScanStatus, 5000);
};

const stopScanPolling = () => {
  if (scanPollTimer) {
    clearInterval(scanPollTimer);
    scanPollTimer = null;
  }
};

const triggerScan = async () => {
  if (isScanning.value) return;
  try {
    await systemApi.triggerScan();
    toast.success(t('settings.scan_started'));
    await fetchScanStatus();
  } catch (e) {
    console.error(e);
    toast.error(t('common.error'));
  }
};

// Password change
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});
const isChangingPassword = ref(false);
const showPasswordForm = ref(false);
const showOldPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const passwordValidation = computed(() => {
  const { oldPassword, newPassword, confirmPassword } = passwordForm;
  if (!oldPassword || !newPassword || !confirmPassword) return null;
  if (newPassword.length < 8) return t('auth.password_too_short', { min: 8 });
  if (!/[a-zA-Z]/.test(newPassword)) return t('auth.password_need_letter');
  if (!/\d/.test(newPassword)) return t('auth.password_need_digit');
  if (newPassword !== confirmPassword) return t('auth.password_mismatch');
  return '';
});

const canSubmitPassword = computed(() => {
  const { oldPassword, newPassword, confirmPassword } = passwordForm;
  return oldPassword && newPassword && confirmPassword && passwordValidation.value === '';
});

const changePassword = async () => {
  if (!canSubmitPassword.value) {
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error(t('settings.fields_incomplete'));
    } else if (passwordValidation.value) {
      toast.error(passwordValidation.value);
    }
    return;
  }
  isChangingPassword.value = true;
  try {
    await authApi.changePassword(passwordForm.oldPassword, passwordForm.newPassword);
    toast.success(t('settings.password_changed'));
    passwordForm.oldPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
    showOldPassword.value = false;
    showNewPassword.value = false;
    showConfirmPassword.value = false;
    showPasswordForm.value = false;
  } catch (e: any) {
    if (e.response?.status === 400 || e.response?.status === 401) {
      toast.error(t('settings.wrong_password'));
    } else {
      toast.error(t('settings.password_change_failed'));
    }
  } finally {
    isChangingPassword.value = false;
  }
};

onMounted(() => {
  checkHealth();
  fetchConfig();
  fetchScanStatus();
});

onUnmounted(() => {
  stopScanPolling();
});
</script>

<template>
  <div class="p-4 md:p-8 pb-24 max-w-5xl mx-auto animate-fade-in">
    <header class="mb-8 md:mb-12">
      <div class="flex flex-col items-center gap-2 mb-6">
        <img :src="logoUrl" alt="Logo" class="w-14 h-14 md:w-16 md:h-16 drop-shadow-lg" />
        <span class="text-lg md:text-xl font-bold tracking-widest text-primary">{{ t('settings.app_name') }}</span>
      </div>
      <div class="text-center md:text-left">
        <h1 class="text-3xl md:text-4xl font-bold text-text-primary tracking-tight mb-2 flex items-center justify-center md:justify-start gap-3">
          <Settings class="w-8 h-8 md:w-10 md:h-10 text-primary" />
          {{ t('settings.title') }}
        </h1>
        <p class="text-text-secondary text-sm md:text-base max-w-2xl">
          {{ t('settings.subtitle') }}
        </p>
      </div>
    </header>

    <div class="space-y-8">

      <!-- Account Security -->
      <section>
        <h3 class="text-lg font-semibold text-text-primary border-b border-border pb-2 mb-6 flex items-center gap-2">
          <Lock class="w-5 h-5 text-emerald-500" />
          {{ t('settings.account_security') }}
        </h3>

        <div class="bg-bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
          <!-- User Info Bar -->
          <div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div class="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-gradient flex items-center justify-center shadow-md shadow-primary/15 flex-shrink-0">
                <span class="text-lg sm:text-xl font-bold text-white uppercase">{{ authStore.user?.username?.charAt(0) || '?' }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm sm:text-base font-semibold text-text-primary truncate">{{ authStore.user?.display_name || authStore.user?.username || '-' }}</h3>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-xs text-text-secondary truncate">{{ authStore.user?.username }}</span>
                  <span class="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                    :class="authStore.user?.role === 'admin'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-bg-elevate text-text-secondary'"
                  >{{ authStore.user?.role || '-' }}</span>
                </div>
              </div>
            </div>
            <button
              @click="showPasswordForm = !showPasswordForm"
              class="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 w-full sm:w-auto flex-shrink-0"
              :class="showPasswordForm
                ? 'bg-primary text-white shadow-sm'
                : 'bg-bg-elevate text-text-primary hover:bg-primary hover:text-white border border-border'"
            >
              <KeyRound class="w-4 h-4" />
              {{ t('settings.change_password') }}
              <ChevronRight
                class="w-4 h-4 transition-transform duration-300"
                :class="showPasswordForm ? 'rotate-90' : ''"
              />
            </button>
          </div>

          <!-- Expandable Password Form -->
          <div
            class="grid transition-all duration-300 ease-in-out"
            :class="showPasswordForm ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
          >
            <div class="overflow-hidden">
              <div class="px-5 pb-5 pt-1 border-t border-border">
                <p class="text-xs text-text-secondary mb-4 mt-3">{{ t('settings.change_password_desc') }}</p>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <!-- Current Password -->
                  <div>
                    <label class="block text-text-secondary text-xs mb-1.5">{{ t('settings.current_password') }}</label>
                    <div class="relative">
                      <input
                        v-model="passwordForm.oldPassword"
                        :type="showOldPassword ? 'text' : 'password'"
                        :placeholder="t('settings.current_password_placeholder')"
                        class="w-full p-2.5 pr-10 bg-bg-elevate rounded-lg border border-border text-text-primary focus:border-primary outline-none transition-colors text-sm"
                      />
                      <button
                        type="button"
                        @click="showOldPassword = !showOldPassword"
                        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <EyeOff v-if="showOldPassword" class="w-4 h-4" />
                        <Eye v-else class="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <!-- New Password -->
                  <div>
                    <label class="block text-text-secondary text-xs mb-1.5">{{ t('settings.new_password') }}</label>
                    <div class="relative">
                      <input
                        v-model="passwordForm.newPassword"
                        :type="showNewPassword ? 'text' : 'password'"
                        :placeholder="t('settings.new_password_placeholder')"
                        class="w-full p-2.5 pr-10 bg-bg-elevate rounded-lg border border-border text-text-primary focus:border-primary outline-none transition-colors text-sm"
                      />
                      <button
                        type="button"
                        @click="showNewPassword = !showNewPassword"
                        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <EyeOff v-if="showNewPassword" class="w-4 h-4" />
                        <Eye v-else class="w-4 h-4" />
                      </button>
                    </div>
                    <p class="text-[10px] text-text-tertiary mt-1">{{ t('auth.password_hint') }}</p>
                  </div>

                  <!-- Confirm New Password -->
                  <div>
                    <label class="block text-text-secondary text-xs mb-1.5">{{ t('settings.confirm_new_password') }}</label>
                    <div class="relative">
                      <input
                        v-model="passwordForm.confirmPassword"
                        :type="showConfirmPassword ? 'text' : 'password'"
                        :placeholder="t('settings.confirm_new_password_placeholder')"
                        class="w-full p-2.5 pr-10 bg-bg-elevate rounded-lg border border-border text-text-primary focus:border-primary outline-none transition-colors text-sm"
                        @keyup.enter="changePassword"
                      />
                      <button
                        type="button"
                        @click="showConfirmPassword = !showConfirmPassword"
                        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <EyeOff v-if="showConfirmPassword" class="w-4 h-4" />
                        <Eye v-else class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Validation + Submit row -->
                <div class="flex items-center justify-between mt-4 gap-4">
                  <p
                    v-if="passwordValidation && passwordValidation !== ''"
                    class="text-xs text-red-500 flex items-center gap-1 flex-1"
                  >
                    <XCircle class="w-3.5 h-3.5 flex-shrink-0" />
                    {{ passwordValidation }}
                  </p>
                  <div v-else class="flex-1"></div>
                  <button
                    @click="changePassword"
                    :disabled="!canSubmitPassword || isChangingPassword"
                    class="px-6 py-2.5 rounded-xl font-medium transition-all text-sm flex items-center gap-2 active:scale-[0.98] flex-shrink-0"
                    :class="canSubmitPassword && !isChangingPassword
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30'
                      : 'bg-bg-elevate text-text-tertiary cursor-not-allowed'"
                  >
                    <RefreshCw v-if="isChangingPassword" class="w-4 h-4 animate-spin" />
                    <Lock v-else class="w-4 h-4" />
                    {{ isChangingPassword ? t('settings.password_changing') : t('settings.change_password') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Appearance & Interface -->
      <section class="space-y-6">
        <h3 class="text-lg font-semibold text-text-primary border-b border-border pb-2 mb-4 flex items-center gap-2">
           <Palette class="w-5 h-5 text-accent-orange" />
           {{ t('settings.appearance') }}
        </h3>
        
        <div class="flex flex-wrap gap-6">
          <!-- Theme Selection -->
          <div class="flex-1 min-w-[300px] bg-bg-surface rounded-2xl border border-border overflow-hidden hover:border-primary/20 transition-colors shadow-sm">
            <div class="p-6">
              <h2 class="text-base font-medium text-text-primary mb-4">{{ t('settings.theme') }}</h2>
              <div class="grid grid-cols-2 gap-4">
                <button 
                  @click="setTheme('light')"
                  class="group relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300"
                  :class="theme === 'light' ? 'bg-zinc-50 border-primary shadow-inner' : 'bg-bg-main border-transparent hover:bg-bg-elevate'"
                >
                  <div class="w-full aspect-video bg-white rounded-lg border border-zinc-200 shadow-sm flex items-center justify-center overflow-hidden">
                     <div class="w-3/4 h-3/4 bg-zinc-50 rounded-md flex flex-col gap-1 p-2">
                        <div class="w-1/3 h-2 bg-zinc-200 rounded-full"></div>
                        <div class="w-full h-16 bg-zinc-100 rounded-md mt-1"></div>
                     </div>
                  </div>
                  <div class="flex items-center gap-2">
                     <Sun class="w-4 h-4" :class="theme === 'light' ? 'text-primary' : 'text-text-secondary'" />
                     <span class="text-sm font-medium" :class="theme === 'light' ? 'text-primary' : 'text-text-secondary'">{{ t('settings.light') }}</span>
                  </div>
                  <div v-if="theme === 'light'" class="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary"></div>
                </button>

                <button 
                  @click="setTheme('dark')"
                  class="group relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300"
                  :class="theme === 'dark' ? 'bg-zinc-900 border-primary shadow-inner' : 'bg-bg-main border-transparent hover:bg-bg-elevate'"
                >
                   <div class="w-full aspect-video bg-zinc-950 rounded-lg border border-zinc-800 shadow-sm flex items-center justify-center overflow-hidden">
                     <div class="w-3/4 h-3/4 bg-zinc-900 rounded-md flex flex-col gap-1 p-2">
                        <div class="w-1/3 h-2 bg-zinc-700 rounded-full"></div>
                        <div class="w-full h-16 bg-zinc-800 rounded-md mt-1"></div>
                     </div>
                  </div>
                  <div class="flex items-center gap-2">
                     <Moon class="w-4 h-4" :class="theme === 'dark' ? 'text-primary' : 'text-text-secondary'" />
                     <span class="text-sm font-medium" :class="theme === 'dark' ? 'text-primary' : 'text-text-secondary'">{{ t('settings.dark') }}</span>
                  </div>
                  <div v-if="theme === 'dark'" class="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary"></div>
                </button>
              </div>
            </div>
          </div>

          <!-- Language Selection -->
          <div class="flex-1 min-w-[300px] bg-bg-surface rounded-2xl border border-border overflow-hidden hover:border-primary/20 transition-colors shadow-sm">
             <div class="p-6">
                <h2 class="text-base font-medium text-text-primary mb-4 flex items-center gap-2">
                   <Globe class="w-4 h-4 text-accent-blue" />
                   {{ t('settings.language') }}
                </h2>
                <div class="grid grid-cols-2 gap-4">
                   <button 
                      @click="changeLanguage('zh-CN')"
                      class="group relative flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300"
                      :class="locale === 'zh-CN' ? 'bg-bg-elevate border-primary shadow-sm' : 'bg-bg-main border-transparent hover:bg-bg-elevate'"
                   >
                      <span class="font-medium" :class="locale === 'zh-CN' ? 'text-primary' : 'text-text-primary'">中文</span>
                      <div v-if="locale === 'zh-CN'" class="w-2 h-2 rounded-full bg-primary"></div>
                   </button>

                   <button 
                      @click="changeLanguage('en-US')"
                      class="group relative flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300"
                      :class="locale === 'en-US' ? 'bg-bg-elevate border-primary shadow-sm' : 'bg-bg-main border-transparent hover:bg-bg-elevate'"
                   >
                      <span class="font-medium" :class="locale === 'en-US' ? 'text-primary' : 'text-text-primary'">English</span>
                      <div v-if="locale === 'en-US'" class="w-2 h-2 rounded-full bg-primary"></div>
                   </button>
                </div>
             </div>
          </div>

          <!-- Quality Selection -->
          <div class="flex-1 min-w-[300px] bg-bg-surface rounded-2xl border border-border overflow-hidden hover:border-primary/20 transition-colors shadow-sm">
            <div class="p-6">
              <h2 class="text-base font-medium text-text-primary mb-4 flex items-center gap-2">
                <Music class="w-4 h-4 text-accent" />
                {{ t('player.quality_title') }}
              </h2>
              <div class="grid grid-cols-3 gap-3">
                <button
                  v-for="opt in qualityOptions"
                  :key="opt.value"
                  @click="playerStore.quality = opt.value"
                  class="group relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-300"
                  :class="playerStore.quality === opt.value
                    ? 'bg-bg-elevate border-primary shadow-sm'
                    : 'bg-bg-main border-transparent hover:bg-bg-elevate'"
                >
                  <span
                    class="text-sm font-bold font-mono"
                    :class="playerStore.quality === opt.value ? 'text-primary' : 'text-text-primary'"
                  >{{ opt.short }}</span>
                  <span
                    class="text-[10px] leading-tight text-center"
                    :class="playerStore.quality === opt.value ? 'text-primary/70' : 'text-text-secondary'"
                  >{{ t(`player.quality_${opt.value}`) }}</span>
                  <div v-if="playerStore.quality === opt.value" class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- System Config -->
      <section v-if="config" class="space-y-6">
        <div class="flex items-center justify-between border-b border-border pb-2 mb-4">
          <h3 class="text-lg font-semibold text-text-primary flex items-center gap-2">
             <Sliders class="w-5 h-5 text-accent-blue" />
             {{ t('settings.configuration') }}
          </h3>
          <button
            @click="saveConfig"
            class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            :class="hasConfigChanged && !isSaving
              ? 'bg-primary hover:bg-primary-hover text-white'
              : 'bg-bg-elevate text-text-tertiary cursor-not-allowed'"
            :disabled="isSaving || !hasConfigChanged"
          >
            <Save class="w-4 h-4" />
            {{ isSaving ? t('settings.saving') : t('settings.save_changes') }}
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Scan Settings -->
          <div class="bg-bg-surface rounded-2xl border border-border overflow-hidden shadow-sm p-6 space-y-4">
            <h4 class="font-medium text-text-primary flex items-center gap-2">
              <HardDrive class="w-4 h-4 text-text-secondary" />
              {{ t('settings.scan_settings') }}
            </h4>
            
            <div class="space-y-4 text-sm">
              <div>
                <label class="block text-text-secondary text-xs mb-1">{{ t('settings.scan_mode') }}</label>
                <select 
                  v-model="formState.scan.mode"
                  class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                >
                  <option value="manual">{{ t('settings.scan_mode_manual') }}</option>
                  <option value="scheduled">{{ t('settings.scan_mode_scheduled') }}</option>
                  <option value="watch">{{ t('settings.scan_mode_watch') }}</option>
                </select>
              </div>

              <div v-if="formState.scan.mode === 'scheduled'">
                <label class="block text-text-secondary text-xs mb-1">{{ t('settings.interval_hours') }}</label>
                <input 
                  v-model.number="formState.scan.interval_hours" 
                  type="number" 
                  class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                />
              </div>

              <div class="flex items-center justify-between">
                <label class="text-text-primary">{{ t('settings.skip_small_files') }}</label>
                <input 
                  v-model="formState.scan.skip_small_files" 
                  type="checkbox" 
                  class="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
              </div>
              <div v-if="formState.scan.skip_small_files">
                <label class="block text-text-secondary text-xs mb-1">{{ t('settings.min_file_size') }}</label>
                <input 
                  v-model.number="formState.scan.min_file_size" 
                  type="number" 
                  class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                />
              </div>

              <div class="pt-4 border-t border-border">
                <label class="block text-text-secondary text-xs mb-2">{{ t('settings.music_directories') }}</label>
                
                <div class="space-y-2 mb-3">
                  <div v-for="(root, index) in formState.scan.roots" :key="index" class="flex items-center gap-2 p-2 bg-bg-main rounded border border-border group">
                    <span class="text-text-primary flex-1 text-sm truncate" :title="root">{{ root }}</span>
                    <button @click="removeRoot(index)" class="p-1 text-text-secondary hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" :title="t('settings.remove')">
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                  <div v-if="formState.scan.roots.length === 0" class="text-sm text-text-tertiary italic p-2 text-center">
                    {{ t('common.no_data') }}
                  </div>
                </div>

                <div class="flex gap-2">
                  <input 
                    v-model="newRootPath"
                    type="text" 
                    :placeholder="t('settings.path_placeholder')"
                    class="flex-1 p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none text-sm"
                    @keyup.enter="addRoot"
                  />
                  <button @click="addRoot" class="px-3 py-2 bg-bg-elevate hover:bg-bg-surface border border-border rounded text-text-primary hover:text-primary transition-colors">
                    <Plus class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Transcode Settings -->
          <div class="bg-bg-surface rounded-2xl border border-border overflow-hidden shadow-sm p-6 space-y-4">
            <h4 class="font-medium text-text-primary flex items-center gap-2">
              <Music class="w-4 h-4 text-text-secondary" />
              {{ t('settings.transcode_settings') }}
            </h4>
            
            <div class="space-y-4 text-sm">
              <div class="flex items-center justify-between">
                <label class="text-text-primary">{{ t('settings.enable_transcoding') }}</label>
                <input 
                  v-model="formState.transcode.enabled" 
                  type="checkbox" 
                  class="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
              </div>
              <div>
                <label class="block text-text-secondary text-xs mb-1">{{ t('settings.transcode_cache_path') }}</label>
                <div class="p-2 bg-bg-main rounded border border-border text-text-primary truncate text-xs" :title="config.transcode.cache_path">{{ config.transcode.cache_path }}</div>
              </div>
              <div>
                <label class="block text-text-secondary text-xs mb-1">{{ t('settings.max_concurrent_jobs') }}</label>
                <input 
                  v-model.number="formState.transcode.max_concurrent_transcodes" 
                  type="number" 
                  class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                />
              </div>
              <div>
                <label class="block text-text-secondary text-xs mb-1">{{ t('settings.cache_strategy') }}</label>
                <select 
                  v-model="formState.transcode.cache_strategy"
                  class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                >
                  <option value="none">{{ t('settings.cache_strategy_none') }}</option>
                  <option value="all">{{ t('settings.cache_strategy_all') }}</option>
                  <option value="smart">{{ t('settings.cache_strategy_smart') }}</option>
                </select>
              </div>
              <div v-if="formState.transcode.cache_strategy === 'smart'">
                <label class="block text-text-secondary text-xs mb-1">{{ t('settings.cache_threshold') }}</label>
                <input 
                  v-model.number="formState.transcode.cache_threshold" 
                  type="number" 
                  class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>

          <!-- Recommend Settings -->
          <div class="bg-bg-surface rounded-2xl border border-border overflow-hidden shadow-sm p-6 space-y-4">
            <h4 class="font-medium text-text-primary flex items-center gap-2">
              <Sparkles class="w-4 h-4 text-text-secondary" />
              {{ t('settings.recommend_settings') }}
            </h4>
            
            <div class="space-y-4 text-sm">
              <div>
                <label class="block text-text-secondary text-xs mb-1">{{ t('settings.recommend_interval') }}</label>
                <input 
                  v-model.number="formState.recommend.job_interval_hours" 
                  type="number" 
                  class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                />
              </div>
              <div>
                <label class="block text-text-secondary text-xs mb-1">{{ t('settings.play_threshold') }}</label>
                <input 
                  v-model.number="formState.recommend.play_threshold" 
                  type="number" 
                  class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                />
              </div>
              <div>
                <label class="block text-text-secondary text-xs mb-1">{{ t('settings.max_results') }}</label>
                <input 
                  v-model.number="formState.recommend.max_results" 
                  type="number" 
                  class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>

          <!-- Maintenance Settings -->
          <div class="bg-bg-surface rounded-2xl border border-border overflow-hidden shadow-sm p-6 space-y-4">
            <h4 class="font-medium text-text-primary flex items-center gap-2">
              <Shield class="w-4 h-4 text-text-secondary" />
              {{ t('settings.maintenance_settings') }}
            </h4>
            
            <div class="space-y-4 text-sm">
              <div class="flex items-center justify-between">
                <label class="text-text-primary">{{ t('settings.enable_maintenance') }}</label>
                <input 
                  v-model="formState.maintenance.enabled" 
                  type="checkbox" 
                  class="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
              </div>
              <div>
                <label class="block text-text-secondary text-xs mb-1">{{ t('settings.maintenance_interval') }}</label>
                <input 
                  v-model.number="formState.maintenance.interval_hours" 
                  type="number" 
                  class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-text-secondary text-xs mb-1">{{ t('settings.history_retention_days') }}</label>
                  <input 
                    v-model.number="formState.maintenance.history_retention_days" 
                    type="number" 
                    class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label class="block text-text-secondary text-xs mb-1">{{ t('settings.recommendation_retention_days') }}</label>
                  <input 
                    v-model.number="formState.maintenance.recommendation_retention_days" 
                    type="number" 
                    class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                  />
                </div>
              </div>
              <div class="flex items-center justify-between">
                <label class="text-text-primary">{{ t('settings.enable_vacuum') }}</label>
                <input 
                  v-model="formState.maintenance.enable_vacuum" 
                  type="checkbox" 
                  class="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
              </div>
              <div v-if="formState.maintenance.enable_vacuum">
                <label class="block text-text-secondary text-xs mb-1">{{ t('settings.vacuum_threshold') }}</label>
                <input 
                  v-model.number="formState.maintenance.vacuum_threshold" 
                  type="number" 
                  step="0.1"
                  class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>

          <!-- Advanced Settings -->
          <div class="bg-bg-surface rounded-2xl border border-border overflow-hidden shadow-sm p-6 space-y-4 md:col-span-2">
            <h4 class="font-medium text-text-primary flex items-center gap-2">
              <Shield class="w-4 h-4 text-text-secondary" />
              高级配置（特色）
            </h4>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <label class="text-text-primary">启用 Subsonic API</label>
                  <input
                    v-model="formState.subsonic.enabled"
                    type="checkbox"
                    class="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                </div>
                <div class="flex items-center justify-between">
                  <label class="text-text-primary">启用内置 Web 前端</label>
                  <input
                    v-model="formState.web.enabled"
                    type="checkbox"
                    class="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                </div>
                <div>
                  <label class="block text-text-secondary text-xs mb-1">JWT 过期小时数</label>
                  <input
                    v-model.number="formState.security.token_expiry_hours"
                    type="number"
                    min="1"
                    class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label class="block text-text-secondary text-xs mb-1">登录限流次数（窗口内）</label>
                  <input
                    v-model.number="formState.security.login_rate_limit"
                    type="number"
                    min="0"
                    class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label class="block text-text-secondary text-xs mb-1">登录限流窗口（秒）</label>
                  <input
                    v-model.number="formState.security.login_rate_window_secs"
                    type="number"
                    min="1"
                    class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div class="space-y-4">
                <div>
                  <label class="block text-text-secondary text-xs mb-1">流媒体 Token TTL（秒）</label>
                  <input
                    v-model.number="formState.security.stream_token_ttl_secs"
                    type="number"
                    min="1"
                    class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label class="block text-text-secondary text-xs mb-1">CORS 允许来源（逗号分隔）</label>
                  <input
                    v-model="corsOriginsInput"
                    type="text"
                    placeholder="https://music.example.com, http://localhost:5173"
                    class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label class="block text-text-secondary text-xs mb-1">日志级别</label>
                  <select
                    v-model="formState.logging.level"
                    class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                  >
                    <option value="trace">trace</option>
                    <option value="debug">debug</option>
                    <option value="info">info</option>
                    <option value="warn">warn</option>
                    <option value="error">error</option>
                  </select>
                </div>
                <div>
                  <label class="block text-text-secondary text-xs mb-1">模块日志（逗号分隔）</label>
                  <input
                    v-model="loggingModulesInput"
                    type="text"
                    placeholder="zhiyin=debug, axum=info"
                    class="w-full p-2 bg-bg-elevate rounded border border-border text-text-primary focus:border-primary outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- System & Library Info -->
      <section class="space-y-6">
        <h3 class="text-lg font-semibold text-text-primary border-b border-border pb-2 mb-4 flex items-center gap-2">
           <Monitor class="w-5 h-5 text-text-secondary" />
           {{ t('settings.system') }}
        </h3>

        <!-- System Info Card -->
        <div class="bg-bg-surface rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col h-full">
           <div class="p-6 flex-1 space-y-6">
              <!-- API Status -->
              <div class="flex items-center justify-between group">
                 <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-bg-elevate flex items-center justify-center text-text-secondary group-hover:text-primary transition-colors">
                       <RefreshCw class="w-5 h-5" />
                    </div>
                    <div>
                       <h4 class="font-medium text-text-primary">{{ t('settings.api_status') }}</h4>
                       <p class="text-xs text-text-secondary">{{ t('settings.backend_connection') }}</p>
                    </div>
                 </div>
                 <div class="flex items-center gap-2">
                    <span 
                      class="text-sm font-medium px-2 py-1 rounded flex items-center gap-1.5 transition-colors"
                      :class="systemStore.isConnected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'"
                    >
                      <CheckCircle2 v-if="systemStore.isConnected" class="w-3.5 h-3.5" />
                      <XCircle v-else class="w-3.5 h-3.5" />
                      {{ systemStore.isConnected ? t('settings.connected') : t('settings.disconnected') }}
                    </span>
                    <button 
                      @click="checkHealth(true)" 
                      class="p-1.5 hover:bg-bg-elevate rounded-md text-text-secondary hover:text-primary transition-colors"
                      :class="{ 'animate-spin': isChecking }"
                      :title="t('settings.refresh_status')"
                    >
                      <RefreshCw class="w-4 h-4" />
                    </button>
                 </div>
              </div>

              <div class="h-px bg-border w-full"></div>

              <!-- Version & Build Info -->
              <div class="flex items-center justify-between group">
                 <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-bg-elevate flex items-center justify-center text-text-secondary group-hover:text-primary transition-colors">
                       <Monitor class="w-5 h-5" />
                    </div>
                    <div>
                       <h4 class="font-medium text-text-primary">{{ t('settings.app_name') }}</h4>
                       <p class="text-xs text-text-secondary">{{ t('settings.current_version') }}</p>
                    </div>
                 </div>
                 <span class="font-mono text-sm bg-bg-elevate px-2 py-1 rounded text-text-primary">
                   {{ healthInfo?.version || '-' }}
                 </span>
              </div>

           </div>
           
           <!-- Action Footer -->
           <div class="p-4 bg-bg-elevate/30 border-t border-border space-y-3">
              <button 
                @click="triggerScan"
                :disabled="isScanning"
                class="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                 <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isScanning }" />
                 {{ isScanning ? t('settings.scanning') : t('settings.scan') }}
              </button>

              <!-- 扫描进度 -->
              <div v-if="isScanning && scanStatus" class="space-y-2">
                <div class="flex items-center justify-between text-xs text-text-secondary">
                  <span>{{ t(`settings.scan_phase.${scanStatus.phase}`) }}</span>
                  <span>{{ scanProgressPercent }}%</span>
                </div>
                <div class="h-1.5 bg-bg-main rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-primary-gradient rounded-full transition-all duration-500"
                    :style="{ width: `${scanProgressPercent}%` }"
                  ></div>
                </div>
                <div class="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div>
                    <div class="text-text-tertiary">{{ t('settings.scan_added') }}</div>
                    <div class="font-medium text-green-500">{{ scanStatus.added }}</div>
                  </div>
                  <div>
                    <div class="text-text-tertiary">{{ t('settings.scan_modified') }}</div>
                    <div class="font-medium text-amber-500">{{ scanStatus.modified }}</div>
                  </div>
                  <div>
                    <div class="text-text-tertiary">{{ t('settings.scan_deleted') }}</div>
                    <div class="font-medium text-red-500">{{ scanStatus.deleted }}</div>
                  </div>
                </div>
                <p v-if="scanStatus.current_file" class="text-[10px] text-text-tertiary truncate" :title="scanStatus.current_file">
                  {{ scanStatus.current_file }}
                </p>
              </div>

              <p v-else class="text-[10px] text-center text-text-tertiary">
                {{ t('settings.last_scan', { time: scanStatus?.finished_at ? lastScanTime : t('settings.never') }) }}
              </p>
           </div>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
