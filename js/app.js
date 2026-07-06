/* =============================================================================
   Partner Scale LATAM — app logic
   -----------------------------------------------------------------------------
   Tabs: Overview · Partners · Forecast · Accuracy · Admin
   Source of truth = localStorage (deals captured in Forecast, partners in
   Partners, monthly targets in Accuracy, catalogs/backups in Admin).

   Routes (hash):
     #/overview   #/territory/CODE   #/country/CODE   #/deals/q
     #/partners   #/partner/ID
     #/forecast   #/accuracy   #/admin
============================================================================= */

/* Fixed "today" so quarter/time windows in the demo are stable.
   Switch to new Date() when the forecast is live. (Backups use the real clock.) */
const TODAY = new Date(2026, 6, 6); // 2026-07-06 (month 0-indexed: 6 = July)

/* ---- Deal stages (close probability) ------------------------------------- */
const STAGES = [
  { key: 'Discovery',  label: 'Discovery',  weight: 0.20, committed: false, won: false, lost: false },
  { key: 'Demo - POC', label: 'Demo · POC', weight: 0.40, committed: false, won: false, lost: false },
  { key: 'Proposal',   label: 'Proposal',   weight: 0.70, committed: true,  won: false, lost: false },
  { key: 'Won',        label: 'Won',        weight: 1.00, committed: true,  won: true,  lost: false },
  { key: 'Lost',       label: 'Lost',       weight: 0.00, committed: false, won: false, lost: true  },
  { key: 'Declined',   label: 'Declined',   weight: 0.00, committed: false, won: false, lost: true  },
];
const STAGE_MAP = STAGES.reduce((m, s) => { m[s.key] = s; return m; }, {});
const stageCls = (k) => 'st-' + String(k).replace(/[^A-Za-z]/g, '');

/* ---- Helpers -------------------------------------------------------------- */
const app = () => document.getElementById('app');
const tabbar = () => document.getElementById('tabbar');
const clone = (o) => JSON.parse(JSON.stringify(o));

const fmtUSD = (n) => '$' + Math.round(n).toLocaleString('en-US');
const fmtUSDshort = (n) => {
  const a = Math.abs(n);
  if (a >= 1e6) return '$' + (n / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
  if (a >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + Math.round(n);
};
const dateOf = (iso) => new Date(iso + 'T00:00:00');
const fmtDate = (iso) => dateOf(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
const monthKey = (iso) => iso.slice(0, 7);
const fmtMonth = (key) => new Date(key + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

/* ---- Time windows (CALENDAR year) ---------------------------------------- */
const Y0 = TODAY.getFullYear();
const QI = Math.floor(TODAY.getMonth() / 3);
const WIN = {
  q:    { from: new Date(Y0, QI * 3, 1),     to: new Date(Y0, QI * 3 + 3, 0), label: 'Q' + (QI + 1) + ' ' + Y0, short: 'Q' + (QI + 1) },
  rest: { from: new Date(Y0, QI * 3 + 3, 1), to: new Date(Y0, 11, 31),        label: 'Rest of ' + Y0 },
  next: { from: new Date(Y0 + 1, 0, 1),      to: new Date(Y0 + 1, 11, 31),    label: '' + (Y0 + 1) },
};
const inWin = (deal, w) => { const t = dateOf(deal.close); return t >= w.from && t <= w.to; };

/* ---- Store (localStorage) ------------------------------------------------- */
const STORE_KEY = 'psl:data:v4';   // v4: deal.actual + locked monthly forecast (locks)
const BK_KEY    = 'psl:backups:v4';
let STORE = { partners: [], deals: [], config: {}, locks: {} };
const CUR_KEY = Y0 + '-' + String(TODAY.getMonth() + 1).padStart(2, '0');   // current month key
let partnerById = {}, dealsByPartner = {}, countryByCode = {}, territoryByCode = {};

COUNTRIES.forEach(c => countryByCode[c.code] = c);
TERRITORIES.forEach(t => territoryByCode[t.code] = t);

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { STORE = normalize(JSON.parse(raw)); reindex(); return; }
  } catch (e) { /* corrupt -> reseed */ }
  seedStore();
}
function normalize(s) {                         // fill any missing top-level pieces
  s.partners = s.partners || []; s.deals = s.deals || [];
  s.config = Object.assign(clone(SEED_CONFIG), s.config || {});
  s.locks = s.locks || {};
  s.partners.forEach(p => { p.contacts = p.contacts || []; });
  return s;
}
function seedStore() {
  STORE = normalize({
    partners: clone(SEED_PARTNERS), deals: clone(SEED_DEALS),
    config: clone(SEED_CONFIG), locks: clone(SEED_LOCKS),
  });
  saveStore('seed');
}
function saveStore(reason) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(STORE)); } catch (e) {}
  snapshot(reason || 'edit');
  reindex();
}
function reindex() {
  partnerById = {}; dealsByPartner = {};
  STORE.partners.forEach(p => { p.country = countryByCode[p.countryCode]; partnerById[p.id] = p; });
  STORE.deals.forEach(d => { (dealsByPartner[d.partnerId] = dealsByPartner[d.partnerId] || []).push(d); });
}
const partnerDeals = (id) => dealsByPartner[id] || [];
const partnersInCountry   = (code) => STORE.partners.filter(p => p.countryCode === code);
const partnersInTerritory = (code) => STORE.partners.filter(p => (countryByCode[p.countryCode] || {}).territory === code);
const countriesInTerritory = (code) => COUNTRIES.filter(c => c.territory === code);

/* ---- Backups (rolling snapshots in localStorage) ------------------------- */
function loadBackups() { try { return JSON.parse(localStorage.getItem(BK_KEY)) || []; } catch (e) { return []; } }
function saveBackups(a) { try { localStorage.setItem(BK_KEY, JSON.stringify(a)); } catch (e) {} }
function snapshot(reason) {
  const list = loadBackups();
  const payload = JSON.stringify(STORE);
  if (list.length && list[list.length - 1].payload === payload) return;   // dedupe identical
  list.push({ ts: Date.now(), reason: reason, partners: STORE.partners.length, deals: STORE.deals.length, payload });
  while (list.length > 40) list.shift();
  saveBackups(list);
}
function restoreBackup(ts) {
  const b = loadBackups().find(x => x.ts === ts);
  if (!b) return;
  if (!confirm('Restore this backup? Current data will be replaced (a new snapshot is kept first).')) return;
  snapshot('pre-restore');
  STORE = normalize(JSON.parse(b.payload));
  saveStore('restore'); renderAdmin();
}

