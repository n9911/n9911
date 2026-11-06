// Public GitHub GET requests only. No repository writes or commit identities.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const api = 'https://api.github.com';
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const isoDay = value => new Date(value).toISOString().slice(0, 10);

export async function collectMetrics(login, { request = fetch, now = new Date(), token = '' } = {}) {
  if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(login)) throw new Error('Invalid GitHub login');
  const end = new Date(now);
  const start = new Date(end); start.setUTCHours(0, 0, 0, 0); start.setUTCDate(start.getUTCDate() - 29);
  const sources = [];
  async function get(endpoint, allowEmpty = false) {
    const url = api + endpoint;
    sources.push(url);
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'public-profile-metrics', 'Cache-Control': 'no-cache' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await request(url, { method: 'GET', headers, cache: 'no-store', signal: AbortSignal.timeout(30000), redirect: 'error' });
    if (allowEmpty && response.status === 409) return [];
    if (!response.ok) throw new Error(`GitHub GET failed (${response.status}) for ${endpoint.split('?')[0]}`);
    return response.json();
  }
  async function pages(endpoint, limit = 100, allowEmpty = false) {
    const all = [];
    for (let page = 1; page <= limit; page++) {
      const values = await get(`${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=100&page=${page}`, allowEmpty);
      if (!Array.isArray(values)) throw new Error('GitHub returned an unexpected list');
      all.push(...values);
      if (values.length < 100) return all;
    }
    throw new Error('Pagination safety limit reached; refusing to publish incomplete metrics');
  }
  const repositories = (await pages(`/users/${login}/repos?type=owner&sort=full_name`))
    .filter(repo => !repo.private && repo.owner.login.toLowerCase() === login.toLowerCase());
  const commits = new Map();
  const languages = {};
  for (const repo of repositories) {
    const base = `/repos/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}`;
    for (const [language, bytes] of Object.entries(await get(base + '/languages'))) {
      languages[language] = (languages[language] ?? 0) + bytes;
    }
    const records = await pages(`${base}/commits?sha=${encodeURIComponent(repo.default_branch)}&since=${start.toISOString()}&until=${end.toISOString()}`, 100, true);
    for (const record of records) {
      const date = record.commit?.committer?.date;
      if (!date || new Date(date) < start || new Date(date) > end) continue;
      // The same commit in several owned forks is counted once.
      commits.set(record.sha, { sha: record.sha, day: isoDay(date) });
    }
  }
  const events = [];
  for (let page = 1; page <= 3; page++) {
    const values = await get(`/users/${login}/events/public?per_page=100&page=${page}`);
    if (!Array.isArray(values)) throw new Error('Unexpected public events list');
    events.push(...values);
    if (values.length < 100) break;
  }
  const eventCounts = {};
  const seen = new Set();
  for (const event of events) {
    if (event.public !== true || seen.has(event.id) || new Date(event.created_at) < start || new Date(event.created_at) > end) continue;
    seen.add(event.id);
    eventCounts[event.type] = (eventCounts[event.type] ?? 0) + 1;
  }
  const daily = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(start); date.setUTCDate(date.getUTCDate() + index);
    const day = isoDay(date);
    return { day, commits: [...commits.values()].filter(commit => commit.day === day).length };
  });
  return {
    schemaVersion: 1, login, observedAt: end.toISOString(), refreshHours: 6,
    window: { since: start.toISOString(), until: end.toISOString(), timezone: 'UTC' },
    scope: 'Owned public repositories including forks; unique default-branch commits by all authors. Language bytes describe repositories, not skill or authorship. Public events are a limited activity feed, not visitor analytics.',
    totals: {
      repositories: repositories.length, forks: repositories.filter(repo => repo.fork).length,
      stars: repositories.reduce((n, repo) => n + repo.stargazers_count, 0),
      openIssuesAndPullRequests: repositories.reduce((n, repo) => n + repo.open_issues_count, 0),
      uniqueCommits30d: commits.size
    },
    repositories: repositories.map(repo => ({ name: repo.name, url: repo.html_url, fork: repo.fork, defaultBranch: repo.default_branch })),
    languages, daily,
    publicEvents: { counts: eventCounts, observed: seen.size, feedLimit: 300, feedLimitReached: events.length >= 300, maxApiLatencyHours: 6 },
    sources
  };
}

