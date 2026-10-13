import Link from 'next/link';
import SearchBar from '@/components/client/SearchBar';
import { Container } from '@/components/ui';

export default function NotFound() {
  return (
    <Container className="max-w-2xl py-20 text-center">
      <div className="text-6xl font-bold text-primary">404</div>
      <h1 className="mt-3 text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted">The address, transaction or page you are looking for does not exist or the input is malformed.</p>
      <div className="mt-6"><SearchBar /></div>
      <Link href="/" className="link mt-6 inline-block text-sm">Back to home</Link>
    </Container>
  );
}