/* ---- Metrics -------------------------------------------------------------- */
function agg(deals) {
  const m = { count: deals.length, committedAmt: 0, committedCount: 0, weighted: 0,
              wonAmt: 0, openCount: 0, pipelineAmt: 0, total: 0,
              partners: new Set(), committedPartners: new Set() };
  deals.forEach(d => {
    const s = STAGE_MAP[d.stage] || STAGE_MAP.Discovery;
    m.total += d.amount; m.partners.add(d.partnerId);
    if (s.committed) { m.committedAmt += d.amount; m.committedCount++; m.committedPartners.add(d.partnerId); }
    if (!s.lost) m.weighted += d.amount * s.weight;
    if (s.won) m.wonAmt += d.amount;
    if (!s.won && !s.lost) { m.openCount++; m.pipelineAmt += d.amount; }
  });
  m.partnerCount = m.partners.size; m.committedPartnerCount = m.committedPartners.size;
  return m;
}
const winDeals = (deals, w) => deals.filter(d => inWin(d, w));

/* ---- Actual / forecast / lock helpers ------------------------------------ */
const dealActual = (d) => (d.actual != null && d.actual !== '') ? Number(d.actual) : d.amount;
/* live committed forecast (Proposal+Won) for a month, from the deals */
function committedForMonth(key) {
  return STORE.deals.filter(d => STAGE_MAP[d.stage].committed && monthKey(d.close) === key)
                    .reduce((s, d) => s + d.amount, 0);
}
/* what actually closed (Won) that month, using the real closed amount */
function actualForMonth(key) {
  return STORE.deals.filter(d => STAGE_MAP[d.stage].won && monthKey(d.close) === key)
                    .reduce((s, d) => s + dealActual(d), 0);
}
/* the forecast used for accuracy: locked value if locked, else live committed */
const monthForecast = (key) => STORE.locks[key] ? STORE.locks[key].amount : committedForMonth(key);
function lockMonth(key) {
  STORE.locks[key] = { amount: committedForMonth(key), at: new Date().toISOString().slice(0, 10) };
  saveStore('lock'); route();
}
function unlockMonth(key) {
  if (!confirm('Unlock ' + fmtMonth(key) + '? The forecast will follow your deals again until you re-lock.')) return;
  delete STORE.locks[key]; saveStore('unlock'); route();
}
/* partner (or any set of) forecast accuracy = Won actual ÷ decided (Won+Lost) value */
function accuracyOf(deals) {
  let forecast = 0, actual = 0;
  deals.forEach(d => { const s = STAGE_MAP[d.stage];
    if (s.won)  { forecast += d.amount; actual += dealActual(d); }
    if (s.lost && d.stage === 'Lost') forecast += d.amount;   // Declined = disqualified, excluded
  });
  return { forecast, actual, acc: forecast > 0 ? actual / forecast : null };
}

/* ---- Small UI components -------------------------------------------------- */
const initials = (name) => name.replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

function kpi(o) {
  return `<div class="kpi${o.primary ? ' primary' : ''}${o.onclick ? ' clickable' : ''}"${o.onclick ? ` onclick="${o.onclick}"` : ''}>
    <div class="label">${o.label}</div><div class="value">${o.value}</div>
    ${o.foot ? `<div class="foot">${o.foot}</div>` : ''}${o.onclick ? '<div class="foot link">View deals →</div>' : ''}
  </div>`;
}
const stageBadge = (k) => `<span class="badge ${stageCls(k)}">${(STAGE_MAP[k] || { label: k }).label}</span>`;
const healthCls = (h) => h === 'Outperforming' ? 'health-out' : h === 'At Risk' ? 'health-risk' : 'health-ok';

function hbarChart(pairs) {
  const max = Math.max(1, ...pairs.map(p => p[1]));
  return pairs.map(([label, val]) => `
    <div class="hbar-row"><div class="hb-label" title="${esc(label)}">${esc(label)}</div>
      <div class="hbar-track"><span style="width:${(val / max * 100).toFixed(1)}%"></span></div>
      <div class="hb-val">${fmtUSDshort(val)}</div></div>`).join('');
}

/* ---- Tabs ----------------------------------------------------------------- */
const TABS = [
  { id: 'overview', label: 'Overview', hash: '#/overview' },
  { id: 'partners', label: 'Partners', hash: '#/partners' },
  { id: 'forecast', label: 'Forecast', hash: '#/forecast' },
  { id: 'accuracy', label: 'Accuracy', hash: '#/accuracy' },
  { id: 'admin',    label: 'Admin',    hash: '#/admin' },
];
function renderTabs(active) {
  tabbar().innerHTML = '<div class="tabbar-inner">' +
    TABS.map(t => `<a class="tab${t.id === active ? ' active' : ''}" href="${t.hash}">${t.label}</a>`).join('') + '</div>';
}

/* =============================================================================
   OVERVIEW
============================================================================= */
function renderOverview() {
  renderTabs('overview');
  const all = STORE.deals;
  const q = agg(winDeals(all, WIN.q)), rest = agg(winDeals(all, WIN.rest)), next = agg(winDeals(all, WIN.next));
  const cards = TERRITORIES.map(t => {
    const parts = partnersInTerritory(t.code);
    const tq = agg(winDeals(parts.flatMap(p => partnerDeals(p.id)), WIN.q));
    return { t, parts, tq };
  });

  app().innerHTML = `
    <h1 class="page-title">Overview <span class="tag-demo">DEMO DATA</span></h1>
    <p class="page-sub">LATAM partner forecast · Anchor month: <b>${TODAY.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</b> · Calendar quarter: <b>${WIN.q.label}</b></p>
    <div class="kpi-row">
      ${kpi({ label: 'Committed · ' + WIN.q.label, value: fmtUSDshort(q.committedAmt), foot: 'Proposal + Won', primary: true, onclick: "go('#/deals/q')" })}
      ${kpi({ label: 'Deals · ' + WIN.q.short, value: q.committedCount, foot: 'committed this quarter' })}
      ${kpi({ label: 'Partners in forecast · ' + WIN.q.short, value: q.committedPartnerCount, foot: 'of ' + STORE.partners.length + ' partners' })}
      ${kpi({ label: 'Weighted · ' + WIN.q.short, value: fmtUSDshort(q.weighted), foot: 'Σ amount × probability' })}
      ${kpi({ label: 'Committed · ' + WIN.rest.label, value: fmtUSDshort(rest.committedAmt), foot: 'Oct–Dec' })}
      ${kpi({ label: 'Committed · ' + WIN.next.label, value: fmtUSDshort(next.committedAmt), foot: 'next year' })}
    </div>
    <div class="section-head"><h2>Territories</h2><span class="page-sub" style="margin:0">Click a territory to drill down</span></div>
    <div class="grid">
      ${cards.map(({ t, parts, tq }) => `
        <div class="tile" onclick="go('#/territory/${t.code}')">
          <div class="tile-head"><div class="terr-badge">${t.code}</div>
            <div style="flex:1"><div class="tile-name">${esc(t.name)}</div>
              <div class="tile-meta">${parts.length} partners · ${countriesInTerritory(t.code).length} countries</div></div></div>
          <div class="tile-stats">
            <div class="stat"><div class="n">${fmtUSDshort(tq.committedAmt)}</div><div class="l">Committed ${WIN.q.short}</div></div>
            <div class="stat"><div class="n">${tq.committedPartnerCount}</div><div class="l">Fcst partners</div></div>
            <div class="stat"><div class="n">${tq.committedCount}</div><div class="l">Deals</div></div></div>
        </div>`).join('')}
    </div>
    <div class="card card-pad" style="margin-top:24px"><h3>Committed by territory · ${WIN.q.label}</h3>
      ${hbarChart(cards.map(x => [x.t.name, x.tq.committedAmt]))}</div>`;
}