export function renderPanels(config, metrics) {
  const { background, ink, accent, paper } = config.palette;
  const frame = (title, subtitle, body, scope = 'owned public repositories, including forks') => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="430" viewBox="0 0 1200 430" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><rect width="1200" height="430" rx="18" fill="${background}"/><g font-family="system-ui, sans-serif" fill="${ink}"><text x="42" y="58" font-size="29" font-weight="700">${esc(title)}</text><text x="42" y="90" font-size="16">${esc(subtitle)}</text>${body}<text x="42" y="390" font-size="14" opacity=".8">${esc(metrics.observedAt)} · snapshot interval ${esc(metrics.refreshHours ?? 6)}h · public GitHub data</text><text x="42" y="414" font-size="13" opacity=".75">${esc(config.world)} · ${esc(metrics.login)} · ${esc(scope)}</text></g></svg>`;
  const bar = (x, y, width, label, value) => `<text x="${x}" y="${y}" font-size="17">${esc(label)}</text><rect x="${x}" y="${y+12}" width="${Math.max(1,width)}" height="18" rx="4" fill="${accent}"/><text x="${x+width+12}" y="${y+28}" font-size="16">${esc(value)}</text>`;
  const boxes = [['PUBLIC REPOS', metrics.totals.repositories], ['STARS', metrics.totals.stars], ['OPEN ISSUES + PRS', metrics.totals.openIssuesAndPullRequests], ['COMMITS / 30D', metrics.totals.uniqueCommits30d]];
  const overview = frame('Repository radar', 'Owned public repositories, including forks. This is not personal contribution scoring.', boxes.map(([label, value], i) => `<g transform="translate(${42+i*283} 136)"><rect width="265" height="173" rx="10" fill="${paper}"/><text x="20" y="43" font-size="16">${label}</text><text x="20" y="119" font-size="57" fill="${accent}">${value}</text></g>`).join(''));
  const max = Math.max(1, ...metrics.daily.map(day => day.commits));
  const activity = frame('Thirty days in orbit', 'Unique commit SHAs on public default branches · UTC · all authors · forks included', metrics.daily.map((day, index) => `<g><rect x="${43+index*37}" y="${315-day.commits/max*180}" width="25" height="${day.commits/max*180}" rx="3" fill="${accent}"/><title>${esc(day.day)}: ${day.commits} commits</title>${index%5===0?`<text x="${43+index*37}" y="343" font-size="13">${day.day.slice(5)}</text>`:''}</g>`).join('') + (metrics.totals.uniqueCommits30d===0?'<text x="42" y="153" font-size="19">No commits in this window.</text>':''));
  const entries = Object.entries(metrics.languages).sort((a,b)=>b[1]-a[1]);
  const top = entries.slice(0, 5);
  if (entries.length > 5) top.push(['Other', entries.slice(5).reduce((sum,[,n])=>sum+n,0)]);
  const total = entries.reduce((sum,[,n])=>sum+n,0);
  const languages = frame('Language constellation', 'GitHub Linguist source bytes across owned public repositories; not a skill percentage.', top.length ? top.map(([language, bytes], i) => bar(42+(i%2)*560, 134+Math.floor(i/2)*76, bytes/total*380, language, `${(bytes/total*100).toFixed(1)}%`)).join('') : '<text x="42" y="190" font-size="22">No language bytes reported yet.</text>');
  const groups = [['PUSH EVENTS', ['PushEvent']], ['ISSUE EVENTS', ['IssuesEvent']], ['PR + REVIEW EVENTS', ['PullRequestEvent','PullRequestReviewEvent']], ['COMMENT EVENTS', ['IssueCommentEvent','PullRequestReviewCommentEvent']]];
  const interactions = frame('Public interactions', `Account event feed · up to 300 events / 30 days · API delay up to 6h${metrics.publicEvents.feedLimitReached ? ' · LIMIT REACHED' : ''}`, groups.map(([label,types],i)=>`<g transform="translate(${42+i*283} 136)"><rect width="265" height="173" rx="10" fill="${paper}"/><text x="16" y="43" font-size="15">${label}</text><text x="20" y="119" font-size="57" fill="${accent}">${types.reduce((sum,type)=>sum+(metrics.publicEvents.counts[type]??0),0)}</text></g>`).join(''), 'limited public events by this account');
  return { overview, activity, languages, interactions };
}

export function versionChartImages(markdown, metrics) {
  return markdown.replace(/(\]\((?:https:\/\/[^\s)]+\/)?src\/assets\/live\/(?:overview|activity|languages|interactions)\.svg)(?:\?[^\s)]*)?\)/g,
    (_, source) => `${source}?snapshot=${encodeURIComponent(metrics.observedAt)})`);
}

export async function saveMetrics(root, config, metrics) {
  const output = path.join(root, 'src/assets/live');
  await mkdir(output, { recursive: true });
  for (const [name, svg] of Object.entries(renderPanels(config, metrics))) await writeFile(path.join(output, name+'.svg'), svg+'\n');
  const readme = path.join(root, 'README.md');
  try {
    const previous = await readFile(readme, 'utf8');
    const next = versionChartImages(previous, metrics);
    if (next !== previous) await writeFile(readme, next);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  // Publish the matching observation last; clients verify SVG timestamps against it.
  await writeFile(path.join(output, 'metrics.json'), JSON.stringify(metrics,null,2)+'\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const config = JSON.parse(await readFile(path.join(root, 'src/profile.json'), 'utf8'));
  const metrics = await collectMetrics(config.login, { token: process.env.GITHUB_TOKEN ?? '' });
  await saveMetrics(root, config, metrics);
  console.log(`Refreshed ${config.login}: ${metrics.totals.repositories} public repositories at ${metrics.observedAt}`);
}
