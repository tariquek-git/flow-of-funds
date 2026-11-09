#!/usr/bin/env python3
"""Who Holds the Money: static site generator.
Reads data/source.json, writes dist/. No dependencies.
Run: python3 build.py
"""
import json, re, os, shutil, html, itertools
from collections import defaultdict, OrderedDict

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.environ.get('WHTM_OUT') or os.path.join(ROOT, 'dist')
SRC = json.load(open(os.path.join(ROOT, 'data', 'source.json')))
import sys; sys.path.insert(0, ROOT)
from iso import FIG as ISOFIG
ISO = {k: f() for k, f in ISOFIG.items()}
WAL = json.load(open(os.path.join(ROOT, 'data', 'wallets.json')))
DEAD = ['worldline.com/en/home/main-navigation/resources/blogs/2025', 'bcb.gov.br/content/estabilidadefinanceira/pix', 'frbsf.org', 'euclid.eba.europa.eu', 'rain.xyz', 'centralbank.ae', 'd97_kr', 'cointelegraph', 'mexc', 'riotimesonline', 'visa.com/currencycloud']
D, PLAIN, SITE, MODELS, PATHS, STORIES, SYN, ROLES, FIT = (SRC[k] for k in ['D','PLAIN','SITE','MODELS','PATHS','STORIES','SYN','ROLES','FIT'])
AS_OF = 'November 2026'
MARKETS = ['CAD','USD','GBP','EUR','AUD','SGD','HKD','BRL','INR']

# ---------------------------------------------------------------- text helpers
def esc(s): return html.escape(str(s if s is not None else ''), quote=True)

MON = r'(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)'
def undate(s):
    s = str(s or '')
    s = re.sub(r'[,(]?\s*\b(?:since|from|in|on|of|launched|dated|as of|approval|effective)?\s*(?:\d{1,2}\s+)?' + MON + r'\.?\s+(?:\d{1,2},?\s+)?\d{4}\)?', '', s, flags=re.I)
    s = re.sub(r'[,(]?\s*\b(?:since|from|in|on|of|as of|dated)?\s*\d{4}-\d{2}(?:-\d{2})?\)?', '', s, flags=re.I)
    s = re.sub(r'\b(?:since|from|in) (?:19|20)\d\d\b', '', s, flags=re.I)
    s = re.sub(r'\s*\([^)]*\b(?:19|20)\d\d\b[^)]*\)', '', s)
    s = re.sub(r'\s*under (?:Decision|Guideline) ECB/\d{4}/\d+[^.]*', '', s, flags=re.I)
    s = re.sub(r'\(\s*\)', '', s); s = re.sub(r'\s+([.,])', r'\1', s); s = re.sub(r'\s{2,}', ' ', s)
    return s.strip()

ACR = [(r'\bRTGS\b','real-time gross settlement'),(r'\bDNS\b','net settlement'),(r'\bFMIs\b','payment systems'),(r'\bFMI\b','payment system'),
       (r'\bPSPs\b','payment companies'),(r'\bPSP\b','payment company'),(r'\bEMIs\b','e-money firms'),(r'\bEMI\b','e-money firm'),
       (r'\bADIs\b','licensed banks'),(r'\bADI\b','licensed bank'),(r'\bCASPs?\b','crypto-asset service provider'),(r'\bSVFs?\b','e-wallet operator'),
       (r'\bMSBs?\b','money service business'),(r'\bFIs\b','financial institutions'),(r'\bCUs\b','credit unions'),(r'\bFI\b','financial institution')]
def clean(s):
    s = str(s or '')
    s = re.sub(r'^n_a,?\s*', '', s, flags=re.I)
    s = re.sub(r'\s*\((inferred|stated|secondary|list|claim|mirror)\)', '', s, flags=re.I)
    s = re.sub(r'\(P\d{3}\)', '', s); s = re.sub(r'\bS\d+\b,?\s*', '', s); s = re.sub(r'\brow \d+\b,?\s*', '', s, flags=re.I)
    s = re.sub(r'\bsee P\d{3}\b', '', s, flags=re.I); s = re.sub(r'\bP\d{3}\b', '', s)
    s = re.sub(r'\s*\(not read for this entity\)', '', s, flags=re.I)
    s = s.replace('per IFPE rules', "under Mexico's e-money rules").replace('IFPE', 'Mexican e-money institution')
    s = s.replace('RPAA PSP', 'registered payment company').replace('RPAA registered', 'registered with the Bank of Canada')
    s = re.sub(r'\s*;\s*', '. ', s); s = re.sub(r':\s', ', ', s); s = re.sub(r'\s{2,}', ' ', s)
    return s.strip()
def plain(s):
    s = undate(s)
    for a, b in ACR: s = re.sub(a, b, s)
    s = s.replace('seat', 'account') if ' seat' in s else s
    return s
def acr(s):
    for a, b in ACR: s = re.sub(a, b, str(s))
    return s
def okf(s): return bool(s) and not re.match(r'^(n/?a|n_a|none|unknown)\b', str(s).strip(), re.I)
def slug(s):
    s = re.sub(r'\(.*?\)', '', str(s)).lower()
    s = s.replace('é','e').replace('ú','u').replace('ã','a').replace('&','and')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')
def host(u):
    m = re.match(r'https?://(?:www\.)?([^/]+)', u or ''); return m.group(1) if m else u
def sentence(s, n=220):
    s = str(s or '').strip()
    if len(s) <= n: return s
    cut = s[:n]; i = cut.rfind('. ')
    return (cut[:i+1] if i > 60 else cut[:cut.rfind(' ')] + '…')

# ---------------------------------------------------------------- reference data
CBFULL = {'USD':'Federal Reserve','CAD':'Bank of Canada','GBP':'Bank of England','EUR':'European Central Bank','AUD':'Reserve Bank of Australia',
          'SGD':'Monetary Authority of Singapore','HKD':'Hong Kong Monetary Authority','BRL':'Banco Central do Brasil','INR':'Reserve Bank of India',
          'CHF':'Swiss National Bank','MXN':'Banco de México','JPY':'Bank of Japan','CNY':"People's Bank of China",'KRW':'Bank of Korea',
          'AED':'Central Bank of the UAE','SAR':'Saudi Central Bank','PHP':'Bangko Sentral ng Pilipinas','IDR':'Bank Indonesia','ZAR':'South African Reserve Bank'}
CBSHORT = {'USD':'the Fed','CAD':'BoC','GBP':'BoE','EUR':'ECB','AUD':'RBA','SGD':'MAS','HKD':'HKMA','BRL':'BCB','INR':'RBI'}
CBSITE = {'USD':'https://www.federalreserve.gov','CAD':'https://www.bankofcanada.ca','GBP':'https://www.bankofengland.co.uk','EUR':'https://www.ecb.europa.eu',
          'AUD':'https://www.rba.gov.au','SGD':'https://www.mas.gov.sg','HKD':'https://www.hkma.gov.hk','BRL':'https://www.bcb.gov.br','INR':'https://www.rbi.org.in'}
MS = None
NAME = {'USD':'United States','CAD':'Canada','GBP':'United Kingdom','EUR':'Euro area','AUD':'Australia','SGD':'Singapore','HKD':'Hong Kong','BRL':'Brazil','INR':'India'}
FLAG = D['flag']
MS = {c: re.sub(r'[^a-z0-9]+', '-', n.lower()).strip('-') for c, n in NAME.items()}

LAYERS = OrderedDict([
    ('7', dict(n='The app', t='Owns the customer', d='The app or account the customer uses. It sets the price and owns the relationship. The money usually sits with a bank or licensed company below it.')),
    ('6', dict(n='Payout', t='Delivers the money at the far end', d='Pays the recipient out through a mobile wallet, cash pickup or a local account, usually in another country.')),
    ('5', dict(n='Currency exchange', t='Swaps one currency for another', d='Converts currencies and keeps money ready on the other side, so a cross-border payment lands already funded.')),
    ('4', dict(n='Networks and processors', t='Carries the message and sets the rules', d='Card networks, instant payment schemes and messaging carry the instruction and set the rules. Processors run the software for whoever holds the licence.')),
    ('3', dict(n='Payment companies', t='Licensed to move money without being a bank', d='Companies licensed to hold customer money and move it, in one country or many, without being a bank.')),
    ('2', dict(n='Banks', t='Settles for others and moves money between banks', d='Banks hold deposits, settle for payment companies that have no central bank account, and move money for other banks across borders.')),
    ('1', dict(n='Settlement', t='Where a payment becomes final', d='The central bank and the systems that settle on its books. Once a payment lands here it cannot be undone.')),
])
LAYER_KIND = {'7':'app','6':'pay','5':'pay','4':'net','3':'pay','2':'bank','1':'cb'}
LAYER_ICON = {'7':'app','6':'payout','5':'fx','4':'net','3':'pay','2':'bank','1':'cb'}
LAYER_TAG = {'7':'Usually holds no money','4':'Holds no customer money','3':'Holds customer money','2':'Holds deposits','1':'Central bank money'}

# Five kinds of institution, one colour each. Red is the central bank only.
KINDS = OrderedDict([
    ('app',  dict(label='App', c='#5B5366')),
    ('pay',  dict(label='Payment company', c='#5B5366')),
    ('net',  dict(label='Network or processor', c='#5B5366')),
    ('sys',  dict(label='Payment system', c='#5B5366')),
    ('bank',  dict(label='Bank', c='#5B5366')),
    ('cb',   dict(label='Central bank', c='#D0263E')),
])
def kind_of(r):
    a, L = r['arch'], str(r['layer'])
    if a == 'settlement_authority': return 'cb'
    if a in ('settlement_system', 'settlement_operator'): return 'sys'
    if L == '1' and a == 'scheme_network': return 'sys'
    if a in ('scheme_network', 'technology_only'): return 'net'
    if a in ('seat_lender', 'infrastructure_bank'): return 'bank'
    if a == 'distributor': return 'app'
    return 'pay'