/* ---- Committed deals of the quarter (click on $) ------------------------- */
function renderDealsQ() {
  renderTabs('overview');
  const deals = winDeals(STORE.deals, WIN.q).filter(d => (STAGE_MAP[d.stage] || {}).committed);
  const m = agg(deals);
  app().innerHTML = `
    <div class="breadcrumb"><a onclick="go('#/overview')">Overview</a><span class="sep">›</span><span>Committed ${WIN.q.label}</span></div>
    <div class="btn-back" onclick="go('#/overview')">← Back to overview</div>
    <h1 class="page-title">Committed deals · ${WIN.q.label}</h1>
    <p class="page-sub">${m.committedCount} deals · ${m.committedPartnerCount} partners · ${fmtUSD(m.committedAmt)} committed</p>
    ${dealsTable(deals, { showPartner: true })}`;
  wireDealsTable();
}

/* ---- Territory -> countries ---------------------------------------------- */
function renderTerritory(code) {
  const t = territoryByCode[code]; if (!t) return go('#/overview');
  renderTabs('overview');
  const parts = partnersInTerritory(code);
  const deals = parts.flatMap(p => partnerDeals(p.id));
  const q = agg(winDeals(deals, WIN.q)), rest = agg(winDeals(deals, WIN.rest));
  const countries = countriesInTerritory(code);
  app().innerHTML = `
    <div class="breadcrumb"><a onclick="go('#/overview')">Overview</a><span class="sep">›</span><span>${esc(t.name)}</span></div>
    <div class="btn-back" onclick="go('#/overview')">← Back to territories</div>
    <h1 class="page-title"><span class="terr-badge lg">${t.code}</span> ${esc(t.name)}</h1>
    <p class="page-sub">${esc(t.desc)} · ${parts.length} partners · ${countries.length} countries</p>
    <div class="kpi-row">
      ${kpi({ label: 'Committed · ' + WIN.q.short, value: fmtUSDshort(q.committedAmt), foot: q.committedCount + ' deals', primary: true })}
      ${kpi({ label: 'Partners in forecast', value: q.committedPartnerCount, foot: 'of ' + parts.length })}
      ${kpi({ label: 'Committed · ' + WIN.rest.label, value: fmtUSDshort(rest.committedAmt), foot: 'Oct–Dec' })}
      ${kpi({ label: 'Weighted · ' + WIN.q.short, value: fmtUSDshort(q.weighted), foot: '' })}
    </div>
    <div class="section-head"><h2>Countries in ${esc(t.name)}</h2></div>
    <div class="grid">
      ${countries.map(c => {
        const cq = agg(winDeals(partnersInCountry(c.code).flatMap(p => partnerDeals(p.id)), WIN.q));
        return `<div class="tile" onclick="go('#/country/${c.code}')">
          <div class="tile-head"><div class="flag">${c.flag}</div>
            <div style="flex:1"><div class="tile-name">${c.name}</div>
              <div class="tile-meta">${partnersInCountry(c.code).length} partners</div></div></div>
          <div class="tile-stats">
            <div class="stat"><div class="n">${fmtUSDshort(cq.committedAmt)}</div><div class="l">Committed ${WIN.q.short}</div></div>
            <div class="stat"><div class="n">${cq.committedCount}</div><div class="l">Deals</div></div></div></div>`;
      }).join('')}
    </div>`;
}

/* ---- Country -> partners -------------------------------------------------- */
function renderCountry(code) {
  const c = countryByCode[code]; if (!c) return go('#/overview');
  renderTabs('overview');
  const t = territoryByCode[c.territory];
  const parts = partnersInCountry(code);
  app().innerHTML = `
    <div class="breadcrumb"><a onclick="go('#/overview')">Overview</a><span class="sep">›</span>
      <a onclick="go('#/territory/${t.code}')">${esc(t.name)}</a><span class="sep">›</span><span>${c.flag} ${c.name}</span></div>
    <div class="btn-back" onclick="go('#/territory/${t.code}')">← Back to ${esc(t.name)}</div>
    <h1 class="page-title">${c.flag} ${c.name}</h1>
    <p class="page-sub">${parts.length} partners · 3-month (${WIN.q.short}) and rest-of-year forecast</p>
    ${partnerTable(parts)}`;
}

/* reusable partner table (committed 3m / rest, weighted, deals) */
function partnerTable(parts) {
  if (!parts.length) return '<div class="card"><div class="empty">No partners here yet. Add them in the <b>Partners</b> tab.</div></div>';
  return `<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Partner</th><th>Country</th><th>Tier</th>
      <th class="num">Committed ${WIN.q.short}</th><th class="num">Committed rest ${Y0}</th>
      <th class="num">Accuracy</th><th class="num"># deals</th><th></th></tr></thead>
    <tbody>${parts.map(p => {
      const d = partnerDeals(p.id), q = agg(winDeals(d, WIN.q)), r = agg(winDeals(d, WIN.rest)), pa = accuracyOf(d);
      return `<tr class="row-link" onclick="go('#/partner/${p.id}')">
        <td><div class="cell-partner"><span class="avatar sm">${initials(p.name)}</span> <b>${esc(p.name)}</b></div></td>
        <td>${(p.country||{}).flag||''} ${(p.country||{}).name||''}</td>
        <td><span class="badge tier">${esc(p.tier)}</span></td>
        <td class="num"><b>${fmtUSD(q.committedAmt)}</b></td>
        <td class="num">${fmtUSD(r.committedAmt)}</td>
        <td class="num">${pa.acc == null ? '<span class="muted-sm">—</span>' : `<span class="acc ${pa.acc >= 0.95 ? 'good' : pa.acc >= 0.8 ? 'mid' : 'low'}">${Math.round(pa.acc * 100)}%</span>`}</td>
        <td class="num">${d.length}</td><td class="num">›</td></tr>`;
    }).join('')}</tbody></table></div></div>`;
}

