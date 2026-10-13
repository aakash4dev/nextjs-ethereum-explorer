'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Re-render the server component tree periodically while the tab is visible. */
export default function AutoRefresh({ intervalMs = 12000 }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
