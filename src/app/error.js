'use client';
import { useEffect } from 'react';
import { Container } from '@/components/ui';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Container className="max-w-2xl py-20 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">The explorer could not load this page. The database or RPC node may be temporarily unavailable.</p>
      {error?.digest && <p className="hash mt-2 text-xs text-muted">Error reference: {error.digest}</p>}
      <button type="button" onClick={() => reset()} className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover">Try again</button>
    </Container>
  );
}
