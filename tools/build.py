"""Build the Settlement Map site from site/ and keep the Render inputs in sync.

site/ is the single source. This script:
  1. applies the participant function model and the verified copy fixes
  2. generates layers/index.html from the homepage, so the two cannot drift
  3. adds a skip link to every interior page
  4. repacks settlement-map-site.tar.gz from site/ and copies the overridden files into
     v9-overrides/, so whatever Render runs (unpack, then overlay) publishes exactly site/

Run from the repo root:  python3 -I tools/build.py
Then check:              python3 -I tools/check.py
"""
import pathlib
import re
import runpy
import shutil
import tarfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
OVERRIDES = ROOT / "v9-overrides"
TARBALL = ROOT / "settlement-map-site.tar.gz"


def layers_index():
    home = (SITE / "index.html").read_text()

    def fix(m):
        attr, url = m.group(1), m.group(2)
        if url.startswith(("http", "#", "mailto:")):
            return m.group(0)
        if url.startswith("layers/"):
            return f'{attr}="{url[len("layers/"):]}"'
        return f'{attr}="../{url}"'

    page = re.sub(r'(href|src)="([^"]+)"', fix, home)
    (SITE / "layers" / "index.html").write_text(page)


def skip_links():
    for path in SITE.rglob("*.html"):
        text = path.read_text()
        if '<main class="main"' not in text or "skip-link" in text:
            continue
        text = text.replace('<main class="main"', '<main class="main" id="main"', 1)
        text = re.sub(r"(<body[^>]*>)", r'\1<a class="skip-link" href="#main">Skip to content</a>', text, count=1)
        path.write_text(text)


SEVEN = [  # same names and order as the homepage
    ("7", "Customer interface", "Who initiates the payment", []),
    ("6", "Last mile", "Who delivers it to the recipient", []),
    ("5", "FX and liquidity", "Who converts and funds it", []),
    ("4", "Networks and processing", "Who sets the rules and runs the processing",
     [("4a", "Schemes and networks"), ("4b", "Processing")]),
    ("3", "Multi-market accounts", "Who holds balances across markets", []),
    ("2", "Bank relationships and access", "Who gives access to banks and rails",
     [("2a", "Correspondents"), ("2b", "Sponsor banks")]),
    ("1", "Settlement systems", "Who makes it final", []),
]


def seven_index():
    """Replace the legacy nine-row index on interior layer pages with the homepage's seven."""
    pat = re.compile(r'<nav aria-label="(?:Nine money movement functions|Seven layers of money movement)" class="flat-map compact-map">.*?</nav>', re.S)
    for path in (SITE / "layers").glob("*.html"):
        text = path.read_text()
        if not pat.search(text):
            continue
        here = path.stem
        rows = []
        for n, name, desc, subs in SEVEN:
            group = here == n or here in {s for s, _ in subs}
            sel = " selected" if group else ""
            cur = ' aria-current="page"' if here == n else ""
            rows.append(f'<a class="flat-row{sel}" href="{n}.html"{cur}><span class="layer-number">{n}</span>'
                        f'<span class="layer-content"><strong>{name}</strong><small>{desc}</small></span>'
                        f'<span class="layer-go">↗</span></a>')
            if group:
                for s, sname in subs:
                    ssel = " selected" if here == s else ""
                    scur = ' aria-current="page"' if here == s else ""
                    rows.append(f'<a class="flat-row flat-sub{ssel}" href="{s}.html"{scur}><span class="layer-number">{s}</span>'
                                f'<span class="layer-content"><strong>{sname}</strong><small>Part of {name.lower()}</small></span>'
                                f'<span class="layer-go">↗</span></a>')
        nav = ('<nav aria-label="Seven layers of money movement" class="flat-map compact-map">'
               '<div class="flat-map-head"><span>SEVEN LAYERS</span><span>FUNCTIONS, NOT STEPS</span></div>'
               + "".join(rows) + "</nav>")
        path.write_text(pat.sub(lambda m: nav, text, count=1))


TABS = [  # bottom tab bar on phones: (label, target, sections it covers, accessible name)
    ("Layers", "index.html", {"", "layers", "subfunctions"}, "Layers"),
    ("Systems", "systems/index.html", {"systems"}, "National systems"),
    ("Markets", "markets/index.html", {"markets"}, "Markets"),
    ("Participants", "participants/index.html", {"participants"}, "Participants"),
    ("Money", "holding/index.html", {"holding"}, "Where money sits"),
]


def mobile_shell():
    """Add the phone app shell (shared stylesheet, theme colour, bottom tab bar) to every page."""
    for path in SITE.rglob("*.html"):
        rel = path.relative_to(SITE)
        prefix = "../" * (len(rel.parts) - 1)
        section = rel.parts[0] if len(rel.parts) > 1 else ""
        text = path.read_text()
        text = re.sub(r'<link data-gen="shell"[^>]*>|<meta data-gen="shell"[^>]*>', "", text)
        text = re.sub(r'<nav data-gen="shell".*?</nav>', "", text, flags=re.S)
        head = (f'<meta data-gen="shell" name="theme-color" content="#ffffff">'
                f'<link data-gen="shell" rel="stylesheet" href="{prefix}assets/shell.css">')
        text = text.replace("</head>", head + "</head>", 1)
        links = []
        for label, target, sections, name in TABS:
            here = section in sections and rel.as_posix() != "methodology.html"
            cur = ' aria-current="page"' if rel.as_posix() == target else (' class="here"' if here else "")
            aria = f' aria-label="{name}"' if name != label else ""
            links.append(f'<a href="{prefix}{target}"{cur}{aria}>{label}</a>')
        nav = '<nav data-gen="shell" class="tabbar" aria-label="Sections">' + "".join(links) + "</nav>"
        text = text.replace("</body>", nav + "</body>", 1)
        path.write_text(text)


def pack():
    with tarfile.open(TARBALL, "w:gz") as tar:
        for path in sorted(SITE.rglob("*")):
            if path.is_file():
                tar.add(path, arcname=str(path.relative_to(SITE)))
    for path in OVERRIDES.rglob("*"):
        if path.is_file():
            src = SITE / path.relative_to(OVERRIDES)
            if src.exists():
                shutil.copyfile(src, path)


if __name__ == "__main__":
    runpy.run_path(str(ROOT / "tools" / "apply_model.py"), run_name="__main__")
    runpy.run_path(str(ROOT / "tools" / "copy_fixes.py"), run_name="__main__")
    runpy.run_path(str(ROOT / "tools" / "roles.py"), run_name="__main__")
    layers_index()
    seven_index()
    skip_links()
    mobile_shell()
    pack()
    print("built:", sum(1 for _ in SITE.rglob("*.html")), "pages")
