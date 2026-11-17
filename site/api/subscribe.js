// POST {email, company(honeypot)}: sends Day 0 now, schedules Days 1-5 with Resend.
const { config, parse, toHtml, text, sign, resend } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'Email is not configured yet.' });
  const { email, company } = req.body || {};
  if (company) return res.status(200).json({ ok: true }); // honeypot: pretend success
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '') || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });

  const base = config.siteUrl || `https://${req.headers.host}`;
  const unsub = `${base}/api/unsubscribe?e=${encodeURIComponent(email)}&t=${sign(email)}`;
  // DRIP_UNIT_MINUTES=1 turns each "hour" into a minute for test runs.
  const unit = process.env.DRIP_UNIT_MINUTES === '1' ? 60000 : 3600000;
  const now = Date.now();
  const ids = [];
  try {
    // Schedule Days 1-5 first so a failure never leaves a half-sent course after Day 0.
    for (const item of config.emails.filter(x => x.delayHours > 0)) {
      const { meta, body } = parse(item.file);
      const r = await resend('POST', '/emails', {
        from: config.from, to: [email], reply_to: config.replyTo, subject: meta.subject,
        html: toHtml(body, unsub, meta.preview), text: text(body, unsub),
        scheduled_at: new Date(now + item.delayHours * unit).toISOString(),
        headers: { 'List-Unsubscribe': `<${unsub}>` },
        tags: [{ name: 'course', value: config.tag }],
      });
      ids.push(r.id);
    }
    const d0 = config.emails.find(x => x.delayHours === 0);
    const { meta, body } = parse(d0.file);
    await resend('POST', '/emails', {
      from: config.from, to: [email], reply_to: config.replyTo, subject: meta.subject,
      html: toHtml(body, unsub, meta.preview), text: text(body, unsub),
      headers: { 'List-Unsubscribe': `<${unsub}>` },
      tags: [{ name: 'course', value: config.tag }],
    });
    return res.status(200).json({ ok: true, scheduled: ids.length });
  } catch (e) {
    // Roll back anything already scheduled.
    await Promise.all(ids.map(id => resend('POST', `/emails/${id}/cancel`).catch(() => {})));
    return res.status(502).json({ error: 'Could not send right now. Try again in a minute.' });
  }
};
