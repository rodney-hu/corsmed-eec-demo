// GET ?e=email&t=token: cancels this address's pending scheduled emails.
const { config, sign, resend } = require('./_lib');

const page = msg => `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex><title>Unsubscribe</title><body style="font:18px/1.6 Arial,sans-serif;max-width:520px;margin:15vh auto;padding:0 20px;color:#1A4D6F"><p>${msg}</p>`;

module.exports = async (req, res) => {
  const { e, t } = req.query || {};
  res.setHeader('content-type', 'text/html; charset=utf-8');
  if (!e || !t || sign(e) !== t) return res.status(400).send(page('This unsubscribe link is not valid.'));
  let cancelled = 0;
  try {
    const list = await resend('GET', '/emails?limit=100');
    for (const m of list.data || []) {
      const to = (m.to || []).map(x => x.toLowerCase());
      if (to.includes(e.toLowerCase()) && m.last_event === 'scheduled' && m.scheduled_at) {
        await resend('POST', `/emails/${m.id}/cancel`).then(() => cancelled++).catch(() => {});
      }
    }
  } catch (err) {
    console.error('unsubscribe failed:', err.message);
    return res.status(502).send(page('Could not process that right now. Reply to any email and Rodney will remove you.'));
  }
  return res.status(200).send(page(`You're unsubscribed. ${cancelled} upcoming email${cancelled === 1 ? '' : 's'} cancelled.`));
};