WAY = {'own':'Holds its own account at the central bank','sponsored':'Through a bank','technical':'Connects to the system itself, a bank settles for it',
       'denied':'No direct access allowed','none':'Holds no customer money'}
WAY1 = {'cb':'It is the central bank. Payments become final here.','sys':'Settles on the central bank\'s books'}
NONBANK = {'yes':'Payment companies can hold an account','opening':'Opening to payment companies','no':'Banks only'}
OWNER = {'industry':'Industry, bank-owned','central_bank':'The central bank','mixed':'Central bank and industry','private':'A company','public':'Government body'}
WHENL = {'always':'Around the clock','business':'Business day','batches':'Several times a day','daily':'Once a day'}
CONF = {'verified':'Official source','stated':'Company or press','inferred':'Inferred from how this kind of system works'}

# ---------------------------------------------------------------- entities
MERGE = {'P401':'P049','P404':'P042','P403':'P046','P402':'P073','P075':'P074'}
ROWS = {r['id']: r for r in D['rows']}
ENT = OrderedDict()
for r in D['rows']:
    if r['id'] == 'P203': continue  # pending deal, forward-looking
    base = MERGE.get(r['id'], r['id'])
    e = ENT.setdefault(base, dict(id=base, rows=[], name=re.sub(r'\bRTGS\b', 'real-time gross settlement', ROWS[base]['name'])))
    e['rows'].append(r)
SLUGS = {}
for base, e in ENT.items():
    s = slug(e['name']) or base.lower()
    if s in SLUGS.values(): s = s + '-' + base.lower()
    SLUGS[base] = s
    e['slug'] = s
    r0 = ROWS[base]
    e['kind'] = kind_of(r0)
    e['layers'] = sorted({str(x['layer']) for x in e['rows']}, reverse=True)
    ccys = []
    for x in e['rows']:
        for c in x['ccy']:
            if c not in ccys: ccys.append(c)
    e['ccy'] = ccys
def ent_of(pid): return ENT.get(MERGE.get(pid, pid))
def plink(pid):
    e = ent_of(pid); return f'/players/{e["slug"]}/' if e else None
def ent_text(e):
    for x in e['rows']:
        if x['id'] in PLAIN: return plain(PLAIN[x['id']])
    return plain(clean(e['rows'][0]['fn']))
def in_market(e, c): return c in e['ccy'] or 'MULTI' in e['ccy'] and c in ('USD','GBP','EUR')

# name -> entity, for linking text values
NAMEIDX = {}
for base, e in ENT.items():
    nm = re.sub(r'\s*\(.*?\)', '', e['name']).strip()
    for k in {nm.lower(), e['name'].lower()}:
        NAMEIDX.setdefault(k, base)
for k, v in {'interac':'P003'}.items():
    if v in ENT: NAMEIDX[k] = v

# ---------------------------------------------------------------- published set (data/publish.json)
# Every row stays in the data. Only the players named in "keep" get their own page.
# Same-function players share one grouped page.
GROUP_OF = {}
_pubf = os.path.join(ROOT, 'data', 'publish.json')
if os.path.exists(_pubf):
    PUB = json.load(open(_pubf))
    _keep = set(PUB['keep'])
    _groups = {}
    for g in PUB['groups']:
        mem = [ENT[m] for m in g['ids'] if m in ENT]
        if not mem: continue
        ge = dict(id=g['id'], name=g['name'], line=g['line'], members=mem, rows=[x for e in mem for x in e['rows']], slug=slug(g['name']))
        ge['kind'] = mem[0]['kind']
        ge['layers'] = sorted({L for e in mem for L in e['layers']}, reverse=True)
        cc = []
        for e in mem:
            for c in e['ccy']:
                if c not in cc: cc.append(c)
        ge['ccy'] = cc
        for e in mem: GROUP_OF[e['id']] = g['id']
        _groups[g['id']] = ge
    _new = OrderedDict()
    for b, e in ENT.items():
        if b in _keep: _new[b] = e
        elif b in GROUP_OF and GROUP_OF[b] not in _new: _new[GROUP_OF[b]] = _groups[GROUP_OF[b]]
    ENT = _new
    SLUGS = {b: e['slug'] for b, e in ENT.items()}
def ent_of(pid):
    b = MERGE.get(pid, pid); return ENT.get(GROUP_OF.get(b, b))
def plink(pid):
    e = ent_of(pid); return f'/players/{e["slug"]}/' if e else None
def ent_text(e):
    if e.get('line'): return e['line']
    for x in e['rows']:
        if x['id'] in PLAIN: return plain(PLAIN[x['id']])
    return plain(clean(e['rows'][0]['fn']))

# ---------------------------------------------------------------- systems
SYSTEMS = OrderedDict()
FIN = SYN['finality']
for c in MARKETS:
    for r in PATHS[c]['rails']:
        sid = f'{c}/{slug(r["name"])}'
        fin = next((f for f in FIN.get(c, []) if f['rail'].lower() == r['name'].lower() or f['rail'].lower().startswith(r['name'].lower().split()[0])), None)
        SYSTEMS[sid] = dict(id=sid, ccy=c, name=r['name'], what=r['what'], owner=r['owner'], owner_type=r['owner_type'], when=r['when'], status=r.get('status'), fin=fin)
def syslink(c, name): return f'/{MS[c]}/{slug(name)}/'

# ---------------------------------------------------------------- icons (Lucide, ISC licence), inline
ICON = {
 'app': '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
 'pay': '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
 'net': '<circle cx="12" cy="4.5" r="2.5"/><path d="m10.2 6.3-3.9 3.9"/><circle cx="4.5" cy="12" r="2.5"/><path d="M7 12h10"/><circle cx="19.5" cy="12" r="2.5"/><path d="m13.8 17.7 3.9-3.9"/><circle cx="12" cy="19.5" r="2.5"/>',
 'sys': '<path d="M3 12h4l3-9 4 18 3-9h4"/>',
 'bank': '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>',
 'cb': '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
 'payout': '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
 'fx': '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
 'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
 'up': '<path d="m18 15-6-6-6 6"/>', 'down': '<path d="m6 9 6 6 6-6"/>', 'right': '<path d="m9 18 6-6-6-6"/>', 'ext': '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
}
def icon(k, size=16, cls=''):
    return f'<svg class="ic {cls}" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICON[k]}</svg>'
def kdot(k, ic=None):
    return f'<span class="kd" style="--k:{KINDS[k]["c"]}" title="{esc(KINDS[k]["label"])}">{icon(ic or k,13)}</span>'
def ldot(k): return kdot(LAYER_KIND[k], LAYER_ICON[k])
def ltag(k):
    t = LAYER_TAG.get(k)
    return f'<span class="tag{" hold" if k in ("3","2") else ""}{" fin" if k=="1" else ""}">{esc(t)}</span>' if t else ''
def flag(c, h=14):
    if c not in FLAG: return ''
    return f'<img class="flag" src="/assets/flags/{c.lower()}.svg" alt="" width="{int(h*4/3)}" height="{h}">'

# ---------------------------------------------------------------- page shell
CSS = open(os.path.join(ROOT, 'assets', 'site.css')).read()
JS = open(os.path.join(ROOT, 'assets', 'site.js')).read()

