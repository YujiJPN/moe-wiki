
(function(){
var R = window.WROOT || (function(){var s=(document.currentScript&&document.currentScript.src)||'';return s.slice(0,s.lastIndexOf('/')+1)})();
var norm = function(s){return (s||'').toLowerCase().replace(/[\s　]+/g,'').replace(/[ァ-ヶ]/g,function(c){return String.fromCharCode(c.charCodeAt(0)-0x60)}).replace(/[！-～]/g,function(c){return String.fromCharCode(c.charCodeAt(0)-0xfee0)})};
var esc = function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')};
window.WESC = esc;

// ---- menu: the current page highlighted, its branch opened and scrolled into view; group state remembered
var here = location.href.split('#')[0].split('?')[0];
var menu = document.getElementById('menu');
var store = {get:function(k){try{return localStorage.getItem(k)}catch(e){return null}}, set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
if (menu) {
  menu.querySelectorAll('details.g').forEach(function(d){
    var v = store.get('wj-g-' + d.dataset.g); if (v === '1') d.open = true; else if (v === '0') d.open = false;
    d.addEventListener('toggle', function(){ store.set('wj-g-' + d.dataset.g, d.open ? '1' : '0'); });
  });
  var cur = null;
  menu.querySelectorAll('a').forEach(function(a){ if (a.href.split('#')[0] === here) { a.classList.add('cur'); cur = cur || a; } });
  if (cur) { for (var p = cur.parentElement; p && p !== menu; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;
    menu.scrollTop = Math.max(0, cur.offsetTop - menu.clientHeight / 3); }
}
document.querySelectorAll('#cats a').forEach(function(a){ if (a.href.split('#')[0] === here) a.classList.add('cur'); });
var mt = document.getElementById('mt');
if (mt) mt.addEventListener('click', function(){ document.body.classList.toggle('menu-open'); });
document.addEventListener('click', function(e){ if (document.body.classList.contains('menu-open') && !e.target.closest('#menu,#mt')) document.body.classList.remove('menu-open'); });

// ---- tables: click a header to sort; a filter box on tables of 25 rows or more; wide tables scroll sideways
var main = document.querySelector('main');
document.querySelectorAll('table.t').forEach(function(t){
  var tb = t.tBodies[0]; if (!tb) return;
  t.querySelectorAll('thead th').forEach(function(th, i){ th.addEventListener('click', function(){
    var rows = [].slice.call(tb.rows), numc = th.dataset.num, dir = th.dataset.dir === '1' ? -1 : 1;
    t.querySelectorAll('thead th').forEach(function(o){ if (o !== th) delete o.dataset.dir; });
    th.dataset.dir = dir === 1 ? '1' : '0';
    rows.sort(function(a, b){ var x = a.cells[i] ? a.cells[i].textContent : '', y = b.cells[i] ? b.cells[i].textContent : '';
      if (numc) { var fx = parseFloat(x.replace(/,/g,'')), fy = parseFloat(y.replace(/,/g,'')); if (isNaN(fx)) fx = -1e18; if (isNaN(fy)) fy = -1e18; return (fx - fy) * dir; }
      return x.localeCompare(y, 'ja') * dir; });
    rows.forEach(function(r){ tb.appendChild(r); }); }); });
  var n = tb.rows.length;
  if (n >= 25) {
    var box = document.createElement('div'); box.className = 'tf';
    box.innerHTML = '<input type="search" placeholder="表を絞り込む（日本語・英語・数字）"><span>' + n + ' 件</span>';
    t.parentNode.insertBefore(box, t);
    var inp = box.firstChild, cnt = box.lastChild, keys = null, timer = 0;
    inp.addEventListener('input', function(){ clearTimeout(timer); timer = setTimeout(function(){
      if (!keys) { keys = new Map(); [].forEach.call(tb.rows, function(r){ keys.set(r, norm(r.textContent)); }); }
      var q = norm(inp.value), k = 0;
      [].forEach.call(tb.rows, function(r){ var ok = !q || keys.get(r).indexOf(q) >= 0; r.style.display = ok ? '' : 'none'; if (ok) k++; });
      cnt.textContent = q ? (k + ' / ' + n + ' 件') : (n + ' 件'); }, 120); });
  }
});
if (main) document.querySelectorAll('main table').forEach(function(t){
  if (t.offsetWidth > main.clientWidth + 2) { var w = document.createElement('div'); w.className = 'tw'; t.parentNode.insertBefore(w, t); w.appendChild(t); } });

// ---- contents box at the side: the section in view is marked; back-to-top button
var toc = document.querySelector('.toc2');
if (toc && 'IntersectionObserver' in window) {
  var links = {}; toc.querySelectorAll('a').forEach(function(a){ links[a.getAttribute('href').slice(1)] = a; });
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting && links[e.target.id]) {
    toc.querySelectorAll('a.on').forEach(function(a){ a.classList.remove('on'); }); links[e.target.id].classList.add('on'); } }); },
    {rootMargin: '-80px 0px -70% 0px'});
  document.querySelectorAll('main section[id]').forEach(function(s){ io.observe(s); });
}
var up = document.querySelector('a.top');
if (up) { window.addEventListener('scroll', function(){ up.classList.toggle('show', window.scrollY > 600); }, {passive: true});
  up.addEventListener('click', function(e){ e.preventDefault(); window.scrollTo({top: 0, behavior: 'smooth'}); }); }

