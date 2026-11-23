/* レシピツリー（材料の計算） on recipe pages (MoE Wiki データ版). The recipe tree is in
   <script type="application/json" class="cc-data"> next to the form (written by m_recipetree.py): every material with
   its count, where it drops, who sells it and the recipe that makes it. This draws the tree and the totals for the
   number of sets or finished items typed in. */
(function () {
  var me = document.currentScript, src = (me && me.src) || '';
  var R = src.slice(0, src.lastIndexOf('/') + 1);
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function a(text, url) { return url ? '<a href="' + R + url + '">' + esc(text) + '</a>' : esc(text); }
  function link(it) { return a(it.n, it.u); }
  var FLAG = { 1: '道具（消費しない）', 2: '道具（1 セットごとに耐久度 −1）' };

  if (!document.getElementById('cc-style')) {
    var st = document.createElement('style'); st.id = 'cc-style';
    st.textContent = '.cc-tree ul{list-style:none;margin:2px 0 2px 1.1em;padding-left:.8em;border-left:1px dashed var(--line)}' +
      '.cc-tree>ul{margin-left:0;padding-left:0;border-left:0}.cc-tree li{margin:3px 0}' +
      '.cc-tree .cc-src{color:var(--muted);font-size:90%;margin-left:.4em}.cc-tree .cc-cnt{font-weight:bold}' +
      '.cc-tree summary{cursor:pointer}.cc-tree .cc-k{font-size:90%}';
    document.head.appendChild(st);
  }

  function srcHtml(s) {
    if (!s) return '';
    var p = [];
    if (s.d) p.push('ドロップ：' + s.d.map(function (x) { return a(x[0], x[1]) + '（' + x[2] + (x[3] ? '、' + esc(x[3]) : '') + '）'; }).join('、') +
      (s.dn > s.d.length ? ' ほか ' + (s.dn - s.d.length) : ''));
    if (s.g) p.push('採集：' + s.g.map(function (x) { return a(x[0], x[1]) + '（' + x[2] + (x[3] ? '、' + esc(x[3]) : '') + '）'; }).join('、') +
      (s.gn > s.g.length ? ' ほか ' + (s.gn - s.g.length) : ''));
    if (s.s) p.push('NPC：' + s.s.map(function (x) { return a(x[0], x[1]) + '（' + esc(x[2]) + (x[3] ? '、' + esc(x[3]) : '') + '）'; }).join('、') +
      (s.sn > s.s.length ? ' ほか ' + (s.sn - s.s.length) : ''));
    if (s.x) p.push(s.x.map(esc).join('・'));
    return p.join(' ／ ');
  }
  function skills(k) { return k.map(function (x) { return esc(x[0]) + ' ' + x[1]; }).join(' / '); }

  document.querySelectorAll('.cc').forEach(function (box) {
    var data = JSON.parse(box.querySelector('.cc-data').textContent);
    var num = box.querySelector('.cc-n'), mode = box.querySelector('.cc-mode'), deep = box.querySelector('.cc-deep');
    var out = box.querySelector('.cc-out'), treeEl = box.querySelector('.cc-tree');

    // ---- the tree: every material, its count for the sets asked, how to get it; crafted ones open into their recipe
    function tree(rec, sets, depth) {
      var h = '<ul>';
      rec.i.forEach(function (it) {
        var line, need = it.f === 0 ? it.c * sets : it.c;
        if (it.f !== 0) {
          h += '<li>' + link(it) + ' <span class="cc-cnt">×' + fmt(it.c) + '</span><span class="cc-src">' + FLAG[it.f] +
            (it.f === 2 ? '、耐久度 −' + fmt(sets) : '') + '</span></li>';
          return;
        }
        line = link(it) + ' <span class="cc-cnt">×' + fmt(need) + '</span>';
        var s = srcHtml(it.src);
        if (it.s) {
          var sub = Math.ceil(need / it.s.q);
          h += '<li><details' + (depth < 1 ? ' open' : '') + '><summary>' + line + '<span class="cc-src">生産：' + a('レシピ', it.s.ru) +
            ' <span class="cc-k">' + skills(it.s.k) + '</span>（' + fmt(sub) + ' セット → ' + fmt(sub * it.s.q) + ' 個）' +
            (s ? ' ／ ' + s : '') + '</span></summary>' + tree(it.s, sub, depth + 1) + '</details></li>';
        } else {
          var parts = [];
          if (s) parts.push(s);
          if (it.src && it.src.m) parts.push('生産でも作れる');
          h += '<li>' + line + '<span class="cc-src">' + (parts.join(' ／ ') || '入手方法のデータなし') + '</span></li>';
        }
      });
      return h + '</ul>';
    }

    // ---- the totals, split as deep as asked
    function walk(rec, sets, depth, acc, crafts, tools, path) {
      rec.i.forEach(function (it) {
        var need = it.f === 0 ? it.c * sets : it.c;
        if (it.f !== 0) {
          var t = tools[it.n] || (tools[it.n] = { it: it, c: 0, wear: 0 });
          t.c = Math.max(t.c, it.c); if (it.f === 2) t.wear += sets;
          return;
        }
        if (it.s && depth < +deep.value && path.indexOf(it.s.r) < 0) {
          var sub = Math.ceil(need / it.s.q);
          var k = it.s.r, cr = crafts[k] || (crafts[k] = { it: it, sets: 0, made: 0 });
          cr.sets += sub; cr.made += sub * it.s.q;
          walk(it.s, sub, depth + 1, acc, crafts, tools, path.concat([it.s.r]));
          return;
        }
        var x = acc[it.n] || (acc[it.n] = { it: it, c: 0 });
        x.c += need;
      });
    }

    function update() {
      var n = Math.max(1, Math.min(100000, parseInt(num.value, 10) || 1));
      var sets = mode.value === 'items' && data.q ? Math.ceil(n / data.q) : n;
      treeEl.innerHTML = '<p>' + esc(data.p || 'このレシピ') + (data.q ? ' ×' + fmt(sets * data.q) : '') + '（' + fmt(sets) + ' セット、' +
        skills(data.k) + '）</p>' + tree(data, sets, 0);
      var acc = {}, crafts = {}, tools = {};
      walk(data, sets, 0, acc, crafts, tools, [data.r]);
      var rows = Object.keys(acc).map(function (k) { return acc[k]; }).sort(function (p, q) { return q.c - p.c; });
      var h = '<table class="t"><thead><tr><th>材料</th><th>個数</th><th>入手</th></tr></thead><tbody>' + rows.map(function (x) {
        var sp = [];
        if (x.it.src) { var t = srcHtml(x.it.src); if (t) sp.push(t); }
        if (x.it.s) sp.push('生産：' + a('レシピ', x.it.s.ru) + ' ' + skills(x.it.s.k));
        else if (x.it.src && x.it.src.m) sp.push('生産でも作れる');
        return '<tr><td>' + link(x.it) + '</td><td>' + fmt(x.c) + '</td><td>' + (sp.join(' ／ ') || '') + '</td></tr>';
      }).join('') + '</tbody></table>';
      var cr = Object.keys(crafts).map(function (k) { return crafts[k]; });
      if (cr.length) h += '<p>途中で作るもの：' + cr.map(function (c) {
        return link(c.it) + ' ×' + fmt(c.made) + '（' + fmt(c.sets) + ' セット、' + skills(c.it.s.k) + '）';
      }).join('、') + '</p>';
      var tl = Object.keys(tools).map(function (k) { return tools[k]; });
      if (tl.length) h += '<p>道具（消費しない）：' + tl.map(function (t) {
        return link(t.it) + ' ×' + t.c + (t.wear ? '（耐久度 −' + fmt(t.wear) + '）' : '');
      }).join('、') + '</p>';
      out.innerHTML = h;
    }
    num.addEventListener('input', update); mode.addEventListener('change', update); deep.addEventListener('change', update);
    update();
  });
})();