def layout(title, body, crumbs=None, desc=None, rail=None, canonical=''):
    t = 'Who Holds the Money' if title == 'Who Holds the Money' else f'{title} · Who Holds the Money'
    d = desc or 'How money moves in nine markets, from the app down to the central bank, and who holds it at each step.'
    cr = ''
    if crumbs:
        parts = []
        for i, (label, href) in enumerate(crumbs):
            parts.append(f'<a href="{href}">{esc(label)}</a>' if href and i < len(crumbs) - 1 else f'<span aria-current="page">{esc(label)}</span>')
        cr = '<nav class="crumbs" aria-label="Breadcrumb">' + '<span class="sep">/</span>'.join(parts) + '</nav>'
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(t)}</title><meta name="description" content="{esc(d)}">
<meta property="og:title" content="{esc(t)}"><meta property="og:description" content="{esc(d)}"><meta property="og:type" content="website">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%2323182F'/%3E%3Ccircle cx='16' cy='16' r='6' fill='%23D0263E'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css"></head><body>
<header class="top"><div class="wrap top-in">
<a class="mark" href="/"><span class="dot"></span>Who Holds the Money</a>
<nav class="nav"><a href="/layers/">Layers</a><a href="/markets/">Markets</a><a href="/concepts/">Concepts</a><a href="/compare/">Compare</a></nav>
<button class="sbtn" type="button" aria-label="Search" data-search-open>{icon('search',18)}</button>
</div></header>
<div class="search" hidden data-search><div class="wrap"><input type="search" placeholder="Search a player, system or market" aria-label="Search" data-search-input autocomplete="off"><ul data-search-results></ul></div></div>
{rail or ''}
<main class="wrap">{cr}{body}</main>
<footer class="foot"><div class="wrap">
<p><b>Who Holds the Money</b> is an open Fintech North project. Every claim links to its source.</p>
<p><a href="/about/">How this was made and how to send a correction</a></p>
</div></footer>
<script src="/assets/site.js" defer></script></body></html>'''

def write(path, content):
    full = os.path.join(DIST, path.strip('/'), 'index.html') if not path.endswith('.html') else os.path.join(DIST, path.strip('/'))
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, 'w').write(content)

# ---------------------------------------------------------------- shared components
def layer_rail(current=None):
    """Thin seven-step rail under the header. The drill up and down."""
    items = []
    for k, L in LAYERS.items():
        cur = ' aria-current="true"' if k == str(current) else ''
        items.append(f'<a href="/layers/{k}/" class="lr-i{" on" if cur else ""}"{cur}><span class="lr-n">{k}</span><span class="lr-t">{esc(L["n"])}</span></a>')
    return f'<div class="lrail"><div class="wrap lr-in" aria-label="The seven layers">{"".join(items)}</div></div>'

def sources_block(srcs, title='Sources'):
    if not srcs: return ''
    seen, li = set(), []
    for s in srcs:
        if isinstance(s, (list, tuple)):
            label, url = (s[0], s[1]) if len(s) > 1 else (s[0], s[0])
        else: label, url = s, s
        if not str(url).startswith('http') or url in seen or any(x in url for x in DEAD): continue
        seen.add(url)
        lab = label if not re.match(r'^S\d+$', str(label)) else host(url)
        li.append(f'<li><a href="{esc(url)}" rel="noopener" target="_blank">{esc(lab)}</a><span class="host">{esc(host(url))}</span></li>')
    if not li: return ''
    return f'<details class="src"><summary>{esc(title)} <span class="n">{len(li)}</span></summary><ol>{"".join(li)}</ol></details>'

def linkify(val, c=None):
    """Turn a player or system name into a link where we have a page for it."""
    out = []
    for part in [p.strip() for p in re.split(r',\s*', str(val))]:
        key = part.lower()
        if key in ('visa', 'mastercard', 'card networks', 'amex', 'american express'):
            out.append(f'<a href="/networks/cards/">{esc(part)}</a>'); continue
        base = NAMEIDX.get(key)
        sid = None
        if c:
            for sname in [s['name'] for s in SYSTEMS.values() if s['ccy'] == c]:
                if sname.lower() == key or (key.startswith(sname.lower()) and len(sname) > 3): sid = syslink(c, sname)
        if sid: out.append(f'<a href="{sid}">{esc(part)}</a>')
        elif base and plink(base): out.append(f'<a href="{plink(base)}">{esc(part)}</a>')
        else: out.append(esc(part))
    return ', '.join(out)

# where a payment stops: one model, four stops plus the token ledger off-axis
STOPS = ['Company', 'Bank', 'Settlement bank', 'Central bank']
STOPL = ['Layers 7 and 3', 'Layer 2', 'Layer 2', 'Layer 1']
STOPSAID = ["Stops on the company's own books", "Stops on the bank's books", "Stops at the network's settlement banks", "Stops at the central bank"]
ENDS = [
    ('Same app or wallet', 'PayPal to PayPal', 0, 'Both people hold a balance with the same company. Only its own records change. The money backing the balances does not move.', '/players/paypal-xoom/'),
    ('Same bank', 'Two accounts at one bank', 1, 'The bank moves money between two of its own accounts. Nothing leaves the bank.', '/layers/2/'),
    ('Card payment', 'Visa, Mastercard', 2, 'Card networks net what each bank owes and settle once a day through their settlement banks, which in turn settle at the central bank.', '/networks/cards/'),
    ('Bank to bank', 'Lynx, Fedwire, Pix', 3, 'Payments between two banks become final on the central bank\'s books. In Brazil, licensed payment companies settle Pix there too.', '/layers/1/'),
]
def stop_track(compact=False):
    head = ''.join(f'<span>{esc(s)}<small>{esc(l)}</small></span>' for s, l in zip(STOPS, STOPL))
    rows = []
    for label, ex, stop, note, href in ENDS:
        dots = []
        for i in range(4):
            cls = 'st-d' + (' past' if i < stop else '') + (' end' if i == stop else '')
            dots.append(f'<i class="{cls}"></i>')
        seg = ''.join(f'<b class="st-l{" past" if i < stop else ""}"></b>' for i in range(3))
        rows.append(f'''<a class="st-row" href="{href}"><span class="st-lab"><b>{esc(label)}</b><small>{esc(ex)}</small><em>{esc(STOPSAID[stop])}</em></span>
<span class="st-track" aria-label="Stops at: {esc(STOPS[stop])}"><span class="st-segs">{seg}</span><span class="st-dots">{"".join(dots)}</span></span>
</a>''')
    rows.append('''<a class="st-row token" href="/players/circle/"><span class="st-lab"><b>Stablecoin</b><small>USDC</small></span>
<span class="st-off">Off this chain. It stops on a token ledger, and the reserves behind it sit in bank deposits and short-term government debt.</span></a>''')
    return f'<div class="stops"><div class="st-head"><span></span><span class="st-cols">{head}</span></div>{"".join(rows)}</div>'

# finality: when the customer sees it vs when the banks owe and when it is final
BK = ['seconds', 'minutes', 'same day', 'next day', 'days']
BKL = {'seconds':'Seconds','minutes':'Minutes','same day':'Same day','next day':'Next day','days':'Days'}
def fin_rows(items):
    """HTML rows so labels stay readable on phones. Words sit on the first bar instead of a legend."""
    pos = lambda b: 100 * (BK.index(b) if b in BK else 2) / (len(BK) - 1)
    head = ''.join(f'<span style="left:{pos(b):.1f}%">{BKL[b]}</span>' for b in BK)
    out = [f'<div class="fn"><div class="fn-ax"><span class="fn-l"></span><span class="fn-t">{head}</span></div>']
    labelled = False; both_labelled = False
    for lab, sub, r in items:
        a, z = pos(r.get('seen')), pos(r.get('final'))
        basis = 'Each payment settles on its own' if r.get('basis') == 'gross' else 'Banks settle the total later'
        if z > a:
            words = '' if labelled else f'<b class="w w-s" style="left:{a:.1f}%">Seen</b><b class="w w-f" style="left:{z:.1f}%">Final</b>'
            labelled = labelled or bool(words)
            marks = f'<i class="fn-gap" style="left:{a:.1f}%;width:{z-a:.1f}%"></i><i class="fn-s" style="left:{a:.1f}%"></i><i class="fn-f" style="left:{z:.1f}%"></i>{words}'
        else:
            pos_ = f'left:{a:.1f}%' if a < 55 else f'right:{100-a:.1f}%;left:auto;margin-right:-6px'
            marks = f'<i class="fn-b" style="left:{a:.1f}%"></i>' + ('' if both_labelled else f'<b class="w w-b" style="{pos_}">Seen and final together</b>')
            both_labelled = True
        out.append(f'<div class="fn-r"><span class="fn-l">{lab}{f"<small>{esc(sub)}</small>" if sub else ""}</span>'
                   f'<span class="fn-t"><i class="fn-base"></i>{marks}</span></div>')
    out.append('</div><p class="fn-key">The orange bar is the time the banks owe each other before the payment is final at the central bank.</p>')
    return ''.join(out)

def finality_chart(rows, c=None):
    if not rows: return ''
    items = []
    for r in rows:
        name = r['rail']
        href = syslink(c, name) if c and f'{c}/{slug(name)}' in SYSTEMS else None
        items.append((f'<a href="{href}">{esc(name)}</a>' if href else esc(name), None, r))
    return fin_rows(items)

def rails_diagram(c):
    P = PATHS[c]; rails = P['rails']; n = len(rails)
    W, gap = 440, 42; y0 = 52; H = y0 + gap * (n - 1) + 96
    bankY = y0 + gap * (n - 1) / 2
    cbY = y0 + gap * (n - 1) + 60
    bx1, bx2, rx, rw = 46, 394, 140, 160
    g = [f'<svg viewBox="0 0 {W} {H}" class="rails" role="img" aria-label="How a payment travels in {esc(NAME[c])}"><defs><marker id="ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="#B9B2A8"/></marker><marker id="ahr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="#D0263E"/></marker></defs>']
    for i, r in enumerate(rails):
        y = y0 + gap * i
        g.append(f'<path d="M{bx1+44} {bankY} C {rx-20} {bankY}, {rx-30} {y}, {rx+4} {y}" class="wire" marker-end="url(#ah)"/><path d="M{rx+rw-4} {y} C {rx+rw+30} {y}, {rx+rw+20} {bankY}, {bx2-46} {bankY}" class="wire" marker-end="url(#ah)"/>')
    g.append(f'<path d="M{bx1} {bankY+15} V {cbY} H {rx} M {rx+rw} {cbY} H {bx2} V {bankY+15}" class="settle"/>')
    for i, r in enumerate(rails):
        y = y0 + gap * i
        planned = r.get('status') == 'planned'
        lab = r['name'] if len(r['name'] + r['what']) > 21 else f'{r["name"]} · {r["what"]}'
        if planned: lab = f'{r["name"]} · phasing in'
        g.append(f'<a href="{syslink(c, r["name"])}" class="rnode{" planned" if planned else ""}"><rect x="{rx}" y="{y-14}" width="{rw}" height="28" rx="14"/><text x="{rx+rw/2}" y="{y+4}" text-anchor="middle">{esc(lab)}</text></a>')
    for xx, t in ((bx1, "Payer's bank"), (bx2, "Payee's bank")):
        g.append(f'<g class="bnode"><rect x="{xx-44}" y="{bankY-15}" width="88" height="30" rx="15"/><text x="{xx}" y="{bankY+4}" text-anchor="middle">{t}</text></g>')
    cb = CBFULL[c] if len(CBFULL[c]) < 22 else CBSHORT[c]
    g.append(f'<a href="/{MS[c]}/#settles" class="cbnode"><rect x="{rx}" y="{cbY-16}" width="{rw}" height="32" rx="16"/><text x="{rx+rw/2}" y="{cbY+5}" text-anchor="middle">{esc(cb)}</text></a>')
    g.append(f'<text x="{bx1+6}" y="{cbY-6}" class="note">Banks settle here</text>')
    g.append(f'<text x="{bx1}" y="{bankY-24}" class="note" text-anchor="middle">Holds the money</text><text x="{rx+rw/2}" y="{y0-22}" class="note" text-anchor="middle">Carries the payment</text>')
    g.append('</svg>')
    return ''.join(g)

def ladder(rows, c):
    out = []
    for r in rows:
        steps = r['chain']
        chips = []
        for j, s in enumerate(steps):
            last = j == len(steps) - 1
            chips.append(f'<span class="lad-c{" cb" if last else ""}">{esc(s)}</span>')
        out.append(f'''<li><div class="lad-h"><b>{esc(r["who"])}</b><span class="lad-n">{r["rungs"]} {"step" if r["rungs"]==1 else "steps"} away</span></div>
