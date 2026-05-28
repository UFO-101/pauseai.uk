(() => {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  const lbImg = lb.querySelector('.lb-image');
  const btnClose = lb.querySelector('.lb-close');
  const btnPrev = lb.querySelector('.lb-prev');
  const btnNext = lb.querySelector('.lb-next');
  const shots = Array.from(document.querySelectorAll('.shot'));
  let idx = 0;

  const show = (i) => {
    idx = (i + shots.length) % shots.length;
    const a = shots[idx];
    lbImg.src = a.getAttribute('href');
    lbImg.alt = a.querySelector('img')?.alt || '';
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
  };
  const hide = () => {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    lbImg.src = '';
  };

  shots.forEach((a, i) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      show(i);
    });
  });

  btnClose.addEventListener('click', hide);
  btnPrev.addEventListener('click', () => show(idx - 1));
  btnNext.addEventListener('click', () => show(idx + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) hide(); });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') hide();
    if (e.key === 'ArrowRight') show(idx + 1);
    if (e.key === 'ArrowLeft') show(idx - 1);
  });

  // Highlight the active timeline entry as the user scrolls
  const entries = document.querySelectorAll('.entry');
  if ('IntersectionObserver' in window && entries.length) {
    const setActive = (el) => {
      entries.forEach(e => e.classList.toggle('is-active', e === el));
    };
    const io = new IntersectionObserver((items) => {
      const visible = items
        .filter(i => i.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target);
    }, { rootMargin: '-25% 0px -55% 0px', threshold: 0 });
    entries.forEach(e => io.observe(e));
    setActive(entries[0]);
  }

  // Build the hero swirl echoing the PDF cover motif
  const swirl = document.querySelector('.tr-hero-swirl g');
  if (swirl) {
    const cx = 300, cy = 300;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 40; i++) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      const rx = 80 + i * 5.2;
      const ry = 160 + i * 3.4;
      el.setAttribute('cx', cx);
      el.setAttribute('cy', cy);
      el.setAttribute('rx', rx);
      el.setAttribute('ry', ry);
      el.setAttribute('transform', `rotate(${i * 4.5} ${cx} ${cy})`);
      frag.appendChild(el);
    }
    swirl.appendChild(frag);
  }
})();
