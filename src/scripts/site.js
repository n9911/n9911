const status = document.querySelector('[data-freshness]');
async function showFreshness() {
  try {
    const response = await fetch('src/assets/live/metrics.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('No published snapshot');
    const data = await response.json();
    const date = new Date(data.observedAt);
    if (!Number.isFinite(date.getTime())) throw new Error('Invalid snapshot time');
    const interval = Number(data.refreshHours) || 24;
    const old = Date.now() - date.getTime() > interval * 2 * 3600000;
    status.textContent = `GitHub data: ${date.toLocaleString()} · ${old ? 'snapshot is overdue' : `snapshot interval: ${interval} hours`}${data.automation ? ' · automated statistics snapshot' : ''}`;
    status.dataset.stale = String(old);
    for (const image of document.querySelectorAll('img[data-live]')) {
      const url = new URL(image.getAttribute('src'), location.href);
      url.searchParams.set('snapshot', data.observedAt);
      image.src = url.href;
    }
  } catch {
    status.textContent = 'Saved snapshot · live refresh starts after GitHub Pages and its workflow are enabled.';
  }
}
showFreshness();
setInterval(showFreshness, 6 * 3600000);