<div class="lad-chain">{'<span class="lad-a" aria-hidden="true">↓</span>'.join(chips)}</div><p>{esc(plain(r.get("note","")).replace("Planned. ","Phasing in. "))}</p></li>''')
    return f'<ol class="ladder">{"".join(out)}</ol>'

def story_rows(st):
    rows = st.get('rows') or []
    out = []
    for r in rows:
        nodes = ''.join(f'<span class="sn k-{k}">{esc(t)}</span>' for t, k in r['nodes'])
        out.append(f'<div class="sr"><span class="sr-l">{esc(r["label"])}</span><span class="sr-n">{nodes}</span></div>')
    return f'<div class="srows">{"".join(out)}</div>' if out else ''

# ---------------------------------------------------------------- market profile (short comparable answers)
def instant_rail(c):
    rs = [r for r in PATHS[c]['rails'] if r['what'] == 'Instant']
    if not rs: return None
    live = [r for r in rs if r.get('status') != 'planned']
    return live[0] if live else rs[0]
def profile(c):
    P = PATHS[c]; ir = instant_rail(c)
    fin = next((f for f in FIN.get(c, []) if ir and f['rail'].lower().startswith(ir['name'].lower().split()[0])), None)
    if c == 'CAD': fin = None
    instant_note = ''
    if c == 'CAD': instant_note = 'Interac e-Transfer today. Real-Time Rail phasing in.'
    rows = OrderedDict()
    rows['Central bank'] = (f'{CBFULL[c]}', CBSITE.get(c))
    rows['Final at'] = (P['settlement'], None)
    rows['Core rails run by'] = (OWNER.get(P['rails_owner'], P['rails_owner']), None)
    rows['Instant payments'] = (instant_note or (ir['name'] if ir else 'None'), None)
    if fin: rows['Instant payments are final'] = ('In seconds' if fin['final'] == 'seconds' else BKL.get(fin['final'], fin['final']) + (', banks settle the total' if fin.get('basis') == 'net' else ''), None)
    elif c == 'CAD': rows['Instant payments are final'] = ('Next business day, for e-Transfer', None)
    rows['Payment companies at the central bank'] = (NONBANK.get(P['nonbank_access'], P['nonbank_access']), None)
    rows['Deposits held by'] = (P['holders'], None)
    return rows

# ---------------------------------------------------------------- pages
PAYTYPES = [
    ('Same app or wallet', '3', "Stops on the company's own books. The money behind the balances does not move."),
    ('Same bank', '2', "Stops on the bank's books. Nothing leaves the bank."),
    ('Card payment', '2', "Stops at the card network's settlement banks, which settle with each other at the central bank."),
    ('Bank to bank', '1', "Final at the central bank, on the books of the system that settles it."),
    ('Stablecoin', '', "Stops on a token ledger, outside these layers. The reserves behind it sit in bank deposits and short-term government debt."),
]
def page_home():
    # layer stack with a market switcher
    ex = {}
    for c in ['ALL'] + MARKETS:
        ex[c] = {}
        for k in LAYERS:
            pick = []
            for base, e in ENT.items():
                if k in e['layers'] and (c == 'ALL' or c in e['ccy']):
                    pick.append(base)
            # prefer well-known: the LAY ids order from the old site first
            ex[c][k] = [{'n': re.sub(r'\s*\(.*?\)', '', ENT[b]['name']), 'u': plink(b)} for b in pick[:3]]
    rows = []
    for k, L in LAYERS.items():
        kk = LAYER_KIND[k]
        rows.append(f'''<li class="ly" data-layer="{k}"><a class="ly-a" href="/layers/{k}/">
<span class="ly-n">{k}</span><span class="ly-fig">{ISO[k]}</span><span class="ly-t"><b>{esc(L["n"])}</b><small>{esc(L["t"])}</small></span>{ltag(k)}{icon('right',16,'ly-go')}</a>
<span class="ly-ex" data-ex></span></li>''')
    sw = ''.join(f'<button type="button" data-mkt="{c}" class="mk{" on" if c=="ALL" else ""}">{flag(c) if c!="ALL" else ""}<span>{"All" if c=="ALL" else c}</span></button>' for c in ['ALL'] + MARKETS)
    # seen vs final across markets
    gap_rows = []
    for c in MARKETS:
        f = next((x for x in FIN.get(c, []) if x.get('seen') == 'seconds'), None)
        if f: gap_rows.append((c, f))
    gapchart = fin_rows([(f'<a href="/{MS[c]}/">{esc(NAME[c])}</a>', f['rail'], f) for c, f in gap_rows])
    # markets table
    mt = []
    for c in MARKETS:
        P = PATHS[c]; ir = instant_rail(c)
        mt.append(f'''<tr data-href="/{MS[c]}/"><th scope="row"><a href="/{MS[c]}/">{flag(c)}<span>{esc(NAME[c])}</span><code>{c}</code></a></th>
<td>{esc(CBFULL[c])}</td><td>{esc('Interac e-Transfer, Real-Time Rail' if c=='CAD' else (ir['name'] if ir else ''))}</td><td>{esc(NONBANK.get(P['nonbank_access']))}</td></tr>''')
    body = f'''
<section class="hero">
<h1><span class="lt">Who holds the money</span> when a payment moves</h1>
<p class="lede">Seven layers, nine markets. From the app on a phone down to the central bank.</p>
</section>

<section class="sec">
<div class="sec-h"><h2>Who touches a payment</h2><p>Layer 7 is what the customer sees. Layer 1 is where the payment becomes final. Pick a market to see who sits in each layer.</p><div class="mks" role="group" aria-label="Show players for a market">{sw}</div></div>
<div class="stops2" role="group" aria-label="Where a payment stops"><span class="stops2-l">Where does a payment stop?</span>{"".join(f'<button type="button" class="pt" data-stop="{k}" data-say="{esc(say)}">{esc(lab)}</button>' for lab, k, say in PAYTYPES)}</div>
<p class="stop-say" data-stop-say hidden></p>
<ol class="layers" data-layers>{"".join(rows)}</ol>
<script type="application/json" id="layer-ex">{json.dumps(ex, ensure_ascii=False)}</script>
</section>

<section class="sec">
<div class="sec-h"><h2>The customer sees it in seconds. The banks settle later.</h2><p>Each market's instant payment, from the moment the money shows up to the moment it is final at the central bank.</p></div>
<div class="panel">{gapchart}</div>
</section>

<section class="sec">
<div class="sec-h"><h2>Nine markets</h2><a class="more" href="/compare/">Compare markets {icon('right',14)}</a></div>
<div class="tbl-wrap"><table class="tbl mtable"><thead><tr><th>Market</th><th>Final at</th><th>Instant rail</th><th>Payment companies at the central bank</th></tr></thead><tbody>{"".join(mt)}</tbody></table></div>
</section>'''
    write('/', layout('Who Holds the Money', body))

def page_layers_index():
    items = []
    for k, L in LAYERS.items():
        n = sum(1 for e in ENT.values() if k in e['layers'])
        items.append(f'<li class="ly"><a class="ly-a" href="/layers/{k}/"><span class="ly-n">{k}</span><span class="ly-fig">{ISO[k]}</span><span class="ly-t"><b>{esc(L["n"])}</b><small>{esc(L["d"])}</small></span>{ltag(k)}{icon("right",16,"ly-go")}</a></li>')
    body = f'''<section class="hero"><h1><span class="lt">From the app to the central bank</span> The seven layers</h1><p class="lede">From the app the customer sees, down to the central bank where a payment becomes final. Layer 4 runs across the others and holds no customer money.</p></section>
