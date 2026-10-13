import { UnitConverter } from '@/components/client/Tools';
import { Card, Container, PageHeader } from '@/components/ui';

export const metadata = { title: 'Unit Converter', description: 'Convert between wei, gwei and ether units.' };

export default function ToolPage() {
  return (
    <Container className="max-w-4xl">
      <PageHeader title="Unit Converter" subtitle="Convert between wei, gwei and ether units." />
      <Card className="mt-4">
        <UnitConverter />
      </Card>
    </Container>
  );
}