/* =============================================================================
   PARTNERS module (by territory)
============================================================================= */
function renderPartnersModule() {
  renderTabs('partners');
  app().innerHTML = `
    <div class="section-head">
      <div><h1 class="page-title">Partners</h1><p class="page-sub" style="margin:0">All partners by territory · click one for full detail</p></div>
      <button class="btn primary" onclick="openPartnerForm()">＋ New partner</button>
    </div>
    ${TERRITORIES.map(t => {
      const parts = partnersInTerritory(t.code);
      return `<div class="section-head" style="margin-top:22px"><h2><span class="terr-badge sm-inline">${t.code}</span> ${esc(t.name)} <span class="count-chip">${parts.length}</span></h2></div>
        ${partnerTable(parts)}`;
    }).join('')}`;
}

/* =============================================================================
   PARTNER detail (deals + profile + contacts)
============================================================================= */
function renderPartner(id) {
  const p = partnerById[id]; if (!p) return go('#/partners');
  renderTabs('partners');
  const t = territoryByCode[p.country.territory];
  const deals = partnerDeals(id);
  const q = agg(winDeals(deals, WIN.q)), r = agg(winDeals(deals, WIN.rest)), n = agg(winDeals(deals, WIN.next)), m = agg(deals);
  const pa = accuracyOf(deals);
  const row = (label, val) => val ? `<div class="dl-row"><span class="dl-k">${label}</span><span class="dl-v">${esc(val)}</span></div>` : '';

  app().innerHTML = `
    <div class="breadcrumb"><a onclick="go('#/partners')">Partners</a><span class="sep">›</span>
      <a onclick="go('#/territory/${t.code}')">${esc(t.name)}</a><span class="sep">›</span>
      <a onclick="go('#/country/${p.countryCode}')">${p.country.flag} ${p.country.name}</a><span class="sep">›</span><span>${esc(p.name)}</span></div>
    <div class="btn-back" onclick="go('#/partners')">← Back to partners</div>

    <div class="section-head">
      <h1 class="page-title"><span class="avatar">${initials(p.name)}</span> ${esc(p.name)}</h1>
      <button class="btn ghost sm" onclick="openPartnerForm('${p.id}')">✎ Edit partner</button>
    </div>
    <p class="page-sub"><span class="badge tier">${esc(p.tier)}</span> · ${esc(p.type)} ·
      ${p.country.flag} ${p.country.name} · ${esc(t.name)}${p.health ? ` · <span class="health ${healthCls(p.health)}">● ${esc(p.health)}</span>` : ''}</p>

    <div class="kpi-row">
      ${kpi({ label: 'Committed · ' + WIN.q.label, value: fmtUSDshort(q.committedAmt), foot: q.committedCount + ' deals · 3 months', primary: true })}
      ${kpi({ label: 'Committed · ' + WIN.rest.label, value: fmtUSDshort(r.committedAmt), foot: r.committedCount + ' deals · rest of year' })}
      ${kpi({ label: 'Committed · ' + WIN.next.label, value: fmtUSDshort(n.committedAmt), foot: n.committedCount + ' deals' })}
      ${kpi({ label: 'Forecast accuracy', value: pa.acc == null ? '—' : Math.round(pa.acc * 100) + '%', foot: 'Won ' + fmtUSDshort(pa.actual) + ' ÷ decided ' + fmtUSDshort(pa.forecast) })}
      ${kpi({ label: 'Won (year)', value: fmtUSDshort(m.wonAmt), foot: '' })}
      ${kpi({ label: 'Open pipeline', value: fmtUSDshort(m.pipelineAmt), foot: m.openCount + ' deals' })}
    </div>

    <div class="two-col">
      <div class="card card-pad">
        <h3>Partner profile</h3>
        <div class="dl">
          ${row('Tier', p.tier)}${row('Type', p.type)}
          ${row('Partner since', p.since)}${row('Account owner', p.owner)}
          ${row('Industry', p.industry)}${row('HQ', p.location)}
          ${p.website ? `<div class="dl-row"><span class="dl-k">Website</span><span class="dl-v"><a class="lnk" href="https://${esc(p.website)}" target="_blank" rel="noopener">${esc(p.website)}</a></span></div>` : ''}
          ${row('Health', p.health)}
        </div>
        ${p.notes ? `<div class="notes"><span class="dl-k">Notes</span><p>${esc(p.notes)}</p></div>` : ''}
      </div>
      <div class="card card-pad">
        <div class="section-head" style="margin:0 0 12px"><h3 style="margin:0">Contacts</h3>
          <button class="btn ghost sm" onclick="openContactForm('${p.id}')">＋ Add</button></div>
        ${(p.contacts && p.contacts.length) ? p.contacts.map(ct => `
          <div class="contact">
            <div class="contact-main"><div class="contact-name">${esc(ct.name)}</div>
              <div class="contact-title">${esc(ct.title || '')}</div>
              <div class="contact-lines">
                ${ct.email ? `<a class="lnk" href="mailto:${esc(ct.email)}">${esc(ct.email)}</a>` : ''}
                ${ct.phone ? `<span class="muted-sm">${esc(ct.phone)}</span>` : ''}
              </div></div>
            <div class="nowrap">
              <button class="icon-btn" title="Edit" onclick="openContactForm('${p.id}','${ct.id}')">✎</button>
              <button class="icon-btn danger" title="Delete" onclick="deleteContact('${p.id}','${ct.id}')">🗑</button>
            </div></div>`).join('') : '<div class="empty" style="padding:18px">No contacts yet.</div>'}
      </div>
    </div>

    <div class="section-head" style="margin-top:6px">
      <h2>Deals · ${esc(p.name)}</h2>
      <button class="btn primary sm" onclick="openDealForm(null,'${p.id}')">＋ New deal</button>
    </div>
    <p class="page-sub" style="margin:-8px 0 12px">Click ✎ on a deal to record its real outcome (Won / Lost / Declined + closed amount).</p>
    ${dealsTable(deals, { showPartner: false, editable: true })}`;
  wireDealsTable();
}

