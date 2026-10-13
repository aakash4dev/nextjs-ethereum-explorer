import { Container } from '@/components/ui';

export default function Loading() {
  return (
    <Container className="py-8" aria-busy="true" aria-live="polite">
      <div className="h-7 w-64 animate-pulse rounded bg-surface-3" />
      <div className="mt-6 space-y-3 rounded-xl border border-line bg-surface p-4">
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-5 animate-pulse rounded bg-surface-3" style={{ width: `${90 - i * 6}%` }} />)}
      </div>
      <span className="sr-only">Loading…</span>
    </Container>
  );
}
