/**
 * Sport-aware live clock label.
 *
 * Football's `timer` is elapsed minutes ("67" → "67'"). Everything else
 * is not: basketball/hockey send a period code (Q3 / P2 / OT) plus a
 * countdown clock ("07:32"), baseball sends the inning as the status code
 * (IN5, IN10…) and no clock at all. Rendering all of them as `${timer}'`
 * produced "07:32'" and plain "LIVE" for a 7th-inning game.
 */
export const LIVE_STATUS_RE = /^(1H|2H|HT|ET|P|BT|LIVE|INTR|Q\d|OT|AOT|P\d|S\d|R\d|IN\d+)$/;

export function isLiveStatus(status?: string | null): boolean {
  return !!status && LIVE_STATUS_RE.test(status);
}

export function formatLiveClock(
  status: string | undefined | null,
  timer: string | number | null | undefined,
  t: (key: string, opts?: any) => string,
): string {
  const s = status || '';
  const inning = s.match(/^IN(\d+)$/);
  if (inning) return t('dashboard.inning', { n: Number(inning[1]) });
  if (s === 'HT') return t('dashboard.ht');
  if (s === 'INTR') return t('dashboard.interrupted');
  const clock = timer != null && String(timer).trim() !== '' ? String(timer) : '';
  if (s === '1H' || s === '2H' || s === 'ET') {
    return clock ? `${t('dashboard.live')} ${clock}'` : t('dashboard.live');
  }
  if (/^(Q\d|OT|P\d|S\d|R\d|BT)$/.test(s)) {
    return clock ? `${s} · ${clock}` : s;
  }
  return clock ? `${t('dashboard.live')} ${clock}` : t('dashboard.live');
}