<ol class="layers">{"".join(items)}</ol>
'''
    write('/layers/', layout('The seven layers', body, crumbs=[('Home','/'),('Layers',None)], rail=layer_rail()))

def page_layer(k):
    L = LAYERS[k]; syn = SYN['layers'].get(k, {})
    keys = list(LAYERS.keys()); i = keys.index(k)
    up = keys[i-1] if i > 0 else None; down = keys[i+1] if i < len(keys) - 1 else None
    why = ''.join(f'<p>{esc(plain(p))}</p>' for p in syn.get('why', []))
    know = ''.join(f'<li>{esc(plain(p))}</li>' for p in syn.get('know', []))
    # role groups
    groups = []
    for grp in ROLES.get(k, []) + (ROLES.get('4a', []) + ROLES.get('4b', []) if k == '4' else []) + (ROLES.get('2a', []) + ROLES.get('2b', []) if k == '2' else []):
        name, desc, ids = grp
        _seen = []
        for p in ids:
            if ent_of(p) and ent_of(p)['id'] not in _seen: _seen.append(ent_of(p)['id'])
        chips = ''.join(f'<a href="{plink(b)}">{esc(re.sub(r"\s*\(.*?\)", "", ENT[b]["name"]))}</a>' for b in _seen)
        if name == 'Card schemes': chips = '<a href="/networks/cards/">Visa</a><a href="/networks/cards/">Mastercard</a>'
        groups.append(f'<li><b>{esc(name)}</b><p>{esc(plain(desc))}</p>{f"<div class=chips>{chips}</div>" if chips else ""}</li>')
    # table of players at this layer by market
    tr = []
    for base, e in ENT.items():
        if k not in e['layers']: continue
        mk = ''.join(f'<a href="/{MS[c]}/" title="{esc(NAME[c])}">{flag(c)}</a>' for c in e['ccy'] if c in NAME)
        rest = len([c for c in e['ccy'] if c not in NAME])
        if rest: mk += f'<span class="more-m">{"Many markets" if "MULTI" in e["ccy"] else f"+{rest} elsewhere"}</span>'
        tr.append(f'<tr><th scope="row"><a href="/players/{e["slug"]}/">{kdot(e["kind"])}{esc(e["name"])}</a></th><td class="mkcell" data-l="Markets">{mk}</td><td data-l="What it does">{esc(sentence(ent_text(e), 140))}</td></tr>')
    nav = '<div class="updown">' + (f'<a href="/layers/{up}/">{icon("up",16)}<span>Layer {up}, {esc(LAYERS[up]["n"])}</span></a>' if up else '<span></span>') + (f'<a href="/layers/{down}/">{icon("down",16)}<span>Layer {down}, {esc(LAYERS[down]["n"])}</span></a>' if down else '<span></span>') + '</div>'
    take = syn.get('take') or L['t']
    extra = ''
    if k == '1':
        extra = '<section class="sec"><div class="sec-h"><h2>Not every payment reaches this layer</h2><p>A payment stops on the first set of books both sides share. Within one app it stops on the company\'s books. Within one bank it stops on the bank\'s books. Only payments between banks reach the central bank.</p></div></section>'
    body = f'''<section class="hero lhero"><div><p class="eyebrow">{ltag(k)}</p><h1><span class="lt">Layer {k}</span> {esc(L["n"])}</h1><p class="lede">{esc(plain(take))}</p></div><div class="lh-fig">{ISO[k]}</div></section>
<div class="cols"><div>{why or f"<p>{esc(L['d'])}</p>"}</div>{f'<aside class="know"><h3>What to know</h3><ul>{know}</ul></aside>' if know else ''}</div>
{f'<section class="sec"><div class="sec-h"><h2>Who sits here</h2></div><ul class="groups">{"".join(groups)}</ul></section>' if groups else ''}
{extra}
<section class="sec"><div class="sec-h"><h2>Players at this layer</h2><p>{len(tr)} on this site</p></div>
<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Player</th><th>Markets</th><th>What it does</th></tr></thead><tbody>{"".join(tr)}</tbody></table></div></section>
{nav}'''
    write(f'/layers/{k}/', layout(f'Layer {k}, {L["n"]}', body, rail=layer_rail(k), desc=plain(take)))

FAILK = {'app':'App','pay':'Payment company','bank':'Bank','system':'Payment system','cb':'Central bank'}
FAILS = {'carries':'Carries the loss','shares':'Shares it','none':'No role'}
def failures_html(c):
    fl = SYN.get('responsibility', {}).get('failures', [])
    if not fl: return ''
    items = []
    for f in fl:
        here = next((t for cc, t in f.get('differs', []) if cc == c), None)
        carries = [FAILK[k] for k, v in f['states'].items() if v == 'carries']
        items.append(f'<li><b>{esc(plain(f["label"]))}</b><p class="who-c">Usually carried by {esc(" and ".join(carries) or "no single party").lower()}</p><p>{esc(plain(here or f["line"]))}</p></li>')
    return f'<section class="sec"><div class="sec-h"><h2>When something goes wrong</h2><p>Who carries the loss, and where {esc(NAME[c])} differs from the usual pattern.</p></div><ul class="notes">{"".join(items)}</ul></section>'
def lane_html(lane, c):
    key, title, text, pairs = lane
    dl = ''.join(f'<div><dt>{esc(acr(a))}</dt><dd>{linkify(acr(b), c)}</dd></div>' for a, b in pairs)
    return f'<details class="lane" id="{key}" {"open" if key in ("moves","settles") else ""}><summary><h3>{esc(title)}</h3>{icon("down",16,"chev")}</summary><p>{esc(plain(text))}</p>{f"<dl class=pairs>{dl}</dl>" if dl else ""}</details>'

def page_market(c):
    M = MODELS[c]; P = PATHS[c]; cs = SYN['countries'][c]; st = cs['standout']
    prof = profile(c)
    dl = ''.join(f'<div><dt>{esc(k)}</dt><dd>{f"<a href={chr(34)}{esc(u)}{chr(34)} rel=noopener target=_blank>{esc(v)}</a>" if u else esc(v)}</dd></div>' for k, (v, u) in prof.items())
    form = st.get('form')
    vis = ''
    if form == 'finality': vis = finality_chart(st.get('data') or FIN.get(c), c)
    elif form == 'ladder': vis = ladder(st.get('data') or SYN['ladder'][c], c)
    else:
        story = STORIES.get(c)
        vis = finality_chart(FIN.get(c), c)
    # access ladder (skip if already the standout)
    lad = '' if form == 'ladder' else f'<section class="sec" id="access"><div class="sec-h"><h2>How close each kind of player sits to {esc(("the " if CBFULL[c].split()[0] in ("Bank","Federal","European","Reserve","Monetary","Hong","People's") else "") + CBFULL[c])}</h2></div>{ladder(SYN["ladder"][c], c)}</section>'
    timing = '' if form == 'finality' or form not in ('ladder',) else f'<section class="sec" id="timing"><div class="sec-h"><h2>When it is final</h2></div><div class="panel">{finality_chart(FIN.get(c), c)}</div></section>'
    if form not in ('finality', 'ladder'): timing = ''
    lanes = ''.join(lane_html(l, c) for l in M['lanes']['dom'])
    xb = ''.join(lane_html(l, c) for l in M['lanes'].get('xb', []))
    notes = ''.join(f'<li><b>{esc(plain(n["t"]))}</b><p>{esc(plain(n["d"]))}</p></li>' for n in cs.get('notice', []))
    players = defaultdict(list)
    for base, e in ENT.items():
        if c in e['ccy']:
            for k in e['layers']: players[k].append(e)
    pl = []
    for k, L in LAYERS.items():
        if not players.get(k): continue
        chips = ''.join(f'<a href="/players/{e["slug"]}/">{esc(re.sub(r"\s*\(.*?\)", "", e["name"]))}</a>' for e in players[k])
        pl.append(f'<li><a class="pl-l" href="/layers/{k}/"><span class="ly-n">{k}</span>{esc(L["n"])}</a><div class="chips">{chips}</div></li>')
    cmp = ''.join(f'<a href="/compare/{MS[c]}-{MS[o]}/">{flag(o)}{esc(NAME[o])}</a>' for o in MARKETS if o != c)
    srcs = M.get('sources', []) + P.get('sources', [])
    body = f'''<section class="hero mhero"><p class="eyebrow">{flag(c, 18)}<code>{c}</code></p><h1><span class="lt">How money moves in</span> {esc(NAME[c])}</h1><p class="lede">{esc(plain(M["line"]))}</p></section>
<div class="grid2">
<dl class="answers">{dl}</dl>
<div class="panel"><h2 class="ph">How a payment travels</h2>{rails_diagram(c)}<p class="pnote">{esc(plain(P.get("rails_owner_note","")))}</p></div>
</div>
<section class="sec standout"><div class="sec-h"><h2>{esc(plain(st["obs"]))}</h2><p>{esc(plain(st["take"]))}</p></div><div class="panel">{vis}</div></section>
{timing}
{lad}
<section class="sec" id="lanes"><div class="sec-h"><h2>Who does what</h2><div class="tabs" role="tablist"><button role="tab" aria-selected="true" data-tab="dom">Domestic</button><button role="tab" aria-selected="false" data-tab="xb">Cross-border</button></div></div>
<div data-pane="dom">{lanes}</div><div data-pane="xb" hidden>{xb}<p class="pnote">{esc(plain(M.get("stablecoin","")))}</p></div></section>
{f'<section class="sec"><div class="sec-h"><h2>Worth knowing</h2></div><ul class="notes">{notes}</ul></section>' if notes else ''}
{failures_html(c)}
<section class="sec"><div class="sec-h"><h2>Players in {esc(NAME[c])}</h2><p>By layer</p></div><ul class="plist">{"".join(pl)}</ul></section>
<section class="sec"><div class="sec-h"><h2>Compare {esc(NAME[c])} with</h2></div><div class="cmp-links">{cmp}</div></section>
{sources_block(srcs)}'''
    write(f'/{MS[c]}/', layout(NAME[c], body, crumbs=[('Home','/'),('Markets','/markets/'),(NAME[c],None)], desc=plain(M['line'])))

def page_markets_index():
    cards = []
    for c in MARKETS:
        cards.append(f'<li><a href="/{MS[c]}/"><span class="mi-h">{flag(c,18)}<b>{esc(NAME[c])}</b><code>{c}</code></span><span class="mi-o">{esc(plain(STORIES[c]["obs"]) if c in STORIES else "")}</span><span class="mi-l">{esc(sentence(plain(MODELS[c]["line"]),150))}</span></a></li>')
    # grouping matrices
    by_owner = defaultdict(list); by_nb = defaultdict(list)
    for c in MARKETS:
        by_owner[OWNER.get(PATHS[c]['rails_owner'])].append(c); by_nb[NONBANK.get(PATHS[c]['nonbank_access'])].append(c)
    def mat(title, d):
        rows = ''.join(f'<div class="mx-r"><span class="mx-k">{esc(k)}</span><span class="mx-v">{"".join(f"<a href=/{MS[c]}/>{flag(c)}{c}</a>" for c in v)}</span></div>' for k, v in d.items())
        return f'<div class="mx"><h3>{esc(title)}</h3>{rows}</div>'
    body = f'''<section class="hero"><h1><span class="lt">Nine markets</span> Same questions, different answers</h1><p class="lede">Nine currency areas. Each one answers the same questions differently.</p></section>
