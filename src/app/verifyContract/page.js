import VerifyForm from '@/components/client/VerifyForm';
import { Card, Container, Notice, PageHeader } from '@/components/ui';
import config from '@/lib/config';

export const metadata = { title: 'Verify & Publish Contract Source Code' };

export default async function VerifyContractPage({ searchParams }) {
  const { a = '' } = await searchParams;
  return (
    <Container>
      <PageHeader title="Verify & Publish Contract Source Code" subtitle="Source code verification provides transparency for users interacting with smart contracts." />
      <Notice tone="info" className="mt-4">
        Compiles your source with the exact compiler settings and compares the result with the deployed bytecode (immutables, linked libraries and metadata are handled).
        Hardhat and Foundry users can verify from the CLI using this explorer&apos;s Etherscan-compatible endpoint: <code className="hash">{config.siteUrl}/api</code>.
      </Notice>
      <Card className="mt-4">
        <VerifyForm initialAddress={a} />
      </Card>
    </Container>
  );
}
