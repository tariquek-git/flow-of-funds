"""Generate the role matrix on the National systems page from site/assets/system-roles.json.

Each system is one row: name, operator and where it becomes final. Tapping the row opens every
role. Market filters and expand-all are added by a small script, so the full list still works
without it. Rerunnable: the generated section is replaced in place.
"""
import html
import json
import pathlib
import re

SITE = pathlib.Path(__file__).resolve().parent.parent / "site"
DATA = SITE / "assets" / "system-roles.json"
PAGE = SITE / "systems" / "index.html"
NA = "Not covered here."


def esc(s):
    return html.escape(s, quote=True)


def cell(value):
    cls = ' class="na"' if value.strip() == NA else ""
    return f"<dd{cls}>{esc(value)}</dd>"


def build():
    d = json.loads(DATA.read_text())
    markets = []
    for s in d["systems"]:
        if s["market"] not in markets:
            markets.append(s["market"])
    names = {s["id"]: s["name"] for s in d["systems"]}
    used_by = {}
    for s in d["systems"]:
        for _, target in s.get("depends", []):
            if target:
                used_by.setdefault(target, []).append(s["id"])

    def link(target, text):
        return f'<a class="r-link" href="#role-{target}">{esc(text)}</a>'

    rows = []
    for s in d["systems"]:
        pill = f'<span class="r-pill">{esc(s["status"])}</span>' if s.get("status") else ""
        grid = "".join(f"<div><dt>{esc(label)}</dt>{cell(s[key])}</div>" for key, label in d["fields"])
        deps = "".join(f"<li>{link(t, txt) if t else esc(txt)}</li>" for txt, t in s.get("depends", []))
        if deps:
            grid += f'<div class="r-wide"><dt>Depends on</dt><dd><ul class="r-deps">{deps}</ul></dd></div>'
        if used_by.get(s["id"]):
            users = "".join(f"<li>{link(u, names[u])}</li>" for u in used_by[s["id"]])
            grid += f'<div class="r-wide"><dt>Relied on by</dt><dd><ul class="r-deps">{users}</ul></dd></div>'
        rows.append(
            f'<details class="role" id="role-{s["id"]}" data-market="{esc(s["market"])}">'
            f'<summary><span class="r-name">{esc(s["name"])}{pill}<small>{esc(s["market"])} · {esc(s["kind"])}</small></span>'
            f'<span class="r-op"><em>Operated by</em>{esc(s["operator"].split(",")[0])}</span>'
            f'<span class="r-final"><em>Final at</em>{esc(s["final"])}</span>'
            f'<span class="r-chev" aria-hidden="true"></span></summary>'
            f'<dl class="r-grid">{grid}</dl>'
            f'<p class="r-more"><a href="{esc(s["page"])}">{esc(s["name"])} in full</a></p></details>'
        )
    filters = "".join(f'<button type="button" data-market="{esc(m)}" aria-pressed="false">{esc(m)}</button>' for m in markets)
    script = (
        "<script>(function(){var sec=document.currentScript.closest('section');if(!sec)return;"
        "var tools=sec.querySelector('.roles-tools');tools.hidden=false;"
        "var rows=[].slice.call(sec.querySelectorAll('.role'));"
        "var btns=[].slice.call(tools.querySelectorAll('button[data-market]'));"
        "btns.forEach(function(b){b.addEventListener('click',function(){var m=b.getAttribute('data-market');"
        "btns.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});"
        "rows.forEach(function(r){r.hidden=!(m==='all'||r.getAttribute('data-market')===m)})})});"
        "var all=tools.querySelector('.roles-all');all.addEventListener('click',function(){"
        "var open=all.getAttribute('aria-expanded')!=='true';all.setAttribute('aria-expanded',open?'true':'false');"
        "all.textContent=open?'Collapse all':'Expand all';"
        "rows.forEach(function(r){if(!r.hidden)r.open=open})});"
        "function go(){var h=location.hash;if(h&&h.indexOf('#role-')===0){var t=sec.querySelector(h);if(t){btns.forEach(function(x){x.setAttribute('aria-pressed',x.getAttribute('data-market')==='all'?'true':'false')});rows.forEach(function(r){r.hidden=false});t.open=true;t.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}}}"
        "go();window.addEventListener('hashchange',go);"
        "})();</script>"
    )
    return (
        '<section class="roles" data-gen="roles" aria-labelledby="roles-h">'
        '<div class="roles-head"><div class="kicker">ROLES BY SYSTEM</div>'
        '<h2 id="roles-h" class="section-title">Who owns, runs and settles each system</h2>'
        '<p class="roles-intro">Tap a system to see every role. Running a system and holding the money are '
        "different jobs, and they are often done by different institutions.</p></div>"
        '<div class="roles-tools" hidden><button type="button" data-market="all" aria-pressed="true">All</button>'
        f'{filters}<button type="button" class="roles-all" aria-expanded="false">Expand all</button></div>'
        f'<div class="roles-list">{"".join(rows)}</div>'
        f'<p class="refnotice">Roles, not routes. “Not covered here” means the atlas has not verified that '
        f'detail. Checked {esc(d["as_of"])}.</p>{script}</section>'
    )


def apply():
    text = PAGE.read_text()
    text = re.sub(r'<section class="roles" data-gen="roles".*?</section>', "", text, flags=re.S)
    anchor = re.search(r'<section aria-labelledby="systems-compare">.*?</section>', text, flags=re.S)
    if anchor is None:
        raise SystemExit("systems/index.html: no place for the role matrix")
    text = text[:anchor.end()] + build() + text[anchor.end():]
    PAGE.write_text(text)


if __name__ == "__main__":
    apply()
    print("role matrix:", len(json.loads(DATA.read_text())["systems"]), "systems")
