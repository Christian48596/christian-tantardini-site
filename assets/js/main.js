const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');

const birthdayGarland = document.querySelector('[data-birthday-garland]:not([hidden])');
if (birthdayGarland) {
  try {
    birthdayGarland.hidden = sessionStorage.getItem('birthdayGarlandDismissed') === '1';
  } catch { /* Storage is optional; the close button still works. */ }
  birthdayGarland.querySelector('[data-garland-dismiss]')?.addEventListener('click', () => {
    birthdayGarland.hidden = true;
    try { sessionStorage.setItem('birthdayGarlandDismissed', '1'); } catch { /* No persistent state needed. */ }
  });
}

if (menuButton && nav) {
  const mobileMenu = window.matchMedia('(max-width: 960px)');
  const setMenuOpen = (isOpen, returnFocus = false) => {
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.textContent = isOpen ? 'Close' : 'Menu';
    nav.classList.toggle('is-open', isOpen);
    nav.inert = mobileMenu.matches && !isOpen;
    if (returnFocus) menuButton.focus();
  };
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    setMenuOpen(!isOpen);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') setMenuOpen(false, true);
  });
  document.addEventListener('click', (event) => {
    if (!nav.contains(event.target) && !menuButton.contains(event.target)) setMenuOpen(false);
  });
  mobileMenu.addEventListener('change', () => setMenuOpen(false));
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenuOpen(false)));
  setMenuOpen(false);
}

document.querySelectorAll('[data-current-year]').forEach((node) => {
  node.textContent = new Date().getFullYear();
});

const publicationList = document.querySelector('[data-publication-list]');
const publicationFilterBar = document.querySelector('[data-publication-filters]');
const publicationSearch = document.querySelector('[data-publication-search]');
const publicationCount = document.querySelector('[data-publication-count]');
const publicationEmpty = document.querySelector('[data-publication-empty]');
const publicationReset = document.querySelector('[data-publication-reset]');
let activePublicationYear = 'all';
const normalizeTitleSearch = (value) => value.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const copyText = async (text, button) => {
  if (button.getAttribute('aria-disabled') === 'true') return;
  const original = button.textContent;
  button.setAttribute('aria-disabled', 'true');
  let temporary;
  try {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      temporary = document.createElement('textarea');
      temporary.value = text;
      temporary.setAttribute('readonly', '');
      temporary.style.position = 'fixed';
      temporary.style.opacity = '0';
      document.body.append(temporary);
      temporary.select();
      if (!document.execCommand('copy')) throw new Error('Clipboard unavailable');
    }
    button.textContent = 'Copied';
    button.classList.add('is-copied');
  } catch {
    button.textContent = 'Could not copy';
  } finally {
    temporary?.remove();
    button.focus({ preventScroll: true });
  }
  window.setTimeout(() => {
    button.textContent = original;
    button.classList.remove('is-copied');
    button.removeAttribute('aria-disabled');
  }, 1400);
};

const publicationByDoi = new Map((window.publications ?? []).map((publication) => [publication[3].toLowerCase(), publication]));
const formatCitation = ([year, title, journal, doi], authors) => `${authors.replaceAll('; ', ', ')} (${year}). ${title}. ${journal}. https://doi.org/${doi}`;
const createCopyButton = (label, value) => {
  const button = document.createElement('button');
  button.className = 'publication-action';
  button.type = 'button';
  button.textContent = label;
  button.setAttribute('aria-live', 'polite');
  button.addEventListener('click', () => copyText(value, button));
  return button;
};

