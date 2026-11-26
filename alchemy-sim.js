/* 錬金シミュレーター on the 錬金ガイド page (MoE Wiki データ版). The data is in
   <script type="application/json" class="al-data"> next to the form (written by m_alchemyguide.py from the alchemy
   box scripts, refdecode/alchemy.py): the 属性 names, the result odds by coin, the combination table (属性① / 属性②
   and result -> result 属性 and rank change), the items of each lineup. Rank of the result = (rank 1 + rank 2) / 2
   rounded down + the change, kept in 1-10; the item is the lineup's item of that 属性 and rank. */
(function () {
  var me = document.currentScript, src = (me && me.src) || '';
  var R = src.slice(0, src.lastIndexOf('/') + 1);
  var root = me ? me.parentNode : document;
  var dataEl = root.querySelector('script.al-data');
  if (!dataEl) return;
  var D = JSON.parse(dataEl.textContent);
  function $(c) { return root.querySelector('.' + c); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function a(text, url) { return url ? '<a href="' + R + url + '">' + esc(text) + '</a>' : esc(text); }
  function pct(x) { var v = Math.round(x * 1000) / 10; return (v % 1 ? v.toFixed(1) : String(v)) + '%'; }

  if (!document.getElementById('al-style')) {
    var st = document.createElement('style'); st.id = 'al-style';
    st.textContent = '.al-form p{margin:6px 0}.al-form select{max-width:100%}.al-roll{margin:8px 0;padding:8px;border:1px solid var(--line);' +
      'border-radius:6px}.al-roll b{font-size:110%}.al-hist{color:var(--muted);font-size:90%}.al-lost{color:var(--muted)}';
    document.head.appendChild(st);
  }

  var TIERS = D.tiers;                           // {1: '通常', ...}
  function lineup() { return D.lineups[$('al-lu').value]; }
  function byKey(lu) {                           // '属性,ランク' -> item
    var m = {};
    lu.forEach(function (it) { m[it[1] + ',' + it[2]] = it; });
    return m;
  }
  function rule(a1, a2) { return D.rules[Math.min(a1, a2) + ',' + Math.max(a1, a2)]; }
  function attr(n) { return n > 0 ? D.attrs[n - 1] : '—'; }

  function fillItems(sel, keep) {
    var lu = lineup(), html = '';
    for (var at = 1; at <= D.attrs.length; at++) {
      html += '<optgroup label="' + esc(D.attrs[at - 1]) + '">';
      lu.forEach(function (it, i) {
        if (it[1] === at) html += '<option value="' + i + '">' + esc(it[3]) + '（' + esc(D.attrs[at - 1]) + ' ランク ' + it[2] + '）</option>';
      });
      html += '</optgroup>';
    }
    sel.innerHTML = html;
    if (keep !== undefined && keep < lu.length) sel.value = keep;
  }

  // every result of the two items in slots 1 and 2: [tier, chance, item or null, 属性, ランク]
  function outcomes() {
    var lu = lineup(), K = byKey(lu);
    var i1 = lu[+$('al-s1').value], i2 = lu[+$('al-s2').value];
    var odds = D.odds[$('al-coin').value], rl = rule(i1[1], i2[1]);
    var base = Math.floor((i1[2] + i2[2]) / 2), out = [];
    Object.keys(TIERS).forEach(function (t) {
      var ch = odds[t] || 0;
      if (!ch) return;
      var r = rl[t - 1];
      if (!r || r[0] <= 0) { out.push([+t, ch, null, 0, 0]); return; }
      var rank = Math.max(1, Math.min(10, base + r[1]));
      out.push([+t, ch, K[r[0] + ',' + rank] || null, r[0], rank]);
    });
    return out;
  }

  function lostText() {
    var ins = $('al-ins').value;
    if (ins === '1') return '入れたアイテムはなくなる（' + esc(D.ins[1]) + ' の効果で素材は戻る）';
    return '入れたアイテムはすべてなくなる';
  }

  function draw() {
    var rows = outcomes(), ins = $('al-ins').value, html = '<table class="t"><thead><tr><th>結果</th><th data-num="1">確率</th>' +
      '<th>できるアイテム</th><th>属性</th><th data-num="1">ランク</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr><td>' + esc(TIERS[r[0]]) + '</td><td>' + pct(r[1]) + '</td>' +
        (r[2] ? '<td>' + a(r[2][3], r[2][4]) + '</td><td>' + esc(attr(r[3])) + '</td><td>' + r[4] + '</td>'
              : '<td class="al-lost" colspan="3">' + lostText() + '</td>') + '</tr>';
    });
    html += '</tbody></table>';
    if (ins === '2') html += '<p class="al-hist">' + esc(D.ins[2]) + '：どの結果のあとでも「元に戻しますか？」で YES を選ぶと素材が戻る（' +
      esc(D.ins[2]) + ' はなくなる）。</p>';
    $('al-out').innerHTML = html;
  }

  var hist = [];
  function roll() {
    var rows = outcomes(), x = Math.random(), acc = 0, pick = rows[rows.length - 1];
    for (var i = 0; i < rows.length; i++) { acc += rows[i][1]; if (x < acc) { pick = rows[i]; break; } }
    var t = TIERS[pick[0]], msg = pick[2] ? '<b>' + esc(t) + '</b>：' + a(pick[2][3], pick[2][4]) + ' になった'
                                          : '<b>' + esc(t) + '</b>：' + lostText();
    hist.unshift(t);
    if (hist.length > 20) hist.pop();
    var cnt = {};
    hist.forEach(function (h) { cnt[h] = (cnt[h] || 0) + 1; });
    $('al-roll').innerHTML = msg + '<div class="al-hist">これまでの ' + hist.length + ' 回（新しい順）：' + esc(hist.join('・')) + '</div>';
  }

  // the ways to make one item: 属性 pairs, results and the rank sums (rank 1 + rank 2) that land on its rank
  function reverse() {
    var lu = lineup(), it = lu[+$('al-target').value], coin = $('al-coin').value, odds = D.odds[coin], rows = [];
    for (var a1 = 1; a1 <= D.attrs.length; a1++) {
      for (var a2 = a1; a2 <= D.attrs.length; a2++) {
        var rl = rule(a1, a2);
        for (var t = 1; t <= 4; t++) {
          var r = rl[t - 1];
          if (!r || r[0] !== it[1] || !(odds[t] > 0)) continue;
          var sums = [];
          for (var s = 2; s <= 20; s++) {
            var rank = Math.max(1, Math.min(10, Math.floor(s / 2) + r[1]));
            if (rank === it[2]) sums.push(s);
          }
          if (sums.length) rows.push([odds[t], t, a1, a2, sums]);
        }
      }
    }
    rows.sort(function (x, y) { return y[0] - x[0] || x[1] - y[1]; });
    if (!rows.length) { $('al-rev').innerHTML = '<p>この組み合わせ表からは作れない（そのコインでは出ない結果だけのとき）。</p>'; return; }
    var html = '<table class="t"><thead><tr><th>属性①</th><th>属性②</th><th>結果</th><th data-num="1">確率</th>' +
      '<th>ランク①＋②の合計</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var s = r[4], txt = s[0] === s[s.length - 1] ? String(s[0]) : s[0] + '〜' + s[s.length - 1];
      html += '<tr><td>' + esc(attr(r[2])) + '</td><td>' + esc(attr(r[3])) + '</td><td>' + esc(TIERS[r[1]]) + '</td><td>' +
        pct(r[0]) + '</td><td>' + txt + '</td></tr>';
    });
    $('al-rev').innerHTML = html + '</tbody></table>';
  }

  function refill() {
    var k1 = $('al-s1').value, k2 = $('al-s2').value, kt = $('al-target').value;
    fillItems($('al-s1'), k1 === '' ? 0 : +k1);
    fillItems($('al-s2'), k2 === '' ? 0 : +k2);
    fillItems($('al-target'), kt === '' ? 0 : +kt);
    draw(); reverse();
  }
  ['al-s1', 'al-s2', 'al-coin', 'al-ins'].forEach(function (c) { $(c).addEventListener('change', function () { draw(); reverse(); }); });
  $('al-target').addEventListener('change', reverse);
  $('al-lu').addEventListener('change', function () { hist = []; $('al-roll').innerHTML = ''; refill(); });
  $('al-go').addEventListener('click', roll);
  refill();
})();
