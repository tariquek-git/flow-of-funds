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
    layers_index()
    skip_links()
    pack()
    print("built:", sum(1 for _ in SITE.rglob("*.html")), "pages")
