/* Who Holds the Money: small progressive enhancements. Every page works without this file. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Home: layer stack with a market switcher */
  const exEl = $('#layer-ex');
  if (exEl) {
    const EX = JSON.parse(exEl.textContent);
    const paint = (m) => {
      $$('[data-layer]').forEach((li) => {
        const box = $('[data-ex]', li); const list = (EX[m] || {})[li.dataset.layer] || [];
        box.innerHTML = m === 'ALL' ? '' : (list.length ? list.map((p) => `<a href="${p.u}">${p.n}</a>`).join('') : '<span class="none">No players mapped here yet</span>');
      });
      $$('.mk').forEach((b) => b.classList.toggle('on', b.dataset.mkt === m));
      try { localStorage.setItem('whtm-mkt', m); } catch (e) {}
    };
    $$('.mk').forEach((b) => b.addEventListener('click', () => paint(b.dataset.mkt)));
    let start = 'ALL'; try { start = localStorage.getItem('whtm-mkt') || 'ALL'; } catch (e) {}
    paint(start);
  }

  /* Home: where does a payment stop, shown on the layer list */
  const say = $('[data-stop-say]'), list = $('[data-layers]');
  $$('.pt').forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') === 'true';
    $$('.pt').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    $$('[data-layer]').forEach((li) => li.classList.remove('hit'));
    if (on) { list.classList.remove('picking'); say.hidden = true; return; }
    b.setAttribute('aria-pressed', 'true');
    list.classList.add('picking');
    const k = b.dataset.stop; if (k) { const li = $(`[data-layer="${k}"]`, list); if (li) li.classList.add('hit'); }
    say.textContent = b.dataset.say; say.hidden = false;
  }));

  /* Markets table rows are links */
  $$('tr[data-href]').forEach((tr) => tr.addEventListener('click', (e) => { if (!e.target.closest('a')) location.href = tr.dataset.href; }));

  /* Tabs (domestic / cross-border) */
  $$('.tabs').forEach((tabs) => {
    const sec = tabs.closest('section');
    $$('button', tabs).forEach((b) => b.addEventListener('click', () => {
      $$('button', tabs).forEach((x) => x.setAttribute('aria-selected', x === b));
      $$('[data-pane]', sec).forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.tab));
    }));
  });

  /* Compare: market pickers and the differences switch */
  const sa = $('select[data-cmp="a"]'), sb = $('select[data-cmp="b"]'), go = $('[data-cmp-go]');
  const target = () => (sa.value === sb.value ? null : `/compare/${sa.value}-${sb.value}/`);
  if (sa && sb) {
    const onChange = () => { const t = target(); if (!t) return; if (go) go.href = t; else location.href = t; };
    sa.addEventListener('change', onChange); sb.addEventListener('change', onChange);
  }
  const diff = $('[data-diff]');
  if (diff) diff.addEventListener('change', () => $('.ctable').classList.toggle('diff', diff.checked));

  /* Search */
  const sbox = $('[data-search]'), sin = $('[data-search-input]'), sres = $('[data-search-results]');
  let IDX = null, sel = 0;
  const open = async () => {
    sbox.hidden = false; sin.focus();
    if (!IDX) { try { IDX = await (await fetch('/assets/search.json')).json(); } catch (e) { IDX = []; } }
  };
  const render = () => {
    const q = sin.value.trim().toLowerCase();
    if (!q) { sres.innerHTML = ''; return; }
    const hits = IDX.filter((x) => (x.t + ' ' + (x.k || '')).toLowerCase().includes(q))
      .sort((a, b) => a.t.toLowerCase().indexOf(q) - b.t.toLowerCase().indexOf(q)).slice(0, 12);
    sel = 0;
    sres.innerHTML = hits.map((h, i) => `<li><a href="${h.u}" class="${i === 0 ? 'on' : ''}"><span>${h.t}</span><small>${h.s}</small></a></li>`).join('') || '<li><small>No match</small></li>';
  };
  $$('[data-search-open]').forEach((b) => b.addEventListener('click', () => (sbox.hidden ? open() : (sbox.hidden = true))));
  if (sin) {
    sin.addEventListener('input', render);
    sin.addEventListener('keydown', (e) => {
      const links = $$('a', sres);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (!links.length) return;
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
        links.forEach((a, i) => a.classList.toggle('on', i === sel));
      } else if (e.key === 'Enter' && links[sel]) { location.href = links[sel].href; }
      else if (e.key === 'Escape') { sbox.hidden = true; }
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/input|select|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
  });

  /* Keep the current layer visible in the rail on phones */
  const cur = $('.lr-i.on'); if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
})();
