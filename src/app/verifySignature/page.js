import { VerifySignature } from '@/components/client/Tools';
import { Card, Container, PageHeader } from '@/components/ui';

export const metadata = { title: 'Verify Signature', description: 'Verify signed messages (EIP-191).' };

export default function ToolPage() {
  return (
    <Container className="max-w-4xl">
      <PageHeader title="Verify Signature" subtitle="Verify signed messages (EIP-191)." />
      <Card className="mt-4">
        <VerifySignature />
      </Card>
    </Container>
  );
}
