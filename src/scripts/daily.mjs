// Prepare a real daily snapshot. This script never commits or pushes anything.
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectMetrics, saveMetrics } from './metrics.mjs';

export async function refreshDaily(root, { now = new Date(), request = fetch, token = '', committer = 'github-actions[bot]' } = {}) {
  const observedAt = new Date(now);
  if (!Number.isFinite(observedAt.getTime())) throw new Error('Invalid snapshot time');
  const day = observedAt.toISOString().slice(0, 10);
  const config = JSON.parse(await readFile(path.join(root, 'src/profile.json'), 'utf8'));
  const markerPath = path.join(root, 'src/assets/live/refresh.json');
  let previous;
  try { previous = JSON.parse(await readFile(markerPath, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (previous) {
    if (previous.schemaVersion !== 1 || previous.login !== config.login ||
        !/^\d{4}-\d{2}-\d{2}$/.test(previous.lastSnapshotDay)) {
      throw new Error('Invalid daily snapshot marker');
    }
    if (previous.lastSnapshotDay > day) throw new Error('Snapshot is newer than the current UTC day');
  }
  const updated = previous?.lastSnapshotDay !== day;
  // Do not alter the successful snapshot if any API request fails.
  const metrics = await collectMetrics(config.login, { request, now: observedAt, token });
  metrics.refreshHours = 6;
  metrics.automation = {
    kind: 'daily-statistics-snapshot',
    author: config.login,
    committer,
    note: 'Repository history includes automated statistics updates; this is not personal contribution scoring.'
  };
  await saveMetrics(root, config, metrics);
  // Write last, so a failed save never marks this day as complete.
  if (updated) await writeFile(markerPath, JSON.stringify({
    schemaVersion: 1, login: config.login, kind: 'daily-statistics-snapshot',
    lastSnapshotDay: day, observedAt: metrics.observedAt
  }, null, 2) + '\n');
  return { updated, refreshed: true, day };
}

export async function verifyPagesSource(repository, {request = fetch, token = ''} = {}) {
  if (!/^[a-z\d-]+\/[a-z\d_.-]+$/i.test(repository ?? '')) throw new Error('Invalid profile repository');
  const headers = {Accept:'application/vnd.github+json', 'User-Agent':'profile-pages-check'};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await request(`https://api.github.com/repos/${repository}/pages`,
    {method:'GET', headers, cache:'no-store', redirect:'error', signal:AbortSignal.timeout(30000)});
  if (!response.ok) throw new Error(`Cannot verify Pages source (${response.status}). Enable Settings > Pages > Source: GitHub Actions and allow pages: read.`);
  if ((await response.json()).build_type !== 'workflow') {
    throw new Error('Pages uses a branch build that can overwrite fresh charts. Set Settings > Pages > Source to GitHub Actions. No setting was changed automatically.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  if (process.argv.includes('--check-pages')) {
    await verifyPagesSource(process.env.GITHUB_REPOSITORY, {token:process.env.GITHUB_TOKEN ?? ''});
    console.log('Pages source verified: GitHub Actions.');
  } else {
  const result = await refreshDaily(root, { token: process.env.GITHUB_TOKEN ?? '' });
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT,
    `updated=${result.updated}\nsnapshot_day=${result.day}\n`);
  console.log(`Refreshed charts from GitHub. ${result.updated ? 'Prepared daily snapshot' : 'Daily commit already reserved'} for ${result.day} UTC.`);
  }
}
