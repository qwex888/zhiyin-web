<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useCoverUrl } from '@/composables/useCoverUrl';

const props = withDefaults(defineProps<{
  coverId?: number | null;
  size?: 'thumb' | 'small' | 'medium' | 'large';
  imgClass?: string;
  lazy?: boolean;
  alt?: string;
}>(), {
  size: 'small',
  imgClass: '',
  lazy: false,
  alt: '',
});

const hasError = ref(false);
const { displayUrl } = useCoverUrl(() => props.coverId);

const coverUrl = computed(() => displayUrl.value);

const showImage = computed(() => !!props.coverId && !hasError.value);

const handleError = () => {
  hasError.value = true;
};

watch(() => props.coverId, () => {
  hasError.value = false;
});
</script>

<template>
  <img
    v-if="showImage && lazy"
    v-lazy="coverUrl"
    :class="['w-full h-full object-cover', imgClass]"
    :alt="alt"
    decoding="async"
    @error="handleError"
  />
  <img
    v-else-if="showImage"
    :src="coverUrl"
    :class="['w-full h-full object-cover', imgClass]"
    :alt="alt"
    decoding="async"
    @error="handleError"
  />
  <slot v-else name="fallback" />
</template>
