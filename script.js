
/* ==================== SYNTAX HIGHLIGHTER ==================== */
const KEYWORDS = new Set([
  'const','let','var','function','return','if','else','switch','case','default',
  'break','continue','for','while','do','of','in','new','class','extends','super',
  'this','try','catch','finally','throw','typeof','instanceof','async','await',
  'import','export','from','null','undefined','true','false','delete','void',
  'yield','static','get','set'
]);
const BUILTINS = new Set([
  'console','document','window','localStorage','JSON','Math','Number','String',
  'Boolean','Promise','Array','Object','Date','fetch','NaN','Infinity'
]);

function esc(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function highlight(src){
  const re = /(\/\/[^\n]*)|(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let out = '', last = 0, m;
  while ((m = re.exec(src)) !== null) {
    out += esc(src.slice(last, m.index));
    if (m[1]) {
      out += '<span class="c">' + esc(m[1]) + '</span>';
    } else if (m[2]) {
      out += '<span class="s">' + esc(m[2]) + '</span>';
    } else if (m[3]) {
      out += '<span class="n">' + esc(m[3]) + '</span>';
    } else if (m[4]) {
      const w = m[4];
      const next = src[m.index + w.length];
      if (KEYWORDS.has(w)) out += '<span class="k">' + w + '</span>';
      else if (BUILTINS.has(w)) out += '<span class="o">' + w + '</span>';
      else if (next === '(') out += '<span class="f">' + w + '</span>';
      else out += w;
    }
    last = re.lastIndex;
  }
  out += esc(src.slice(last));
  return out;
}

document.querySelectorAll('pre > code').forEach(code => {
  code.innerHTML = highlight(code.textContent);
});

/* ==================== COPY BUTTONS ==================== */
document.querySelectorAll('pre').forEach(pre => {
  const btn = document.createElement('button');
  btn.className = 'copy';
  btn.type = 'button';
  btn.textContent = 'Copiar';
  btn.addEventListener('click', () => {
    const codeEl = pre.querySelector('code');
    const text = codeEl ? codeEl.innerText : pre.innerText;
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = 'Copiado!';
      btn.classList.add('done');
      setTimeout(() => { btn.textContent = 'Copiar'; btn.classList.remove('done'); }, 1400);
    });
  });
  pre.appendChild(btn);
});

/* ==================== TOC ==================== */
const toc = document.getElementById('toc');
const sections = [...document.querySelectorAll('main .sec')];

sections.forEach(sec => {
  const h2 = sec.querySelector('h2');
  if (!h2) return;
  const numEl = h2.querySelector('.num');
  const num = numEl ? numEl.textContent : '★';
  const title = h2.textContent.replace(numEl ? numEl.textContent : '', '').trim();

  const a = document.createElement('a');
  a.className = 'toc-link';
  a.href = '#' + sec.id;
  a.innerHTML = '<span class="n">' + num + '</span><span class="t">' + title + '</span>';
  toc.appendChild(a);
});

/* ==================== SCROLL SPY ==================== */
const links = [...document.querySelectorAll('.toc-link')];
const spy = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + id));
    }
  });
}, { rootMargin: '-70px 0px -75% 0px', threshold: 0 });
sections.forEach(s => spy.observe(s));

/* ==================== BUSCA ==================== */
function normalize(str){
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(normalized){
  return normalized.split(/[^a-z0-9]+/).filter(Boolean);
}

function scoreMatch(link, query){
  const nq = normalize(query);
  if (!nq) return 0;

  const numEl   = link.querySelector('.n');
  const titleEl = link.querySelector('.t');
  const nNum    = normalize(numEl ? numEl.textContent : '');
  const nTitle  = normalize(titleEl ? titleEl.textContent : '');
  const href    = link.getAttribute('href');
  const sec     = href ? document.querySelector(href) : null;
  const nContent = sec ? normalize(sec.textContent) : '';

  let score = 0;

  if (nNum === nq) score += 200;
  if (nTitle === nq) score += 150;
  else if (nTitle.startsWith(nq)) score += 100;
  else if (nTitle.includes(nq)) score += 60;
  if (nContent.includes(nq)) score += 10;

  if (score === 0) {
    const qWords = words(nq).filter(w => w.length >= 2);
    if (qWords.length === 0) return 0;

    const tWords = words(nTitle);
    const cWords = words(nContent);

    const everyWordMatches = qWords.every(qw => {
      const prefix = qw.slice(0, Math.max(3, qw.length - 2));
      return tWords.some(w => w.startsWith(prefix)) ||
             cWords.some(w => w.startsWith(prefix));
    });

    if (everyWordMatches) {
      score += 5;
      if (qWords.every(qw => {
        const prefix = qw.slice(0, Math.max(3, qw.length - 2));
        return tWords.some(w => w.startsWith(prefix));
      })) score += 40;
    }
  }

  return score;
}

const search = document.getElementById('search');
const noResults = document.getElementById('noResults');

function runSearch(){
  const q = search.value.trim();
  const empty = q.length === 0;
  let visible = 0;

  links.forEach(l => {
    if (empty) {
      l.classList.remove('hidden');
      visible++;
      return;
    }
    const s = scoreMatch(l, q);
    const show = s > 0;
    l.classList.toggle('hidden', !show);
    if (show) visible++;
  });

  noResults.classList.toggle('show', !empty && visible === 0);
}

search.addEventListener('input', runSearch);

function findBestMatch(query){
  let best = null, bestScore = 0;
  links.forEach(l => {
    const s = scoreMatch(l, query);
    if (s > bestScore) { bestScore = s; best = l; }
  });
  return best;
}

/* ==================== MOBILE MENU ==================== */
const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');
menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
toc.addEventListener('click', e => {
  if (e.target.closest('.toc-link') && window.innerWidth <= 1000) {
    sidebar.classList.remove('open');
  }
});

/* ==================== MODAL ==================== */
const fab = document.getElementById('fab');
const backdrop = document.getElementById('modalBackdrop');
const modalClose = document.getElementById('modalClose');

let lastFocused = null;

function openModal(){
  lastFocused = document.activeElement;
  backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => modalClose.focus(), 50);
}

function closeModal(){
  backdrop.classList.remove('open');
  document.body.style.overflow = '';
  if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
}

fab.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);

backdrop.addEventListener('click', e => {
  if (e.target === backdrop) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && backdrop.classList.contains('open')) {
    closeModal();
  }
});

/* ==================== MIND-ITEM → BUSCA ==================== */
document.querySelectorAll('.mind-item').forEach(item => {
  item.addEventListener('click', () => {
    const answerEl = item.querySelector('.a');
    if (!answerEl) return;
    const answer = answerEl.textContent.replace(/^\s*→\s*/, '').trim();

    search.value = answer;
    runSearch();

    search.classList.remove('flash');
    void search.offsetWidth;
    search.classList.add('flash');
    setTimeout(() => search.classList.remove('flash'), 900);

    closeModal();

    setTimeout(() => {
      const best = findBestMatch(answer);
      if (best) {
        const target = document.querySelector(best.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        links.forEach(l => l.classList.remove('best'));
        best.classList.add('best');
        setTimeout(() => best.classList.remove('best'), 2500);
      }
      if (window.getComputedStyle(search).display !== 'none') {
        search.focus({ preventScroll: true });
      }
    }, 260);
  });
});

/* ==================== VOLTAR AO TOPO ==================== */
const fabTop = document.getElementById('fabTop');
function updateFabTop(){
  fabTop.classList.toggle('visible', window.scrollY > 400);
}
window.addEventListener('scroll', updateFabTop, { passive: true });
updateFabTop();

fabTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});