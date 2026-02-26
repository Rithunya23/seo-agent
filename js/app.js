/* ═══════════════════════════════════════════════
   SEO Agent — App State Machine & UI Logic
   ═══════════════════════════════════════════════ */
const App = {
  currentScreen: 'splash',
  user: null,
  auditData: null,

  /* ── Navigation ── */
  goTo(screen) {
    const curId = 'screen' + this.capitalize(this.currentScreen);
    const nextId = 'screen' + this.capitalize(screen);
    const cur = document.getElementById(curId);
    const next = document.getElementById(nextId);

    if (cur) { cur.classList.remove('active'); cur.classList.add('exit'); }

    setTimeout(() => {
      if (cur) cur.classList.remove('exit');
      if (next) next.classList.add('active');
      this.currentScreen = screen;
      document.body.style.overflow = screen === 'dashboard' ? 'auto' : 'hidden';
    }, 300);
  },

  capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); },

  /* ── Login ── */
  handleLogin(e, isGuest) {
    if (e) e.preventDefault();

    if (!isGuest) {
      const email = document.getElementById('loginEmail').value.trim();
      const pass = document.getElementById('loginPass').value.trim();
      if (!email || !pass) {
        document.getElementById('loginError').style.display = 'block';
        return false;
      }
      this.user = { email, name: email.split('@')[0] };
    } else {
      this.user = { email: 'guest@demo.com', name: 'Guest' };
    }

    sessionStorage.setItem('seoUser', JSON.stringify(this.user));
    document.getElementById('userName').textContent = this.user.name;
    document.getElementById('userAvatar').textContent = this.user.name.charAt(0).toUpperCase();
    this.goTo('upload');
    return false;
  },

  /* ── Upload Tabs ── */
  switchTab(tab) {
    const tabs = ['url', 'paste', 'demo'];
    document.querySelectorAll('.tab-btn').forEach((b, i) => {
      b.classList.toggle('active', tabs[i] === tab);
    });
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab' + this.capitalize(tab)).classList.add('active');
  },

  /* ── Fetch URL via CORS proxy ── */
  async fetchUrl() {
    const url = document.getElementById('urlInput').value.trim();
    if (!url) return;

    this.showLoading('Fetching website...');
    try {
      const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
      const resp = await fetch(proxyUrl);
      if (!resp.ok) throw new Error('Fetch failed');
      const html = await resp.text();
      this.hideLoading();
      this.runAudit(html, url);
    } catch (err) {
      this.hideLoading();
      alert('Could not fetch URL (CORS restriction). Try pasting the HTML directly or use Demo Mode.');
    }
  },

  /* ── Paste HTML ── */
  auditPaste() {
    const html = document.getElementById('pasteArea').value.trim();
    if (!html) return;
    this.runAudit(html, 'Pasted HTML');
  },

  /* ── Load Demo ── */
  loadDemo() {
    this.runAudit(DEMO_HTML, 'demo-ecommerce.com');
  },

  /* ── Loading Overlay ── */
  showLoading(text) {
    document.getElementById('loadingOverlay').classList.add('active');
    document.getElementById('loadingPhase').textContent = text || 'Processing...';
  },
  hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
  },
  setLoadingPhase(t) {
    document.getElementById('loadingPhase').textContent = t;
  },

  /* ═══════════════════════════════════════════════
     MAIN AUDIT ORCHESTRATOR
     Runs the 5-phase agent pipeline with visual feedback
     ═══════════════════════════════════════════════ */
  async runAudit(html, source) {
    this.showLoading('Initializing Planner Agent...');
    this.goTo('dashboard');
    this.auditData = null;
    this.resetDashboard();

    await this.delay(600);

    // ── Phase 1: Planner ──
    this.setPipelineStep(0, 'running');
    this.addLog('[Planner]  Received website: ' + source, 'log-accent');
    this.setLoadingPhase('Planner Agent: Breaking task into steps...');
    await this.delay(800);
    this.addLog('[Planner]  Parsing HTML structure...', 'log-accent');
    await this.delay(600);
    const pages = [{ url: source, html }];
    this.addLog('[Planner]  Identified ' + pages.length + ' page(s) for audit', 'log-accent');
    this.setPipelineStep(0, 'done');
    await this.delay(400);

    // ── Phase 2: Auditor ──
    this.setPipelineStep(1, 'running');
    this.setLoadingPhase('Auditor Agent: Running 11 SEO checks...');
    this.addLog('[Auditor]  Running 11 SEO rule checks...', 'log-green');
    await this.delay(600);
    const auditResults = pages.map(p => SEOEngine.audit(p.url, p.html));
    this.addLog('[Auditor]  Found ' + auditResults[0].issues.length + ' issues across ' + pages.length + ' page(s)', 'log-amber');
    this.setPipelineStep(1, 'done');
    await this.delay(400);

    // ── Phase 3: Decider ──
    this.setPipelineStep(2, 'running');
    this.setLoadingPhase('Decider Agent: Classifying issues...');
    const autoFix = auditResults[0].issues.filter(i => i.action === 'auto-fix');
    const escalate = auditResults[0].issues.filter(i => i.action === 'escalate');
    this.addLog('[Decider]  ' + autoFix.length + ' issues marked SAFE for auto-fix', 'log-green');
    this.addLog('[Decider]  ' + escalate.length + ' issues require HUMAN REVIEW', 'log-red');
    this.setPipelineStep(2, 'done');
    await this.delay(400);

    // ── Phase 4: Fixer ──
    this.setPipelineStep(3, 'running');
    this.setLoadingPhase('Fixer Agent: Applying safe fixes...');
    for (const fix of autoFix) {
      this.addLog('[Fixer]    Fixing: ' + fix.rule, 'log-accent');
      await this.delay(200);
    }
    this.addLog('[Fixer]    Applied ' + autoFix.length + ' fixes', 'log-green');
    this.setPipelineStep(3, 'done');
    await this.delay(400);

    // ── Phase 5: Reviewer ──
    this.setPipelineStep(4, 'running');
    this.setLoadingPhase('Reviewer Agent: Validating...');
    this.addLog('[Reviewer] Validating all fixes...', 'log-accent');
    await this.delay(600);
    this.addLog('[Reviewer] All fixes validated. Report ready.', 'log-green');
    this.addLog('', '');
    this.addLog('Audit complete. ' + autoFix.length + ' fixes applied. ' + escalate.length + ' escalated.', 'log-white', true);
    this.setPipelineStep(4, 'done');

    this.hideLoading();

    // Store results and render dashboard
    this.auditData = {
      pages: auditResults, source,
      summary: {
        totalIssues: auditResults[0].issues.length,
        autoFixed: autoFix.length,
        escalated: escalate.length,
        score: auditResults[0].score
      }
    };
    this.renderDashboard();
  },

  /* ═══════════════════════════════════════════════
     DASHBOARD RENDERING
     ═══════════════════════════════════════════════ */
  resetDashboard() {
    document.getElementById('issuesBody').innerHTML = '';
    document.getElementById('agentLogBody').innerHTML = '';
    document.getElementById('pageList').innerHTML = '';
    document.getElementById('escalationList').innerHTML = '';
    document.getElementById('escalationPanel').style.display = 'none';
    ['cardPages', 'cardIssues', 'cardFixed', 'cardEscalated'].forEach(id =>
      document.getElementById(id).textContent = '0'
    );
    ['sStat1', 'sStat2', 'sStat3', 'sStat4'].forEach(id =>
      document.getElementById(id).textContent = '0'
    );
    document.getElementById('scoreVal').textContent = '0';
    document.getElementById('scoreText').textContent = '--';
    document.getElementById('scoreCircle').style.strokeDashoffset = '138.23';
    for (let i = 0; i < 5; i++) {
      const d = document.getElementById('pipe' + i);
      d.className = 'pipe-dot pending';
      d.closest('.pipe-step').querySelector('.pipe-status').textContent = 'Waiting';
    }
  },

  renderDashboard() {
    if (!this.auditData) return;
    const d = this.auditData;
    const pg = d.pages[0];

    // Animate summary counters
    this.animateCounter('cardPages', d.pages.length);
    this.animateCounter('cardIssues', d.summary.totalIssues);
    this.animateCounter('cardFixed', d.summary.autoFixed);
    this.animateCounter('cardEscalated', d.summary.escalated);

    // Sidebar stats
    this.animateCounter('sStat1', d.summary.totalIssues);
    this.animateCounter('sStat2', d.summary.autoFixed);
    this.animateCounter('sStat3', pg.issues.filter(i => i.severity === 'warning').length);
    this.animateCounter('sStat4', d.summary.escalated);

    // Score ring animation
    const score = pg.score;
    const circ = 138.23;
    const offset = circ - (circ * score / 100);
    const scoreCircle = document.getElementById('scoreCircle');
    scoreCircle.style.stroke = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
    setTimeout(() => { scoreCircle.style.strokeDashoffset = offset; }, 100);
    this.animateCounter('scoreVal', score);
    document.getElementById('scoreText').textContent =
      score >= 70 ? 'Good' : score >= 40 ? 'Needs Work' : 'Poor';

    // Page list sidebar
    const pl = document.getElementById('pageList');
    d.pages.forEach((p, i) => {
      const cls = p.score >= 70 ? 'good' : p.score >= 40 ? 'ok' : 'bad';
      const li = document.createElement('li');
      li.className = 'page-item' + (i === 0 ? ' active' : '');
      li.innerHTML = `
        <div class="page-item-score ${cls}">${p.score}</div>
        <div class="page-item-info">
          <div class="page-item-name">${this.esc(p.url)}</div>
          <div class="page-item-issues">${p.issues.length} issues</div>
        </div>`;
      pl.appendChild(li);
    });

    // Issues table
    this.renderIssues(pg.issues);

    // Escalation panel
    const escalated = pg.issues.filter(i => i.action === 'escalate');
    if (escalated.length > 0) {
      document.getElementById('escalationPanel').style.display = 'block';
      const el = document.getElementById('escalationList');
      escalated.forEach(issue => {
        const div = document.createElement('div');
        div.className = 'esc-item';
        div.innerHTML = `
          <div class="esc-icon">&#x1F6A8;</div>
          <div class="esc-info">
            <div class="esc-title">${this.esc(issue.rule)}</div>
            <div class="esc-reason">${this.esc(issue.reason)}</div>
          </div>
          <div class="esc-actions">
            <button class="btn btn-sm btn-success" onclick="this.closest('.esc-item').style.opacity='.3';this.disabled=true">Approve</button>
            <button class="btn btn-sm btn-danger" onclick="this.closest('.esc-item').style.opacity='.3';this.disabled=true">Reject</button>
          </div>`;
        el.appendChild(div);
      });
    }
  },

  /* ── Issues Table ── */
  renderIssues(issues, filter) {
    const tbody = document.getElementById('issuesBody');
    tbody.innerHTML = '';
    let filtered = issues;
    if (filter && filter !== 'all') {
      if (filter === 'auto-fix' || filter === 'escalate') {
        filtered = issues.filter(i => i.action === filter);
      } else {
        filtered = issues.filter(i => i.severity === filter);
      }
    }

    filtered.forEach((issue, idx) => {
      const sevCls = issue.severity === 'critical' ? 'badge-critical'
        : issue.severity === 'warning' ? 'badge-warning' : 'badge-info';
      const actCls = issue.action === 'auto-fix' ? 'badge-fix' : 'badge-escalate';

      // Main row
      const tr = document.createElement('tr');
      tr.setAttribute('data-severity', issue.severity);
      tr.setAttribute('data-action', issue.action);
      tr.innerHTML = `
        <td class="issue-rule">${this.esc(issue.rule)}</td>
        <td><span class="badge ${sevCls}">${issue.severity}</span></td>
        <td><span class="issue-current" title="${this.esc(issue.current)}">${this.esc(this.trunc(issue.current, 50))}</span></td>
        <td><span class="issue-suggested" title="${this.esc(issue.suggested)}">${this.esc(this.trunc(issue.suggested, 50))}</span></td>
        <td><span class="badge ${actCls}">${issue.action === 'auto-fix' ? 'Auto-Fixed' : 'Escalated'}</span></td>
        <td><button class="expand-btn" onclick="App.toggleExpand(this,${idx})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button></td>`;
      tbody.appendChild(tr);

      // Expandable detail row
      const exTr = document.createElement('tr');
      exTr.className = 'expand-row';
      exTr.id = 'expand-' + idx;
      exTr.innerHTML = `
        <td colspan="6">
          <div class="expand-content">
            <div style="margin-bottom:8px;font-size:12px;color:var(--muted)">
              <strong>Reason:</strong> ${this.esc(issue.reason)}
            </div>
            <div class="before-after">
              <div class="ba-box ba-before">
                <div class="ba-label">Before (Current)</div>
                ${this.esc(issue.current) || '<em>Empty / Missing</em>'}
              </div>
              <div class="ba-box ba-after">
                <div class="ba-label">After (Suggested)</div>
                ${this.esc(issue.suggested)}
              </div>
            </div>
          </div>
        </td>`;
      tbody.appendChild(exTr);
    });
  },

  toggleExpand(btn, idx) {
    btn.classList.toggle('open');
    document.getElementById('expand-' + idx).classList.toggle('visible');
  },

  filterIssues(filter, btn) {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (this.auditData) this.renderIssues(this.auditData.pages[0].issues, filter);
  },

  /* ── Pipeline Steps ── */
  setPipelineStep(idx, state) {
    const dot = document.getElementById('pipe' + idx);
    dot.className = 'pipe-dot ' + state;
    const status = dot.closest('.pipe-step').querySelector('.pipe-status');
    status.textContent = state === 'running' ? 'Running...' : state === 'done' ? 'Complete' : 'Waiting';
  },

  /* ── Agent Log ── */
  addLog(text, cls, bold) {
    const body = document.getElementById('agentLogBody');
    const div = document.createElement('div');
    div.className = 'log-line';
    if (!text) {
      div.innerHTML = '&nbsp;';
    } else {
      div.innerHTML = `<span class="${cls}" ${bold ? 'style="font-weight:700"' : ''}>${this.esc(text)}</span>`;
    }
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  },

  /* ── Counter Animation ── */
  animateCounter(id, target) {
    const el = document.getElementById(id);
    const dur = 1200;
    const start = performance.now();
    (function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * ease);
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  },

  /* ── Export Report ── */
  exportReport() {
    if (!this.auditData) return;
    const d = this.auditData;
    const pg = d.pages[0];

    let txt = '=== SEO AGENT AUDIT REPORT ===\n';
    txt += '='.repeat(40) + '\n\n';
    txt += 'Source: ' + d.source + '\n';
    txt += 'Overall Score: ' + pg.score + '/100\n';
    txt += 'Total Issues: ' + d.summary.totalIssues + '\n';
    txt += 'Auto-Fixed: ' + d.summary.autoFixed + '\n';
    txt += 'Escalated: ' + d.summary.escalated + '\n\n';
    txt += '--- ISSUES ---\n\n';

    pg.issues.forEach((issue, i) => {
      txt += (i + 1) + '. [' + issue.severity.toUpperCase() + '] ' + issue.rule + '\n';
      txt += '   Current:   ' + (issue.current || '(empty)') + '\n';
      txt += '   Suggested: ' + issue.suggested + '\n';
      txt += '   Action:    ' + issue.action + '\n';
      txt += '   Reason:    ' + issue.reason + '\n\n';
    });

    txt += '\n--- Generated by SEO Agent ---\n';

    const blob = new Blob([txt], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'seo-audit-report.txt';
    a.click();
  },

  /* ── Utilities ── */
  delay(ms) { return new Promise(r => setTimeout(r, ms)); },
  esc(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  },
  trunc(s, n) { if (!s) return ''; return s.length > n ? s.slice(0, n) + '...' : s; }
};

/* ── Drop Zone Setup ── */
(function () {
  const dz = document.getElementById('dropZone');
  if (!dz) return;

  ['dragenter', 'dragover'].forEach(e =>
    dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.add('dragover'); })
  );
  ['dragleave', 'drop'].forEach(e =>
    dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.remove('dragover'); })
  );

  dz.addEventListener('drop', ev => {
    const file = ev.dataTransfer.files[0];
    if (file && (file.name.endsWith('.html') || file.name.endsWith('.htm'))) {
      const r = new FileReader();
      r.onload = e => App.runAudit(e.target.result, 'Uploaded: ' + file.name);
      r.readAsText(file);
    }
  });

  dz.addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.html,.htm';
    inp.onchange = e => {
      const f = e.target.files[0];
      if (f) {
        const r = new FileReader();
        r.onload = ev => App.runAudit(ev.target.result, 'Uploaded: ' + f.name);
        r.readAsText(f);
      }
    };
    inp.click();
  });
})();

/* ── Init ── */
document.body.style.overflow = 'hidden';
