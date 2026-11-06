const status = document.querySelector('[data-freshness]');
let verifiedSnapshot = '';
let chartUrls = [];
let refreshing = false;
async function showFreshness() {
  if (refreshing || !status) return;
  refreshing = true;
  try {
    const response = await fetch('src/assets/live/metrics.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('No published snapshot');
    const data = await response.json();
    const date = new Date(data.observedAt);
    if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now() + 300000) throw new Error('Invalid snapshot time');
    if (verifiedSnapshot !== data.observedAt) {
      const images = [...document.querySelectorAll('img[data-live]')];
      if (images.length !== 4) throw new Error('Expected four live charts');
      const sources = await Promise.all(images.map(async image => {
        const source = image.dataset.chartSource || image.getAttribute('src');
        image.dataset.chartSource = source;
        const url = new URL(source, location.href);
        url.searchParams.set('snapshot', data.observedAt);
        const chart = await fetch(url.href, {cache:'no-store'});
        if (!chart.ok) throw new Error('Chart is unavailable');
        const svg = await chart.text();
        const xml = new DOMParser().parseFromString(svg, 'image/svg+xml');
        if (xml.querySelector('parsererror') || xml.documentElement.localName !== 'svg' ||
            !svg.includes(data.observedAt) || !svg.includes(data.login)) throw new Error('Chart belongs to a different snapshot');
        return svg;
      }));
      // Decode the entire new set before replacing any visible chart or freshness label.
      const next = sources.map(svg => URL.createObjectURL(new Blob([svg], {type:'image/svg+xml'})));
      try {
        await Promise.all(next.map(async source => { const image = new Image(); image.src = source; await image.decode(); }));
        images.forEach((image, index) => { image.src = next[index]; });
      } catch (error) { next.forEach(url => URL.revokeObjectURL(url)); throw error; }
      chartUrls.forEach(url => URL.revokeObjectURL(url));
      chartUrls = next;
      verifiedSnapshot = data.observedAt;
    }
    const interval = Number(data.refreshHours) > 0 ? Number(data.refreshHours) : 6;
    const old = Date.now() - date.getTime() > interval * 3600000;
    status.textContent = `GitHub observation: ${date.toLocaleString()} · ${old ? 'snapshot is overdue' : `refresh interval: ${interval} hours`}${data.automation ? ' · automated statistics snapshot' : ''}`;
    status.dataset.stale = String(old);
  } catch {
    status.textContent = 'Could not verify current charts · showing the last available images. Check the workflow and Pages source.';
    status.dataset.stale = 'true';
  } finally { refreshing = false; }
}
showFreshness();
setInterval(showFreshness, 5 * 60000);
