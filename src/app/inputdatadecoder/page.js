import { InputDecoder } from '@/components/client/Tools';
import { Card, Container, PageHeader } from '@/components/ui';

export const metadata = { title: 'Input Data Decoder', description: 'Decode transaction calldata using an ABI, a verified contract, or the signature database.' };

export default function ToolPage() {
  return (
    <Container className="max-w-4xl">
      <PageHeader title="Input Data Decoder" subtitle="Decode transaction calldata using an ABI, a verified contract, or the signature database." />
      <Card className="mt-4">
        <InputDecoder />
      </Card>
    </Container>
  );
}
