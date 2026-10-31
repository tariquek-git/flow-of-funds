"""Regenerate every participant-to-function link in the static site from atlas-data.json.

Each participant lists the specific functions it performs (``functions``). Its layers are
derived from those functions, never the other way round, so a participant can no longer
inherit every function of a layer it touches.

Rewrites, idempotently:
  * the function list and layer highlights on each participant page
  * the participant list on each layer page and each function page

Run from the repo root:  python3 -I tools/apply_model.py
"""
import json
import pathlib
import sys

from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
DATA = SITE / "assets" / "atlas-data.json"

# The explicit model. Edit here, then rerun. Every id must exist in atlas-data subfunctions.
FUNCTIONS = {
    "wise": ["consumer-apps", "business-apis", "multicurrency-balances", "local-collection",
             "fx-execution", "local-bank-credit"],
    "visa": ["card-schemes", "card-push-payout"],
    "mastercard": ["card-schemes"],
    "swift": ["financial-messaging"],
    "interac": ["domestic-schemes", "instant-links"],
    "marqeta": ["issuer-processing"],
    "clearbank": ["banking-as-service", "scheme-sponsorship"],
    "circle": [],
    "payments-canada": ["domestic-schemes", "clearing-netting", "rtgs"],
    "bank-of-canada": ["central-bank-accounts"],
    "federal-reserve": ["central-bank-accounts", "rtgs", "instant-links", "clearing-netting"],
    "banco-central-do-brasil": ["domestic-schemes", "instant-links", "central-bank-accounts"],
}

# Plain-language note shown under a participant's function list, where the bare list would mislead.
NOTES = {
    "circle": ("Circle is not shown as performing any layer function in this map. It issues USDC. Most "
               "reserves sit in the Circle Reserve Fund, a government money market fund managed by "
               "BlackRock with BNY Mellon as custodian, and the rest is cash at banks.",
               "../holding/stablecoin-reserves.html", "Where stablecoin reserves sit"),
    "clearbank": ("The Bank of England lists ClearBank as a CHAPS direct participant, so it holds its own "
                  "settlement account there. Its clients do not hold that account.",
                  "https://www.bankofengland.co.uk/payments/chaps/", "Bank of England, CHAPS participants"),
    "federal-reserve": ("Fedwire Funds is the Federal Reserve's RTGS. FedNow is its instant service and "
                        "FedACH its ACH operator. All settle in Reserve Bank master accounts, held directly or "
                        "through a correspondent.",
                        "https://www.frbservices.org/financial-services/wires", "Federal Reserve Financial Services, Fedwire Funds"),
    "swift": ("Swift carries payment messages. It is neither a payment system nor a settlement system "
              "and holds no customer funds.",
              "https://www.swift.com/about-us/organisation-governance/swift-oversight", "Swift oversight"),
}

DESC = {
    "federal-reserve": "Operates Fedwire Funds, FedNow and FedACH, and holds master accounts for eligible institutions.",
    "interac": "Operator of Canadian payment services including Interac e-Transfer. Funds stay at participating institutions.",
}


def load():
    data = json.loads(DATA.read_text())
    subs = data["subfunctions"]
    for pid, fns in FUNCTIONS.items():
        unknown = [f for f in fns if f not in subs]
        if unknown:
            sys.exit(f"{pid}: unknown function ids {unknown}")
        p = data["participants"][pid]
        p["functions"] = fns
        p["layers"] = sorted({subs[f]["layer"] for f in fns}, reverse=True)
        if pid in DESC:
            p["desc"] = DESC[pid]
    missing = set(data["participants"]) - set(FUNCTIONS)
    if missing:
        sys.exit(f"participants without an explicit function list: {sorted(missing)}")
    DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    return data


def fn_list(soup, items):
    """items: list of (href, title, desc). Returns a <ul class="fn-list" data-gen> node."""
    ul = soup.new_tag("ul", attrs={"class": "fn-list", "data-gen": "model"})
    for href, title, desc in items:
        li = soup.new_tag("li")
        a = soup.new_tag("a", href=href)
        a.string = title
        li.append(a)
        if desc:
            p = soup.new_tag("p")
            p.string = desc
            li.append(p)
        ul.append(li)
    return ul


def heading(soup, text):
    div = soup.new_tag("div", attrs={"class": "section-top", "data-gen": "model"})
    h = soup.new_tag("h2", attrs={"class": "section-title"})
    h.string = text
    div.append(h)
    return div


