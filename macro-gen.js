/* マクロジェネレーター / チェッカー (MoE Wiki データ版). Data: macro-data.js (window.MCD), written by m_macro.py
   from the client: the player command table, the technique and item names, the emotes, the placeholder rules. */
(function () {
  var D = window.MCD, root = document.getElementById('mcgen');
  if (!D || !root) return;
  var TICK = D.tick, PAUSE = D.pause_ticks, LINES = 6, LINE_MAX = D.line_max;

  function q(s, e) { return (e || document).querySelector(s); }
  function mk(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function secs(t) { return (Math.round(t * TICK * 1000) / 1000).toFixed(3).replace(/\.?0+$/, '') + ' 秒'; }

  // ---- Shift-JIS bytes (the macro editor counts bytes: half-width 1, full-width 2)
  function sjis(s) {
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80 || (c >= 0xff61 && c <= 0xff9f)) n += 1;
      else { n += 2; if (c >= 0xd800 && c <= 0xdbff) i++; }
    }
    return n;
  }

  // ---- the client's command lookup: 27 buckets (a-z, the rest) in name order; an exact name (any case) wins at once,
  //      else the last record that may be abbreviated, starts with the typed word and is typed at least its minimum
  var B = [];
  for (var b = 0; b < 27; b++) B.push([]);
  function bk(w) { var c = w.charAt(0).toLowerCase(); return c >= 'a' && c <= 'z' ? c.charCodeAt(0) - 97 : 26; }
  D.cmd.forEach(function (c) { B[bk(c[0])].push(c); });
  function lookup(w, abbrev) {
    if (!w) return null;
    var lw = w.toLowerCase(), list = B[bk(w)], found = null;
    for (var i = 0; i < list.length; i++) {
      var c = list[i], n = c[0].toLowerCase();
      if (n === lw) return c;
      if (abbrev !== false && c[1] && n.indexOf(lw) === 0 && lw.length >= c[2]) found = c;
    }
    return found;
  }

  // ---- placeholders (%...): the client's rules, letter by letter
  function isd(c) { return c >= '0' && c <= '9'; }
  function pct(r) {               // r = the text after '%'; returns [length used, meaning] or null (the % stays)
    var a = r.charAt(0), P = D.pct;
    if (a === '1') return [1, P['1']];
    if (a >= '2' && a <= '5') return [1, P.party.replace('N', a)];
    if (a === 'c') {
      if (r.charAt(1) === 'e') return [2, P.ce];
      if (isd(r.charAt(1))) { var k = 1, v = 0; while (k <= 3 && isd(r.charAt(k))) { v = v * 10 + (+r.charAt(k)); k++; } return v < 368 ? [k, P.c] : null; }
      return null;
    }
    if (a === 'd') return r.substr(1, 2) === 'ir' ? [3, P.dir] : null;
    if (a === 'f') return isd(r.charAt(1)) && +r.charAt(1) < 9 ? [2, P.f] : null;
    if (a === 'h') return r.charAt(1) !== 'p' ? null : r.charAt(2) === 'p' ? [3, P.hpp] : [2, P.hp];
    if (a === 'm') return r.charAt(1) !== 'p' ? null : r.charAt(2) === 'p' ? [3, P.mpp] : [2, P.mp];
    if (a === 'i') return [1, P.i];
    if (a === 'l') {
      if (r.substr(1, 2) === 'nt') return [3, P.lnt];
      if (r.substr(1, 2) === 'st') return [3, P.lst];
      if (r.charAt(1) === 't') return [2, P.lt];
      return [1, P.l];
    }
    if (a === 'p') return [1, P.p];
    if (a === 'r') return [1, P.r];
    if (a === 's') {
      if (r.charAt(1) === 'b') return [2, P.sb];
      if (r.charAt(1) === 't') return r.charAt(2) === 'p' ? [3, P.stp] : [2, P.st];
      return null;
    }
    if (a === 't') return r.substr(1, 2) === 'sb' ? [3, P.tsb] : [1, P.t];
    return null;
  }
  function placeholders(s) {
    var out = [];
    for (var i = 0; i < s.length; i++) {
      if (s.charAt(i) !== '%') continue;
      var m = pct(s.slice(i + 1));
      if (m) { out.push(['%' + s.substr(i + 1, m[0]), m[1]]); i += m[0]; }
    }
    return out;
  }

  // ---- one line as the client reads it
  function readLine(s) {
    var r = { bytes: sjis(s), notes: [], ticks: 1, kind: '' };
    if (r.bytes > LINE_MAX) r.notes.push(['bad', D.t.too_long.replace('%d', LINE_MAX)]);
    if (s === '') { r.kind = D.t.empty; return r; }
    if (s.charAt(0) === '/') {
      if (s.slice(0, 6).toLowerCase() === '/pause') {
        var sp = s.indexOf(' '), n = sp < 0 ? 0 : parseInt(s.slice(sp + 1).replace(/^[\s]+/, ''), 10);
        if (!(n > 0 && n < 600)) { n = 0; r.notes.push(['warn', D.t.pause_zero]); }
        r.ticks = 1 + n * PAUSE;
        r.kind = '/pause ' + n + ' → ' + secs(n * PAUSE);
        return r;
      }
      var w = s.slice(1).split(' ')[0];
      var c = w.length > 63 ? null : lookup(w);
      if (!c) { r.kind = D.t.invalid; r.notes.push(['bad', "'/" + w + "' " + D.t.invalid]); }
      else {
        r.kind = '/' + c[0] + (c[0].toLowerCase() !== w.toLowerCase() ? ' ' + D.t.abbrev_of.replace('%s', '/' + w) : '');
        if (c[3]) r.kind += ' — ' + c[3];
        var arg = s.slice(1 + w.length).replace(/^ +/, '');
        if (c[0] === 'cmd') {
          var m = /^\[([^\]]*)\]/.exec(arg);
          if (!m) r.notes.push(['bad', D.t.no_bracket]);
          else if (m[1] && !TECH[m[1].toLowerCase()]) r.notes.push(['warn', D.t.no_tech.split('%s').join(m[1])]);
        }
        if (c[0] === 'targetcps') r.notes.push(['warn', D.t.loot]);
        if (c[0] === 'useitem' || c[0] === 'equipitem') {
          var mi = /^\[([^\]]*)\]/.exec(arg);
          if (mi && mi[1] && !anyItem(mi[1], c[0] === 'useitem' ? D.use : D.equip)) r.notes.push(['warn', D.t.no_item.replace('%s', mi[1])]);
        }
      }
    } else {
      r.kind = D.t.said;
      var w0 = s.split(' ')[0];
      if (lookup(w0, false)) r.notes.push(['warn', D.t.no_slash]);
    }
    placeholders(s).forEach(function (p) { r.notes.push(['ph', p[0] + ' → ' + p[1]]); });
    return r;
  }

  function timing(lines) {         // [{line, ticks}] -> the tick each line runs at, and the end
    var t = 0, at = [];
    for (var i = 0; i < LINES; i++) { at.push(t); t += lines[i] ? lines[i].ticks : 1; }
    return { at: at, end: t };
  }

  // ---- name lists (filled on first use)
  var TECH = {};
  D.tech.split('\n').forEach(function (n) { if (n) TECH[n.toLowerCase()] = 1; });

  // the client's item-name wildcard: '*' anywhere (several), '**' a literal '*', case kept, the whole name must
  // match; each part is taken at its first place after the previous one (no going back)
  function wild(pat, name) {
    var parts = [], cur = '', i;
    for (i = 0; i < pat.length; i++) {
      if (pat.charAt(i) === '*') {
        if (pat.charAt(i + 1) === '*') { cur += '*'; i++; continue; }
        parts.push(cur); cur = null; parts.push(null); cur = '';
      } else cur += pat.charAt(i);
    }
    parts.push(cur);
    var pos = 0, star = false;
    for (i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p === null) { star = true; continue; }
      if (p === '') continue;
      if (!star) { if (name.substr(pos, p.length) !== p) return false; pos += p.length; }
      else { var k = name.indexOf(p, pos); if (k < 0) return false; pos = k + p.length; }
      star = false;
    }
    return star || pos === name.length;
  }
  var itemCache = {};
  function anyItem(pat, src) {
    var key = src === D.use ? 'u' : 'e';
    if (!itemCache[key]) itemCache[key] = src.split('\n');
    var list = itemCache[key];
    for (var i = 0; i < list.length; i++) if (list[i] && wild(pat, list[i])) return true;
    return false;
  }
  var made = {};
  function datalist(id, src) {
    if (made[id]) return;
    made[id] = 1;
    var dl = mk('datalist'); dl.id = id;
    var frag = document.createDocumentFragment();
    src.split('\n').forEach(function (n) { if (n) { var o = document.createElement('option'); o.value = n; frag.appendChild(o); } });
    dl.appendChild(frag); root.appendChild(dl);
  }

  // ---- generator rows
  var rowsEl = q('#mc-rows', root), out = q('#mc-out', root), info = q('#mc-info', root);
  var KINDS = D.kinds;           // [[value, label], ...]

  function sel(opts, cls) {
    var s = mk('select', cls);
    opts.forEach(function (o) { var e = mk('option', null, o[1]); e.value = o[0]; s.appendChild(e); });
    return s;
  }
  function input(cls, ph, list) {
    var e = mk('input', cls); e.type = 'text'; if (ph) e.placeholder = ph;
    if (list) { e.setAttribute('list', list[0]); e.addEventListener('focus', function () { datalist(list[0], list[1]); }); }
    return e;
  }
  function targetBox() {
    var w = mk('span', 'mc-tg');
    var s = sel(D.targets, 'mc-ts');
    var pre = sel(D.prefixes, 'mc-tp');
    var nm = input('mc-tn', D.t.name_ph);
    pre.hidden = nm.hidden = true;
    s.addEventListener('change', function () { pre.hidden = nm.hidden = s.value !== 'name'; update(); });
    w.appendChild(s); w.appendChild(pre); w.appendChild(nm);
    w.value = function () { return s.value === 'name' ? (pre.value + nm.value.trim()) : s.value; };
    return w;
  }

  function addRow(kind) {
    if (rowsEl.children.length >= LINES) return;
    var row = mk('div', 'mc-row');
    var no = mk('span', 'mc-no');
    var k = sel(KINDS, 'mc-k');
    var p = mk('span', 'mc-p');
    var del = mk('button', 'mc-del', '×'); del.type = 'button'; del.title = D.t.remove;
    var up = mk('button', 'mc-up', '↑'); up.type = 'button'; up.title = D.t.up;
    row.appendChild(no); row.appendChild(k); row.appendChild(p); row.appendChild(up); row.appendChild(del);
    rowsEl.appendChild(row);
    function fields() {
      p.innerHTML = '';
      var v = k.value, f = {};
      if (v === 'cmd') { f.name = input('mc-n', D.t.tech_ph, ['mc-dl-tech', D.tech]); f.tgt = targetBox(); }
      else if (v === 'useitem') { f.name = input('mc-n', D.t.item_ph, ['mc-dl-use', D.use]); f.tgt = targetBox(); }
      else if (v === 'equipitem') { f.name = input('mc-n', D.t.item_ph, ['mc-dl-eq', D.equip]); f.opt = sel(D.equip_opts, 'mc-o'); }
      else if (v === 'target') { f.tgt = targetBox(); }
      else if (v === 'near') { f.opt = sel(D.near, 'mc-o'); }
      else if (v === 'pause') {
        f.num = mk('input', 'mc-num'); f.num.type = 'number'; f.num.min = 1; f.num.max = 599; f.num.value = 1;
        f.sec = mk('span', 'mc-sec');
      }
      else if (v === 'pet') { f.opt = sel(D.pet, 'mc-o'); }
      else if (v === 'chat') { f.opt = sel(D.chat, 'mc-o'); f.to = input('mc-to', D.t.tell_ph); f.text = input('mc-txt', D.t.text_ph); }
      else if (v === 'emote') { f.opt = sel(D.emote, 'mc-o'); }
      else if (v === 'toggle') { f.opt = sel(D.toggles, 'mc-o'); f.on = sel([['on', 'on'], ['off', 'off'], ['', D.t.toggle_flip]], 'mc-o2'); }
      else if (v === 'any') {
        f.opt = mk('select', 'mc-o');
        D.allcmd.forEach(function (g) {
          var og = document.createElement('optgroup'); og.label = g[0];
          g[1].forEach(function (c) { var o = mk('option', null, c[1]); o.value = c[0]; o.setAttribute('data-u', c[2]); og.appendChild(o); });
          f.opt.appendChild(og);
        });
        f.arg = input('mc-txt', D.t.args_ph);
        var hint = function () { var o = f.opt.options[f.opt.selectedIndex]; f.arg.placeholder = (o && o.getAttribute('data-u')) || D.t.args_ph; };
        f.opt.addEventListener('change', hint); hint();
      }
      else if (v === 'free') { f.text = input('mc-free', D.t.free_ph); }
      Object.keys(f).forEach(function (n) { p.appendChild(f[n]); });
      if (f.to) { f.to.hidden = f.opt.value !== 'tell'; f.opt.addEventListener('change', function () { f.to.hidden = f.opt.value !== 'tell'; }); }
      row.f = f;
      update();
    }
    row.text = function () {
      var v = k.value, f = row.f || {}, t;
      if (v === 'cmd' || v === 'useitem') {
        var n = f.name.value.trim(); if (!n) return '';
        t = f.tgt.value();
        return '/' + v + ' [' + n + ']' + (t ? ' ' + t : '');
      }
      if (v === 'equipitem') { var e = f.name.value.trim(); if (!e) return ''; return '/equipitem [' + e + ']' + (f.opt.value ? ' ' + f.opt.value : ''); }
      if (v === 'target') { t = f.tgt.value(); return t ? '/target ' + t : '/targetclear'; }
      if (v === 'near' || v === 'pet' || v === 'emote') return f.opt.value;
      if (v === 'pause') {
        var n2 = Math.max(1, Math.min(599, parseInt(f.num.value, 10) || 1));
        f.sec.textContent = '= ' + secs(n2 * PAUSE);
        return '/pause ' + n2;
      }
      if (v === 'chat') { var x = f.text.value; if (f.opt.value === 'tell') return '/tell ' + f.to.value.trim() + ' ' + x; return f.opt.value + ' ' + x; }
      if (v === 'toggle') return f.opt.value + (f.on.value ? ' ' + f.on.value : '');
      if (v === 'any') { var ag = f.arg.value.trim(); return '/' + f.opt.value + (ag ? ' ' + ag : ''); }
      if (v === 'free') return f.text.value;
      return '';
    };
    k.addEventListener('change', fields);
    del.addEventListener('click', function () { row.remove(); update(); });
    up.addEventListener('click', function () { if (row.previousElementSibling) rowsEl.insertBefore(row, row.previousElementSibling); update(); });
    if (kind) k.value = kind;
    fields();
  }

  function report(lines, el) {
    var T = timing(lines), h = '<table class="t mc-t"><thead><tr><th>' + D.t.h_line + '</th><th>' + D.t.h_text + '</th><th>' + D.t.h_bytes +
      '</th><th>' + D.t.h_at + '</th><th>' + D.t.h_read + '</th></tr></thead><tbody>';
    for (var i = 0; i < LINES; i++) {
      var L = lines[i], s = L ? L.src : '';
      var notes = L ? L.r.notes.map(function (n) { return '<div class="mc-' + n[0] + '">' + esc(n[1]) + '</div>'; }).join('') : '';
      h += '<tr><td>' + (i + 1) + '</td><td class="mc-src">' + esc(s) + '</td><td>' + (L ? L.r.bytes : 0) + '</td><td>' + secs(T.at[i]) +
        '</td><td>' + esc(L ? L.r.kind : D.t.empty) + notes + '</td></tr>';
    }
    h += '</tbody></table><p>' + D.t.total.replace('%s', secs(T.end)) + '</p>';
    el.innerHTML = h;
  }

  function update() {
    var lines = [], txt = [];
    Array.prototype.forEach.call(rowsEl.children, function (row, i) {
      q('.mc-no', row).textContent = (i + 1) + '.';
      var s = row.text ? row.text() : '';
      txt.push(s);
    });
    while (txt.length && txt[txt.length - 1] === '') txt.pop();
    txt.forEach(function (s) { var r = readLine(s); lines.push({ src: s, r: r, ticks: r.ticks }); });
    out.value = txt.join('\n');
    report(lines, info);
    q('#mc-add', root).disabled = rowsEl.children.length >= LINES;
  }

  rowsEl.addEventListener('input', update);
  rowsEl.addEventListener('change', update);
  q('#mc-add', root).addEventListener('click', function () { addRow('cmd'); });
  q('#mc-copy', root).addEventListener('click', function () {
    var msg = q('#mc-msg', root);
    var done = function () { msg.textContent = D.t.copied; setTimeout(function () { msg.textContent = ''; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(out.value).then(done, function () { out.select(); document.execCommand('copy'); done(); });
    else { out.select(); document.execCommand('copy'); done(); }
  });
  q('#mc-to-check', root).addEventListener('click', function () { q('#mc-in', root).value = out.value; tab('chk'); check(); });

  // ---- checker
  function check() {
    var src = q('#mc-in', root).value.replace(/\r/g, '').split('\n'), lines = [];
    var extra = src.length > LINES ? src.slice(LINES).filter(function (s) { return s !== ''; }).length : 0;
    src.slice(0, LINES).forEach(function (s) { var r = readLine(s); lines.push({ src: s, r: r, ticks: r.ticks }); });
    report(lines, q('#mc-res', root));
    if (extra) q('#mc-res', root).insertAdjacentHTML('afterbegin', '<p class="mc-bad">' + esc(D.t.extra.replace('%d', extra)) + '</p>');
  }
  q('#mc-in', root).addEventListener('input', check);

  // ---- tabs
  function tab(t) {
    root.querySelectorAll('.mc-tab').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
    root.querySelectorAll('.mc-pane').forEach(function (p) { p.hidden = p.dataset.p !== t; });
  }
  root.querySelectorAll('.mc-tab').forEach(function (b) { b.addEventListener('click', function () { tab(b.dataset.t); }); });

  // ---- examples (fill the generator)
  // (the example links come after this script in the page: one listener on the document)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-mc-ex]');
    if (!a) return;
    e.preventDefault();
    q('#mc-in', root).value = a.getAttribute('data-mc-ex'); tab('chk'); check();
    root.scrollIntoView({ behavior: 'smooth' });
  });

  addRow('cmd');
  check();
})();
