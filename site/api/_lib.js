// Shared helpers: config, markdown-to-email-HTML, Resend calls, unsubscribe tokens.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'drip.config.json'), 'utf8'));

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" style="color:#0067AC">$1</a>');

function parse(file) {
  const raw = fs.readFileSync(path.join(root, file), 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const meta = {};
  m[1].split('\n').forEach(l => {
    const i = l.indexOf(':');
    if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^"|"$/g, '').replace(/\\"/g, '"');
  });
  return { meta, body: m[2].trim() };
}

function toHtml(body, unsubUrl, preview) {
  const out = [];
  let list = false;
  const closeList = () => { if (list) { out.push('</ul>'); list = false; } };
  for (const raw of body.split(/\n{2,}/)) {
    let block = raw.trim();
    if (/^---(\n|$)/.test(block)) {
      closeList();
      out.push('<hr style="border:0;border-top:1px solid #999;margin:28px 0">');
      block = block.slice(3).trim();
      if (!block) continue;
    }
    const lines = block.split('\n');
    if (lines.every(l => /^- /.test(l))) {
      if (!list) { out.push('<ul style="padding-left:20px;margin:0 0 16px">'); list = true; }
      out.push(lines.map(l => `<li style="margin-bottom:8px">${inline(l.slice(2))}</li>`).join(''));
    } else if (/^### /.test(block)) {
      closeList();
      out.push(`<h2 style="font-size:22px;line-height:1.3;margin:28px 0 12px">${inline(block.slice(4))}</h2>`);
    } else {
      closeList();
      const small = /^The MRI Educator's Blueprint is an independent concept/.test(block);
      out.push(small
        ? `<p class="m" style="margin:0 0 16px;font-size:13px;color:#555">${inline(lines.join(' '))}</p>`
        : `<p style="margin:0 0 16px">${inline(lines.join('<br>'))}</p>`);
    }
  }
  closeList();
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><style>
:root{color-scheme:light dark}
@media (prefers-color-scheme:dark){body,.w{background:#111!important;color:#fff!important}a{color:#7CC4F0!important}.m{color:#bbb!important}}
</style></head><body style="margin:0;background:#fff;color:#111"><span style="display:none;max-height:0;overflow:hidden">${esc(preview || '')}</span>
<div class="w" style="max-width:600px;margin:0 auto;padding:28px 20px;background:#fff;font:17px/1.6 Arial,sans-serif;color:#111">
${out.join('\n')}
<p class="m" style="font-size:12px;color:#555;margin-top:28px"><a href="${unsubUrl}" class="m" style="color:#555">Unsubscribe</a></p>
</div></body></html>`;
}

function text(body, unsubUrl) {
  return body.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^### /gm, '').replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)') + `\n\nUnsubscribe: ${unsubUrl}`;
}

const secret = () => process.env.UNSUB_SECRET || process.env.RESEND_API_KEY || '';
const sign = e => crypto.createHmac('sha256', secret()).update(e.toLowerCase()).digest('hex').slice(0, 32);

async function resend(method, p, body) {
  const r = await fetch('https://api.resend.com' + p, {
    method,
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.message || `Resend ${r.status}`), { status: r.status, detail: j });
  return j;
}

module.exports = { config, parse, toHtml, text, sign, resend };
