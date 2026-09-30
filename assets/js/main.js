const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');

if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    nav.classList.toggle('is-open', !isOpen);
  });
}

document.querySelectorAll('.site-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    nav?.classList.remove('is-open');
  });
});

document.querySelectorAll('[data-current-year]').forEach((node) => {
  node.textContent = new Date().getFullYear();
});

const publicationList = document.querySelector('[data-publication-list]');
const publicationFilterBar = document.querySelector('[data-publication-filters]');
const publicationSearch = document.querySelector('[data-publication-search]');
const publicationCount = document.querySelector('[data-publication-count]');
const publicationEmpty = document.querySelector('[data-publication-empty]');
let activePublicationYear = 'all';

const copyText = async (text, button) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const temporary = document.createElement('textarea');
    temporary.value = text;
    temporary.setAttribute('readonly', '');
    temporary.style.position = 'fixed';
    temporary.style.opacity = '0';
    document.body.append(temporary);
    temporary.select();
    document.execCommand('copy');
    temporary.remove();
  }
  const original = button.textContent;
  button.textContent = 'Copied';
  button.classList.add('is-copied');
  window.setTimeout(() => {
    button.textContent = original;
    button.classList.remove('is-copied');
  }, 1400);
};

const publicationByDoi = new Map((window.publications ?? []).map((publication) => [publication[3].toLowerCase(), publication]));
const formatCitation = ([year, title, journal, doi], authors) => `${authors.replaceAll('; ', ', ')} (${year}). ${title}. ${journal}. https://doi.org/${doi}`;
const createCopyButton = (label, value) => {
  const button = document.createElement('button');
  button.className = 'publication-action';
  button.type = 'button';
  button.textContent = label;
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
    article.dataset.publicationTitle = title.toLocaleLowerCase();

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
  const updatePublications = () => {
    const query = publicationSearch?.value.trim().toLocaleLowerCase() ?? '';
    let visibleCount = 0;
    publicationItems.forEach((item) => {
      const matchesYear = activePublicationYear === 'all' || item.dataset.publicationYear === activePublicationYear;
      const matchesQuery = !query || item.dataset.publicationTitle.includes(query);
      const isVisible = matchesYear && matchesQuery;
      item.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });
    if (publicationCount) publicationCount.textContent = String(visibleCount);
    if (publicationEmpty) publicationEmpty.hidden = visibleCount !== 0;
  };

  publicationFilterBar?.querySelectorAll('[data-publication-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      activePublicationYear = button.dataset.publicationFilter;
      if (publicationSearch) publicationSearch.value = '';
      publicationFilterBar.querySelectorAll('[data-publication-filter]').forEach((item) => {
        const isActive = item === button;
        item.classList.toggle('is-active', isActive);
        item.setAttribute('aria-pressed', String(isActive));
      });
      updatePublications();
    });
  });
  publicationSearch?.addEventListener('input', () => {
    activePublicationYear = 'all';
    publicationFilterBar?.querySelectorAll('[data-publication-filter]').forEach((item) => {
      const isActive = item.dataset.publicationFilter === 'all';
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-pressed', String(isActive));
    });
    updatePublications();
  });

  const exportBibtex = document.querySelector('[data-export-bibtex]');
  if (exportBibtex) {
    const escapeBibtex = (value) => value.replaceAll('&', '\\&').replaceAll('{', '\\{').replaceAll('}', '\\}');
    const usedKeys = new Map();
    const bibtex = window.publications.map(([year, title, journal, doi]) => {
      const authors = window.publicationAuthors?.[doi.toLowerCase()] ?? 'Tantardini, Christian';
      const keyWord = title.replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).find((word) => word.length > 4) ?? 'Work';
      const baseKey = `Tantardini${year}${keyWord}`;
      const occurrence = usedKeys.get(baseKey) ?? 0;
      usedKeys.set(baseKey, occurrence + 1);
      const key = occurrence === 0 ? baseKey : `${baseKey}${String.fromCharCode(97 + occurrence)}`;
      return `@article{${key},\n  author = {${escapeBibtex(authors.replaceAll('; ', ' and '))}},\n  title = {${escapeBibtex(title)}},\n  journal = {${escapeBibtex(journal)}},\n  year = {${year}},\n  doi = {${doi}},\n  url = {https://doi.org/${doi}}\n}`;
    }).join('\n\n');
    exportBibtex.href = `data:application/x-bibtex;charset=utf-8,${encodeURIComponent(bibtex)}`;
    exportBibtex.download = 'christian-tantardini-publications.bib';
  }
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

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('is-visible');
  });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
