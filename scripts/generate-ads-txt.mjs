import { mkdir, writeFile } from 'node:fs/promises';

const rawClient = String(process.env.VITE_ADSENSE_CLIENT || '').trim();
const match = rawClient.match(/^ca-pub-(\d+)$/);

await mkdir('public', { recursive: true });

const content = match
  ? `google.com, pub-${match[1]}, DIRECT, f08c47fec0942fa0\n`
  : '# AdSense publisher ID is not configured for this deployment.\n';

await writeFile('public/ads.txt', content, 'utf8');
console.log(match ? '[monetization] ads.txt generated' : '[monetization] ads.txt left inactive');
