'use client';
import { useSyncExternalStore } from 'react';
import { formatDateUtc, timeAgo } from '@/lib/format';

// One shared 1s clock for every <TimeAgo> on the page.
let now = 0;
let timer = null;
const listeners = new Set();
function subscribe(cb) {
  listeners.add(cb);
  if (!timer) {
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size) {
      clearInterval(timer);
      timer = null;
    }
  };
}
const getSnapshot = () => now || (now = Date.now());
const getServerSnapshot = () => null;

/** Relative time that stays fresh; renders the absolute UTC time on the server. */
export default function TimeAgo({ value, className = '' }) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!value) return <span className={className}>-</span>;
  const abs = formatDateUtc(value);
  return (
    <time dateTime={new Date(value).toISOString()} title={abs} className={className}>
      {current === null ? abs : timeAgo(value, current)}
    </time>
  );
}
