"""Regression checks for the Settlement Map. Exits non-zero on any failure.

Covers the defects found in the V9 review so they cannot come back:
  * known false or misleading sentences (CHIPS, RTP, USDC, UPI, RTR)
  * required settlement facts on the high-stakes pages
  * participant/function links must match the explicit model in atlas-data.json
  * every internal link resolves
  * no essential content hidden on mobile, no failing text contrast on white
  * generated pages and the Render tarball match site/

Run from the repo root:  python3 -I tools/check.py
"""
import json
import pathlib
import re
import sys
import tarfile
import urllib.parse

from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
failures = []


def fail(msg):
    failures.append(msg)


def pages():
    return sorted(SITE.rglob("*.html"))


def text_of(path):
    return BeautifulSoup(path.read_text(), "html.parser").get_text(" ", strip=True)


# 1. Sentences that must never reappear on a published page.
FORBIDDEN = [
    "token issuer holds a reserve mix",
    "coordinates network-level settlement",
    "under its own network rules and funding model",
    "settlement under CHIPS rules",
    "RTR is live",
    "RTR launched",
    "RTR has launched",
    "Swift settles",
    "Swift moves the money",
]
for p in pages():
    t = text_of(p)
    for phrase in FORBIDDEN:
        for m in re.finditer(re.escape(phrase.lower()), t.lower()):
            before = t.lower()[max(0, m.start() - 30):m.start()]
            if re.search(r"\b(not|never|no|prove|whether)\b[^.]*$", before):
                continue  # negated or hedged, e.g. "does not prove RTR is live"
            fail(f"forbidden claim '{phrase}' on {p.relative_to(SITE)}")

# 2. Facts that must be present on the high-stakes pages.
REQUIRED = {
    "index.html": ["Covers Canada and the United States", "T2", "CLS", "CIPS"],
    "systems/chips.html": ["Federal Reserve Bank of New York", "does not own the balances"],
    "systems/rtp.html": ["prefunded balance account at a Federal Reserve Bank", "agent"],
    "systems/us-clearing-house.html": ["TCH does not hold those balances"],
    "holding/stablecoin-reserves.html": ["BlackRock", "BNY Mellon", "Other stablecoins are set up differently"],
    "participants/circle.html": ["not shown as performing any layer function"],
    "systems/india-npci.html": ["multilateral net settlement batch"],
    "systems/upi.html": ["RTGS accounts at RBI"],
    "markets/india.html": ["multilateral net settlement batch"],
    "participants/federal-reserve.html": ["Fedwire Funds"],
    "participants/swift.html": ["neither a payment system nor a settlement system"],
}
for rel, needles in REQUIRED.items():
    t = text_of(SITE / rel)
    for n in needles:
        if n not in t:
            fail(f"missing required fact '{n}' on {rel}")

# 3. Participant <-> function links follow the explicit model.
data = json.loads((SITE / "assets" / "atlas-data.json").read_text())
parts, subs = data["participants"], data["subfunctions"]
for pid, p in parts.items():
    if "functions" not in p:
        fail(f"{pid}: no explicit functions list")
        continue
    derived = sorted({subs[f]["layer"] for f in p["functions"]} | set(p.get("direct_layers", [])), reverse=True)
    if sorted(p["layers"], reverse=True) != derived:
        fail(f"{pid}: layers {p['layers']} do not match its functions {derived}")
    soup = BeautifulSoup((SITE / "participants" / f"{pid}.html").read_text(), "html.parser")
    shown = {pathlib.Path(a["href"]).stem for a in soup.select("a[href*='subfunctions/']")}
    extra = shown - set(p["functions"])
    if extra:
        fail(f"{pid} page shows functions it does not perform: {sorted(extra)}")
    active = {b.select_one('.num').get_text(strip=True) for b in soup.select('a.layerbar.active')}
    if active != set(p["layers"]):
        fail(f"{pid} page highlights layers {sorted(active)}, model says {p['layers']}")
for f in (SITE / "subfunctions").glob("*.html"):
    if f.stem not in subs:
        continue
    soup = BeautifulSoup(f.read_text(), "html.parser")
    for a in soup.select("a[href*='participants/']"):
        pid = pathlib.Path(a["href"]).stem
        if pid in parts and f.stem not in parts[pid]["functions"]:
            fail(f"subfunctions/{f.name} lists {pid}, which does not perform it")
for f in (SITE / "layers").glob("*.html"):
    soup = BeautifulSoup(f.read_text(), "html.parser")
    for a in soup.select("ul.fn-list a[href*='participants/'], a.card[href*='participants/']"):
        pid = pathlib.Path(a["href"]).stem
        if pid in parts and f.stem not in parts[pid]["layers"]:
            fail(f"layers/{f.name} lists {pid}, which has no function in that layer")

