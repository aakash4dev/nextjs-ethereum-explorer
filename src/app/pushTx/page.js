import { BroadcastTx } from '@/components/client/Tools';
import { Card, Container, PageHeader } from '@/components/ui';

export const metadata = { title: 'Broadcast Raw Transaction', description: 'Submit a signed transaction to the network.' };

export default function ToolPage() {
  return (
    <Container className="max-w-4xl">
      <PageHeader title="Broadcast Raw Transaction" subtitle="Submit a signed transaction to the network." />
      <Card className="mt-4">
        <BroadcastTx />
      </Card>
    </Container>
  );
}
