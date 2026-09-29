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

  window.publications.forEach(([year, title, journal, doi, type]) => {
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
    details.append(heading, meta);

    const link = document.createElement('a');
    link.className = 'publication-link';
    link.href = `https://doi.org/${doi}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'DOI';
    article.append(yearLabel, details, link);
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
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('is-visible');
  });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