<div class="grid2">{mat("Who runs the core rails", by_owner)}{mat("Can a payment company hold a central bank account", by_nb)}</div>
<ul class="mindex">{"".join(cards)}</ul>'''
    write('/markets/', layout('Markets', body, crumbs=[('Home','/'),('Markets',None)]))

def page_system(sid):
    s = SYSTEMS[sid]; c = s['ccy']
    rel = [e for e in ENT.values() if c in e['ccy'] and any(s['name'].lower() in (x['fn'] + ' ' + str(x.get('cp','')) + ' ' + str(x.get('chain',''))).lower() for x in e['rows'])]
    rel_chips = ''.join(f'<a href="/players/{e["slug"]}/">{kdot(e["kind"])}{esc(re.sub(r"\s*\(.*?\)", "", e["name"]))}</a>' for e in rel[:24])
    f = s['fin']
    dl = [('Market', f'<a href="/{MS[c]}/">{flag(c)} {esc(NAME[c])}</a>'), ('What it carries', esc(s['what'])), ('Run by', linkify(s['owner'], c)),
          ('Owned by', esc(OWNER.get(s['owner_type'], s['owner_type']))), ('Settles', esc(WHENL.get(s['when'], s['when'])))]
    if f:
        dl += [('Customer sees it', esc(BKL.get(f['seen'], f['seen']))), ('Final at the central bank', esc(BKL.get(f['final'], f['final']))),
               ('How', 'One payment at a time' if f.get('basis') == 'gross' else 'Net amounts, in batches')]
    if s['status'] == 'planned': dl.append(('Status', 'Phasing in'))
    dlh = ''.join(f'<div><dt>{a}</dt><dd>{b}</dd></div>' for a, b in dl)
    note = f'<p class="lede">{esc(plain(f["note"]))}</p>' if f else ''
    body = f'''<section class="hero"><p class="eyebrow">{kdot("sys")} Payment system</p><h1>{esc(s["name"])}</h1>{note}</section>
<div class="grid2"><dl class="answers">{dlh}</dl><div class="panel"><h2 class="ph">On the {esc(NAME[c])} map</h2>{rails_diagram(c)}</div></div>
{f'<section class="sec"><div class="sec-h"><h2>Players connected to it</h2><p>Named in the data as using it</p></div><div class="chips big">{rel_chips}</div></section>' if rel_chips else ''}
{sources_block([[host(f["src"]), f["src"]]] if f and f.get("src") else [])}'''
    write(f'/{MS[c]}/{slug(s["name"])}/', layout(f'{s["name"]}, {NAME[c]}', body, crumbs=[('Home','/'),('Markets','/markets/'),(NAME[c], f'/{MS[c]}/'),(s['name'],None)], rail=layer_rail('1')))

def nofig(t):
    parts = [p for p in re.split(r',\s+|\.\s+', t) if not re.search(r'\$[\d,.]+|\d[\d,.]*\s?(M|B|million|billion)\b', p)]
    return ', '.join(parts) if parts else t
NOTE_RX = re.compile(r'\b(stated|unstated|quoted|row|per the|mechanism|audit|claim|mirror|see)\b', re.I)
def tidy(t):
    parts = [p.strip() for p in re.split(r'(?<=[.])\s+', t) if p.strip() and not NOTE_RX.search(p)]
    t = ' '.join(parts) if parts else t
    t = re.sub(r'[,;\s]+$', '', t).strip()
    return t[:1].upper() + t[1:] if t else t
def guess_site(e):
    toks = [w for w in re.split(r'[^a-z0-9]+', re.sub(r'\(.*?\)', '', e['name'].lower())) if len(w) > 3 and w not in ('bank','financial','payments','payment','company','group','limited','corp','national','central')]
    for x in e['rows']:
        for s_ in x.get('sources', []):
            u = s_[1] if len(s_) > 1 else ''
            h = host(u)
            if any(t in h for t in toks) and not any(z in u for z in DEAD): return 'https://' + h
    return None
def role_text(x):
    return plain(PLAIN[x['id']]) if x['id'] in PLAIN else tidy(plain(clean(x['fn'])))
def page_player(base):
    e = ENT[base]
    if e.get('members'): return page_group(e)
    r0 = e['rows'][0]
    k0 = str(ROWS[base]['layer'])
    roles = []
    for x in e['rows']:
        L = str(x['layer'])
        way = WAY1.get(kind_of(x)) if L == '1' else WAY.get(x['way'], WAY['none'])
        roles.append(f'<li><a class="pl-l" href="/layers/{L}/"><span class="ly-n">{L}</span>{esc(LAYERS[L]["n"])}</a>{"" if role_text(x) == ent_text(e) else f"<p>{esc(role_text(x))}</p>"}<dl class="pairs"><div><dt>Route to the central bank</dt><dd>{esc(way)}</dd></div>' +
                     (f'<div><dt>Where customer money sits</dt><dd>{esc(sentence(tidy(nofig(plain(clean(x["held"])))), 260))}</dd></div>' if okf(x.get('held')) else '') +
                     (f'<div><dt>Settles through</dt><dd>{esc(sentence(tidy(plain(clean(x["cp"]))), 200))}</dd></div>' if okf(x.get('cp')) else '') +
                     f'<div><dt>Based on</dt><dd>{esc(CONF.get(x.get("conf"), "From a secondary source"))}</dd></div></dl></li>')
    mk = ''.join(f'<a href="/{MS[c]}/">{flag(c)}{esc(NAME[c])}</a>' if c in NAME else f'<span class="chip-plain"><code>{esc(c)}</code></span>' for c in e['ccy'] if c != 'MULTI')
    if 'MULTI' in e['ccy']: mk += '<span class="chip-plain">Many markets</span>'
    site = SITE.get(base) or next((SITE[x['id']] for x in e['rows'] if x['id'] in SITE), None) or guess_site(e)
    srcs = [s for x in e['rows'] for s in x.get('sources', [])]
    body = f'''<section class="hero"><p class="eyebrow">{kdot(e["kind"])} {esc(KINDS[e["kind"]]["label"])}</p><h1>{esc(e["name"])}</h1><p class="lede">{esc(ent_text(e))}</p>
{f'<p><a class="ext" href="{esc(site)}" rel="noopener" target="_blank">Official site {icon("ext",14)}</a></p>' if site else ''}</section>
<section class="sec"><div class="sec-h"><h2>{"Roles" if len(roles) > 1 else "Role"}</h2></div><ul class="roles">{"".join(roles)}</ul></section>
<section class="sec"><div class="sec-h"><h2>Markets</h2></div><div class="chips big">{mk}</div></section>
{sources_block(srcs)}'''
    write(f'/players/{e["slug"]}/', layout(e['name'], body, crumbs=[('Home','/'),('Layers','/layers/'),(f'{k0} {LAYERS[k0]["n"]}', f'/layers/{k0}/'),(re.sub(r"\s*\(.*?\)", "", e['name']),None)], rail=layer_rail(k0), desc=ent_text(e)))

def page_group(e):
    items = []
    def _way(x): return WAY1.get(kind_of(x)) if str(x['layer']) == '1' else WAY.get(x['way'], WAY['none'])
    def _cp(x): return sentence(tidy(plain(clean(x['cp']))), 160) if okf(x.get('cp')) else ''
    firsts = [m['rows'][0] for m in e['members']]
    shared = len({(_way(x), _cp(x)) for x in firsts}) == 1
    for m in e['members']:
        x = m['rows'][0]; L = str(x['layer'])
        way = WAY1.get(kind_of(x)) if L == '1' else WAY.get(x['way'], WAY['none'])
        site = SITE.get(m['id']) or guess_site(m)
        nm = esc(m['name']) + (f' <a class="ext" href="{esc(site)}" rel="noopener" target="_blank" aria-label="Official site">{icon("ext",14)}</a>' if site else '')
        mk = ''.join(flag(c) for c in m['ccy'] if c in NAME)
        if shared:
            items.append(f'<li><b>{nm}</b> {mk}<p>{esc(sentence(tidy(plain(clean(x["fn"]))), 220))}</p></li>'); continue
        items.append(f'<li><b>{nm}</b> {mk}<p>{esc(sentence(tidy(plain(clean(x["fn"]))), 220))}</p><dl class="pairs"><div><dt>Route to the central bank</dt><dd>{esc(way)}</dd></div>' +
                     (f'<div><dt>Settles through</dt><dd>{esc(sentence(tidy(plain(clean(x["cp"]))), 160))}</dd></div>' if okf(x.get('cp')) else '') +
                     f'<div><dt>Based on</dt><dd>{esc(CONF.get(x.get("conf"), "From a secondary source"))}</dd></div></dl></li>')
    k0 = e['layers'][0]
    mk = ''.join(f'<a href="/{MS[c]}/">{flag(c)}{esc(NAME[c])}</a>' for c in e['ccy'] if c in NAME)
    if 'MULTI' in e['ccy'] or any(c not in NAME for c in e['ccy'] if c != 'MULTI'): mk += '<span class="chip-plain">Many markets</span>'
    srcs = [s for x in e['rows'] for s in x.get('sources', [])]
    body = f'''<section class="hero"><p class="eyebrow">{kdot(e["kind"])} {esc(KINDS[e["kind"]]["label"])}</p><h1>{esc(e["name"])}</h1><p class="lede">{esc(e["line"])}</p></section>
{f'<section class="sec"><dl class="pairs"><div><dt>Route to the central bank</dt><dd>{esc(_way(firsts[0]))}</dd></div>' + (f'<div><dt>Settles through</dt><dd>{esc(_cp(firsts[0]))}</dd></div>' if _cp(firsts[0]) else '') + '</dl></section>' if shared else ''}
<section class="sec"><div class="sec-h"><h2>Examples</h2><p>Real and sourced, not a full list</p></div><ul class="roles">{"".join(items)}</ul></section>
<section class="sec"><div class="sec-h"><h2>Markets</h2></div><div class="chips big">{mk}</div></section>
{sources_block(srcs)}'''
    write(f'/players/{e["slug"]}/', layout(e['name'], body, crumbs=[('Home','/'),('Layers','/layers/'),(f'{k0} {LAYERS[k0]["n"]}', f'/layers/{k0}/'),(e['name'],None)], rail=layer_rail(k0), desc=e['line']))

def page_cards():
    g = ent_of('P036')
    chips = f'<a href="{plink("P036")}">{kdot("net")}{esc(g["name"])}</a>' if g else ''
    chips = '<p class="pnote">Push payment products the networks run on top of the card rails</p>' + chips
    body = f'''<section class="hero"><p class="eyebrow">{kdot("net")} Networks</p><h1>Card networks</h1><p class="lede">Visa and Mastercard set the rules and carry the authorisation and clearing messages. They hold no customer money. Each day they net what every issuing and acquiring bank owes, and the banks settle those amounts through the networks' settlement banks, which settle in turn at the central bank.</p></section>