/* =============================================================================
   Deals table (reusable)
============================================================================= */
let dealSort = { key: 'close', dir: 1 };
function dealsTable(deals, opts) {
  opts = opts || {};
  const showPartner = opts.showPartner, editable = opts.editable;
  if (!deals.length) return '<div class="card"><div class="empty">No deals. Add them in <b>Forecast</b>.</div></div>';
  const cols = [ showPartner ? { key: 'partner', label: 'Partner' } : null,
    { key: 'name', label: 'Deal' }, { key: 'product', label: 'Product' },
    { key: 'close', label: 'Close date' }, { key: 'amount', label: 'Forecast USD', num: true },
    { key: 'stage', label: 'Stage' }, { key: 'actual', label: 'Actual (real)', num: true } ].filter(Boolean);
  const rows = deals.slice().sort((a, b) => {
    let av, bv;
    if (dealSort.key === 'partner') { av = (partnerById[a.partnerId]||{}).name || ''; bv = (partnerById[b.partnerId]||{}).name || ''; }
    else if (dealSort.key === 'actual') { av = STAGE_MAP[a.stage].won ? dealActual(a) : -1; bv = STAGE_MAP[b.stage].won ? dealActual(b) : -1; }
    else { av = a[dealSort.key]; bv = b[dealSort.key]; }
    if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
    return (av < bv ? -1 : av > bv ? 1 : 0) * dealSort.dir;
  });
  const overdue = (d) => !STAGE_MAP[d.stage].won && !STAGE_MAP[d.stage].lost && dateOf(d.close) < TODAY;
  const actualCell = (d) => { const s = STAGE_MAP[d.stage];
    if (s.won) return `<b class="ok">${fmtUSD(dealActual(d))}</b>`;
    if (s.lost) return '<span class="muted-sm">$0</span>';
    return '<span class="muted-sm">pending</span>'; };
  return `<div class="card"><div class="table-wrap"><table id="dealsT">
    <thead><tr>${cols.map(c => `<th class="${c.num ? 'num' : ''}" data-k="${c.key}">${c.label} ${dealSort.key === c.key ? `<span class="arrow">${dealSort.dir > 0 ? '▲' : '▼'}</span>` : ''}</th>`).join('')}${editable ? '<th class="num">Edit</th>' : ''}</tr></thead>
    <tbody>${rows.map(d => `<tr>
        ${showPartner ? `<td><div class="cell-partner"><span class="avatar sm">${initials((partnerById[d.partnerId]||{}).name||'?')}</span> <a class="lnk" onclick="go('#/partner/${d.partnerId}')">${esc((partnerById[d.partnerId]||{}).name||'—')}</a></div></td>` : ''}
        <td class="deal-name">${esc(d.name)}${overdue(d) ? ' <span class="badge st-Lost" title="Past close date">overdue</span>' : ''}</td>
        <td>${esc(d.product)}</td><td>${fmtDate(d.close)}</td>
        <td class="num"><b>${fmtUSD(d.amount)}</b></td>
        <td>${stageBadge(d.stage)}</td>
        <td class="num">${actualCell(d)}</td>
        ${editable ? `<td class="num nowrap"><button class="icon-btn" title="Record outcome / edit" onclick="openDealForm('${d.id}')">✎</button></td>` : ''}</tr>`).join('')}</tbody></table></div></div>`;
}
function wireDealsTable() {
  const t = document.getElementById('dealsT'); if (!t) return;
  t.querySelectorAll('thead th[data-k]').forEach(th => th.onclick = () => {
    const k = th.dataset.k;
    if (dealSort.key === k) dealSort.dir *= -1; else { dealSort.key = k; dealSort.dir = 1; }
    route();
  });
}

/* =============================================================================
   FORECAST (deals only)
============================================================================= */
function renderForecast() {
  renderTabs('forecast');
  const deals = STORE.deals.slice().sort((a, b) => dateOf(a.close) - dateOf(b.close));
  const m = agg(STORE.deals);
  app().innerHTML = `
    <h1 class="page-title">Forecast <span class="tag-demo">MANUAL ENTRY</span></h1>
    <p class="page-sub">Capture your <b>deals</b> here — this feeds every other tab. Partners are managed in the <b>Partners</b> tab; backups in <b>Admin</b>.</p>
    <div class="kpi-row">
      ${kpi({ label: 'Total deals', value: STORE.deals.length, foot: fmtUSD(m.total) + ' total value' })}
      ${kpi({ label: 'Total committed', value: fmtUSDshort(m.committedAmt), foot: m.committedCount + ' deals', primary: true })}
      ${kpi({ label: 'Won (year)', value: fmtUSDshort(m.wonAmt), foot: '' })}
    </div>
    ${lockPanel()}
    <div class="toolbar"><button class="btn primary" onclick="openDealForm()">＋ New deal</button></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Partner</th><th>Deal</th><th>Product</th><th>Close date</th>
        <th class="num">Amount USD</th><th>Stage</th><th class="num">Actions</th></tr></thead>
      <tbody>${deals.length ? deals.map(d => { const p = partnerById[d.partnerId] || { name: '—' };
        return `<tr>
          <td><div class="cell-partner"><span class="avatar sm">${initials(p.name)}</span> ${esc(p.name)} <span class="muted-sm">${(p.country||{}).flag||''}</span></div></td>
          <td class="deal-name">${esc(d.name)}</td><td>${esc(d.product)}</td><td>${fmtDate(d.close)}</td>
          <td class="num"><b>${fmtUSD(d.amount)}</b></td><td>${stageBadge(d.stage)}</td>
          <td class="num nowrap"><button class="icon-btn" title="Edit" onclick="openDealForm('${d.id}')">✎</button>
            <button class="icon-btn danger" title="Delete" onclick="deleteDeal('${d.id}')">🗑</button></td></tr>`;
      }).join('') : '<tr><td class="empty" colspan="7">No deals yet. Create the first one with “＋ New deal”.</td></tr>'}
      </tbody></table></div></div>`;
}

