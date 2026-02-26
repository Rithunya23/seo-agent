/* ═══════════════════════════════════════════════
   Content Monitor — Detects Changes & Auto-Triggers Audit
   Periodically re-fetches a URL, compares content hash,
   and fires callback when changes are detected.
   ═══════════════════════════════════════════════ */
const ContentMonitor = {
  watching: false,
  interval: null,
  url: null,
  lastHash: null,
  lastHtml: null,
  checkCount: 0,
  changesDetected: 0,
  intervalMs: 30000, // 30 seconds default
  onChangeCallback: null,
  onStatusCallback: null,

  /** Start watching a URL for content changes */
  start(url, options = {}) {
    if (this.watching) this.stop();

    this.url = url;
    this.watching = true;
    this.checkCount = 0;
    this.changesDetected = 0;
    this.intervalMs = options.intervalMs || 30000;
    this.onChangeCallback = options.onChange || null;
    this.onStatusCallback = options.onStatus || null;

    this.notify('status', { state: 'started', url, interval: this.intervalMs });

    // Do initial fetch to establish baseline
    this.check().then(() => {
      // Start periodic checks
      this.interval = setInterval(() => this.check(), this.intervalMs);
    });
  },

  /** Stop watching */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.watching = false;
    this.notify('status', { state: 'stopped', checks: this.checkCount, changes: this.changesDetected });
  },

  /** Perform a single content check */
  async check() {
    if (!this.watching || !this.url) return;

    this.checkCount++;
    this.notify('status', { state: 'checking', check: this.checkCount });

    try {
      const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(this.url);
      const resp = await fetch(proxyUrl, { cache: 'no-store' });
      if (!resp.ok) throw new Error('Fetch failed: ' + resp.status);
      const html = await resp.text();
      const hash = this.hashContent(html);

      if (this.lastHash === null) {
        // First check — establish baseline
        this.lastHash = hash;
        this.lastHtml = html;
        this.notify('status', { state: 'baseline', hash });
        return;
      }

      if (hash !== this.lastHash) {
        // Content changed!
        this.changesDetected++;
        const diff = this.detectChanges(this.lastHtml, html);
        const prevHash = this.lastHash;
        this.lastHash = hash;
        this.lastHtml = html;

        this.notify('change', {
          url: this.url,
          prevHash,
          newHash: hash,
          diff,
          html,
          checkNumber: this.checkCount,
          timestamp: new Date().toISOString()
        });
      } else {
        this.notify('status', { state: 'no-change', check: this.checkCount });
      }
    } catch (err) {
      this.notify('status', { state: 'error', error: err.message, check: this.checkCount });
    }
  },

  /** Simple but effective content hash using djb2 */
  hashContent(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xFFFFFFFF;
    }
    return hash.toString(16);
  },

  /** Detect what changed between old and new HTML */
  detectChanges(oldHtml, newHtml) {
    const parser = new DOMParser();
    const oldDoc = parser.parseFromString(oldHtml, 'text/html');
    const newDoc = parser.parseFromString(newHtml, 'text/html');

    const changes = [];

    // Check title change
    const oldTitle = oldDoc.querySelector('title')?.textContent?.trim() || '';
    const newTitle = newDoc.querySelector('title')?.textContent?.trim() || '';
    if (oldTitle !== newTitle) {
      changes.push({ type: 'title', old: oldTitle, new: newTitle });
    }

    // Check meta description change
    const oldDesc = oldDoc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
    const newDesc = newDoc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
    if (oldDesc !== newDesc) {
      changes.push({ type: 'meta-description', old: oldDesc, new: newDesc });
    }

    // Check H1 change
    const oldH1 = [...oldDoc.querySelectorAll('h1')].map(h => h.textContent.trim()).join(', ');
    const newH1 = [...newDoc.querySelectorAll('h1')].map(h => h.textContent.trim()).join(', ');
    if (oldH1 !== newH1) {
      changes.push({ type: 'h1', old: oldH1, new: newH1 });
    }

    // Check body content word count change
    const oldWords = (oldDoc.body?.textContent?.trim() || '').split(/\s+/).filter(w => w).length;
    const newWords = (newDoc.body?.textContent?.trim() || '').split(/\s+/).filter(w => w).length;
    if (Math.abs(oldWords - newWords) > 10) {
      changes.push({ type: 'content-length', old: oldWords + ' words', new: newWords + ' words' });
    }

    // Check image count change
    const oldImgs = oldDoc.querySelectorAll('img').length;
    const newImgs = newDoc.querySelectorAll('img').length;
    if (oldImgs !== newImgs) {
      changes.push({ type: 'images', old: oldImgs + ' images', new: newImgs + ' images' });
    }

    // Check link count change
    const oldLinks = oldDoc.querySelectorAll('a[href]').length;
    const newLinks = newDoc.querySelectorAll('a[href]').length;
    if (oldLinks !== newLinks) {
      changes.push({ type: 'links', old: oldLinks + ' links', new: newLinks + ' links' });
    }

    // Check schema/structured data change
    const oldSchema = oldDoc.querySelectorAll('script[type="application/ld+json"]').length;
    const newSchema = newDoc.querySelectorAll('script[type="application/ld+json"]').length;
    if (oldSchema !== newSchema) {
      changes.push({ type: 'schema', old: oldSchema + ' schemas', new: newSchema + ' schemas' });
    }

    // If no specific changes detected but hash differs, mark as general content change
    if (changes.length === 0) {
      changes.push({ type: 'general', old: 'Previous version', new: 'Content updated' });
    }

    return changes;
  },

  /** Fire callbacks */
  notify(type, data) {
    if (type === 'change' && this.onChangeCallback) {
      this.onChangeCallback(data);
    }
    if (this.onStatusCallback) {
      this.onStatusCallback({ type, ...data });
    }
  },

  /** Get current status */
  getStatus() {
    return {
      watching: this.watching,
      url: this.url,
      checkCount: this.checkCount,
      changesDetected: this.changesDetected,
      intervalMs: this.intervalMs
    };
  }
};