<div class="chips big">{chips}</div>
'''
    write('/networks/cards/', layout('Card networks', body, crumbs=[('Home','/'),('Layers','/layers/'),('4 Networks and processors','/layers/4/'),('Card networks',None)], rail=layer_rail('4')))

COMPARE_ROWS = ['Central bank','Final at','Core rails run by','Instant payments','Instant payments are final','Payment companies at the central bank','Deposits held by']
def page_compare(a, b):
    pa, pb = profile(a), profile(b)
    tr = []
    for k in COMPARE_ROWS:
        va = pa.get(k, ('',None))[0]; vb = pb.get(k, ('',None))[0]
        same = k != 'Central bank' and k != 'Final at' and va == vb
        tr.append(f'<tr data-same="{1 if same else 0}"><th scope="row">{esc(k)}</th><td>{esc(va)}</td><td>{esc(vb)}</td></tr>')
    ob = lambda c: f'<p class="cmp-obs"><b>{esc(plain(STORIES[c]["obs"]))}</b> {esc(plain(STORIES[c]["take"]))}</p>' if c in STORIES else ''
    tr.append(f'<tr class="tall" data-same="0"><th scope="row">What stands out</th><td>{ob(a)}</td><td>{ob(b)}</td></tr>')
    sel = lambda cur, which: '<select data-cmp="' + which + '" aria-label="Market">' + ''.join(f'<option value="{MS[c]}"{" selected" if c == cur else ""}>{esc(NAME[c])}</option>' for c in MARKETS) + '</select>'
    body = f'''<section class="hero"><h1>Compare</h1><p class="lede">The same questions, answered market by market.</p></section>
<div class="cmp-bar">{sel(a,"a")}<span>and</span>{sel(b,"b")}<label class="tog"><input type="checkbox" data-diff> Only differences</label></div>
<div class="tbl-wrap"><table class="tbl ctable"><thead><tr><th></th><th><a href="/{MS[a]}/">{flag(a)}{esc(NAME[a])}</a></th><th><a href="/{MS[b]}/">{flag(b)}{esc(NAME[b])}</a></th></tr></thead><tbody>{"".join(tr)}</tbody></table></div>
<section class="sec"><div class="sec-h"><h2>Seen versus final</h2><p>Same scale for both markets</p></div>
<div class="grid2"><div class="panel"><h3 class="ph">{flag(a)} {esc(NAME[a])}</h3>{finality_chart(FIN.get(a), a)}</div><div class="panel"><h3 class="ph">{flag(b)} {esc(NAME[b])}</h3>{finality_chart(FIN.get(b), b)}</div></div></section>
<section class="sec"><div class="sec-h"><h2>Distance from the central bank</h2></div>
<div class="grid2"><div><h3 class="ph">{flag(a)} {esc(NAME[a])}</h3>{ladder(SYN["ladder"][a], a)}</div><div><h3 class="ph">{flag(b)} {esc(NAME[b])}</h3>{ladder(SYN["ladder"][b], b)}</div></div></section>'''
    write(f'/compare/{MS[a]}-{MS[b]}/', layout(f'{NAME[a]} and {NAME[b]}', body, crumbs=[('Home','/'),('Compare','/compare/'),(f'{NAME[a]} and {NAME[b]}',None)]))

def page_compare_index():
    tr = []
    for k in COMPARE_ROWS[1:]:
        cells = ''.join(f'<td>{esc(profile(c).get(k, ("",None))[0])}</td>' for c in MARKETS)
        tr.append(f'<tr><th scope="row">{esc(k)}</th>{cells}</tr>')
    head = ''.join(f'<th><a href="/{MS[c]}/">{flag(c)}{c}</a></th>' for c in MARKETS)
    sel = lambda cur, which: '<select data-cmp="' + which + '" aria-label="Market">' + ''.join(f'<option value="{MS[c]}"{" selected" if c == cur else ""}>{esc(NAME[c])}</option>' for c in MARKETS) + '</select>'
    body = f'''<section class="hero"><h1><span class="lt">Side by side</span> Compare markets</h1><p class="lede">Pick two markets to set side by side, or read all nine at once.</p></section>
<div class="cmp-bar">{sel("CAD","a")}<span>and</span>{sel("GBP","b")}<a class="btn" data-cmp-go href="/compare/canada-united-kingdom/">Compare</a></div>
<div class="tbl-wrap wide"><table class="tbl allm"><thead><tr><th></th>{head}</tr></thead><tbody>{"".join(tr)}</tbody></table></div>'''
    write('/compare/', layout('Compare markets', body, crumbs=[('Home','/'),('Compare',None)]))

def page_about():
    body = f'''<section class="hero"><h1>How this was made</h1><p class="lede">An open map of who holds the money as a payment moves, built from central bank, operator and regulator documents.</p></section>
<div class="prose">
<h2>Sources</h2><p>Every row cites its sources. Central banks, payment system operators and regulators come first, then company filings, then secondary reporting. Where a detail is not published, the site describes how that kind of system normally works and marks it as inferred.</p>
<h2>Scope</h2><p>The map covers who does what as money moves. It does not cover enforcement, fines or legal advice. Examples name well-known players only, and players of the same kind are grouped.</p><p>A player gets its own page when it holds a seat, licence or charter that changes where money settles, or runs a payment system, and people working in that market know the name. The examples are a curated set, not a full list.</p>
<h2>Tools</h2><p>Research, drafting and the site build were done with Claude, an AI model made by Anthropic, and reviewed by hand. The data was last checked in {AS_OF}.</p>
<h2>Corrections</h2><p>Spotted something wrong or out of date? Email <a href="mailto:tarique@fintechnorth.ca">tarique@fintechnorth.ca</a> (tarique@fintechnorth.ca) with the page and a source.</p>
</div>'''
    write('/about/', layout('How this was made', body, crumbs=[('Home','/'),('About',None)]))

def page_404():
    body = '<section class="hero"><h1>Page not found</h1><p class="lede">That page does not exist. Try the <a href="/layers/">layers</a>, the <a href="/markets/">markets</a> or search.</p></section>'
    os.makedirs(DIST, exist_ok=True)
    open(os.path.join(DIST, '404.html'), 'w').write(layout('Not found', body))

def search_index():
    idx = [dict(t=NAME[c], s='Market', u=f'/{MS[c]}/', k=c) for c in MARKETS]
    idx += [dict(t=f'Layer {k}, {L["n"]}', s='Layer', u=f'/layers/{k}/') for k, L in LAYERS.items()]
    idx += [dict(t=s['name'], s=f'Payment system, {NAME[s["ccy"]]}', u=syslink(s['ccy'], s['name'])) for s in SYSTEMS.values()]
    idx += [dict(t=e['name'], s=KINDS[e['kind']]['label'], u=f'/players/{e["slug"]}/') for e in ENT.values()]
    idx.append(dict(t='Card networks', s='Networks', u='/networks/cards/'))
    idx += [dict(t=t, s='Concept', u=f'/concepts/{k}/') for k, t, _ in CONCEPT_LIST]
    os.makedirs(os.path.join(DIST, 'assets'), exist_ok=True)
    json.dump(idx, open(os.path.join(DIST, 'assets', 'search.json'), 'w'), ensure_ascii=False)

def agent_files():
    """Machine-readable outputs for agents: llms.txt and JSON per market."""
    os.makedirs(os.path.join(DIST, 'api'), exist_ok=True)
    lines = ['# Who Holds the Money', '', '> How money moves in nine markets, from the app down to the central bank, and who holds it at each step. Open data, sourced.', '', '## Markets']
    for c in MARKETS:
        prof = {k: v for k, (v, u) in profile(c).items()}
        json.dump(dict(code=c, name=NAME[c], summary=plain(MODELS[c]['line']), profile=prof,
                       systems=[dict(name=s['name'], carries=s['what'], run_by=s['owner'], settles=WHENL.get(s['when'])) for s in SYSTEMS.values() if s['ccy'] == c],
                       players=[dict(name=e['name'], kind=KINDS[e['kind']]['label'], url=f'/players/{e["slug"]}/') for e in ENT.values() if c in e['ccy']]),
                  open(os.path.join(DIST, 'api', f'{c.lower()}.json'), 'w'), ensure_ascii=False, indent=1)
        lines.append(f'- [{NAME[c]}](/{MS[c]}/): {plain(MODELS[c]["line"])} Data: /api/{c.lower()}.json')
    lines += ['', '## Layers'] + [f'- [Layer {k}, {L["n"]}](/layers/{k}/): {L["d"]}' for k, L in LAYERS.items()]
    open(os.path.join(DIST, 'llms.txt'), 'w').write('\n'.join(lines) + '\n')

CONCEPT_LIST = [
    ('instant', 'Instant payments', 'The customer sees the money in seconds. When it is final at the central bank differs by market.'),
    ('batch', 'Batch payments', 'Payroll, bills and direct debits, sent in files and settled as net totals.'),
    ('wallets', 'Wallets', 'Where the money behind a wallet balance actually sits.'),
]
BATCH = {'ACSS', 'ACH', 'Bacs', 'BECS', 'NEFT', 'GIRO', 'STEP2', 'NACH', 'Núclea'}

def concept_shell(slug_, title, lede, body):
    nav = ''.join(f'<a href="/concepts/{k}/"{" aria-current=page" if k == slug_ else ""}>{esc(t)}</a>' for k, t, _ in CONCEPT_LIST)
    page = f'''<section class="hero"><p class="eyebrow">Concept</p><h1>{esc(title)}</h1><p class="lede">{esc(lede)}</p></section>
