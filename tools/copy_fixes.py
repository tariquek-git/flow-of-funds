"""Factual copy corrections from the V9 review, verified against primary sources on 30 Oct 2026.

Each fix is an exact replacement. The script fails loudly if the old text is missing and the
new text is not already present, so a silent no-op cannot happen. Safe to rerun.

Run from the repo root:  python3 -I tools/copy_fixes.py
"""
import pathlib
import sys

from bs4 import BeautifulSoup

SITE = pathlib.Path(__file__).resolve().parent.parent / "site"

CHIPS_RULES = "https://www.theclearinghouse.org/-/media/New/TCH/Documents/Payment-Systems/CHIPS/CHIPS-Rules-and-Administrative-Procedures-June-4-2026.pdf"
RTP_RULES = "https://www.theclearinghouse.org/-/media/New/TCH/Documents/Payment-Systems/RTP/RTP-Operating-Rules-Effective-September-30-2026.pdf"
RTP_NOTE = "https://www.theclearinghouse.org/-/media/New/TCH/Documents/Payment-Systems/RTP_Settlement_Model_and_Reconciliation_for_Funding_Participants_November_2020.pdf"
CIRCLE = "https://www.circle.com/transparency"
CRF_NCSR = "https://www.sec.gov/Archives/edgar/data/844779/000119312526003784/d62473dncsrs.htm"
NPCI_SETTLE = "https://www.npci.org.in/PDF/npci/others/UPI-Settlement-Process.pdf"
RBI_PSR = "https://www.rbi.org.in/scripts/PublicationsView.aspx?Id=23127"

USDC = ("Reserves are usually split across several institutions. For USDC, Circle issues the token, "
        "most reserves sit in a BlackRock-managed government money market fund whose custodian is "
        "BNY Mellon, and the rest is cash at banks. Other stablecoins are set up differently.")
UPI_ROW = ("NPCI is the clearing and settlement agency. It calculates each bank's net position and "
           "submits it to RBI's RTGS as a net settlement batch, which debits and credits members' "
           "settlement accounts at RBI. The customer sees the money instantly, while interbank "
           "settlement happens later, in cycles, on a net basis.")

FIXES = [
    # CHIPS
    ("systems/chips.html",
     "High-value interbank payment settlement under CHIPS rules",
     "High-value USD payments between banks. The funds backing them sit in an account at the "
     "Federal Reserve Bank of New York, held for all funding participants."),
    ("systems/chips.html",
     "CHIPS provides final, irrevocable settlement when a payment is released and settled.",
     "A payment is final when CHIPS releases and settles it on the CHIPS system's own records. "
     "Those positions are backed by the CHIPS prefunded balance account at the Federal Reserve Bank "
     "of New York, held for the joint benefit of funding participants. The Clearing House instructs "
     "that account as their agent and does not own the balances."),
    # RTP
    ("systems/rtp.html",
     "Instant interbank clearing and settlement according to RTP arrangements",
     "Instant payments between banks, settled on the RTP system's own ledger. Participants' "
     "positions are backed by a prefunded account at a Federal Reserve Bank."),
    ("systems/rtp.html",
     "RTP provides final instant interbank settlement under its own network rules and funding model; it is not FedNow.",
     "A payment is final when the RTP system records the debit and credit to participants' positions. "
     "Those positions are backed dollar for dollar by a prefunded balance account at a Federal Reserve "
     "Bank, funded through Fedwire or the Fed's liquidity management transfer service. TCH's settlement "
     "note names the Federal Reserve Bank of New York. The account is held for funding participants and "
     "funding agents, with TCH acting as their agent. RTP is not FedNow."),
    # The Clearing House
    ("systems/us-clearing-house.html",
     "RTP provides instant interbank settlement; CHIPS provides high-value clearing and settlement; EPN is an ACH operator under ACH rules.",
     "RTP and CHIPS each settle on their own system records, backed by prefunded accounts at the "
     "Federal Reserve that TCH instructs as agent for participants. TCH does not hold those balances. "
     "EPN is an ACH operator under Nacha rules."),
    # Stablecoin reserves
    ("holding/stablecoin-reserves.html",
     "The token issuer holds a reserve mix such as short-dated government securities, repos and cash deposits.",
     USDC),
    ("holding/index.html",
     "The token issuer holds a reserve mix such as short-dated government securities, repos and cash deposits.",
     USDC),
    ("assets/atlas-data.json",
     "The token issuer holds a reserve mix such as short-dated government securities, repos and cash deposits.",
     USDC),
    # UPI
    ("systems/india-npci.html",
     "NPCI coordinates network-level settlement processes, while RBI-operated central systems provide settlement infrastructure for obligations as applicable.",
     UPI_ROW),
    ("assets/atlas-data.json",
     "NPCI coordinates network-level settlement processes, while RBI-operated central systems provide settlement infrastructure for obligations as applicable.",
     UPI_ROW),
    ("systems/upi.html",
     "Network-led interbank instructions and settlement arrangements via regulated institutions",
     "Instant customer payments. NPCI nets the obligations between banks and settles them in batches "
     "through the banks' RTGS accounts at RBI."),
]