def clear_generated(soup):
    for node in soup.select('[data-gen="model"]'):
        node.decompose()


def replace_cards(soup, selector_href, new_nodes):
    """Remove the legacy card grid holding links matching selector_href, and its heading.
    Insert new_nodes where it was. Returns True if a place was found."""
    anchor = None
    first = soup.select_one(f'a.card.cardlink[href*="{selector_href}"]')
    if first is not None:
        grid = first.parent
        head = grid.find_previous_sibling()
        anchor = grid
        if head is not None and "section-top" in (head.get("class") or []):
            head.decompose()
    if anchor is None:
        return False
    for n in new_nodes:
        anchor.insert_before(n)
    anchor.decompose()
    return True


def write(path, soup):
    path.write_text(str(soup))


def participant_pages(data):
    subs = data["subfunctions"]
    for pid, p in data["participants"].items():
        path = SITE / "participants" / f"{pid}.html"
        soup = BeautifulSoup(path.read_text(), "html.parser")
        # where generated content lives: before the source box
        target = soup.select_one('[data-gen-slot="functions"]')
        legacy = soup.select_one('a.card.cardlink[href*="subfunctions/"]')
        clear_generated(soup)
        nodes = [heading(soup, "What it does in this map")]
        if p["functions"]:
            nodes.append(fn_list(soup, [(f"../subfunctions/{f}.html", subs[f]["title"], subs[f]["desc"])
                                        for f in p["functions"]]))
        if pid in NOTES:
            text, href, label = NOTES[pid]
            para = soup.new_tag("p", attrs={"class": "fn-note", "data-gen": "model"})
            para.append(text + " ")
            a = soup.new_tag("a", href=href)
            if href.startswith("http"):
                a["rel"] = "noopener noreferrer"
                a["target"] = "_blank"
            a.string = label
            para.append(a)
            nodes.append(para)
        if legacy is not None:
            replace_cards(soup, "subfunctions/", nodes)
            slot = soup.new_tag("span", attrs={"data-gen-slot": "functions", "hidden": ""})
            nodes[-1].insert_after(slot)
        elif target is not None:
            for n in nodes:
                target.insert_before(n)
        else:
            sys.exit(f"{pid}: no place for function list")
        # layer highlights
        for bar in soup.select("a.layerbar"):
            num = bar.select_one(".num").get_text(strip=True)
            classes = [c for c in bar.get("class", []) if c != "active"]
            mini = bar.select_one(".mini")
            if num in p["layers"]:
                classes.append("active")
                mini.string = "ROLE ↗"
            else:
                mini.string = "Explore ↗"
            bar["class"] = classes
        dek = soup.select_one("p.dek")
        if dek is not None:
            dek.string = p["desc"]
        write(path, soup)


def listing_pages(data):
    parts = data["participants"]
    subs = data["subfunctions"]
    pages = []
    for f in sorted((SITE / "layers").glob("*.html")):
        n = f.stem
        members = [pid for pid, p in parts.items() if n in p["layers"]]
        pages.append((f, members, "Participants with a function in this layer"))
    for f in sorted((SITE / "subfunctions").glob("*.html")):
        if f.stem not in subs:
            continue
        members = [pid for pid, p in parts.items() if f.stem in p["functions"]]
        pages.append((f, members, "Participants that perform this function"))
    for path, members, title in pages:
        soup = BeautifulSoup(path.read_text(), "html.parser")
        slot = soup.select_one('[data-gen-slot="participants"]')
        has_legacy = soup.select_one('a.card.cardlink[href*="participants/"]') is not None
        if slot is None and not has_legacy:
            continue
        clear_generated(soup)
        nodes = []
        if members:
            nodes = [heading(soup, title),
                     fn_list(soup, [(f"../participants/{pid}.html", parts[pid]["name"], parts[pid]["desc"])
                                    for pid in members])]
        marker = soup.new_tag("span", attrs={"data-gen-slot": "participants", "hidden": ""})
        if has_legacy:
            replace_cards(soup, "participants/", nodes + [marker])
        else:
            for n in nodes:
                slot.insert_before(n)
        write(path, soup)


if __name__ == "__main__":
    d = load()
    participant_pages(d)
    listing_pages(d)
    print("model applied:", len(d["participants"]), "participants")
