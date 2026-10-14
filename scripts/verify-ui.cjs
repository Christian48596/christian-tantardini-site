// Run against a local preview: node scripts/verify-ui.cjs [playwright module path].
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const base = process.env.SITE_PREVIEW_URL || 'http://127.0.0.1:8765';
  const pages = ['projects.html', 'publications.html', 'activities.html', 'cv.html', 'contact.html'];
  try {
    for (const width of [320, 390, 768, 1024, 1280, 1920]) {
      await page.setViewportSize({ width, height: width >= 1920 ? 1080 : 844 });
      let reference;
      for (const file of pages) {
        await page.goto(`${base}/${file}`, { waitUntil: 'networkidle' });
        const layout = await page.evaluate(() => {
          const heading = document.querySelector('.page-heading-rule');
          const rect = heading.getBoundingClientRect();
          return { x: rect.x, bottom: rect.bottom, overflow: document.documentElement.scrollWidth > innerWidth };
        });
        assert.equal(layout.overflow, false, `${file} overflows at ${width}px`);
        assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(241, 246, 243)', `${file}: pale mint background`);
        if (file === 'cv.html') {
          const cv = await page.evaluate(() => {
            const panels = [...document.querySelectorAll('.cv-block')];
            const dates = [...document.querySelectorAll('.cv-block--timeline time')];
            const links = [...document.querySelectorAll('.cv-block--profiles .text-link')];
            return {
              panels: panels.length,
              translucentPanels: panels.every((el) => getComputedStyle(el).backgroundColor === 'rgba(224, 238, 229, 0.42)'),
              dates: dates.map((el) => el.textContent),
              labels: [...document.querySelectorAll('.cv-skill')].map((el) => el.textContent),
              links: links.every((el) => el.getBoundingClientRect().height >= 44),
              metric: document.querySelector('.cv-metric-value').textContent,
              timelineAligned: panels.slice(0,2).every((panel) => {
                const entries = [...panel.querySelectorAll('.cv-entry-body')].map((el) => el.getBoundingClientRect().left);
                return entries.every((x) => Math.abs(x - entries[0]) < 1);
              })
            };
          });
          assert.equal(cv.panels, 4);
          assert.equal(cv.translucentPanels, true);
          assert.deepEqual(cv.dates, ['Current','2025','2022—2025','2020—2022','2020','2014','2012']);
          assert.deepEqual(cv.labels, ['Fortran','C++','Python','MPI','OpenMP','GPU']);
          assert.equal(cv.metric, '18');
          assert.equal(cv.links, true, `CV profile touch targets at ${width}px`);
          assert.equal(cv.timelineAligned, true, `CV timeline alignment at ${width}px`);
        }
        if (file === 'publications.html') {
          const fullWidthSearch = await page.evaluate(() => {
            const panel = document.querySelector('.publication-controls').getBoundingClientRect();
            const input = document.querySelector('[data-publication-search]').getBoundingClientRect();
            return Math.abs(panel.left - input.left) < 1 && Math.abs(panel.right - input.right) < 1;
          });
          assert.equal(fullWidthSearch, true, `Full-width publication search at ${width}px`);
        }
        if (reference) {
          assert.ok(Math.abs(layout.x - reference.x) < 1, `${file}: heading x differs at ${width}px`);
          assert.ok(Math.abs(layout.bottom - reference.bottom) < 1, `${file}: divider y differs at ${width}px`);
        } else reference = layout;
        if (file === 'projects.html') {
          const aligned = await page.evaluate(() => {
            const labels = [...document.querySelectorAll('.research-paper > span')].map((el) => el.getBoundingClientRect().left);
            const tails = [...document.querySelectorAll('.link-tail')].map((el) => [...el.getClientRects()].every((rect) => Math.abs(rect.top - el.getClientRects()[0].top) < 1));
            const images = [...document.querySelectorAll('.research-illustration')];
            return labels.every((x) => Math.abs(x - labels[0]) < 1) && tails.every(Boolean) && images.length === 5 && images.every((el) => el.complete && el.naturalWidth === 768 && el.src.includes('-gloss.webp'));
          });
          assert.equal(aligned, true, `Research text/arrow alignment at ${width}px`);
        }
        if (file === 'activities.html') {
          const artwork = await page.evaluate(() => {
            const images = [...document.querySelectorAll('.activity-illustration')];
            const headings = [...document.querySelectorAll('.activity-content h2')].map((el) => el.getBoundingClientRect().left);
            return images.length === 4 && images.every((el) => el.complete && el.naturalWidth === 768 && el.src.includes('-gloss.webp') && el.getBoundingClientRect().width >= 56) && headings.every((x) => Math.abs(x - headings[0]) < 1);
          });
          assert.equal(artwork, true, `Activity drawings and text alignment at ${width}px`);
        }
      }
      await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Home overflows at ${width}px`);
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(241, 246, 243)', 'Home: pale mint background');
      const cards = await page.evaluate(() => [...document.querySelectorAll('.home-field-card')].map((card) => {
        const image = card.querySelector('img');
        const box = card.getBoundingClientRect();
        return { loaded: image.complete && image.naturalWidth === 768 && image.src.includes('-gloss.webp'), width: box.width, height: box.height, href: card.getAttribute('href') };
      }));
      assert.equal(cards.length, 5);
      assert.ok(cards.every((card) => card.loaded && card.width >= 44 && card.height >= 44), `Card images and touch targets at ${width}px`);
      assert.equal(new Set(cards.map((card) => card.href)).size, 5);
      assert.equal(await page.locator('.home-introduction .home-profile-links .text-link').count(), 3);
      const centeredIntro = await page.evaluate(() => {
        const heading = document.querySelector('.home-identity h1');
        const range = document.createRange();
        range.selectNodeContents(heading);
        const name = range.getBoundingClientRect();
        const photo = document.querySelector('.home-photo-frame').getBoundingClientRect();
        const stage = document.querySelector('.home-stage').getBoundingClientRect();
        const center = stage.left + stage.width / 2;
        return getComputedStyle(heading).textAlign === 'center' && Math.abs(name.left + name.width / 2 - center) < 1 && Math.abs(photo.left + photo.width / 2 - center) < 1;
      });
      assert.equal(centeredIntro, true, `Portrait and name centered at ${width}px`);
      console.log(`Grid, first dividers and no-overflow: ${width}px passed`);
    }

    await page.setViewportSize({ width: 1280, height: 900 });
    for (const slug of ['physical-chemistry', 'solid-state-physics', 'fluid-dynamics', 'machine-learning', 'ai']) {
      await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
      await page.locator(`.home-field-card[href="projects.html#${slug}"]`).click();
      await page.waitForURL(`**/projects.html#${slug}`);
      await page.waitForLoadState('networkidle');
      const target = await page.evaluate((id) => {
        const row = document.getElementById(id);
        return row.matches(':target') && row.getBoundingClientRect().top >= document.querySelector('.site-header').getBoundingClientRect().bottom - 1;
      }, slug);
      assert.equal(target, true, `Card opens an unobscured Research target: ${slug}`);
    }
    await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
    await page.locator('.home-field-card').first().focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.locator('.home-field-card').first().evaluate((el) => el.matches(':focus-visible') && getComputedStyle(el).outlineStyle !== 'none'), true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.home-field-card').first().hover();
    assert.equal(await page.locator('.home-field-card').first().evaluate((el) => getComputedStyle(el).transform), 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    console.log('Research cards: images, keyboard focus, all five links and reduced motion passed');

    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${base}/publications.html`, { waitUntil: 'networkidle' });
      const total = await page.evaluate(() => window.publications.length);
      const visible = page.locator('.publication:not([hidden])');
      const input = page.getByRole('searchbox', { name: 'Search by article title' });
      assert.equal(await visible.count(), total);
      const yearCount = await page.evaluate(() => new Set(window.publications.map((p) => p[0])).size);
      assert.equal(await page.locator('.publication-year-heading:not([hidden])').count(), yearCount);
      await input.fill('QUANTUM');
      const expectedQuantum = await page.evaluate(() => window.publications.filter((p) => /quantum/i.test(p[1])).length);
      assert.equal(await visible.count(), expectedQuantum);
      assert.equal(await page.locator('.publication:not([hidden]) mark').count(), expectedQuantum);
      assert.equal(await page.locator('[data-publication-count]').innerText(), String(expectedQuantum));
      assert.match(page.url(), /q=QUANTUM/);

      await page.getByRole('button', { name: 'Clear title search', exact: true }).click();
      await page.getByRole('button', { name: '2024', exact: true }).click();
      const expected2024 = await page.evaluate(() => window.publications.filter((p) => p[0] === 2024).length);
      assert.equal(await visible.count(), expected2024);
      assert.equal(await page.locator('.publication-year-heading:not([hidden])').count(), 0);
      await input.fill('magnetic');
      const expectedMagnetic = await page.evaluate(() => window.publications.filter((p) => p[0] === 2024 && /magnetic/i.test(p[1])).length);
      assert.equal(await visible.count(), expectedMagnetic);
      await page.getByRole('button', { name: 'Clear title search', exact: true }).focus();
      await page.keyboard.press('Enter');
      assert.equal(await input.inputValue(), '');
      assert.equal(await input.evaluate((el) => el === document.activeElement), true);
      assert.equal(await visible.count(), expected2024);
      assert.equal(await page.locator('.publication:not([hidden]) mark').count(), 0);

      await page.getByRole('button', { name: 'Reset search and year filters' }).click();
      assert.equal(await visible.count(), total);
      await input.fill('zzzzzz-no-results');
      assert.equal(await visible.count(), 0);
      assert.equal(await page.locator('.publication-empty').isVisible(), true);
      assert.equal(await page.locator('.publication-year-heading:not([hidden])').count(), 0);
      await page.getByRole('button', { name: 'Reset search and year filters' }).click();
      await input.fill('élèctronegativity');
      assert.ok(await visible.count() > 0, 'Accent and plural-insensitive search');
      assert.ok(await page.locator('.publication:not([hidden]) mark').count() > 0);
      await input.fill('<img onerror=alert(1)>');
      assert.equal(await page.locator('.publication-title-link img').count(), 0);
      await page.getByRole('button', { name: 'Reset search and year filters' }).click();

      await page.evaluate(() => window.scrollTo({ top: 1000, behavior: 'instant' }));
      await page.waitForFunction(() => document.querySelector('[data-publication-controls]').classList.contains('is-stuck'));
      const sticky = await page.evaluate(() => ({
        header: document.querySelector('.site-header').getBoundingClientRect().bottom,
        toolbar: document.querySelector('[data-publication-controls]').getBoundingClientRect().top
      }));
      assert.ok(Math.abs(sticky.header - sticky.toolbar) < 1, `Sticky panel overlaps header at ${width}px`);
      await page.getByRole('button', { name: '2024', exact: true }).click();
      const recordPosition = await page.evaluate(() => ({
        panel: document.querySelector('[data-publication-controls]').getBoundingClientRect().bottom,
        record: document.querySelector('.publication:not([hidden])').getBoundingClientRect().top
      }));
      assert.ok(recordPosition.record >= recordPosition.panel, 'First result is not hidden by sticky controls');
      await visible.getByText('Authors', { exact: true }).first().click();
      assert.equal(await page.locator('.publication:not([hidden]) .publication-authors').first().getAttribute('open'), '');

      await page.goto(`${base}/publications.html?year=2024&q=magnetic`, { waitUntil: 'networkidle' });
      assert.equal(await visible.count(), expectedMagnetic);
      assert.equal(await page.getByRole('button', { name: '2024', exact: true }).getAttribute('aria-pressed'), 'true');
      assert.equal(await input.inputValue(), 'magnetic');
      const clearSize = await page.getByRole('button', { name: 'Clear title search', exact: true }).boundingBox();
      assert.ok(clearSize.width >= 44 && clearSize.height >= 44);
      if (width === 390) {
        await page.getByRole('button', { name: 'Menu', exact: true }).click();
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
        assert.equal(await page.locator('.menu-toggle').evaluate((el) => el === document.activeElement), true);
        await page.screenshot({ path: path.join(os.tmpdir(), 'christian-publications15-mobile.png') });
      }
      console.log(`Search, highlighting, years, clear/reset, URL, authors and sticky controls: ${width}px passed`);
    }
    assert.deepEqual(errors, [], 'Browser JavaScript errors');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${base}/publications.html?q=magnetic`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(os.tmpdir(), 'christian-publications15.png') });
    await page.goto(`${base}/projects.html`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(os.tmpdir(), 'christian-research15.png') });
    await page.goto(`${base}/activities.html`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(os.tmpdir(), 'christian-activities16.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(os.tmpdir(), 'christian-activities16-mobile.png'), fullPage: true });
    await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(os.tmpdir(), 'christian-home17-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: path.join(os.tmpdir(), 'christian-home17.png'), fullPage: true });
    await page.screenshot({ path: path.join(os.tmpdir(), 'christian-home18.png'), fullPage: true });
    await page.goto(`${base}/projects.html`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(os.tmpdir(), 'christian-research18.png'), fullPage: true });
    await page.goto(`${base}/activities.html`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(os.tmpdir(), 'christian-activities18.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(os.tmpdir(), 'christian-home18-mobile.png'), fullPage: true });
    await page.goto(`${base}/projects.html`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(os.tmpdir(), 'christian-research18-mobile.png'), fullPage: true });
    await page.goto(`${base}/activities.html`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(os.tmpdir(), 'christian-activities18-mobile.png'), fullPage: true });
    await page.goto(`${base}/cv.html`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(os.tmpdir(), 'christian-cv19-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: path.join(os.tmpdir(), 'christian-cv19.png'), fullPage: true });
    await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(os.tmpdir(), 'christian-home19.png'), fullPage: true });
    console.log('All UI checks passed; desktop screenshots saved in OS temp directory.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
