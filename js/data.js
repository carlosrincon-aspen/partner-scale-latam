/* =============================================================================
   Partner Scale LATAM — Catalogs + SEED data (demo)
   -----------------------------------------------------------------------------
   IMPORTANT: this is only the INITIAL sample data. The app copies it to
   localStorage on first load; from then on the real source of truth is what the
   user captures in the app (deals in Forecast, partners in Partners). See app.js.

   Everything below is FICTITIOUS on purpose ("Partner 1"…).
============================================================================= */

/* ---- Territories (Salesforce LATAM commercial model) --------------------- */
const TERRITORIES = [
  { code: 'BRA',  name: 'Brazil',                    desc: 'Independent business unit (Portuguese market)' },
  { code: 'MEX',  name: 'Mexico',                     desc: 'Largest growth & investment market' },
  { code: 'NOLA', name: 'North America & Caribbean',  desc: 'Central America & the Caribbean' },
  { code: 'SOLA', name: 'South America (SOLA)',       desc: 'Southern Cone & Andean region' },
];

/* ---- Countries (each belongs to a territory) ----------------------------- */
const COUNTRIES = [
  { code: 'BR', name: 'Brazil',             flag: '🇧🇷', territory: 'BRA'  },
  { code: 'MX', name: 'Mexico',             flag: '🇲🇽', territory: 'MEX'  },
  { code: 'CR', name: 'Costa Rica',         flag: '🇨🇷', territory: 'NOLA' },
  { code: 'PA', name: 'Panama',             flag: '🇵🇦', territory: 'NOLA' },
  { code: 'GT', name: 'Guatemala',          flag: '🇬🇹', territory: 'NOLA' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴', territory: 'NOLA' },
  { code: 'CO', name: 'Colombia',           flag: '🇨🇴', territory: 'SOLA' },
  { code: 'CL', name: 'Chile',              flag: '🇨🇱', territory: 'SOLA' },
  { code: 'AR', name: 'Argentina',          flag: '🇦🇷', territory: 'SOLA' },
  { code: 'PE', name: 'Peru',               flag: '🇵🇪', territory: 'SOLA' },
];

/* ---- Editable catalogs (seed for STORE.config; managed in Admin) --------- */
const SEED_CONFIG = {
  tiers:    ['Summit', 'Crest', 'Ridge', 'Base'],   // rename freely in Admin (e.g. Tier 1/2/3)
  types:    ['SI', 'ISV', 'Reseller'],
  products: ['Sales Cloud', 'Service Cloud', 'Marketing Cloud', 'Data Cloud',
             'Commerce Cloud', 'Platform', 'Tableau', 'MuleSoft', 'Slack'],
  health:   ['Outperforming', 'On Track', 'At Risk'],
};

/* ---- SEED partners (fictitious, with profile + contacts) ----------------- */
const SEED_PARTNERS = [
  { id: 'p1',  name: 'Partner 1',  countryCode: 'BR', tier: 'Summit', type: 'SI',
    since: 2016, owner: 'Ana Souza', industry: 'Banking', location: 'São Paulo, BR', website: 'partner1.example.com',
    health: 'Outperforming', notes: 'Strategic account. Strong Data Cloud practice.',
    contacts: [ { id: 'c1', name: 'Marcos Lima',  title: 'Alliance Director', email: 'marcos@partner1.example.com', phone: '+55 11 5555-0101' },
                { id: 'c2', name: 'Julia Reis',   title: 'Practice Lead',     email: 'julia@partner1.example.com',  phone: '+55 11 5555-0102' } ] },
  { id: 'p2',  name: 'Partner 2',  countryCode: 'BR', tier: 'Crest',  type: 'SI',
    since: 2019, owner: 'Ana Souza', industry: 'Retail', location: 'Rio de Janeiro, BR', website: '',
    health: 'On Track', notes: '', contacts: [ { id: 'c3', name: 'Pedro Alves', title: 'Sales Manager', email: 'pedro@partner2.example.com', phone: '+55 21 5555-0201' } ] },
  { id: 'p3',  name: 'Partner 3',  countryCode: 'MX', tier: 'Summit', type: 'SI',
    since: 2014, owner: 'Ricardo Peña', industry: 'Telco', location: 'CDMX, MX', website: 'partner3.example.com',
    health: 'On Track', notes: 'Largest partner in Mexico.', contacts: [ { id: 'c4', name: 'Laura Díaz', title: 'Partner Manager', email: 'laura@partner3.example.com', phone: '+52 55 5555-0301' } ] },
  { id: 'p4',  name: 'Partner 4',  countryCode: 'MX', tier: 'Ridge',  type: 'Reseller',
    since: 2021, owner: 'Ricardo Peña', industry: 'SMB', location: 'Monterrey, MX', website: '', health: 'At Risk', notes: '', contacts: [] },
  { id: 'p5',  name: 'Partner 5',  countryCode: 'CR', tier: 'Crest',  type: 'SI',
    since: 2019, owner: 'Diego Muñoz', industry: 'Public Sector', location: 'San José, CR', website: '', health: 'On Track', notes: '', contacts: [] },
  { id: 'p6',  name: 'Partner 6',  countryCode: 'PA', tier: 'Base',   type: 'Reseller',
    since: 2022, owner: 'Diego Muñoz', industry: 'Banking', location: 'Panama City, PA', website: '', health: 'On Track', notes: '', contacts: [] },
  { id: 'p7',  name: 'Partner 7',  countryCode: 'CO', tier: 'Summit', type: 'SI',
    since: 2018, owner: 'Carlos Rincón', industry: 'Financial Services', location: 'Bogotá, CO', website: 'partner7.example.com',
    health: 'Outperforming', notes: 'Top performer in SOLA. Expanding into Data Cloud.',
    contacts: [ { id: 'c5', name: 'Sofía Mora',   title: 'Alliance Lead',   email: 'sofia@partner7.example.com',  phone: '+57 1 555-0701' },
                { id: 'c6', name: 'Andrés Cano',  title: 'Delivery Manager', email: 'andres@partner7.example.com', phone: '+57 1 555-0702' } ] },
  { id: 'p8',  name: 'Partner 8',  countryCode: 'CO', tier: 'Ridge',  type: 'ISV',
    since: 2020, owner: 'Carlos Rincón', industry: 'Marketing Tech', location: 'Medellín, CO', website: '', health: 'On Track', notes: '', contacts: [] },
  { id: 'p9',  name: 'Partner 9',  countryCode: 'CL', tier: 'Crest',  type: 'SI',
    since: 2017, owner: 'Diego Muñoz', industry: 'Retail', location: 'Santiago, CL', website: 'partner9.example.com',
    health: 'On Track', notes: '', contacts: [ { id: 'c7', name: 'Rodrigo Soto', title: 'Account Director', email: 'rodrigo@partner9.example.com', phone: '+56 2 555-0901' } ] },
  { id: 'p10', name: 'Partner 10', countryCode: 'AR', tier: 'Summit', type: 'SI',
    since: 2015, owner: 'Lucía Fernández', industry: 'E-commerce', location: 'Buenos Aires, AR', website: '', health: 'Outperforming', notes: '', contacts: [ { id: 'c8', name: 'Nicolás Sosa', title: 'Partner Lead', email: 'nicolas@partner10.example.com', phone: '+54 11 555-1001' } ] },
  { id: 'p11', name: 'Partner 11', countryCode: 'PE', tier: 'Ridge',  type: 'SI',
    since: 2020, owner: 'Diego Muñoz', industry: 'Consumer Goods', location: 'Lima, PE', website: '', health: 'On Track', notes: '', contacts: [] },
];

/* ---- SEED deals (fictitious) ---------------------------------------------
   stage: 'Discovery' | 'Demo - POC' | 'Proposal' | 'Won' | 'Lost' | 'Declined'
   close = expected close date (billing start)                                 */
const SEED_DEALS = [
  { id: 'd1',  partnerId: 'p1',  name: 'Deal 1 · Partner 1',  product: 'Sales Cloud',     amount: 120000, created: '2026-05-10', close: '2026-08-15', stage: 'Proposal'   },
  { id: 'd2',  partnerId: 'p1',  name: 'Deal 2 · Partner 1',  product: 'Service Cloud',   amount:  80000, created: '2026-06-01', close: '2026-11-20', stage: 'Demo - POC' },
  { id: 'd3',  partnerId: 'p2',  name: 'Deal 1 · Partner 2',  product: 'Data Cloud',      amount:  60000, created: '2026-06-15', close: '2026-09-10', stage: 'Discovery'  },
  { id: 'd4',  partnerId: 'p3',  name: 'Deal 1 · Partner 3',  product: 'Marketing Cloud', amount: 150000, created: '2026-04-20', close: '2026-09-05', stage: 'Proposal'   },
  { id: 'd5',  partnerId: 'p3',  name: 'Deal 2 · Partner 3',  product: 'Platform',        amount:  90000, created: '2026-06-25', close: '2026-12-01', stage: 'Proposal'   },
  { id: 'd6',  partnerId: 'p4',  name: 'Deal 1 · Partner 4',  product: 'Sales Cloud',     amount:  40000, created: '2026-05-30', close: '2026-08-28', stage: 'Won'        },
  { id: 'd7',  partnerId: 'p5',  name: 'Deal 1 · Partner 5',  product: 'Service Cloud',   amount:  55000, created: '2026-06-05', close: '2026-09-25', stage: 'Demo - POC' },
  { id: 'd8',  partnerId: 'p6',  name: 'Deal 1 · Partner 6',  product: 'Sales Cloud',     amount:  30000, created: '2026-06-10', close: '2026-10-15', stage: 'Declined'   },
  { id: 'd9',  partnerId: 'p7',  name: 'Deal 1 · Partner 7',  product: 'Data Cloud',      amount: 200000, created: '2026-03-15', close: '2026-08-20', stage: 'Proposal'   },
  { id: 'd10', partnerId: 'p7',  name: 'Deal 2 · Partner 7',  product: 'Service Cloud',   amount:  75000, created: '2026-06-20', close: '2026-11-10', stage: 'Demo - POC' },
  { id: 'd11', partnerId: 'p7',  name: 'Deal 3 · Partner 7',  product: 'Platform',        amount:  50000, created: '2026-01-10', close: '2026-06-30', stage: 'Won'        },
  { id: 'd12', partnerId: 'p8',  name: 'Deal 1 · Partner 8',  product: 'Marketing Cloud', amount:  45000, created: '2026-06-01', close: '2026-09-18', stage: 'Proposal'   },
  { id: 'd13', partnerId: 'p9',  name: 'Deal 1 · Partner 9',  product: 'Sales Cloud',     amount:  95000, created: '2026-05-05', close: '2026-09-30', stage: 'Proposal'   },
  { id: 'd14', partnerId: 'p9',  name: 'Deal 2 · Partner 9',  product: 'Data Cloud',      amount:  60000, created: '2026-06-12', close: '2026-12-05', stage: 'Discovery'  },
  { id: 'd15', partnerId: 'p10', name: 'Deal 1 · Partner 10', product: 'Service Cloud',   amount: 110000, created: '2026-04-01', close: '2026-08-10', stage: 'Won'        },
  { id: 'd16', partnerId: 'p11', name: 'Deal 1 · Partner 11', product: 'Sales Cloud',     amount:  35000, created: '2026-06-18', close: '2026-10-20', stage: 'Lost'       },
  { id: 'd17', partnerId: 'p11', name: 'Deal 2 · Partner 11', product: 'Platform',        amount:  25000, created: '2026-02-20', close: '2027-02-15', stage: 'Proposal'   },
  /* historical closed deals (Won) — feed the Accuracy module for H1 2026 */
  { id: 'd18', partnerId: 'p3',  name: 'Deal 3 · Partner 3',  product: 'Sales Cloud',     amount:  80000, created: '2025-12-01', close: '2026-02-20', stage: 'Won'        },
  { id: 'd19', partnerId: 'p10', name: 'Deal 2 · Partner 10', product: 'Data Cloud',      amount: 120000, created: '2026-01-10', close: '2026-03-15', stage: 'Won'        },
  { id: 'd20', partnerId: 'p1',  name: 'Deal 3 · Partner 1',  product: 'Platform',        amount:  90000, created: '2026-02-01', close: '2026-04-22', stage: 'Won', actual: 85000 },
  { id: 'd21', partnerId: 'p9',  name: 'Deal 3 · Partner 9',  product: 'Service Cloud',   amount:  70000, created: '2026-03-01', close: '2026-05-18', stage: 'Won'        },
  /* decided losses (feed partner accuracy) + a live current-month deal */
  { id: 'd22', partnerId: 'p3',  name: 'Deal 4 · Partner 3',  product: 'Platform',        amount:  20000, created: '2026-01-05', close: '2026-03-10', stage: 'Lost'       },
  { id: 'd23', partnerId: 'p9',  name: 'Deal 4 · Partner 9',  product: 'Marketing Cloud', amount:  30000, created: '2026-02-10', close: '2026-06-05', stage: 'Lost'       },
  { id: 'd24', partnerId: 'p1',  name: 'Deal 4 · Partner 1',  product: 'Sales Cloud',     amount:  70000, created: '2026-06-20', close: '2026-07-28', stage: 'Proposal'   },
];

/* ---- SEED locked monthly forecast (Accuracy module) ----------------------
   key 'YYYY-MM' -> { amount: committed forecast frozen that month, at: date }.
   The current month (Jul) is intentionally left UNLOCKED to demo locking.     */
const SEED_LOCKS = {
  '2026-02': { amount:  70000, at: '2026-03-01' },
  '2026-03': { amount: 130000, at: '2026-04-01' },
  '2026-04': { amount: 100000, at: '2026-05-01' },
  '2026-05': { amount:  80000, at: '2026-06-01' },
  '2026-06': { amount:  60000, at: '2026-07-01' },
};
