// Resolve the owner's GitHub-provided noreply identity. No Git or remote writes.
import { readFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolveAuthor(login, { request = fetch, token = '', repository = '' } = {}) {
  if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(login)) throw new Error('Invalid profile login');
  if (repository && repository.toLowerCase() !== `${login}/${login}`.toLowerCase()) {
    throw new Error('Profile login does not match the running profile repository');
  }
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'profile-commit-author' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await request(`https://api.github.com/users/${encodeURIComponent(login)}`, {
    method: 'GET', headers, redirect: 'error', signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`GitHub author lookup failed (${response.status})`);
  const user = await response.json();
  if (typeof user.login !== 'string' || user.login.toLowerCase() !== login.toLowerCase() ||
      user.type !== 'User' || !Number.isSafeInteger(user.id) || user.id < 1) {
    throw new Error('GitHub returned an unexpected account identity');
  }
  const createdAt = Date.parse(user.created_at);
  if (!Number.isFinite(createdAt) || createdAt < Date.parse('2017-07-19T00:00:00Z')) {
    throw new Error('Account needs its noreply address verified in GitHub email settings');
  }
  // GitHub documents this form for accounts created after July 18, 2017.
  // Identity is used only by Git; do not save the email in public data files.
  return { name: login, email: `${user.id}+${login}@users.noreply.github.com` };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const config = JSON.parse(await readFile(path.join(root, 'src/profile.json'), 'utf8'));
  const author = await resolveAuthor(config.login, {
    token: process.env.GITHUB_TOKEN ?? '', repository: process.env.GITHUB_REPOSITORY ?? ''
  });
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT,
    `name=${author.name}\nemail=${author.email}\n`);
  console.log(`Verified profile commit author: ${author.name}. Committer remains github-actions[bot].`);
}
