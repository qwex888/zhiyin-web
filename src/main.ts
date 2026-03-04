import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import router from './router'
import i18n from './i18n'
import './style.css'
import App from './App.vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { lazyImageDirective } from './composables/useLazyImage'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn') // Default to Chinese

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(i18n)

// Click outside directive
app.directive('click-outside', {
  mounted(el, binding) {
    el.clickOutsideEvent = (event: Event) => {
      // Check if click was outside the element and its children
      if (!(el === event.target || el.contains(event.target))) {
        // Invoke the provided method
        binding.value(event);
      }
    };
    document.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent);
  },
});

// Lazy image directive - 图片懒加载指令
app.directive('lazy', lazyImageDirective);

app.mount('#app')