/* =============================================================================
   ACCURACY (locked forecast vs actual, by month)
============================================================================= */
function lockPanel() {
  const live = committedForMonth(CUR_KEY), lk = STORE.locks[CUR_KEY];
  if (lk) {
    const drift = live - lk.amount;
    return `<div class="lock-panel locked">
      <div><div class="lp-title">🔒 ${fmtMonth(CUR_KEY)} forecast locked</div>
        <div class="lp-sub">${fmtUSD(lk.amount)} committed · locked ${lk.at} · sent to Accuracy${drift ? ` · deals now sum ${fmtUSD(live)} (${drift > 0 ? '+' : ''}${fmtUSD(drift)})` : ''}</div></div>
      <button class="btn ghost sm" onclick="unlockMonth('${CUR_KEY}')">Unlock</button></div>`;
  }
  return `<div class="lock-panel">
    <div><div class="lp-title">${fmtMonth(CUR_KEY)} forecast: <b>${fmtUSD(live)}</b> committed</div>
      <div class="lp-sub">Lock it to freeze this month's number into Accuracy for end-of-month comparison.</div></div>
    <button class="btn primary sm" onclick="lockMonth('${CUR_KEY}')">🔒 Lock month → Accuracy</button></div>`;
}
function renderAccuracy() {
  renderTabs('accuracy');
  const rows = [];
  for (let mo = 0; mo < 12; mo++) {
    const key = Y0 + '-' + String(mo + 1).padStart(2, '0');
    const forecast = monthForecast(key), actual = actualForMonth(key);
    const locked = !!STORE.locks[key];
    const isPast = new Date(Y0, mo + 1, 0) <= TODAY;
    rows.push({ key, mo, forecast, actual, locked, isPast, acc: forecast > 0 ? actual / forecast : null });
  }
  const past = rows.filter(r => r.isPast && r.forecast > 0);
  const totF = past.reduce((s, r) => s + r.forecast, 0), totA = past.reduce((s, r) => s + r.actual, 0);
  const overall = totF > 0 ? totA / totF : null;

  app().innerHTML = `
    <h1 class="page-title">Forecast accuracy <span class="tag-demo">${Y0}</span></h1>
    <p class="page-sub">Locked forecast (from your committed deals) vs. actual closed (Won) by month.
      Lock a month in <b>Forecast</b>; record real outcomes on each deal (Won + closed amount) and they flow here.</p>
    <div class="kpi-row">
      ${kpi({ label: 'Overall accuracy · YTD', value: overall == null ? '—' : Math.round(overall * 100) + '%', foot: 'actual ÷ locked forecast', primary: true })}
      ${kpi({ label: 'Forecast · YTD', value: fmtUSDshort(totF), foot: past.length + ' closed months' })}
      ${kpi({ label: 'Actual · YTD', value: fmtUSDshort(totA), foot: 'Won to date' })}
    </div>
    <div class="card card-pad"><h3>Forecast vs Actual · ${Y0}</h3>
      <div class="legend"><span class="lg-box lg-f"></span> Forecast <span class="lg-box lg-a"></span> Actual</div>
      ${accuracyChart(rows)}</div>
    <div class="section-head" style="margin-top:22px"><h2>Monthly detail</h2></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Month</th><th class="num">Forecast</th><th>Status</th><th class="num">Actual (Won)</th>
        <th class="num">Accuracy</th><th class="num">Variance</th></tr></thead>
      <tbody>${rows.map(r => `<tr${r.mo === TODAY.getMonth() ? ' class="hl"' : ''}>
        <td><b>${fmtMonth(r.key)}</b></td>
        <td class="num">${r.forecast ? fmtUSD(r.forecast) : '—'}</td>
        <td>${r.locked
              ? `<span class="lock-tag">🔒 locked</span> <button class="icon-btn" title="Unlock" onclick="unlockMonth('${r.key}')">✎</button>`
              : (r.forecast ? `<button class="btn ghost sm" onclick="lockMonth('${r.key}')">Lock</button>` : '<span class="muted-sm">—</span>')}</td>
        <td class="num">${fmtUSD(r.actual)}</td>
        <td class="num">${r.acc == null ? '—' : `<span class="acc ${r.acc >= 0.95 ? 'good' : r.acc >= 0.8 ? 'mid' : 'low'}">${Math.round(r.acc * 100)}%</span>`}</td>
        <td class="num">${r.forecast ? fmtUSD(r.actual - r.forecast) : '—'}</td></tr>`).join('')}
      </tbody></table></div></div>
    <p class="footer-note">Forecast = locked committed deals (or live until you lock). Actual = Won deals' real closed amount that month.</p>`;
}
function accuracyChart(rows) {
  const max = Math.max(1, ...rows.flatMap(r => [r.forecast, r.actual]));
  const W = 720, H = 190, padB = 26, padT = 8, gap = 8;
  const groupW = (W - gap) / rows.length, barW = (groupW - gap) / 2 - 2;
  const scale = (v) => (v / max) * (H - padT - padB);
  const bars = rows.map((r, i) => {
    const x = gap + i * groupW;
    const fH = scale(r.forecast), aH = scale(r.actual);
    return `
      <rect x="${x + 2}" y="${H - padB - fH}" width="${barW}" height="${fH}" rx="2" fill="#9cc3e6"></rect>
      <rect x="${x + 2 + barW + 2}" y="${H - padB - aH}" width="${barW}" height="${aH}" rx="2" fill="#032d60"></rect>
      <text x="${x + groupW / 2}" y="${H - 9}" text-anchor="middle" font-size="10" fill="#6b7a8d">${fmtMonth(r.key).split(' ')[0]}</text>`;
  }).join('');
  return `<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" role="img">${bars}</svg></div>`;
}

