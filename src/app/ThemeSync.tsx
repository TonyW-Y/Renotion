import { useEffect } from 'react';
import { useUiStore } from '@/state/uiStore';

/** Mirrors the theme from the store onto <html data-theme> and the browser chrome. */
export function ThemeSync() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0a0c0f' : '#f4f5f7');
  }, [theme]);
  return null;
}
