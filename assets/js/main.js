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

const publicationFilters = document.querySelectorAll('[data-publication-filter]');
const publicationItems = document.querySelectorAll('[data-publication-year]');

publicationFilters.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.publicationFilter;
    publicationFilters.forEach((item) => item.classList.remove('is-active'));
    button.classList.add('is-active');
    publicationItems.forEach((item) => {
      item.hidden = filter !== 'all' && item.dataset.publicationYear !== filter;
    });
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('is-visible');
  });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
