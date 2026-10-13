import { withApi, json, CACHE } from '@/lib/api';
import { EVM_VERSIONS, listCompilerVersions } from '@/lib/verification/compiler';
import { SUPPORTED_LICENSES } from '@/lib/verification/verify';

export const dynamic = 'force-dynamic';

export const GET = withApi(async () => json({ versions: await listCompilerVersions(), evmVersions: EVM_VERSIONS, licenses: SUPPORTED_LICENSES }, { cache: CACHE.long }), { db: false });