/* =============================================================================
   ADMIN (catalogs + backups + danger zone)
============================================================================= */
function renderAdmin() {
  renderTabs('admin');
  const backups = loadBackups().slice().reverse();
  const catalog = (kind, title, note) => {
    const items = STORE.config[kind] || [];
    return `<div class="card card-pad admin-cat"><h3>${title}</h3>
      ${note ? `<p class="cat-note">${note}</p>` : ''}
      <div class="chip-list">${items.map((it, i) => `
        <div class="chip"><input class="chip-in" value="${esc(it)}" onchange="catalogRename('${kind}',${i},this.value)">
          <button class="icon-btn danger" title="Delete" onclick="catalogDelete('${kind}',${i})">✕</button></div>`).join('')}
      </div>
      <div class="cat-add"><input id="add_${kind}" placeholder="Add ${title.toLowerCase()}…" onkeydown="if(event.key==='Enter')catalogAdd('${kind}')">
        <button class="btn sm" onclick="catalogAdd('${kind}')">Add</button></div></div>`;
  };
  app().innerHTML = `
    <h1 class="page-title">Admin</h1>
    <p class="page-sub">Manage catalogs, back up your data, and reset. No data leaves this browser unless you export it.</p>

    <div class="section-head"><h2>Catalogs</h2></div>
    <div class="two-col">
      ${catalog('tiers', 'Tiers', 'Rename freely (e.g. Tier 1 / Tier 2). Renaming updates every partner using that tier.')}
      ${catalog('health', 'Health statuses', '')}
    </div>
    <div class="two-col" style="margin-top:14px">
      ${catalog('products', 'Products', '')}
      ${catalog('types', 'Partner types', '')}
    </div>

    <div class="section-head" style="margin-top:24px"><h2>Backups</h2></div>
    <div class="card card-pad">
      <p class="cat-note">Automatic snapshots are kept in this browser on every change (last 40). Use <b>Export JSON</b> for an off-device copy you can keep forever, and <b>Import JSON</b> to restore it anywhere.</p>
      <div class="toolbar">
        <button class="btn" onclick="manualSnapshot()">＋ Snapshot now</button>
        <button class="btn primary" onclick="exportJSON()">↓ Export JSON</button>
        <button class="btn" onclick="document.getElementById('importFile').click()">↑ Import JSON</button>
        <input type="file" id="importFile" accept="application/json" style="display:none" onchange="importJSON(this)">
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>When</th><th>Reason</th><th class="num">Partners</th><th class="num">Deals</th><th class="num">Restore</th></tr></thead>
        <tbody>${backups.length ? backups.map(b => `<tr>
          <td>${new Date(b.ts).toLocaleString('en-US')}</td><td><span class="muted-sm">${esc(b.reason||'')}</span></td>
          <td class="num">${b.partners}</td><td class="num">${b.deals}</td>
          <td class="num"><button class="btn ghost sm" onclick="restoreBackup(${b.ts})">Restore</button></td></tr>`).join('')
          : '<tr><td class="empty" colspan="5">No snapshots yet.</td></tr>'}
        </tbody></table></div>
    </div>

    <div class="section-head" style="margin-top:24px"><h2 class="danger-h">Danger zone</h2></div>
    <div class="card card-pad">
      <p class="cat-note">Replace everything with the built-in sample data. A snapshot is saved first so you can undo.</p>
      <button class="btn ghost danger" onclick="resetSample()">↺ Reset to sample data</button>
    </div>`;
}
function catalogRename(kind, i, val) {
  val = val.trim(); if (!val) return renderAdmin();
  const old = STORE.config[kind][i];
  STORE.config[kind][i] = val;
  if (kind === 'tiers') STORE.partners.forEach(p => { if (p.tier === old) p.tier = val; });
  if (kind === 'types') STORE.partners.forEach(p => { if (p.type === old) p.type = val; });
  if (kind === 'health') STORE.partners.forEach(p => { if (p.health === old) p.health = val; });
  if (kind === 'products') STORE.deals.forEach(d => { if (d.product === old) d.product = val; });
  saveStore('catalog'); renderAdmin();
}
function catalogDelete(kind, i) {
  const val = STORE.config[kind][i];
  let used = 0;
  if (kind === 'tiers') used = STORE.partners.filter(p => p.tier === val).length;
  if (kind === 'types') used = STORE.partners.filter(p => p.type === val).length;
  if (kind === 'products') used = STORE.deals.filter(d => d.product === val).length;
  if (used && !confirm(`“${val}” is used by ${used} record(s). Delete it from the catalog anyway? (existing records keep the value)`)) return;
  STORE.config[kind].splice(i, 1); saveStore('catalog'); renderAdmin();
}
function catalogAdd(kind) {
  const el = document.getElementById('add_' + kind); const val = (el.value || '').trim();
  if (!val) return; if (STORE.config[kind].indexOf(val) >= 0) { alert('Already exists.'); return; }
  STORE.config[kind].push(val); saveStore('catalog'); renderAdmin();
}
function manualSnapshot() { snapshot('manual'); renderAdmin(); }

