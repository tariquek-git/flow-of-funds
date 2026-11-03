"""Narrow the published atlas to its core and unlink everything outside it.

Archived pages move to archive/site/ (kept in git, never published). Links to them are
removed from the remaining pages: list rows, cards and nav items are dropped, inline links in
prose keep their text. Grids and headings left empty are removed too. Safe to rerun.

Core scope: Canada and the United States, with Brazil (Pix) and India (UPI) as contrasting
designs. The seven layers, their functions, where money sits, participants and method.

Run from the repo root:  python3 -I tools/prune.py   (then tools/build.py, tools/check.py)
"""
import pathlib
import shutil

from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
ARCHIVE = ROOT / "archive" / "site"

ARCHIVED = [
    # walkthroughs of single payments: examples, not reference
    "corridors",
    # markets outside the core scope
    "markets/uk.html", "markets/mexico.html", "markets/ecuador.html",
    "systems/boe-rtgs.html", "systems/chaps.html", "systems/faster-payments.html", "systems/bacs.html",
    "systems/uk-boe.html", "systems/uk-payuk.html",
    "participants/clearbank.html",
    # internal working files that were being served publicly
    "review", "README.md", "DESIGN_V7.md", "DESIGN_V9.md", "QA_AND_RED_TEAM.md", "QA_BIAS_GATE.json",
    "QA_BIAS_REVIEW.md", "QA_BIAS_SCAN.json", "QA_V7.json", "QA_V7.md",
]

DROP_CLASSES = {"card", "cardlink", "flat-row", "linkpill", "navlink", "layerbar", "entry-link", "chip", "pill"}


def move():
    for rel in ARCHIVED:
        src = SITE / rel
        if not src.exists():
            continue
        dst = ARCHIVE / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if dst.exists():
            shutil.rmtree(dst) if dst.is_dir() else dst.unlink()
        shutil.move(str(src), str(dst))


def archived_targets():
    out = set()
    for rel in ARCHIVED:
        p = (ARCHIVE / rel)
        if p.is_dir():
            out |= {(SITE / f.relative_to(ARCHIVE)).resolve() for f in p.rglob("*") if f.is_file()}
        else:
            out.add((SITE / rel).resolve())
    return out


def unlink(targets):
    for page in SITE.rglob("*.html"):
        soup = BeautifulSoup(page.read_text(), "html.parser")
        changed = False
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.startswith(("http", "#", "mailto:")):
                continue
            target = (page.parent / href.split("#")[0]).resolve()
            if target not in targets:
                continue
            changed = True
            classes = set(a.get("class") or [])
            parent = a.parent
            if parent is not None and parent.name == "li":
                parent.decompose()
            elif classes & DROP_CLASSES or a.find_parent("nav") is not None or a.find(["div", "h3", "strong"]):
                a.decompose()
            else:
                a.unwrap()
        if not changed:
            continue
        # remove grids, lists and navs that are now empty, with the heading introducing them
        for box in soup.select("div.cards, ul, div.mini-stack, div.role-rows"):
            if not box.find(["a", "li", "div", "p"]):
                head = box.find_previous_sibling()
                if head is not None and "section-top" in (head.get("class") or []):
                    head.decompose()
                box.decompose()
        page.write_text(str(soup))


def cleanup():
    """Scope fixes the link pass cannot make on its own."""
    for page in SITE.rglob("*.html"):
        text = page.read_text()
        new = text.replace("</a>Corridors<a", "</a><a")  # orphaned mobile-nav label
        if new != text:
            page.write_text(new)

    def edit(rel, fn):
        path = SITE / rel
        soup = BeautifulSoup(path.read_text(), "html.parser")
        fn(soup)
        path.write_text(str(soup))

    def systems_index(soup):
        for tr in soup.select("tr"):
            td = tr.find("td")
            if td is not None and td.get_text(strip=True).startswith("UK"):
                tr.decompose()

    def changes(soup):
        for sec in soup.select("section.change-row"):
            k = sec.select_one(".kicker")
            if k is not None and "· UK ·" in k.get_text():
                sec.decompose()

    def methodology(soup):
        for tr in soup.select("table.scope-table tbody tr"):
            cells = tr.find_all("td")
            cur = cells[0].get_text(strip=True)
            if cur == "USD":
                cells[2].string = "United States"
            if cur in ("GBP", "MXN"):
                cells[1].string = "Not in this version"
                cells[2].string = "—"

    edit("systems/index.html", systems_index)
    s = SITE / "systems" / "index.html"
    s.write_text(s.read_text().replace("Five architectures. Different governance.", "Four architectures. Different governance."))
    edit("systems/changes.html", changes)
    edit("methodology.html", methodology)
    home = SITE / "index.html"
    h = home.read_text()
    old = ("Covered in depth for Canada, the United States, the United Kingdom, Brazil and India, "
           "with shorter notes on Mexico and Ecuador.")
    new = ("Covers Canada and the United States, with Brazil and India as contrasting designs. "
           "The United Kingdom and Mexico are not in this version.")
    home.write_text(h.replace(old, new))


if __name__ == "__main__":
    move()
    unlink(archived_targets())
    cleanup()
    print("pruned; published pages:", sum(1 for _ in SITE.rglob("*.html")))
