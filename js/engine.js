/* ═══════════════════════════════════════════════
   SEO Analysis Engine — 11 Rule Checks
   ═══════════════════════════════════════════════ */
const SEOEngine = {

  /** Run full audit on a single page */
  audit(url, html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const meta = this.extractMeta(doc, url);
    const issues = this.runChecks(meta, url);
    const score = this.calcScore(issues);
    return { url, issues, score, meta };
  },

  /** Extract all SEO-relevant metadata from parsed HTML */
  extractMeta(doc, url) {
    const title = doc.querySelector('title')?.textContent?.trim() || '';
    const descEl = doc.querySelector('meta[name="description"]');
    const description = descEl?.getAttribute('content')?.trim() || '';
    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';

    // Open Graph
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
    const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

    // Twitter Card
    const twCard = doc.querySelector('meta[name="twitter:card"]')?.getAttribute('content') || '';

    // Headings
    const h1s = [...doc.querySelectorAll('h1')].map(h => h.textContent.trim());
    const h2s = [...doc.querySelectorAll('h2')].map(h => h.textContent.trim());
    const h3s = [...doc.querySelectorAll('h3')].map(h => h.textContent.trim());
    const allHeadings = [];
    doc.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
      allHeadings.push({ level: parseInt(h.tagName[1]), text: h.textContent.trim() });
    });

    // Images
    const images = [...doc.querySelectorAll('img')].map(img => ({
      src: img.getAttribute('src') || '',
      alt: img.getAttribute('alt') || ''
    }));

    // Content
    const bodyText = doc.body?.textContent?.trim() || '';
    const wordCount = bodyText.split(/\s+/).filter(w => w.length > 0).length;

    // Links
    const links = [...doc.querySelectorAll('a[href]')].map(a => a.getAttribute('href'));
    const internalLinks = links.filter(l =>
      l && !l.startsWith('http') && !l.startsWith('mailto:') && !l.startsWith('tel:')
    );

    // Schema / Structured Data
    const schemaScripts = [...doc.querySelectorAll('script[type="application/ld+json"]')];
    const schema = [];
    schemaScripts.forEach(s => {
      try { schema.push(JSON.parse(s.textContent)); } catch (e) { /* skip invalid */ }
    });

    return {
      title, description, canonical,
      ogTitle, ogDesc, ogImage, twCard,
      h1s, h2s, h3s, allHeadings,
      images, wordCount, internalLinks, links,
      schema, bodyText
    };
  },

  /** Run all 11 SEO rule checks + bonus checks */
  runChecks(meta, url) {
    const issues = [];
    let id = 0;

    // ── Rule 1: Missing Meta Title ──
    if (!meta.title) {
      const suggested = meta.h1s[0]
        ? meta.h1s[0] + ' | ' + this.domain(url)
        : this.domain(url) + ' — Official Website';
      issues.push({
        id: id++, rule: 'Missing Meta Title', severity: 'critical', action: 'auto-fix',
        element: '<title>', current: '', suggested,
        reason: 'No <title> tag found. Search engines use this as the primary heading in results.'
      });
    }
    // ── Rule 2: Title Length ──
    else if (meta.title.length > 60) {
      issues.push({
        id: id++, rule: 'Meta Title Too Long', severity: 'warning', action: 'auto-fix',
        element: '<title>', current: meta.title + ' (' + meta.title.length + ' chars)',
        suggested: meta.title.slice(0, 57) + '...',
        reason: 'Title exceeds 60 characters and will be truncated in search results.'
      });
    } else if (meta.title.length < 30 && meta.title.length > 0) {
      issues.push({
        id: id++, rule: 'Meta Title Too Short', severity: 'warning', action: 'auto-fix',
        element: '<title>', current: meta.title + ' (' + meta.title.length + ' chars)',
        suggested: meta.title + ' | ' + this.domain(url),
        reason: 'Title is under 30 characters. Longer titles perform better in search.'
      });
    }

    // ── Rule 3: Missing Meta Description ──
    if (!meta.description) {
      const firstPara = meta.bodyText.split('.').slice(0, 2).join('.').slice(0, 155).trim();
      const suggested = firstPara
        ? firstPara + '.'
        : 'Discover everything about ' + this.domain(url) + '. Visit us today for more information.';
      issues.push({
        id: id++, rule: 'Missing Meta Description', severity: 'critical', action: 'auto-fix',
        element: '<meta name="description">', current: '', suggested,
        reason: 'No meta description found. This is a key ranking signal and click-through driver.'
      });
    }
    // ── Rule 4: Description Length ──
    else if (meta.description.length > 160) {
      issues.push({
        id: id++, rule: 'Meta Description Too Long', severity: 'warning', action: 'auto-fix',
        element: '<meta description>',
        current: meta.description + ' (' + meta.description.length + ' chars)',
        suggested: meta.description.slice(0, 157) + '...',
        reason: 'Description exceeds 160 characters and will be truncated.'
      });
    } else if (meta.description.length < 70 && meta.description.length > 0) {
      issues.push({
        id: id++, rule: 'Meta Description Too Short', severity: 'warning', action: 'auto-fix',
        element: '<meta description>',
        current: meta.description + ' (' + meta.description.length + ' chars)',
        suggested: meta.description + ' Learn more about our offerings and discover what makes us stand out.',
        reason: 'Description is under 70 characters. Longer descriptions improve click-through rates.'
      });
    }

    // ── Rule 5: Missing / Multiple H1 ──
    if (meta.h1s.length === 0) {
      issues.push({
        id: id++, rule: 'Missing H1 Tag', severity: 'critical', action: 'escalate',
        element: '<h1>', current: 'No H1 found',
        suggested: 'Add a single, descriptive H1 that matches the page topic',
        reason: 'H1 is the primary heading for SEO. Cannot auto-generate — requires human judgment on content.'
      });
    } else if (meta.h1s.length > 1) {
      issues.push({
        id: id++, rule: 'Multiple H1 Tags', severity: 'critical', action: 'escalate',
        element: '<h1>',
        current: meta.h1s.length + ' H1 tags: "' + meta.h1s.join('", "') + '"',
        suggested: 'Keep only one H1 tag per page',
        reason: 'Multiple H1s confuse search engines about the page topic. Human must decide which to keep.'
      });
    }

    // ── Rule 6: Heading Hierarchy ──
    if (meta.allHeadings.length > 1) {
      for (let i = 1; i < meta.allHeadings.length; i++) {
        if (meta.allHeadings[i].level - meta.allHeadings[i - 1].level > 1) {
          issues.push({
            id: id++, rule: 'Broken Heading Hierarchy', severity: 'warning', action: 'escalate',
            element: '<h' + meta.allHeadings[i].level + '>',
            current: 'H' + meta.allHeadings[i - 1].level + ' → H' + meta.allHeadings[i].level + ' (skipped level)',
            suggested: 'Use sequential heading levels (H1 → H2 → H3)',
            reason: 'Skipping heading levels hurts accessibility and SEO structure. Human must restructure content.'
          });
          break;
        }
      }
    }

    // ── Rule 7: Images Missing Alt ──
    const noAlt = meta.images.filter(img => !img.alt);
    if (noAlt.length > 0) {
      issues.push({
        id: id++, rule: 'Images Missing Alt Text', severity: 'warning', action: 'auto-fix',
        element: '<img>',
        current: noAlt.length + ' image(s) have no alt text',
        suggested: 'Add descriptive alt text to each image (e.g., "Product photo of blue widget")',
        reason: 'Alt text improves accessibility and image search rankings.'
      });
    }

    // ── Rule 8: Open Graph ──
    if (!meta.ogTitle || !meta.ogDesc) {
      const parts = [];
      if (!meta.ogTitle) parts.push('og:title');
      if (!meta.ogDesc) parts.push('og:description');
      if (!meta.ogImage) parts.push('og:image');
      issues.push({
        id: id++, rule: 'Missing Open Graph Tags', severity: 'warning', action: 'auto-fix',
        element: '<meta property="og:*">',
        current: 'Missing: ' + parts.join(', '),
        suggested: 'og:title="' + (meta.title || 'Page Title') + '" og:description="' + (meta.description || 'Page description') + '"',
        reason: 'Open Graph tags control how your page appears when shared on social media.'
      });
    }

    // ── Rule 9: Missing Canonical ──
    if (!meta.canonical) {
      issues.push({
        id: id++, rule: 'Missing Canonical URL', severity: 'info', action: 'auto-fix',
        element: '<link rel="canonical">',
        current: 'Not set',
        suggested: '<link rel="canonical" href="' + url + '" />',
        reason: 'Canonical URL prevents duplicate content issues and consolidates link equity.'
      });
    }

    // ── Rule 10: Thin Content ──
    if (meta.wordCount < 300) {
      issues.push({
        id: id++, rule: 'Thin Content', severity: 'warning', action: 'escalate',
        element: '<body>',
        current: meta.wordCount + ' words',
        suggested: 'Expand content to 300+ words with relevant, high-quality information',
        reason: 'Pages with fewer than 300 words may rank poorly. Content expansion requires human writing.'
      });
    }

    // ── Rule 11: Missing Schema ──
    if (meta.schema.length === 0) {
      issues.push({
        id: id++, rule: 'Missing Structured Data (Schema)', severity: 'info', action: 'auto-fix',
        element: '<script type="application/ld+json">',
        current: 'No schema markup found',
        suggested: '{"@context":"https://schema.org","@type":"WebPage","name":"' + (meta.title || 'Page') + '","description":"' + (meta.description || '') + '"}',
        reason: 'Structured data helps search engines understand page content and enables rich snippets.'
      });
    }

    // ── Bonus: Twitter Card ──
    if (!meta.twCard) {
      issues.push({
        id: id++, rule: 'Missing Twitter Card Tags', severity: 'info', action: 'auto-fix',
        element: '<meta name="twitter:card">',
        current: 'Not set',
        suggested: '<meta name="twitter:card" content="summary_large_image">',
        reason: 'Twitter Cards enhance how your links appear on Twitter.'
      });
    }

    return issues;
  },

  /** Calculate overall page health score (0–100) */
  calcScore(issues) {
    let score = 100;
    issues.forEach(i => {
      if (i.severity === 'critical') score -= 15;
      else if (i.severity === 'warning') score -= 8;
      else score -= 3;
    });
    return Math.max(0, Math.min(100, score));
  },

  /** Extract domain from URL */
  domain(url) {
    try { return new URL(url).hostname; }
    catch { return url.replace(/https?:\/\//, '').split('/')[0] || 'website'; }
  }
};
