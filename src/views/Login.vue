<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/auth';
import { usePlayerStore } from '@/stores/player';
import { Music2, Eye, EyeOff, Loader2, ShieldCheck, UserPlus } from 'lucide-vue-next';

const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();

const isSetupMode = ref(false);
const isCheckingStatus = ref(true);
const isSubmitting = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

// 登录失败冷却
const MAX_ATTEMPTS = 5;
const COOLDOWN_SECS = 30;
const failedAttempts = ref(0);
const cooldownRemaining = ref(0);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

const isCoolingDown = computed(() => cooldownRemaining.value > 0);

const startCooldown = () => {
  cooldownRemaining.value = COOLDOWN_SECS;
  cooldownTimer = setInterval(() => {
    cooldownRemaining.value--;
    if (cooldownRemaining.value <= 0) {
      if (cooldownTimer) clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
  }, 1000);
};

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
});

const PASSWORD_MIN_LENGTH = 8;

const validatePasswordStrength = (password: string): string | null => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return t('auth.password_too_short', { min: PASSWORD_MIN_LENGTH });
  }
  if (!/[a-zA-Z]/.test(password)) {
    return t('auth.password_need_letter');
  }
  if (!/\d/.test(password)) {
    return t('auth.password_need_digit');
  }
  return null;
};

const form = ref({
  username: '',
  password: '',
  confirmPassword: '',
});

onMounted(async () => {
  if (authStore.isAuthenticated) {
    router.replace({ name: 'Home' });
    return;
  }
  try {
    const { data } = await authApi.getStatus();
    isSetupMode.value = !data.initialized;
  } catch {
    errorMessage.value = t('auth.status_check_failed');
  } finally {
    isCheckingStatus.value = false;
  }
});

const handleSubmit = async () => {
  errorMessage.value = '';
  successMessage.value = '';

  if (isCoolingDown.value) return;

  if (!form.value.username.trim() || !form.value.password) {
    errorMessage.value = t('auth.fields_required');
    return;
  }

  if (isSetupMode.value) {
    const strengthError = validatePasswordStrength(form.value.password);
    if (strengthError) {
      errorMessage.value = strengthError;
      return;
    }
    if (form.value.password !== form.value.confirmPassword) {
      errorMessage.value = t('auth.password_mismatch');
      return;
    }
  }

  isSubmitting.value = true;
  try {
    if (isSetupMode.value) {
      await authApi.setup(form.value.username.trim(), form.value.password);
      successMessage.value = t('auth.setup_success');
      isSetupMode.value = false;
      form.value.confirmPassword = '';
    } else {
      const { data } = await authApi.login(form.value.username.trim(), form.value.password);
      failedAttempts.value = 0;
      authStore.setAuth(data.token, data.user);
      usePlayerStore().clearQueue();
      router.replace({ name: 'Home' });
    }
  } catch (e: any) {
    const status = e.response?.status;
    if (isSetupMode.value) {
      errorMessage.value = status === 409
        ? t('auth.already_initialized')
        : t('auth.setup_failed');
    } else {
      failedAttempts.value++;
      if (failedAttempts.value >= MAX_ATTEMPTS) {
        startCooldown();
        errorMessage.value = t('auth.too_many_attempts', { seconds: COOLDOWN_SECS });
      } else {
        errorMessage.value = status === 401
          ? t('auth.invalid_credentials')
          : t('auth.login_failed');
      }
    }
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-bg-main relative overflow-hidden px-4">
    <!-- Background decorations -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.02] rounded-full blur-3xl"></div>
    </div>

    <!-- Loading check -->
    <div v-if="isCheckingStatus" class="flex flex-col items-center gap-4">
      <Loader2 class="w-8 h-8 text-primary animate-spin" />
    </div>

    <!-- Login / Setup Card -->
    <div v-else class="relative w-full max-w-md animate-fade-in">
      <!-- Logo & Title -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-gradient shadow-lg shadow-primary/25 mb-5">
          <Music2 class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-text-primary mb-1">ZHIYIN</h1>
        <p class="text-sm text-text-secondary">
          {{ isSetupMode ? t('auth.setup_subtitle') : t('auth.login_subtitle') }}
        </p>
      </div>

      <!-- Card -->
      <div class="bg-bg-surface border border-border rounded-2xl p-8 shadow-sm backdrop-blur-sm">
        <!-- Mode indicator -->
        <div class="flex items-center gap-2 mb-6 px-3 py-2 rounded-lg" 
             :class="isSetupMode ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'">
          <UserPlus v-if="isSetupMode" class="w-4 h-4 flex-shrink-0" />
          <ShieldCheck v-else class="w-4 h-4 flex-shrink-0" />
          <span class="text-xs font-medium">
            {{ isSetupMode ? t('auth.setup_hint') : t('auth.login_hint') }}
          </span>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <!-- Username -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-text-secondary">{{ t('auth.username') }}</label>
            <input
              v-model="form.username"
              type="text"
              autocomplete="username"
              :placeholder="t('auth.username_placeholder')"
              class="w-full bg-bg-main border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>

          <!-- Password -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-text-secondary">{{ t('auth.password') }}</label>
            <div class="relative">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                :placeholder="t('auth.password_placeholder')"
                class="w-full bg-bg-main border border-border rounded-xl px-4 py-3 pr-11 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
              >
                <EyeOff v-if="showPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Confirm Password (Setup only) -->
          <div v-if="isSetupMode" class="space-y-1.5">
            <label class="text-sm font-medium text-text-secondary">{{ t('auth.confirm_password') }}</label>
            <div class="relative">
              <input
                v-model="form.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                autocomplete="new-password"
                :placeholder="t('auth.confirm_password_placeholder')"
                class="w-full bg-bg-main border border-border rounded-xl px-4 py-3 pr-11 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
              >
                <EyeOff v-if="showConfirmPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Success -->
          <div v-if="successMessage" class="flex items-center gap-2 px-3 py-2.5 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-xs">
            <span>{{ successMessage }}</span>
          </div>

          <!-- Error -->
          <div v-if="errorMessage" class="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Password strength hint (setup mode only) -->
          <p v-if="isSetupMode" class="text-[11px] text-text-tertiary -mt-2">
            {{ t('auth.password_hint') }}
          </p>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="isSubmitting || isCoolingDown"
            class="w-full flex items-center justify-center gap-2 bg-primary-gradient text-white font-medium py-3 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:brightness-110 active:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            <template v-if="isCoolingDown">
              {{ t('auth.cooldown', { seconds: cooldownRemaining }) }}
            </template>
            <template v-else>
              {{ isSubmitting
                ? (isSetupMode ? t('auth.creating') : t('auth.logging_in'))
                : (isSetupMode ? t('auth.create_admin') : t('auth.login'))
              }}
            </template>
          </button>
        </form>
      </div>

      <!-- Footer -->
      <p class="text-center text-xs text-text-tertiary mt-6">
        ZHIYIN &copy; {{ new Date().getFullYear() }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
