/* =====================================================================
   markdown.js – small, safe Markdown renderer for release notes (HC.md)

   Input is untrusted text (GitHub release body / CHANGELOG section). Nothing of it reaches the
   DOM unescaped: the text is split into blocks and inline tokens, every piece of text goes
   through esc(), and the only markup in the result is the fixed set of tags written here.
   Raw HTML in the notes is shown as text, HTML comments are dropped.

   Supported: headings (#..######, a line that is only **bold**), bullet and numbered lists
   (nested, task boxes), **bold**, *italic*, ~~strike~~, `code`, fenced code, links and bare URLs
   (https:// only, opened externally: target=_blank – pywebview hands those to the system
   browser), tables, blockquotes, horizontal rules. Images become their alt text.

   HC.md.parse(md)            -> blocks
   HC.md.render(md | blocks)  -> HTML string
   HC.md.summary(md, max)     -> {html, partial} | null   highlights: the list below a
                                 «Highlights» heading, else the first list, else the first paragraph
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const esc = HC.util.esc;

  const MAX_INPUT = 200000; // characters
  const MAX_INLINE = 20000;
  const MAX_DEPTH = 4; // nested lists / quotes

  /* ---------- links ---------- */
  /** Only absolute https:// URLs without credentials; returns the normalised URL or ''. */
  function safeUrl(raw) {
    const s = String(raw || '');
    if (!/^https:\/\/[^\s\\<>"'`]+$/i.test(s)) return '';
    try {
      const u = new URL(s);
      if (u.protocol !== 'https:' || !u.hostname || u.username || u.password) return '';
      return u.href;
    } catch (e) {
      return '';
    }
  }
  const anchor = (href, html) => `<a class="md-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${html}</a>`;

  /* ---------- inline ---------- */
  const INLINE = new RegExp([
    /\\([!-/:-@[-`{-~])/, // 1 escaped punctuation
    /(`+)(?!`)(.+?)\2(?!`)/, // 2,3 code
    /!?\[((?:[^[\]\\]|\\.)*)\]\(\s*<?([^\s<>()]*(?:\([^\s<>()]*\)[^\s<>()]*)*)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/, // 4,5 link / image
    /<(https:\/\/[^\s<>]+)>/, // 6 autolink
    /\*\*(?=\S)(.+?)(?<=\S)\*\*/, // 7 bold
    /(?<![A-Za-z0-9])__(?=\S)(.+?)(?<=\S)__(?![A-Za-z0-9])/, // 8 bold
    /~~(?=\S)(.+?)(?<=\S)~~/, // 9 strike
    /(?<![A-Za-z0-9*])\*(?=[^\s*])([^*]+?)(?<=[^\s*])\*(?![A-Za-z0-9*])/, // 10 italic (not inside words: 2*3*4, *.mp3)
    /(?<![A-Za-z0-9_])_(?=[^\s_])([^_]+?)(?<=[^\s_])_(?![A-Za-z0-9_])/, // 11 italic
    /(?<![A-Za-z0-9])(https:\/\/[^\s<>"'`]+)/, // 12 bare URL
  ].map((r) => r.source).join('|'), 'g');

  function inline(raw, noLinks, depth) {
    const s = String(raw == null ? '' : raw);
    const d = depth || 0;
    if (s.length > MAX_INLINE || d > 6) return esc(s);
    let out = '';
    let last = 0;
    const re = new RegExp(INLINE, 'g'); // own state: inline() recurses
    let m;
    while ((m = re.exec(s))) {
      out += esc(s.slice(last, m.index));
      last = m.index + m[0].length;
      const sub = (t) => inline(t, noLinks, d + 1);
      if (m[1] != null) out += esc(m[1]);
      else if (m[3] != null) out += `<code>${esc(m[3].trim())}</code>`;
      else if (m[4] != null) {
        const href = noLinks ? '' : safeUrl(m[5]);
        const text = inline(m[4], true, d + 1);
        out += href ? anchor(href, text || esc(href)) : text;
      } else if (m[6] != null) {
        const href = noLinks ? '' : safeUrl(m[6]);
        out += href ? anchor(href, esc(m[6])) : esc(m[6]);
      } else if (m[7] != null || m[8] != null) out += `<strong>${sub(m[7] != null ? m[7] : m[8])}</strong>`;
      else if (m[9] != null) out += `<del>${sub(m[9])}</del>`;
      else if (m[10] != null || m[11] != null) out += `<em>${sub(m[10] != null ? m[10] : m[11])}</em>`;
      else if (m[12] != null) {
        const tail = /[.,;:!?)\]]+$/.exec(m[12]); // punctuation after a URL belongs to the sentence
        const url = tail ? m[12].slice(0, -tail[0].length) : m[12];
        const href = noLinks ? '' : safeUrl(url);
        out += (href ? anchor(href, esc(url)) : esc(url)) + (tail ? esc(tail[0]) : '');
      }
    }
    return out + esc(s.slice(last));
  }

  /** Text of an inline string without Markdown markers (for matching headings). */
  const plain = (s) => String(s || '').replace(/[*_`~]/g, '').replace(/\s+/g, ' ').trim();

  /* ---------- blocks ---------- */
  const RE_HEAD = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
  const RE_HR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
  const RE_FENCE = /^ {0,3}(`{3,}|~{3,})/;
  const RE_QUOTE = /^ {0,3}>[ \t]?(.*)$/;
  const RE_ITEM = /^( *)([-*+]|\d{1,9}[.)])[ \t]+(.*)$/;
  const RE_TSEP = /^ *\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
  const RE_BOLD_LINE = /^ {0,3}(?:\*\*|__)([^*_].*?)(?:\*\*|__):?[ \t]*$/;

  const cells = (line) => {
    let s = line.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
    return s.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
  };
  const isTable = (lines, i) => lines[i].includes('|') && i + 1 < lines.length && lines[i + 1].includes('-') &&
    (lines[i + 1].includes('|') || lines[i].trim().startsWith('|')) && RE_TSEP.test(lines[i + 1]);
  const startsBlock = (lines, i) => RE_HEAD.test(lines[i]) || RE_HR.test(lines[i]) || RE_FENCE.test(lines[i]) ||
    RE_QUOTE.test(lines[i]) || RE_ITEM.test(lines[i]) || isTable(lines, i);

  function parseLines(lines, depth) {
    const blocks = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      let m;
      if ((m = RE_FENCE.exec(line))) {
        const close = new RegExp(`^ {0,3}${m[1][0]}{${m[1].length},}[ \\t]*$`);
        const body = [];
        i++;
        while (i < lines.length && !close.test(lines[i])) body.push(lines[i++]);
        i++;
        blocks.push({ t: 'code', text: body.join('\n') });
        continue;
      }
      if ((m = RE_HEAD.exec(line))) { blocks.push({ t: 'h', level: m[1].length, text: m[2] }); i++; continue; }
      if (RE_HR.test(line)) { blocks.push({ t: 'hr' }); i++; continue; }
      if (RE_QUOTE.test(line)) {
        const inner = [];
        while (i < lines.length && (m = RE_QUOTE.exec(lines[i]))) { inner.push(m[1]); i++; }
        blocks.push({ t: 'quote', blocks: depth < MAX_DEPTH ? parseLines(inner, depth + 1) : [{ t: 'p', text: inner.join(' ') }] });
        continue;
      }
      if (isTable(lines, i)) {
        const head = cells(line);
        const align = cells(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? 'c' : /-:$/.test(c) ? 'r' : ''));
        const rows = [];
        i += 2;
        while (i < lines.length && lines[i].trim() && lines[i].includes('|')) rows.push(cells(lines[i++]));
        blocks.push({ t: 'table', head, align, rows });
        continue;
      }
      if ((m = RE_ITEM.exec(line))) {
        const base = m[1].length;
        const ordered = /\d/.test(m[2]);
        const list = { t: ordered ? 'ol' : 'ul', start: ordered ? parseInt(m[2], 10) : null, items: [] };
        while (i < lines.length) {
          const it = RE_ITEM.exec(lines[i]);
          if (!it || it[1].length > base + 1 || it[1].length < base || /\d/.test(it[2]) !== ordered) break;
          const own = [it[3]];
          i++;
          while (i < lines.length) {
            const l = lines[i];
            if (!l.trim()) { // a blank line stays in the item only if indented text follows
              let j = i + 1;
              while (j < lines.length && !lines[j].trim()) j++;
              if (j < lines.length && /^ {2,}\S/.test(lines[j]) && lines[j].search(/\S/) > base) { own.push(''); i++; continue; }
              break;
            }
            const indent = l.search(/\S/);
            if (indent > base + 1) { own.push(l.slice(Math.min(indent, base + 2))); i++; continue; }
            if (startsBlock(lines, i)) break;
            own.push(l.trim()); // lazy continuation
            i++;
          }
          let k = 1;
          const text = [own[0]];
          while (k < own.length && own[k].trim() && !startsBlock(own, k)) text.push(own[k++].trim());
          const task = /^\[([ xX])\][ \t]+(.*)$/.exec(text[0]);
          if (task) text[0] = task[2];
          const rest = own.slice(k);
          list.items.push({
            text: text.join(' '),
            task: task ? (task[1] === ' ' ? 'open' : 'done') : null,
            children: rest.some((l) => l.trim()) ? (depth < MAX_DEPTH ? parseLines(rest, depth + 1) : [{ t: 'p', text: rest.join(' ') }]) : [],
          });
          while (i < lines.length && !lines[i].trim() && i + 1 < lines.length && RE_ITEM.test(lines[i + 1])) i++; // loose list
        }
        blocks.push(list);
        continue;
      }
      if ((m = RE_BOLD_LINE.exec(line)) && !/\*\*|__/.test(m[1]) && (i + 1 >= lines.length || !lines[i + 1].trim() || startsBlock(lines, i + 1))) {
        blocks.push({ t: 'h', level: 4, text: m[1] });
        i++;
        continue;
      }
      const para = [line.trim()];
      i++;
      while (i < lines.length && lines[i].trim() && !startsBlock(lines, i)) para.push(lines[i++].trim());
      blocks.push({ t: 'p', text: para.join(' ') });
    }
    return blocks;
  }

  function parse(md) {
    const text = String(md == null ? '' : md).slice(0, MAX_INPUT)
      .replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?(?:-->|$)/g, '').replace(/\t/g, '    ');
    return parseLines(text.split('\n'), 0);
  }

  /* ---------- HTML ---------- */
  function blockHtml(b) {
    if (b.t === 'h') { const n = b.level <= 2 ? 3 : b.level === 3 ? 4 : 5; return `<h${n}>${inline(b.text)}</h${n}>`; }
    if (b.t === 'p') return `<p>${inline(b.text)}</p>`;
    if (b.t === 'hr') return '<hr>';
    if (b.t === 'code') return `<pre><code>${esc(b.text)}</code></pre>`;
    if (b.t === 'quote') return `<blockquote>${b.blocks.map(blockHtml).join('')}</blockquote>`;
    if (b.t === 'ul' || b.t === 'ol') {
      const start = b.t === 'ol' && Number.isFinite(b.start) && b.start !== 1 ? ` start="${Number(b.start)}"` : '';
      return `<${b.t}${start}>${b.items.map((it) => `<li${it.task ? ` class="md-task ${it.task}"` : ''}>${inline(it.text)}${it.children.map(blockHtml).join('')}</li>`).join('')}</${b.t}>`;
    }
    if (b.t === 'table') {
      const cls = (i) => (b.align[i] ? ` class="md-${b.align[i]}"` : '');
      const row = (r, tag) => `<tr>${b.head.map((_, i) => `<${tag}${cls(i)}>${inline(r[i] || '')}</${tag}>`).join('')}</tr>`;
      return `<div class="md-table"><table><thead>${row(b.head, 'th')}</thead><tbody>${b.rows.map((r) => row(r, 'td')).join('')}</tbody></table></div>`;
    }
    return '';
  }
  const render = (md) => (Array.isArray(md) ? md : parse(md)).map(blockHtml).join('');

  /* ---------- highlights ---------- */
  const RE_HIGHLIGHTS = /^highlights?\b/i;
  function summary(md, max) {
    const blocks = Array.isArray(md) ? md : parse(md);
    const limit = max || 8;
    const isList = (b) => b.t === 'ul' || b.t === 'ol';
    let list = null;
    const at = blocks.findIndex((b) => b.t === 'h' && RE_HIGHLIGHTS.test(plain(b.text)));
    for (let i = at + 1; at >= 0 && i < blocks.length && blocks[i].t !== 'h'; i++) {
      if (isList(blocks[i])) { list = blocks[i]; break; }
    }
    if (!list) list = blocks.find(isList);
    if (list) {
      const items = list.items.slice(0, limit).map((it) => ({ text: it.text, task: it.task, children: [] }));
      const whole = blocks.filter((b) => !(b.t === 'h' && RE_HIGHLIGHTS.test(plain(b.text)))).length === 1 &&
        list.items.length <= limit && list.items.every((it) => !it.children.length);
      return { html: blockHtml({ t: 'ul', items }), partial: !whole };
    }
    const p = blocks.find((b) => b.t === 'p');
    if (!p) return null;
    return { html: blockHtml(p), partial: blocks.length > 1 };
  }

  HC.md = { parse, render, summary, inline: (s) => inline(s), safeUrl };
})();
