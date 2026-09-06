export type VerifiedSeedReuse = {
  seedId: string;
  appId: string;
  topicId: string;
  canonicalQuery: string;
  aliases: string[];
  frontPackageId: string;
  sourceIds: string[];
  status: 'SEED_READY_FRONT_ANALYSIS';
  evidence: string;
};

// Generated-source contract: entries must come only from 35_INTERNAL_SEED_REGISTRY
// rows that are already verified/front-ready. This snapshot is API-free and prevents
// an existing approved Seed from being mistaken for a Queens collection miss.
export const VERIFIED_SEED_REUSE_INDEX: VerifiedSeedReuse[] = [
  {
    seedId: 'SEED_CONTENTOS_DUBAI_CHEWY_COOKIE_20260821_001',
    appId: 'APP_CONTENT_OS',
    topicId: 'CONTENTOS_SEED_두바이쫀득쿠키',
    canonicalQuery: '두바이 쫀득 쿠키',
    aliases: ['두바이쫀쿠티', '두바이쫀쿠', '두쫀쿠', '두바이 초콜릿 쫀득 쿠키'],
    frontPackageId: 'FRONT_SCRIPT_FEATURE_PACKAGE_DUBAI_CHEWY_COOKIE_V1',
    sourceIds: ['QRY_20260821_DUBAI_CHEWY_COOKIE_001', '6vI8ooWwTvM', 'GHd73FxzAj0', 'nOR6laAzTq0', 'C-b3KjnoikA'],
    status: 'SEED_READY_FRONT_ANALYSIS',
    evidence: '35_INTERNAL_SEED_REGISTRY row9; FRONT_READY=YES; Queens 4; script-feature enriched',
  },
];

const normalize = (value: string) => String(value || '').toLowerCase().replace(/[\s_\-·]/g, '');

export function findVerifiedSeedReuse(query: string): VerifiedSeedReuse | null {
  const needle = normalize(query);
  if (!needle) return null;
  for (const seed of VERIFIED_SEED_REUSE_INDEX) {
    const candidates = [seed.canonicalQuery, ...seed.aliases].map(normalize);
    if (candidates.some((candidate) => candidate === needle || candidate.includes(needle) || needle.includes(candidate))) {
      return seed;
    }
  }
  return null;
}