// ---- search: results while typing (the index loads on first use); Enter opens the highlighted one or the full list
var SIN = null;
function prep(){ if (!SIN && window.SI) SIN = window.SI.map(function(r){ return [norm(r[0]), norm(r[3])]; }); }
window.WSEARCH = function(q, limit){
  prep(); var nq = norm(q), out = []; if (!nq || !SIN) return out;
  for (var i = 0; i < SIN.length; i++) { var t = SIN[i][0], a = SIN[i][1];
    var s = t === nq ? 0 : t.indexOf(nq) === 0 ? 1 : t.indexOf(nq) >= 0 ? 2 : a.indexOf(nq) >= 0 ? 3 : -1;
    if (s >= 0) out.push([s, i]); }
  out.sort(function(x, y){ return x[0] - y[0] || SI[x[1]][0].length - SI[y[1]][0].length; });
  if (limit) out = out.slice(0, limit);
  return out.map(function(h){ return SI[h[1]]; });
};
var sq = document.getElementById('sq'), sd = document.getElementById('sd'), sel = -1, loading = false, waiting = [];
function load(cb){ if (window.SI) return cb(); waiting.push(cb); if (loading) return; loading = true;
  var sc = document.createElement('script'); sc.src = R + 'search-index.js';
  sc.onload = function(){ var w = waiting; waiting = []; w.forEach(function(f){ f(); }); }; document.head.appendChild(sc); }
function show(){
  var q = sq.value; if (!q.trim()) { sd.style.display = 'none'; return; }
  load(function(){
    var hits = WSEARCH(q, 0), first = hits.slice(0, 15);
    sd.innerHTML = first.map(function(r){ return '<a href="' + R + r[1] + '"><span class="kind">' + r[2] + '</span>' + esc(r[0]) +
      (r[3] ? ' <small>' + esc(r[3]) + '</small>' : '') + '</a>'; }).join('') +
      '<a class="more" href="' + R + 'search.html?q=' + encodeURIComponent(q) + '">' + (hits.length ? 'すべての結果（' + hits.length + ' 件）' : '見つかりません') + '</a>';
    sel = -1; sd.style.display = 'block'; });
}
if (sq && sd) {
  var tm = 0;
  sq.addEventListener('input', function(){ clearTimeout(tm); tm = setTimeout(show, 100); });
  sq.addEventListener('focus', function(){ load(function(){}); if (sq.value.trim()) show(); });
  sq.addEventListener('keydown', function(e){
    var items = sd.querySelectorAll('a');
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!items.length) return;
      sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach(function(a, i){ a.classList.toggle('sel', i === sel); }); items[sel].scrollIntoView({block: 'nearest'}); }
    else if (e.key === 'Enter' && sel >= 0 && items[sel]) { e.preventDefault(); location.href = items[sel].href; }
    else if (e.key === 'Escape') { sd.style.display = 'none'; sq.blur(); } });
  document.addEventListener('click', function(e){ if (!e.target.closest('.sf')) sd.style.display = 'none'; });
  document.addEventListener('keydown', function(e){ if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); sq.focus(); } });
}
})();