# 3b. The review's high-stakes claims stay recorded with their sources.
claims = {c["id"] for c in json.loads((SITE / "assets" / "verified-claims.json").read_text())["claims"]}
for cid in ("us-chips-settlement-account", "us-rtp-settlement-account", "usdc-reserve-roles", "india-upi-settlement"):
    if cid not in claims:
        fail(f"verified-claims.json is missing {cid}")
# Interior layer pages use the homepage's seven names.
for f in (SITE / "layers").glob("*.html"):
    if "Nine money movement functions" in f.read_text():
        fail(f"layers/{f.name} still shows the nine-row index")

# 4. Internal links resolve.
for p in pages():
    soup = BeautifulSoup(p.read_text(), "html.parser")
    for tag, attr in (("a", "href"), ("link", "href"), ("img", "src"), ("script", "src")):
        for el in soup.find_all(tag):
            url = el.get(attr)
            if not url or url.startswith(("http:", "https:", "mailto:", "#", "data:")):
                continue
            target = (p.parent / urllib.parse.urlparse(url).path).resolve()
            if not target.exists():
                fail(f"broken link {url} on {p.relative_to(SITE)}")

# 5. Mobile: essential content must reflow, not disappear. Contrast on white must pass AA.
def lum(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


for css in ("assets/atlas.css", "assets/home-v9.css"):
    s = (SITE / css).read_text()
    for bad in ('.v9-layer-desc{display:none', 'systems-compare"]{display:none'):
        if bad in s:
            fail(f"{css} hides essential content on mobile: {bad}")
    for c in set(re.findall(r'(?<![-\w])color:\s*(#[0-9a-fA-F]{6})', s)):
        ratio = 1.05 / (lum(c.lower()) + 0.05)
        if 2.7 <= ratio < 4.5:  # muted text meant for white; lighter values sit on dark panels
            fail(f"{css} text colour {c} is {ratio:.2f}:1 on white")
    # interior pages need a skip link
for p in pages():
    t = p.read_text()
    if '<main class="main"' in t and "skip-link" not in t:
        fail(f"no skip link on {p.relative_to(SITE)}")

# 5b. Scope: archived pages stay unpublished and unlinked.
for gone in ("corridors", "markets/uk.html", "markets/mexico.html", "markets/ecuador.html", "systems/chaps.html",
             "participants/clearbank.html", "review", "QA_V7.md"):
    if (SITE / gone).exists():
        fail(f"{gone} is archived but still published")

# 5c. Every page carries the phone app shell.
for p in pages():
    t = p.read_text()
    if 'class="tabbar"' not in t or "assets/shell.css" not in t:
        fail(f"no mobile app shell on {p.relative_to(SITE)}")

# 5d. Role matrix: one row per system in the data, every field present, every dependency resolves.
roles = json.loads((SITE / "assets" / "system-roles.json").read_text())
ids = {r["id"] for r in roles["systems"]}
sysindex = (SITE / "systems" / "index.html").read_text()
for r in roles["systems"]:
    for key, _ in roles["fields"]:
        if not r.get(key):
            fail(f"system-roles: {r['id']} has no {key}")
    if f'id="role-{r["id"]}"' not in sysindex:
        fail(f"systems/index.html is missing the role row for {r['id']}")
    if not (SITE / "systems" / r["page"]).exists():
        fail(f"system-roles: {r['id']} links to missing page {r['page']}")
    for _, target in r.get("depends", []):
        if target and target not in ids:
            fail(f"system-roles: {r['id']} depends on unknown system {target}")

# 6. Generated outputs match the source.
home = (SITE / "index.html").read_text()
layers_index = (SITE / "layers" / "index.html").read_text()
def _norm(h):
    h = re.sub(r'<nav data-gen="shell".*?</nav>', "", h, flags=re.S)  # tab bar marks a different page
    return re.sub(r'(href|src)="[^"]*"', "", h)
if _norm(home) != _norm(layers_index):
    fail("layers/index.html has drifted from index.html; run tools/build.py")
with tarfile.open(ROOT / "settlement-map-site.tar.gz") as tar:
    for m in tar.getmembers():
        if m.isfile():
            src = SITE / m.name
            if not src.exists() or tar.extractfile(m).read() != src.read_bytes():
                fail(f"tarball out of date for {m.name}; run tools/build.py")
                break
for o in (ROOT / "v9-overrides").rglob("*"):
    if o.is_file():
        src = SITE / o.relative_to(ROOT / "v9-overrides")
        if src.exists() and src.read_bytes() != o.read_bytes():
            fail(f"v9-overrides/{o.relative_to(ROOT / 'v9-overrides')} differs from site/; run tools/build.py")

if failures:
    print(f"FAIL: {len(failures)} problem(s)")
    for f in failures:
        print(" -", f)
    sys.exit(1)
print(f"PASS: {len(pages())} pages checked")