const selectedPublicationGrid = document.querySelector('[data-selected-publications]');
if (selectedPublicationGrid && Array.isArray(window.selectedPublications)) {
  window.selectedPublications.forEach(({ doi, theme, note }, index) => {
    const publication = publicationByDoi.get(doi.toLowerCase());
    if (!publication) return;
    const [year, title, journal] = publication;
    const card = document.createElement('article');
    card.className = 'selected-publication-card';
    card.innerHTML = `<div class="selected-publication-top"><span>${String(index + 1).padStart(2, '0')}</span><span>${year}</span></div><p class="selected-publication-theme"></p><h3></h3><p class="selected-publication-note"></p><div class="selected-publication-meta"></div>`;
    card.querySelector('.selected-publication-theme').textContent = theme;
    card.querySelector('h3').textContent = title;
    card.querySelector('.selected-publication-note').textContent = note;
    card.querySelector('.selected-publication-meta').textContent = journal;
    const link = document.createElement('a');
    link.className = 'card-link';
    link.href = `https://doi.org/${doi}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', `${title} — DOI`);
    card.append(link);
    selectedPublicationGrid.append(card);
  });
}

if (publicationList && Array.isArray(window.publications)) {
  const years = [...new Set(window.publications.map(([year]) => String(year)))];
  const filterOptions = [['all', 'All years'], ...years.map((year) => [year, year])];

  filterOptions.forEach(([value, label], index) => {
    const button = document.createElement('button');
    button.className = `filter-button${index === 0 ? ' is-active' : ''}`;
    button.type = 'button';
    button.dataset.publicationFilter = value;
    button.textContent = label;
    button.setAttribute('aria-pressed', String(index === 0));
    publicationFilterBar?.append(button);
  });

  window.publications.forEach((publication) => {
    const [year, title, journal, doi, type] = publication;
    const authors = window.publicationAuthors?.[doi.toLowerCase()] ?? 'Author information unavailable';
    const article = document.createElement('article');
    article.className = `publication${type === 'correction' ? ' publication-correction' : ''}`;
    article.dataset.publicationYear = String(year);
    article.dataset.publicationTitle = normalizeTitleSearch(title);

    const yearLabel = document.createElement('span');
    yearLabel.className = 'publication-year';
    yearLabel.textContent = String(year);

    const details = document.createElement('div');
    const heading = document.createElement('h3');
    heading.textContent = title;
    const meta = document.createElement('div');
    meta.className = 'publication-meta';
    meta.append(document.createTextNode(journal));
    const authorDetails = document.createElement('details');
    authorDetails.className = 'publication-authors';
    const authorSummary = document.createElement('summary');
    authorSummary.textContent = 'Authors';
    const authorList = document.createElement('p');
    authorList.textContent = authors.replaceAll('; ', ' · ');
    authorDetails.append(authorSummary, authorList);
    details.append(heading, meta, authorDetails);

    const actions = document.createElement('div');
    actions.className = 'publication-actions';
    const link = document.createElement('a');
    link.className = 'publication-link';
    link.href = `https://doi.org/${doi}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'DOI';
    actions.append(link, createCopyButton('Copy DOI', doi), createCopyButton('Copy citation', formatCitation(publication, authors)));
    article.append(yearLabel, details, actions);
    publicationList.append(article);
  });

  const publicationItems = publicationList.querySelectorAll('[data-publication-year]');
  const updatePublications = (saveUrl = true) => {
    const queryWords = normalizeTitleSearch(publicationSearch?.value ?? '').split(/\s+/).filter(Boolean);
    let visibleCount = 0;
    publicationItems.forEach((item) => {
      const matchesYear = activePublicationYear === 'all' || item.dataset.publicationYear === activePublicationYear;
      const matchesQuery = queryWords.every((word) => {
        const variants = [word];
        // Common singular/plural forms, e.g. electronegativity/electronegativities.
        if (word.length > 4 && word.endsWith('y')) variants.push(`${word.slice(0, -1)}i`);
        if (word.length > 5 && word.endsWith('ies')) variants.push(`${word.slice(0, -3)}y`);
        return variants.some((variant) => item.dataset.publicationTitle.includes(variant));
      });
      const isVisible = matchesYear && matchesQuery;
      item.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });
    if (publicationCount) publicationCount.textContent = String(visibleCount);
    publicationFilterBar?.querySelectorAll('[data-publication-filter]').forEach((button) => {
      const isActive = button.dataset.publicationFilter === activePublicationYear;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
    if (publicationReset) publicationReset.hidden = !publicationSearch.value.trim() && activePublicationYear === 'all';
    if (saveUrl) {
      const url = new URL(window.location.href);
      if (publicationSearch.value.trim()) url.searchParams.set('q', publicationSearch.value.trim());
      else url.searchParams.delete('q');
      if (activePublicationYear !== 'all') url.searchParams.set('year', activePublicationYear);
      else url.searchParams.delete('year');
      window.history.replaceState(null, '', url);
    }
    if (publicationEmpty) {
      publicationEmpty.hidden = visibleCount !== 0;
      publicationEmpty.textContent = activePublicationYear === 'all'
        ? 'No publication titles match this search.'
        : `No publication titles match this search in ${activePublicationYear}.`;
    }
  };

  publicationFilterBar?.querySelectorAll('[data-publication-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      activePublicationYear = button.dataset.publicationFilter;
      updatePublications();
    });
  });
  publicationSearch?.addEventListener('input', () => {
    updatePublications();
  });
  publicationReset?.addEventListener('click', () => {
    publicationSearch.value = '';
    activePublicationYear = 'all';
    updatePublications();
    publicationSearch.focus();
  });
  const restoreFilters = () => {
    const parameters = new URLSearchParams(window.location.search);
    publicationSearch.value = parameters.get('q') ?? '';
    const year = parameters.get('year');
    activePublicationYear = years.includes(year) ? year : 'all';
    updatePublications(false);
  };
  window.addEventListener('popstate', restoreFilters);
  restoreFilters();
}

const otherOutputGrid = document.querySelector('[data-other-outputs]');
if (otherOutputGrid && Array.isArray(window.otherResearchOutputs)) {
  window.otherResearchOutputs.forEach((output) => {
    const card = document.createElement('article');
    card.className = 'output-card';
    const heading = document.createElement('h3');
    heading.textContent = output.title;
    const label = document.createElement('div');
    label.className = 'output-label';
    label.innerHTML = `<span>${output.type}</span><span>${output.year}</span>`;
    const meta = document.createElement('p');
    meta.className = 'output-meta';
    meta.textContent = `${output.authors.replaceAll('; ', ' · ')} — ${output.venue}`;
    const actions = document.createElement('div');
    actions.className = 'output-actions';
    const link = document.createElement('a');
    link.href = `https://doi.org/${output.doi}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Open DOI';
    actions.append(link, createCopyButton('Copy DOI', output.doi));
    card.append(label, heading, meta, actions);
    otherOutputGrid.append(card);
  });
}
