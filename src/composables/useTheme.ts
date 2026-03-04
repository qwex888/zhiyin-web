import { ref, watchEffect } from 'vue';

const THEME_KEY = 'nas-music-theme';
type Theme = 'dark' | 'light';

// Helper to get initial theme with validation
const getInitialTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  } catch (e) {
    console.warn('Failed to access localStorage:', e);
  }
  return 'dark'; // Default fallback
};

// Global state (Singleton)
const theme = ref<Theme>(getInitialTheme());

// Global side-effect handler
// Running this outside the hook ensures it runs only once and immediately upon module import
watchEffect(() => {
  try {
    localStorage.setItem(THEME_KEY, theme.value);
  } catch (e) {
    // Ignore storage errors
  }
  
  const root = document.documentElement;
  if (theme.value === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    // Ensure meta theme-color matches for mobile browsers
    updateMetaThemeColor('#0f0f0f');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    updateMetaThemeColor('#ffffff');
  }
});

function updateMetaThemeColor(color: string) {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
}

export function useTheme() {
  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme;
  };

  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  };

  return {
    theme,
    setTheme,
    toggleTheme
  };
}