<nav class="cnav" aria-label="Concepts">{nav}</nav>{body}'''
    write(f'/concepts/{slug_}/', layout(title, page, crumbs=[('Home','/'),('Concepts','/concepts/'),(title,None)], desc=lede))

OWNSHORT = {'industry':'bank-owned','central_bank':'central bank','mixed':'central bank and industry','private':'a company','public':'government'}
def owner_of(c, rail):
    r = next((x for x in PATHS.get(c, {}).get('rails', []) if x['name'].lower().startswith(rail.lower().split()[0])), None)
    return ('run by ' + OWNSHORT.get(r['owner_type'], '')) if r else ''

def concept_rows(pick):
    rows = []
    for c in MARKETS:
        for f in FIN.get(c, []):
            if pick(c, f): rows.append((c, f))
    order = lambda b: BK.index(b) if b in BK else 2
    rows.sort(key=lambda cf: (order(cf[1]['final']), order(cf[1]['seen']), NAME[cf[0]]))
    return rows

def page_concepts():
    cards = ''.join(f'<li><a href="/concepts/{k}/"><b>{esc(t)}</b><span>{esc(d)}</span></a></li>' for k, t, d in CONCEPT_LIST)
    body = f'''<section class="hero"><h1><span class="lt">One idea at a time</span> Concepts</h1><p class="lede">One idea at a time, set side by side across markets. Every market does it differently.</p></section>
<ul class="mindex concepts">{cards}</ul>'''
    write('/concepts/', layout('Concepts', body, crumbs=[('Home','/'),('Concepts',None)]))

    # instant
    inst = concept_rows(lambda c, f: f.get('seen') == 'seconds' and 'card' not in f['rail'].lower() and f['rail'].lower() != 'eftpos')
    items = []
    for c, f in inst:
        name = 'Interac e-Transfer' if f['rail'] == 'Interac' else f['rail']
        if any(r.get('status') == 'planned' and r['name'] == f['rail'] for r in PATHS[c]['rails']): name += ', phasing in'
        href = syslink(c, f['rail']) if f'{c}/{slug(f["rail"])}' in SYSTEMS else f'/{MS[c]}/'
        items.append((f'<a href="{href}">{esc(name)}</a>', f'{NAME[c]} · {owner_of(c, f["rail"]) or "run by industry"}', f))
    zelle = {'rail': 'Zelle', 'seen': 'seconds', 'final': 'next day', 'basis': 'net'}
    pos = next(i for i, it in enumerate(items) if it[2]['final'] == 'next day') if any(it[2]['final'] == 'next day' for it in items) else len(items)
    items.insert(pos, ('<a href="/united-states/">Zelle</a>', 'United States · run by a bank-owned network', zelle))
    notes = '''<ul class="notes">
<li><b>Same experience, different finish</b><p>FedNow, RTP and Pix are final the moment the money arrives. Zelle and Interac e-Transfer feel the same to the customer, but the banks settle with each other later, mostly through ACH in the United States and through Lynx the next business day in Canada.</p></li>
<li><b>Who runs it shapes who can join</b><p>Central bank rails such as FedNow and Pix sit beside industry rails such as RTP and Faster Payments. In Brazil and the United Kingdom, licensed payment companies can settle at the central bank themselves.</p></li>
</ul>'''
    srcs = [[host(f['src']), f['src']] for _, f in inst if f.get('src')] + [['Early Warning, Zelle settlement through ACH files', 'https://www.earlywarning.com/blog/part-4-levvel-shares-top-architecture-considerations-zeller'], ['The Clearing House, Zelle on the RTP network', 'https://finextra.com/pressarticle/86337/zelle-comes-to-the-rtp-network']]
    body = f'''<section class="sec"><div class="sec-h"><h2>Seen in seconds. Final when?</h2><p>Every instant payment on this site, sorted by when it becomes final.</p></div><div class="panel">{fin_rows(items)}</div></section>
<section class="sec"><div class="sec-h"><h2>What stands out</h2></div>{notes}</section>{sources_block(srcs)}'''
    concept_shell('instant', 'Instant payments', CONCEPT_LIST[0][2], body)

    # batch
    bat = concept_rows(lambda c, f: f['rail'] in BATCH)
    items = [(f'<a href="{syslink(c, f["rail"])}">{esc(f["rail"])}</a>' if f'{c}/{slug(f["rail"])}' in SYSTEMS else esc(f['rail']), f'{NAME[c]} · {owner_of(c, f["rail"]) or "run by industry"}', f) for c, f in bat]
    srcs = [[host(f['src']), f['src']] for _, f in bat if f.get('src')]
    body = f'''<section class="sec"><div class="sec-h"><h2>Sent in files, settled as totals</h2><p>Batch systems carry payroll, bills and direct debits. Banks exchange files through the day and settle the net amount they owe each other at the central bank.</p></div><div class="panel">{fin_rows(items) if items else "<p>No batch systems mapped yet.</p>"}</div></section>{sources_block(srcs)}'''
    concept_shell('batch', 'Batch payments', CONCEPT_LIST[1][2], body)

    # wallets
    rungs = []
    for i, rg in enumerate(WAL['rungs']):
        chips = []
        for m in WAL['markets']:
            if rg['key'] in m['used']: chips.append(f'<span class="wc u{" cbc" if rg["key"]=="cb" else ""}">{esc(m["name"])}, {esc(m["who"])}</span>')
            elif rg['key'] in m['allowed']: chips.append(f'<span class="wc">{esc(m["name"])}</span>')
        last = rg['key'] == 'cb'
        rungs.append(f'<li class="wr{" last" if last else ""}"><span class="wr-dot"></span><div><b>{esc(rg["name"])}</b><p>{esc(rg["line"])}</p><div class="chips">{"".join(chips)}</div></div></li>')
    rows = []
    for m in WAL['markets']:
        src = m['src'] or [[s[0] if not re.match(r"^S\d+$", str(s[0])) else host(s[1]), s[1]] for pid in m.get('rows', []) for s in ROWS[pid]['sources'][:1]]
        link = f'<a href="/{MS[m["code"]]}/">{flag(m["code"])}{esc(m["name"])}</a>' if m['code'] in NAME else f'{flag(m["code"])}{esc(m["name"])}'
        srcl = ''.join(f'<a class="src1" href="{esc(u)}" rel="noopener" target="_blank">{esc(l)}</a>' for l, u in src[:2])
        rows.append(f'<li><div class="wm-h">{link}<span>{esc(m["who"])}</span></div><p>{esc(m["line"])}</p><div class="wm-s">{srcl}<span class="cf">{esc(CONF.get(m["conf"], ""))}</span></div></li>')
    body = f'''<section class="sec"><div class="sec-h"><h2>Behind the balance</h2><p>Down is closer to the central bank. A filled name is where the largest players hold the money. An outlined name is what the rules allow.</p></div>
<ol class="wladder">{"".join(rungs)}</ol></section>
<section class="sec"><div class="sec-h"><h2>Market by market</h2></div><ul class="wmk">{"".join(rows)}</ul></section>'''
    concept_shell('wallets', 'Wallets', CONCEPT_LIST[2][2], body)

def build():
    if os.path.exists(DIST): shutil.rmtree(DIST)
    os.makedirs(os.path.join(DIST, 'assets'))
    open(os.path.join(DIST, 'assets', 'site.css'), 'w').write(CSS)
    open(os.path.join(DIST, 'assets', 'site.js'), 'w').write(JS)
    import base64
    os.makedirs(os.path.join(DIST, 'assets', 'flags'))
    for c, uri in FLAG.items():
        open(os.path.join(DIST, 'assets', 'flags', c.lower() + '.svg'), 'wb').write(base64.b64decode(uri.split(',', 1)[1]))
    page_home(); page_concepts(); page_layers_index(); page_markets_index(); page_compare_index(); page_about(); page_404(); page_cards()
    for k in LAYERS: page_layer(k)
    for c in MARKETS: page_market(c)
    for sid in SYSTEMS: page_system(sid)
    for base in ENT: page_player(base)
    for a, b in itertools.permutations(MARKETS, 2): page_compare(a, b)
    search_index(); agent_files()
    json.dump({'cleanUrls': True, 'trailingSlash': True}, open(os.path.join(DIST, 'vercel.json'), 'w'))
    n = sum(len(f) for _, _, f in os.walk(DIST))
    print(f'built {n} files')

if __name__ == '__main__':
    build()
