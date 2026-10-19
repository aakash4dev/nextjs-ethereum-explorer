'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';
import { THEME_COLORS } from '@/lib/theme';

// The <html> class (set before paint by themeInitScript) is the source of truth.
function subscribe(cb) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => mo.disconnect();
}
const getSnapshot = () => document.documentElement.classList.contains('dark');
const getServerSnapshot = () => false;

export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[dark ? 'dark' : 'light']);
  }, [dark]);
  const toggle = () => {
    const next = !getSnapshot();
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      /* storage blocked */
    }
  };
  return (
    <button type="button" onClick={toggle} aria-label="Toggle dark mode" aria-pressed={dark} title={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="border-l border-line pl-4 text-muted transition-colors hover:text-primary">
      {dark ? <FaSun className="h-3.5 w-3.5" /> : <FaMoon className="h-3.5 w-3.5" />}
    </button>
  );
}
