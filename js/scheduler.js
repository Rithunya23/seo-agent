/* ═══════════════════════════════════════════════
   SEO Agent Scheduler — Autonomous Recurring Audits
   Automatically crawls the complete site on a schedule
   (default: every 1 hour) and generates optimized SEO tags.
   ═══════════════════════════════════════════════ */
const Scheduler = {
  active: false,
  timer: null,
  intervalMs: 3600000,       // default 1 hour
  url: null,
  runCount: 0,
  history: [],               // audit history log
  maxHistory: 50,
  onRunCallback: null,
  onStatusCallback: null,

  /** Start the scheduler */
  start(url, options = {}) {
    if (this.active) this.stop();
    this.url = url;
    this.active = true;
    this.intervalMs = options.intervalMs || 3600000;
    this.onRunCallback = options.onRun || null;
    this.onStatusCallback = options.onStatus || null;

    this.notify('started', {
      url, interval: this.intervalMs,
      nextRun: new Date(Date.now() + this.intervalMs).toLocaleTimeString()
    });

    // Run immediately on start
    this.execute();

    // Schedule recurring runs
    this.timer = setInterval(() => this.execute(), this.intervalMs);
  },

  /** Stop the scheduler */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.active = false;
    this.notify('stopped', { runs: this.runCount });
  },

  /** Execute a full site audit run */
  async execute() {
    if (!this.url) return;
    this.runCount++;
    const runId = this.runCount;
    const startTime = Date.now();

    this.notify('running', { run: runId, url: this.url });

    try {
      // 1. Fetch the main page
      const mainHtml = await this.fetchPage(this.url);
      if (!mainHtml) throw new Error('Failed to fetch main page');

      // 2. Discover all internal links
      const links = this.discoverLinks(mainHtml, this.url);
      this.notify('progress', { run: runId, phase: 'Discovered ' + links.length + ' page(s)' });

      // 3. Fetch and audit each page (main + discovered links, cap at 10)
      const pagesToAudit = [this.url, ...links].slice(0, 10);
      const results = [];

      for (let i = 0; i < pagesToAudit.length; i++) {
        const pageUrl = pagesToAudit[i];
        this.notify('progress', {
          run: runId,
          phase: 'Auditing page ' + (i + 1) + '/' + pagesToAudit.length + ': ' + pageUrl
        });

        let html;
        if (pageUrl === this.url) {
          html = mainHtml;
        } else {
          html = await this.fetchPage(pageUrl);
        }

        if (html) {
          const audit = SEOEngine.audit(pageUrl, html);
          results.push(audit);
        }
      }

      // 4. Build aggregate result
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const avgScore = results.length > 0
        ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
        : 0;
      const totalIssues = results.reduce((s, r) => s + r.issues.length, 0);
      const autoFixed = results.reduce((s, r) => s + r.issues.filter(i => i.action === 'auto-fix').length, 0);
      const escalated = results.reduce((s, r) => s + r.issues.filter(i => i.action === 'escalate').length, 0);

      const entry = {
        id: runId,
        timestamp: new Date().toISOString(),
        timeStr: new Date().toLocaleString(),
        url: this.url,
        pages: results,
        pagesAudited: results.length,
        avgScore,
        totalIssues,
        autoFixed,
        escalated,
        elapsed: elapsed + 's',
        seoTags: results[0]?.seoTags || null
      };

      // Save to history
      this.history.unshift(entry);
      if (this.history.length > this.maxHistory) this.history.pop();

      // Persist to sessionStorage
      this.persist();

      this.notify('completed', entry);

      // Fire callback to app
      if (this.onRunCallback) {
        this.onRunCallback(entry);
      }

      // Calculate next run
      this.notify('scheduled', {
        nextRun: new Date(Date.now() + this.intervalMs).toLocaleTimeString(),
        lastScore: avgScore
      });

    } catch (err) {
      this.notify('error', { run: runId, error: err.message });
    }
  },

  /** Fetch a page via CORS proxy */
  async fetchPage(url) {
    try {
      const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
      const resp = await fetch(proxyUrl, { cache: 'no-store' });
      if (!resp.ok) return null;
      return await resp.text();
    } catch {
      return null;
    }
  },

  /** Discover all internal links on a page */
  discoverLinks(html, baseUrl) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const seen = new Set();
    let base;
    try { base = new URL(baseUrl); } catch { return []; }

    doc.querySelectorAll('a[href]').forEach(a => {
      let href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

      try {
        const full = new URL(href, baseUrl);
        // Only same-origin links
        if (full.hostname === base.hostname) {
          const clean = full.origin + full.pathname; // strip hash/query
          if (clean !== baseUrl && !seen.has(clean)) {
            seen.add(clean);
          }
        }
      } catch { /* skip invalid URLs */ }
    });

    return [...seen];
  },

  /** Notify listeners */
  notify(state, data) {
    if (this.onStatusCallback) {
      this.onStatusCallback({ state, ...data });
    }
  },

  /** Persist history to sessionStorage */
  persist() {
    try {
      sessionStorage.setItem('seoSchedulerHistory', JSON.stringify(this.history.slice(0, 20)));
    } catch { /* quota exceeded, ignore */ }
  },

  /** Restore history from sessionStorage */
  restore() {
    try {
      const data = sessionStorage.getItem('seoSchedulerHistory');
      if (data) this.history = JSON.parse(data);
    } catch { /* ignore */ }
  },

  /** Get status summary */
  getStatus() {
    return {
      active: this.active,
      url: this.url,
      runCount: this.runCount,
      intervalMs: this.intervalMs,
      historyCount: this.history.length,
      lastRun: this.history[0] || null
    };
  }
};

// Restore history on load
Scheduler.restore();