/* =============================================================================
   Forms (overlay)
============================================================================= */
function closeOverlay() { const o = document.getElementById('overlay'); if (o) o.remove(); }
function overlay(title, bodyHTML, onSave) {
  closeOverlay();
  const div = document.createElement('div');
  div.id = 'overlay'; div.className = 'overlay';
  div.innerHTML = `<div class="panel"><div class="panel-head"><h3>${esc(title)}</h3><button class="icon-btn" onclick="closeOverlay()">✕</button></div>
    <div class="panel-body">${bodyHTML}</div>
    <div class="panel-foot"><button class="btn ghost" onclick="closeOverlay()">Cancel</button><button class="btn primary" id="ovSave">Save</button></div></div>`;
  div.addEventListener('click', (e) => { if (e.target === div) closeOverlay(); });
  document.body.appendChild(div);
  document.getElementById('ovSave').onclick = onSave;
}
const val = (id) => (document.getElementById(id).value || '').trim();
function field(label, inner) { return `<label class="fld"><span>${label}</span>${inner}</label>`; }
function selectHTML(id, options, selected) {
  return `<select id="${id}">${options.map(o => { const v = typeof o === 'string' ? o : o.v, l = typeof o === 'string' ? o : o.l;
    return `<option value="${esc(v)}"${v === selected ? ' selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
}

function openDealForm(id, prefillPartner) {
  const d = id ? STORE.deals.find(x => x.id === id) : null;
  if (!STORE.partners.length) { alert('Create a partner first (Partners tab).'); return; }
  const pOpts = STORE.partners.map(p => ({ v: p.id, l: p.name + ' · ' + ((countryByCode[p.countryCode]||{}).name||'') }));
  const body = `
    ${field('Partner', selectHTML('f_partner', pOpts, d ? d.partnerId : (prefillPartner || STORE.partners[0].id)))}
    ${field('Deal name', `<input id="f_name" type="text" value="${d ? esc(d.name) : ''}" placeholder="e.g. Sales Cloud rollout">`)}
    ${field('Product', selectHTML('f_product', STORE.config.products, d ? d.product : STORE.config.products[0]))}
    <div class="fld-row">${field('Forecast amount USD', `<input id="f_amount" type="number" min="0" step="1000" value="${d ? d.amount : ''}" placeholder="0">`)}
      ${field('Close date', `<input id="f_close" type="date" value="${d ? d.close : ''}">`)}</div>
    <div class="fld-row">${field('Stage', selectHTML('f_stage', STAGES.map(s => ({ v: s.key, l: s.label + ' (' + Math.round(s.weight*100) + '%)' })), d ? d.stage : 'Discovery'))}
      ${field('Created date', `<input id="f_created" type="date" value="${d ? d.created : TODAY.toISOString().slice(0,10)}">`)}</div>
    <div class="fld-hint">Set the stage to <b>Won</b> when it closes, then enter the real amount below (or <b>Lost / Declined</b> if it didn't).</div>
    ${field('Actual closed USD (only if Won)', `<input id="f_actual" type="number" min="0" step="1000" value="${d && d.actual != null && d.actual !== '' ? d.actual : ''}" placeholder="defaults to forecast amount">`)}`;
  overlay(id ? 'Edit deal' : 'New deal', body, () => {
    const name = val('f_name'), amount = parseFloat(val('f_amount')), close = val('f_close');
    if (!name) return alert('Enter the deal name.');
    if (!(amount >= 0)) return alert('Enter a valid amount.');
    if (!close) return alert('Choose the close date.');
    const actualStr = val('f_actual');
    const rec = { partnerId: val('f_partner'), name, product: val('f_product'), amount, close,
                  created: val('f_created') || close, stage: val('f_stage'),
                  actual: actualStr === '' ? '' : parseFloat(actualStr) };
    if (d) Object.assign(d, rec); else STORE.deals.push(Object.assign({ id: 'd' + Date.now() }, rec));
    saveStore('deal'); closeOverlay(); route();
  });
}

function openPartnerForm(id) {
  const p = id ? STORE.partners.find(x => x.id === id) : null;
  const cOpts = COUNTRIES.map(c => ({ v: c.code, l: c.flag + ' ' + c.name + ' · ' + c.territory }));
  const body = `
    ${field('Partner name', `<input id="f_pname" type="text" value="${p ? esc(p.name) : ''}" placeholder="e.g. Acme Consulting">`)}
    ${field('Country', selectHTML('f_country', cOpts, p ? p.countryCode : COUNTRIES[0].code))}
    <div class="fld-row">${field('Tier', selectHTML('f_tier', STORE.config.tiers, p ? p.tier : STORE.config.tiers[0]))}
      ${field('Type', selectHTML('f_type', STORE.config.types, p ? p.type : STORE.config.types[0]))}</div>
    <div class="fld-row">${field('Partner since (year)', `<input id="f_since" type="number" min="1990" max="2100" value="${p && p.since ? p.since : ''}" placeholder="2020">`)}
      ${field('Health', selectHTML('f_health', STORE.config.health, p ? p.health : STORE.config.health[1]))}</div>
    ${field('Account owner', `<input id="f_owner" type="text" value="${p ? esc(p.owner||'') : ''}" placeholder="Relationship owner">`)}
    <div class="fld-row">${field('Industry', `<input id="f_industry" type="text" value="${p ? esc(p.industry||'') : ''}" placeholder="e.g. Banking">`)}
      ${field('HQ / location', `<input id="f_location" type="text" value="${p ? esc(p.location||'') : ''}" placeholder="City, Country">`)}</div>
    ${field('Website', `<input id="f_website" type="text" value="${p ? esc(p.website||'') : ''}" placeholder="partner.com">`)}
    ${field('Notes', `<textarea id="f_notes" rows="2" placeholder="Anything relevant…">${p ? esc(p.notes||'') : ''}</textarea>`)}`;
  overlay(id ? 'Edit partner' : 'New partner', body, () => {
    const name = val('f_pname'); if (!name) return alert('Enter the partner name.');
    const rec = { name, countryCode: val('f_country'), tier: val('f_tier'), type: val('f_type'),
      since: val('f_since') ? parseInt(val('f_since'), 10) : '', owner: val('f_owner'), health: val('f_health'),
      industry: val('f_industry'), location: val('f_location'), website: val('f_website'), notes: val('f_notes') };
    if (p) Object.assign(p, rec);
    else STORE.partners.push(Object.assign({ id: 'p' + Date.now(), contacts: [] }, rec));
    saveStore('partner'); closeOverlay();
    if (p) renderPartner(p.id); else renderPartnersModule();
  });
}

function openContactForm(partnerId, contactId) {
  const p = partnerById[partnerId]; if (!p) return;
  const ct = contactId ? (p.contacts || []).find(x => x.id === contactId) : null;
  const body = `
    ${field('Name', `<input id="c_name" type="text" value="${ct ? esc(ct.name) : ''}" placeholder="Full name">`)}
    ${field('Title / role', `<input id="c_title" type="text" value="${ct ? esc(ct.title||'') : ''}" placeholder="e.g. Alliance Director">`)}
    <div class="fld-row">${field('Email', `<input id="c_email" type="email" value="${ct ? esc(ct.email||'') : ''}" placeholder="name@partner.com">`)}
      ${field('Phone', `<input id="c_phone" type="text" value="${ct ? esc(ct.phone||'') : ''}" placeholder="+00 000 000">`)}</div>`;
  overlay(contactId ? 'Edit contact' : 'Add contact', body, () => {
    const name = val('c_name'); if (!name) return alert('Enter the contact name.');
    const rec = { name, title: val('c_title'), email: val('c_email'), phone: val('c_phone') };
    p.contacts = p.contacts || [];
    if (ct) Object.assign(ct, rec); else p.contacts.push(Object.assign({ id: 'c' + Date.now() }, rec));
    saveStore('contact'); closeOverlay(); renderPartner(partnerId);
  });
}
function deleteContact(partnerId, contactId) {
  const p = partnerById[partnerId]; if (!p) return;
  const ct = (p.contacts || []).find(x => x.id === contactId);
  if (!ct || !confirm('Delete contact “' + ct.name + '”?')) return;
  p.contacts = p.contacts.filter(x => x.id !== contactId);
  saveStore('contact'); renderPartner(partnerId);
}

function deleteDeal(id) {
  const d = STORE.deals.find(x => x.id === id); if (!d) return;
  if (!confirm('Delete deal “' + d.name + '”?')) return;
  STORE.deals = STORE.deals.filter(x => x.id !== id); saveStore('deal'); route();
}
function resetSample() {
  if (!confirm('This replaces ALL your data with the sample. A snapshot is saved first. Continue?')) return;
  snapshot('pre-reset'); seedStore(); renderAdmin();
}

/* ---- Export / Import ------------------------------------------------------ */
function exportJSON() {
  const blob = new Blob([JSON.stringify(STORE, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = 'partner-scale-latam-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function importJSON(input) {
  const file = input.files && input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.partners) || !Array.isArray(data.deals)) throw new Error('Invalid format');
      if (!confirm('Replace current data with the imported file (' + data.partners.length + ' partners, ' + data.deals.length + ' deals)? A snapshot is saved first.')) return;
      snapshot('pre-import'); STORE = normalize(data); saveStore('import'); renderAdmin();
    } catch (e) { alert('Could not import: ' + e.message); }
    input.value = '';
  };
  reader.readAsText(file);
}

/* =============================================================================
   Router
============================================================================= */
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
function route() {
  const parts = (location.hash || '#/overview').replace(/^#\//, '').split('/').filter(Boolean);
  window.scrollTo(0, 0);
  switch (parts[0]) {
    case 'partners':  return renderPartnersModule();
    case 'partner':   return parts[1] ? renderPartner(parts[1]) : renderPartnersModule();
    case 'forecast':  return renderForecast();
    case 'accuracy':  return renderAccuracy();
    case 'admin':     return renderAdmin();
    case 'territory': return parts[1] ? renderTerritory(parts[1]) : renderOverview();
    case 'country':   return parts[1] ? renderCountry(parts[1]) : renderOverview();
    case 'deals':     return renderDealsQ();
    default:          return renderOverview();
  }
}

loadStore();
window.addEventListener('hashchange', route);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', route);
else route();