# Primary sources added to each page's evidence box.
SOURCES = {
    "systems/chips.html": [("CHIPS Rules and Administrative Procedures, effective 4 June 2026", CHIPS_RULES, "Primary / rulebook")],
    "systems/rtp.html": [("RTP Operating Rules, effective 30 September 2026", RTP_RULES, "Primary / rulebook"),
                         ("TCH, RTP settlement model for funding participants, November 2020", RTP_NOTE, "Primary / operator")],
    "systems/us-clearing-house.html": [("CHIPS Rules, effective 4 June 2026", CHIPS_RULES, "Primary / rulebook"),
                                       ("RTP Operating Rules, effective 30 September 2026", RTP_RULES, "Primary / rulebook")],
    "holding/stablecoin-reserves.html": [("Circle, USDC reserves, as of 26 October 2026", CIRCLE, "Issuer disclosure"),
                                         ("BlackRock Funds N-CSR, Circle Reserve Fund (custodian named)", CRF_NCSR, "Primary / SEC filing")],
    "systems/india-npci.html": [("NPCI, UPI settlement process", NPCI_SETTLE, "Primary / operator"),
                                ("RBI Payment System Report, December 2024 (RTGS settles NPCI net batches)", RBI_PSR, "Primary / central bank")],
    "systems/upi.html": [("NPCI, UPI settlement process", NPCI_SETTLE, "Primary / operator"),
                         ("RBI Payment System Report, December 2024", RBI_PSR, "Primary / central bank")],
}


def apply_fixes():
    for rel, old, new in FIXES:
        path = SITE / rel
        text = path.read_text()
        if old in text:
            path.write_text(text.replace(old, new))
        elif new not in text:
            sys.exit(f"{rel}: expected text not found and fix not present:\n  {old[:90]}")


def add_sources():
    for rel, items in SOURCES.items():
        path = SITE / rel
        soup = BeautifulSoup(path.read_text(), "html.parser")
        box = soup.select_one("section.sourcebox")
        if box is None:
            sys.exit(f"{rel}: no evidence box")
        have = {a.get("href") for a in box.select("a")}
        note = box.select_one("p.refnotice")
        for title, url, cat in items:
            if url in have:
                continue
            div = soup.new_tag("div", attrs={"class": "source-item"})
            a = soup.new_tag("a", href=url, rel="noopener noreferrer", target="_blank")
            a.string = f"{title} ↗"
            span = soup.new_tag("span")
            span.string = f"Checked 2026-10-30 · {cat}"
            div.append(a)
            div.append(span)
            if note is not None:
                note.insert_before(div)
            else:
                box.append(div)
        path.write_text(str(soup))


if __name__ == "__main__":
    apply_fixes()
    add_sources()
    print("copy fixes applied:", len(FIXES))
