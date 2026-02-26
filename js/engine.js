/* ═══════════════════════════════════════════════
   SEO Analysis Engine — 11 Rule Checks + Smart Generation
   ═══════════════════════════════════════════════ */
const SEOEngine = {

  /** Run full audit on a single page */
  audit(url, html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const meta = this.extractMeta(doc, url);
    const issues = this.runChecks(meta, url);
    const score = this.calcScore(issues);
    const seoTags = this.generateOptimizedTags(meta, url);
    return { url, issues, score, meta, seoTags };
  },

  /* ═══════════════════════════════════════════════
     SMART SEO TAG GENERATION
     Extracts keywords, analyzes content, and generates
     ranking-optimized meta title, description, and tags
     ═══════════════════════════════════════════════ */

  /** Extract top keywords from page content */
  extractKeywords(text, count = 8) {
    const stop = new Set([
      'the','a','an','and','or','but','in','on','at','to','for','of','with',
      'by','from','as','is','was','are','were','been','be','have','has','had',
      'do','does','did','will','would','could','should','may','might','shall',
      'can','this','that','these','those','it','its','i','you','he','she','we',
      'they','me','him','her','us','them','my','your','his','our','their',
      'what','which','who','whom','where','when','how','not','no','nor','if',
      'then','than','too','very','just','about','above','after','again','all',
      'also','am','any','because','before','between','both','each','few','get',
      'here','into','more','most','other','out','over','own','same','so','some',
      'such','up','only','now','new','one','two','like','make','many','well',
      'back','even','give','good','know','look','see','take','come','could',
      'find','first','go','great','here','high','last','long','look','made',
      'much','need','never','next','old','part','place','point','right','show',
      'still','tell','thing','think','three','through','under','us','use','way',
      'work','world','year','click','read','learn','best','top','buy','free',
      'www','http','https','html','com','org','net'
    ]);

    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stop.has(w));

    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

    // Score: frequency * word length bonus
    return Object.entries(freq)
      .map(([word, cnt]) => ({ word, score: cnt * (1 + word.length * 0.1) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(e => e.word);
  },

  /** Extract key phrases (2-3 word combos) */
  extractPhrases(text, count = 5) {
    const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const words = clean.split(/\s+/).filter(w => w.length > 2);
    const bigrams = {};
    for (let i = 0; i < words.length - 1; i++) {
      const pair = words[i] + ' ' + words[i + 1];
      if (pair.length > 7) bigrams[pair] = (bigrams[pair] || 0) + 1;
    }
    return Object.entries(bigrams)
      .filter(([, cnt]) => cnt > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(e => e[0]);
  },

  /** Generate optimized meta title from content analysis */
  generateTitle(meta, url) {
    const domain = this.domain(url);
    // If existing title is good, return it
    if (meta.title && meta.title.length >= 30 && meta.title.length <= 60) {
      return meta.title;
    }

    const h1 = meta.h1s[0] || '';
    const keywords = this.extractKeywords(meta.bodyText, 5);
    const phrases = this.extractPhrases(meta.bodyText, 3);

    // Strategy 1: Use H1 + domain
    if (h1 && h1.length >= 15 && h1.length <= 50) {
      return h1 + ' | ' + this.capitalize(domain.replace(/\.[a-z]+$/, ''));
    }

    // Strategy 2: Use top phrase + keywords
    if (phrases.length > 0) {
      const phrase = this.titleCase(phrases[0]);
      const kw = keywords.length > 1 ? ' — ' + this.titleCase(keywords[0]) + ' & ' + this.titleCase(keywords[1]) : '';
      const title = phrase + kw;
      if (title.length <= 58) return title + ' | ' + this.capitalize(domain.replace(/\.[a-z]+$/, ''));
      return title.slice(0, 57) + '...';
    }

    // Strategy 3: Use top keywords
    if (keywords.length >= 3) {
      return this.titleCase(keywords.slice(0, 3).join(' ')) + ' — ' + this.capitalize(domain.replace(/\.[a-z]+$/, ''));
    }

    // Fallback
    return this.capitalize(domain.replace(/\.[a-z]+$/, '')) + ' — Your Trusted Source';
  },

  /** Generate optimized meta description from content */
  generateDescription(meta, url) {
    // If existing description is good, return it
    if (meta.description && meta.description.length >= 70 && meta.description.length <= 160) {
      return meta.description;
    }

    const keywords = this.extractKeywords(meta.bodyText, 6);
    const phrases = this.extractPhrases(meta.bodyText, 3);
    const sentences = meta.bodyText
      .replace(/\s+/g, ' ')
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 120);

    // Find the most keyword-rich sentence
    let bestSentence = '';
    let bestScore = 0;
    for (const sent of sentences) {
      const lower = sent.toLowerCase();
      let score = 0;
      keywords.forEach(kw => { if (lower.includes(kw)) score++; });
      if (score > bestScore) { bestScore = score; bestSentence = sent; }
    }

    let desc = '';

    if (bestSentence) {
      desc = bestSentence;
      // Append keyword-rich suffix if room
      if (desc.length < 110 && keywords.length > 2) {
        desc += '. Discover ' + keywords.slice(0, 3).join(', ') + ' and more.';
      }
    } else if (phrases.length > 0) {
      desc = 'Explore ' + phrases.slice(0, 2).join(', ') + '. ';
      if (keywords.length > 2) {
        desc += 'Learn about ' + keywords.slice(0, 4).join(', ') + '.';
      }
    } else {
      desc = 'Discover everything about ' + this.domain(url) + '.';
      if (keywords.length > 0) {
        desc += ' Learn about ' + keywords.join(', ') + '.';
      }
    }

    // Ensure length is 70-160
    if (desc.length > 160) desc = desc.slice(0, 157) + '...';
    if (desc.length < 70) desc += ' Visit us today for comprehensive information and resources.';

    return desc;
  },

  /** Generate full set of optimized SEO tags */
  generateOptimizedTags(meta, url) {
    const title = this.generateTitle(meta, url);
    const description = this.generateDescription(meta, url);
    const domain = this.domain(url);
    const keywords = this.extractKeywords(meta.bodyText, 10);
    const phrases = this.extractPhrases(meta.bodyText, 5);

    // Generate canonical
    const canonical = meta.canonical || url;

    // Generate OG tags
    const ogTitle = meta.ogTitle || title;
    const ogDesc = meta.ogDesc || description;
    const ogImage = meta.ogImage || '';

    // Generate schema
    const schema = meta.schema.length > 0
      ? JSON.stringify(meta.schema[0], null, 2)
      : JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": title,
          "description": description,
          "url": canonical
        }, null, 2);

    // Build copy-ready HTML snippet
    const htmlSnippet = [
      `<title>${title}</title>`,
      `<meta name="description" content="${description}" />`,
      `<meta name="keywords" content="${keywords.join(', ')}" />`,
      `<link rel="canonical" href="${canonical}" />`,
      ``,
      `<!-- Open Graph -->`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:title" content="${ogTitle}" />`,
      `<meta property="og:description" content="${ogDesc}" />`,
      `<meta property="og:url" content="${canonical}" />`,
      ogImage ? `<meta property="og:image" content="${ogImage}" />` : `<!-- Add og:image for social sharing -->`,
      ``,
      `<!-- Twitter Card -->`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${ogTitle}" />`,
      `<meta name="twitter:description" content="${ogDesc}" />`,
      ``,
      `<!-- Structured Data -->`,
      `<script type="application/ld+json">`,
      schema,
      `</script>`
    ].join('\n');

    return {
      title,
      description,
      keywords,
      phrases,
      canonical,
      ogTitle,
      ogDesc,
      ogImage,
      schema,
      htmlSnippet,
      // Ranking tips based on analysis
      tips: this.generateRankingTips(meta, keywords)
    };
  },

  /** Generate actionable ranking tips */
  generateRankingTips(meta, keywords) {
    const tips = [];

    if (meta.wordCount < 300) {
      tips.push({
        priority: 'high',
        tip: 'Content is thin (' + meta.wordCount + ' words). Aim for 800-1500 words for better rankings.',
        action: 'Add comprehensive content covering: ' + keywords.slice(0, 4).join(', ')
      });
    } else if (meta.wordCount < 800) {
      tips.push({
        priority: 'medium',
        tip: 'Content length is OK (' + meta.wordCount + ' words) but could be stronger.',
        action: 'Consider expanding to 1000+ words for competitive keywords.'
      });
    }

    if (meta.h1s.length === 0) {
      tips.push({
        priority: 'high',
        tip: 'Missing H1 tag — this is the most important on-page heading for SEO.',
        action: 'Add an H1 that includes your primary keyword: "' + (keywords[0] || 'your main topic') + '"'
      });
    }

    if (meta.h2s.length === 0 && meta.wordCount > 200) {
      tips.push({
        priority: 'medium',
        tip: 'No H2 subheadings found. Structure content with H2s for better readability and SEO.',
        action: 'Add H2 sections for: ' + keywords.slice(0, 3).map(k => '"' + k + '"').join(', ')
      });
    }

    if (meta.internalLinks.length < 3) {
      tips.push({
        priority: 'medium',
        tip: 'Only ' + meta.internalLinks.length + ' internal link(s). Internal linking boosts rankings.',
        action: 'Add 3-5 internal links to related pages on your site.'
      });
    }

    const imgNoAlt = meta.images.filter(i => !i.alt).length;
    if (imgNoAlt > 0) {
      tips.push({
        priority: 'medium',
        tip: imgNoAlt + ' image(s) missing alt text. Alt text helps image SEO.',
        action: 'Add keyword-rich alt text to all images (include "' + (keywords[0] || 'topic') + '" where relevant).'
      });
    }

    if (keywords.length > 0) {
      tips.push({
        priority: 'info',
        tip: 'Top keywords detected: ' + keywords.slice(0, 5).join(', '),
        action: 'Ensure these appear in your title, H1, first paragraph, and meta description.'
      });
    }

    return tips;
  },

  /** Title case helper */
  titleCase(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
  },

  /** Capitalize first letter */
  capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
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
