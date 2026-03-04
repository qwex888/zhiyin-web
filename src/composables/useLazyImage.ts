import { ref, onMounted, onUnmounted } from 'vue';

/**
 * 图片懒加载 Hook
 * 使用 Intersection Observer 控制图片加载时机
 */
export function useLazyImage(options: {
  rootMargin?: string;
  threshold?: number;
} = {}) {
  const { rootMargin = '100px', threshold = 0.01 } = options;
  
  const observer = ref<IntersectionObserver | null>(null);
  const loadedImages = new Set<string>();
  
  // 创建 Intersection Observer
  const createObserver = () => {
    if ('IntersectionObserver' in window) {
      observer.value = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              const src = img.dataset.src;
              
              if (src && !loadedImages.has(src)) {
                // 加载图片
                img.src = src;
                loadedImages.add(src);
                
                // 加载完成后移除 data-src
                img.onload = () => {
                  img.removeAttribute('data-src');
                  img.classList.add('loaded');
                };
                
                // 停止观察已加载的图片
                observer.value?.unobserve(img);
              }
            }
          });
        },
        {
          rootMargin,
          threshold,
        }
      );
    }
  };
  
  // 观察单个元素
  const observe = (element: HTMLElement) => {
    if (observer.value) {
      observer.value.observe(element);
    }
  };
  
  // 取消观察单个元素
  const unobserve = (element: HTMLElement) => {
    if (observer.value) {
      observer.value.unobserve(element);
    }
  };
  
  // 清理
  const cleanup = () => {
    if (observer.value) {
      observer.value.disconnect();
      observer.value = null;
    }
    loadedImages.clear();
  };
  
  onMounted(() => {
    createObserver();
  });
  
  onUnmounted(() => {
    cleanup();
  });
  
  return {
    observe,
    unobserve,
    cleanup,
  };
}

/**
 * 简化版：用于 Vue 指令
 */
export const lazyImageDirective = {
  mounted(el: HTMLImageElement, binding: { value: string }) {
    // 设置占位符
    el.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
    el.dataset.src = binding.value;
    
    // 创建观察器
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            
            if (src) {
              img.src = src;
              img.onload = () => {
                img.classList.add('loaded');
              };
              observer.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '150px', // 提前 150px 开始加载
        threshold: 0.01,
      }
    );
    
    observer.observe(el);
    
    // 保存 observer 引用以便清理
    (el as any)._lazyObserver = observer;
  },
  
  unmounted(el: HTMLImageElement) {
    const observer = (el as any)._lazyObserver;
    if (observer) {
      observer.disconnect();
      delete (el as any)._lazyObserver;
    }
  },
};
