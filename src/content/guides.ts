// Generated from the audited content pass, expanded + QA'd. Safe to hand-edit; scripts/check-content.ts
// (wired into `pnpm test` + prebuild) keeps slugs unique and every cross-ref + seedId + source + diagram honest.
// Public how-it-works guides. Model: src/content/types.ts.
import type { Guide } from "./types";

export const GUIDES: Guide[] = [
  {
    "slug": "interac-e-transfer-explained",
    "title": "How an Interac e-Transfer actually moves money",
    "answer": "An Interac e-Transfer feels like sending money by email or text, but the email/phone alias and the notification are just messages, the actual money moves as a debit and credit between the two people's banks, with the interbank position settled through Payments Canada's underlying clearing and settlement system.",
    "audience": "Canadians, founders, and ops people who use e-Transfer daily and assume the money travels with the email.",
    "summary": "You send an e-Transfer to someone's email or phone number; Interac uses that alias to route a notification, not the cash itself. The recipient either gets autodeposit or answers a security question to claim it. Behind the scenes, your bank and their bank exchange records and settle the real money through Payments Canada's clearing and settlement system. It feels instant to the people involved, but the interbank settlement that makes the money final runs separately underneath that experience.",
    "parties": [
      {
        "name": "Sender",
        "role": "Person initiating the transfer from their bank's app or site"
      },
      {
        "name": "Sender's bank",
        "role": "Debits the sender and instructs Interac; participant in settlement"
      },
      {
        "name": "Interac",
        "role": "Operates the alias/notification routing and the e-Transfer platform (message layer)"
      },
      {
        "name": "Recipient",
        "role": "Person who receives the notification and claims or autodeposits the funds"
      },
      {
        "name": "Recipient's bank",
        "role": "Credits the recipient; participant in settlement"
      },
      {
        "name": "Payments Canada",
        "role": "Operates the underlying clearing and settlement system that finalizes interbank money movement"
      }
    ],
    "steps": [
      {
        "n": 1,
        "kind": "message",
        "text": "The sender opens their bank app, enters an amount and the recipient's email or phone number (the alias), and optionally sets a security question.",
        "party": "Sender"
      },
      {
        "n": 2,
        "kind": "money",
        "text": "The sender's bank typically places a hold on or debits the funds from the sender's account so the amount is reserved.",
        "party": "Sender's bank"
      },
      {
        "n": 3,
        "kind": "message",
        "text": "Interac looks up the alias in its directory and sends a notification to the recipient, it is routing a message, not carrying the cash.",
        "party": "Interac"
      },
      {
        "n": 4,
        "kind": "message",
        "text": "If the recipient has autodeposit registered, the funds are directed straight to their account; otherwise they click the link and answer the security question to claim it.",
        "party": "Recipient"
      },
      {
        "n": 5,
        "kind": "message",
        "text": "The recipient's bank receives the claim instruction and prepares to credit the recipient's account.",
        "party": "Recipient's bank"
      },
      {
        "n": 6,
        "kind": "money",
        "text": "The recipient's bank credits the recipient's account, often making funds available right away even before the interbank settlement is final.",
        "party": "Recipient's bank"
      },
      {
        "n": 7,
        "kind": "money",
        "text": "The two banks settle the underlying obligation through Payments Canada's clearing and settlement system; this interbank money movement is when funds become final between the banks.",
        "party": "Payments Canada"
      },
      {
        "n": 8,
        "kind": "exception",
        "text": "If the recipient never claims the transfer (no autodeposit and no answer), it expires and the held funds are typically returned to the sender.",
        "party": "Sender"
      }
    ],
    "settlementTiming": "The experience feels instant and funds are often usable immediately, but the interbank settlement that makes the money final runs separately through Payments Canada's underlying clearing and settlement system, on that system's own cycle rather than at the moment the recipient sees the funds. Exact timing depends on the participating banks and the underlying system.",
    "misconceptions": [
      {
        "claim": "The money is attached to the email and travels through Interac to the recipient.",
        "reality": "The email or phone number is just an address Interac uses to route a notification. The actual money moves as a debit and credit between the two banks and is settled through Payments Canada, Interac handles the message layer, banks move the funds."
      },
      {
        "claim": "Because it lands instantly, the transfer is fully settled and irreversible the moment the recipient sees it.",
        "reality": "Showing available funds quickly is the recipient's bank crediting the account; the interbank settlement that makes the money final happens separately through the underlying system. Availability to the recipient and finality between the banks are not the same step."
      }
    ],
    "relatedTerms": [
      "alias-directory",
      "clearing",
      "settlement"
    ],
    "prompts": [
      {
        "prompt": "Show an Interac e-Transfer where the sender uses a security question and the recipient claims it manually, separating the notification messages from the interbank money movement.",
        "seedId": "interac-etransfer",
        "note": "Highlights the message vs money split and the manual claim path."
      },
      {
        "prompt": "Diagram an Interac e-Transfer with autodeposit turned on, showing how the claim step is skipped while settlement still runs underneath.",
        "seedId": "interac-etransfer",
        "note": "Contrasts autodeposit with the security-question flow."
      }
    ],
    "seeds": [
      {
        "seedId": "interac-etransfer",
        "label": "Interac e-Transfer"
      }
    ],
    "sources": [
      {
        "label": "Interac e-Transfer",
        "url": "https://www.interac.ca/en/consumers/products/interac-e-transfer/",
        "publisher": "Interac",
        "kind": "operator",
        "note": "How e-Transfer, aliases, autodeposit, and the request feature work."
      },
      {
        "label": "Clearing and settlement systems",
        "url": "https://www.payments.ca/systems-services/payment-systems",
        "publisher": "Payments Canada",
        "kind": "operator",
        "note": "Underlying systems that clear and settle interbank obligations, including for e-Transfer."
      },
      {
        "label": "Core funding and settlement",
        "url": "https://www.bankofcanada.ca/core-functions/financial-system/",
        "publisher": "Bank of Canada",
        "kind": "authority",
        "note": "Oversight of Canada's payment settlement infrastructure."
      }
    ],
    "railFamily": "interac",
    "jurisdiction": [
      "CA"
    ],
    "updated": "2026-06",
    "diagram": {
      "nodes": [
        {
          "id": "sender",
          "label": "Sender"
        },
        {
          "id": "sender-bank",
          "label": "Sender's bank"
        },
        {
          "id": "interac",
          "label": "Interac"
        },
        {
          "id": "recipient",
          "label": "Recipient"
        },
        {
          "id": "recipient-bank",
          "label": "Recipient's bank"
        },
        {
          "id": "payments-canada",
          "label": "Payments Canada"
        }
      ],
      "legs": [
        {
          "from": "sender",
          "to": "sender-bank",
          "kind": "message",
          "label": "Enter amount and alias",
          "ordinal": 1
        },
        {
          "from": "sender-bank",
          "to": "interac",
          "kind": "message",
          "label": "Send transfer request",
          "ordinal": 2
        },
        {
          "from": "interac",
          "to": "recipient",
          "kind": "message",
          "label": "Notify recipient",
          "ordinal": 3
        },
        {
          "from": "recipient",
          "to": "recipient-bank",
          "kind": "message",
          "label": "Claim or autodeposit",
          "ordinal": 4
        },
        {
          "from": "recipient-bank",
          "to": "recipient",
          "kind": "money",
          "label": "Credit account",
          "ordinal": 5
        },
        {
          "from": "interac",
          "to": "payments-canada",
          "kind": "message",
          "label": "Clear and net positions",
          "ordinal": 6
        },
        {
          "from": "sender-bank",
          "to": "recipient-bank",
          "kind": "money",
          "label": "Settle between banks",
          "ordinal": 7
        },
        {
          "from": "sender-bank",
          "to": "sender",
          "kind": "exception",
          "label": "Unclaimed funds returned",
          "ordinal": 8
        }
      ]
    }
  },
  {
    "slug": "card-tap-to-settlement",
    "title": "From a card tap to settlement: the four-party model (Visa as the example)",
    "answer": "When you tap a card, an authorization is a real-time check and hold that moves no money; the network switch routes that message and later the clearing records, and only afterward do the banks settle the actual money, typically funding the merchant a day or two later, net of fees.",
    "audience": "Founders, product, and ops people who see a card payment as one instant event and don't realize auth, clearing, and settlement are separate.",
    "summary": "The four-party model connects a cardholder, the merchant, the merchant's acquirer, and the cardholder's issuer, with a card network acting as the switch between the banks. A tap first triggers an authorization, a real-time check and hold, with no money moving. Later the transaction clears (records are exchanged) and the banks settle the real money, typically a day or so afterward. The merchant is funded net of the merchant discount, and interchange is generally netted into the settlement between the banks rather than sent as a separate payment.",
    "parties": [
      {
        "name": "Cardholder",
        "role": "Person tapping or inserting the card to pay"
      },
      {
        "name": "Merchant",
        "role": "Business accepting the card and expecting to be funded"
      },
      {
        "name": "Acquirer",
        "role": "The merchant's bank/processor that submits transactions into the network"
      },
      {
        "name": "Card network",
        "role": "Visa or Mastercard acting as the switch that routes messages between acquirer and issuer (message layer)"
      },
      {
        "name": "Issuer",
        "role": "The cardholder's bank that approves or declines and ultimately owes the funds"
      }
    ],
    "steps": [
      {
        "n": 1,
        "kind": "message",
        "text": "The cardholder taps; the terminal captures the card details and sends an authorization request into the acquirer.",
        "party": "Cardholder"
      },
      {
        "n": 2,
        "kind": "message",
        "text": "The network switch routes the authorization request from the acquirer to the correct issuer.",
        "party": "Card network"
      },
      {
        "n": 3,
        "kind": "message",
        "text": "The issuer checks the account for funds or credit and risk, then approves or declines, typically placing a hold on the cardholder's available balance. No money has moved yet.",
        "party": "Issuer"
      },
      {
        "n": 4,
        "kind": "message",
        "text": "The approval travels back through the network to the terminal, and the merchant completes the sale.",
        "party": "Merchant"
      },
      {
        "n": 5,
        "kind": "message",
        "text": "Later, often in a batch, the acquirer submits the captured transactions for clearing, exchanging the records that compute who owes whom. Still messages, not money.",
        "party": "Acquirer"
      },
      {
        "n": 6,
        "kind": "money",
        "text": "Through the network's settlement process, the issuer's and acquirer's banks settle the net positions; this bank-to-bank money movement is when funds become final.",
        "party": "Issuer"
      },
      {
        "n": 7,
        "kind": "money",
        "text": "The acquirer funds the merchant for the sale, typically a day or two after the transaction (often described as T+1 or T+2).",
        "party": "Acquirer"
      },
      {
        "n": 8,
        "kind": "money",
        "text": "The merchant receives the deposit net of the merchant discount rate, the bundled fee that typically covers interchange, network fees, and the acquirer's margin.",
        "party": "Merchant"
      },
      {
        "n": 9,
        "kind": "exception",
        "text": "If the cardholder later disputes the charge, a chargeback can claw funds back from the merchant through the network, separate from this forward flow.",
        "party": "Cardholder"
      }
    ],
    "settlementTiming": "Authorization is real time at the tap, but clearing and settlement follow afterward; merchants are commonly funded around T+1 to T+2, and exact timing varies by acquirer, card program, and country.",
    "misconceptions": [
      {
        "claim": "When the card is approved at the terminal, the money has been taken and moved to the merchant.",
        "reality": "Approval is just an authorization, a check and a hold on the cardholder's balance. The actual money moves later through clearing and settlement between the banks; the merchant is typically funded a day or two afterward."
      },
      {
        "claim": "Interchange is a separate fee the merchant pays out to Visa or Mastercard.",
        "reality": "Interchange generally flows between the banks and is netted within settlement, not sent as a standalone payment. The merchant typically sees it bundled inside the merchant discount, and the network itself mostly routes messages rather than moving the money."
      },
      {
        "claim": "Interac Debit in Canada works the same way, with a hold now and the money captured later.",
        "reality": "Interac Debit works differently: it is a single-message, good-funds rail, so approval and the debit to the customer's account happen together in real time, with no hold-then-capture and no chargebacks. The banks still settle with each other later, which is why the merchant is still funded on a delay."
      }
    ],
    "relatedTerms": [
      "authorization",
      "clearing",
      "settlement",
      "interchange",
      "chargeback",
      "issuer",
      "acquirer",
      "processor"
    ],
    "prompts": [
      {
        "prompt": "Show the Visa four-party model end to end, clearly separating the authorization and hold from the later clearing and settlement money movement.",
        "seedId": "visa-four-party",
        "note": "Use to make the auth vs clearing vs settlement distinction visible."
      },
      {
        "prompt": "Diagram an Interac Debit purchase showing how the network switch routes the authorization message while the cardholder's and merchant's banks settle the real money.",
        "seedId": "interac-debit",
        "note": "Good for contrasting a debit rail with the credit-card four-party flow."
      }
    ],
    "seeds": [
      {
        "seedId": "visa-four-party",
        "label": "Visa four-party model"
      },
      {
        "seedId": "interac-debit",
        "label": "Interac Debit"
      }
    ],
    "sources": [
      {
        "label": "Visa Core Rules and Visa Product and Service Rules",
        "url": "https://www.visa.com/en-us/support/visa-rules",
        "publisher": "Visa",
        "kind": "operator",
        "note": "Network rules covering authorization, clearing, settlement, and the roles of issuer and acquirer."
      },
      {
        "label": "Mastercard rules and standards",
        "url": "https://www.mastercard.com/us/en/business/support/rules.html",
        "publisher": "Mastercard",
        "kind": "operator",
        "note": "Hosts the Mastercard Rules and Transaction Processing Rules covering the four-party scheme, clearing, and settlement."
      },
      {
        "label": "Interac Debit",
        "url": "https://www.interac.ca/en/consumers/products/interac-debit/",
        "publisher": "Interac",
        "kind": "operator",
        "note": "Canada's debit network for in-person and online purchases; the network switch routes transactions between the buyer's and merchant's banks."
      }
    ],
    "railFamily": "card",
    "jurisdiction": [
      "US",
      "CA",
      "global"
    ],
    "updated": "2026-06",
    "diagram": {
      "nodes": [
        {
          "id": "cardholder",
          "label": "Cardholder"
        },
        {
          "id": "merchant",
          "label": "Merchant"
        },
        {
          "id": "acquirer",
          "label": "Acquirer"
        },
        {
          "id": "network",
          "label": "Card network"
        },
        {
          "id": "issuer",
          "label": "Issuer"
        }
      ],
      "legs": [
        {
          "from": "cardholder",
          "to": "merchant",
          "kind": "message",
          "label": "Tap card",
          "ordinal": 1
        },
        {
          "from": "merchant",
          "to": "acquirer",
          "kind": "message",
          "label": "Auth request",
          "ordinal": 2
        },
        {
          "from": "acquirer",
          "to": "network",
          "kind": "message",
          "label": "Route auth request",
          "ordinal": 3
        },
        {
          "from": "network",
          "to": "issuer",
          "kind": "message",
          "label": "Forward auth request",
          "ordinal": 4
        },
        {
          "from": "issuer",
          "to": "network",
          "kind": "message",
          "label": "Approve, place hold",
          "ordinal": 5
        },
        {
          "from": "network",
          "to": "merchant",
          "kind": "message",
          "label": "Approval, sale done",
          "ordinal": 6
        },
        {
          "from": "issuer",
          "to": "acquirer",
          "kind": "money",
          "label": "Banks settle net",
          "ordinal": 7
        },
        {
          "from": "acquirer",
          "to": "merchant",
          "kind": "money",
          "label": "Fund merchant net",
          "ordinal": 8
        },
        {
          "from": "issuer",
          "to": "merchant",
          "kind": "exception",
          "label": "Chargeback claws back",
          "ordinal": 9
        }
      ]
    }
  },
  {
    "slug": "ach-credit-vs-debit",
    "title": "ACH credit vs ACH debit: who pulls and who pushes",
    "answer": "In an ACH credit you push money out to someone; in an ACH debit you pull money in from someone's account with their prior authorization.",
    "audience": "Founders, ops, and product managers in the US deciding whether to send funds (credit) or collect them (debit) over ACH.",
    "summary": "ACH is the US batch network for bank-to-bank transfers, and every transfer is either a credit (push) or a debit (pull). With a credit, the originator's bank pushes funds toward the receiver, the way payroll or vendor payments work. With a debit, the originator pulls funds from the receiver's account after getting authorization, the way bill pay and subscriptions work. Either way, an ODFI originates the entry, an ACH operator routes the batch, and the RDFI delivers it, settling on a scheduled date rather than in real time.",
    "parties": [
      {
        "name": "Originator",
        "role": "The business or person who starts the entry: pushing a credit or pulling a debit"
      },
      {
        "name": "ODFI (Originating Depository Financial Institution)",
        "role": "The originator's bank, which submits the entry into ACH"
      },
      {
        "name": "ACH operator",
        "role": "The Federal Reserve (FedACH) or The Clearing House's EPN, which sorts and routes batched entries between banks and computes net positions"
      },
      {
        "name": "RDFI (Receiving Depository Financial Institution)",
        "role": "The receiver's bank, which posts the entry to the receiver's account"
      },
      {
        "name": "Receiver",
        "role": "The account holder being paid (credit) or charged (debit)"
      }
    ],
    "steps": [
      {
        "n": 1,
        "kind": "message",
        "text": "The originator builds an ACH entry and marks it credit (push money out) or debit (pull money in). For a debit, they must already hold the receiver's authorization to charge the account.",
        "party": "Originator"
      },
      {
        "n": 2,
        "kind": "message",
        "text": "The originator's bank, the ODFI, collects entries into a batch file and submits it to an ACH operator. This is a records exchange, not money moving yet.",
        "party": "ODFI"
      },
      {
        "n": 3,
        "kind": "message",
        "text": "The ACH operator (FedACH or EPN) sorts the batch and routes each entry to the right receiving bank. It is moving instructions and computing the net positions banks owe each other, not pushing the actual cash.",
        "party": "ACH operator"
      },
      {
        "n": 4,
        "kind": "message",
        "text": "The receiver's bank, the RDFI, receives the entry and prepares to post it: a credit will land in the receiver's account, a debit will be drawn from it.",
        "party": "RDFI"
      },
      {
        "n": 5,
        "kind": "money",
        "text": "On the scheduled settlement date, the banks settle their net positions through accounts at the Federal Reserve. This bank-to-bank movement is when the funds actually shift and become final; the operator computes the net amounts, but the money moves between the banks.",
        "party": "ODFI and RDFI"
      },
      {
        "n": 6,
        "kind": "money",
        "text": "The RDFI posts the entry to the receiver's account: for a credit the receiver is paid, for a debit the receiver is charged.",
        "party": "RDFI"
      },
      {
        "n": 7,
        "kind": "exception",
        "text": "If something is wrong, the RDFI can return the entry: an account-closed or insufficient-funds return is typically quick, while an unauthorized-debit return from a consumer typically has a notably longer window. Treat exact timing as program-specific.",
        "party": "RDFI"
      }
    ],
    "settlementTiming": "Batch, not real-time. ACH typically settles on a scheduled date, commonly the next business day, with same-day options available for some entries; funds are final at settlement, and return windows mean a posted entry can still be reversed for a period afterward. Exact timing varies by entry type and program.",
    "misconceptions": [
      {
        "claim": "ACH credit and debit just describe whether money goes in or out of my account.",
        "reality": "Credit vs debit is defined by which direction the originator moves funds, not your account's perspective. In both, the originator initiates the entry: in a credit it pushes funds out, in a debit it pulls funds in from someone else's account."
      },
      {
        "claim": "ACH is instant once I hit send.",
        "reality": "ACH is a batch system. Entries are grouped, routed by an operator, and settled on a scheduled date rather than the moment you submit, which is why timing is usually next-day rather than real-time."
      }
    ],
    "relatedTerms": [
      "odfi",
      "rdfi",
      "clearing",
      "settlement",
      "authorization"
    ],
    "prompts": [
      {
        "prompt": "Show an ACH credit: an employer pushing payroll to an employee through its ODFI and the employee's RDFI.",
        "seedId": "ach-payroll",
        "note": "Push (credit) example."
      },
      {
        "prompt": "Show an ACH debit: a company pulling a monthly subscription charge from a customer's bank account after authorization.",
        "seedId": "ach-debit-web",
        "note": "Pull (debit) example."
      }
    ],
    "seeds": [
      {
        "seedId": "ach-payroll",
        "label": "Payroll over ACH (credit / push)"
      },
      {
        "seedId": "ach-debit-web",
        "label": "Subscription pull over ACH (debit / pull)"
      }
    ],
    "sources": [
      {
        "label": "ACH Network Rules and how credit/debit entries work",
        "url": "https://www.nacha.org/rules",
        "publisher": "Nacha",
        "kind": "authority",
        "note": "Rule-making body for the ACH Network; defines ODFI/RDFI roles, credit vs debit, and returns."
      },
      {
        "label": "FedACH Services overview",
        "url": "https://www.frbservices.org/financial-services/ach",
        "publisher": "Federal Reserve Financial Services",
        "kind": "operator",
        "note": "One of the two ACH operators that route and net batched entries."
      },
      {
        "label": "Automated Clearing House and Fed settlement",
        "url": "https://www.federalreserve.gov/paymentsystems/fedach_about.htm",
        "publisher": "Federal Reserve",
        "kind": "authority",
        "note": "Background on ACH and interbank settlement through Reserve accounts."
      }
    ],
    "railFamily": "ach",
    "jurisdiction": [
      "US"
    ],
    "updated": "2026-06",
    "diagram": {
      "nodes": [
        {
          "id": "originator",
          "label": "Originator"
        },
        {
          "id": "odfi",
          "label": "ODFI (sender's bank)"
        },
        {
          "id": "ach-operator",
          "label": "ACH operator"
        },
        {
          "id": "rdfi",
          "label": "RDFI (receiver's bank)"
        },
        {
          "id": "receiver",
          "label": "Receiver"
        }
      ],
      "legs": [
        {
          "from": "originator",
          "to": "odfi",
          "kind": "message",
          "label": "Originate credit (push)",
          "ordinal": 1
        },
        {
          "from": "odfi",
          "to": "ach-operator",
          "kind": "message",
          "label": "Submit batch file",
          "ordinal": 2
        },
        {
          "from": "ach-operator",
          "to": "rdfi",
          "kind": "message",
          "label": "Route entries, net positions",
          "ordinal": 3
        },
        {
          "from": "odfi",
          "to": "rdfi",
          "kind": "money",
          "label": "Net settlement (credit shown)",
          "ordinal": 4
        },
        {
          "from": "rdfi",
          "to": "receiver",
          "kind": "money",
          "label": "Credit receiver's account",
          "ordinal": 5
        },
        {
          "from": "receiver",
          "to": "rdfi",
          "kind": "money",
          "label": "Debit variant: funds pulled",
          "ordinal": 6
        },
        {
          "from": "rdfi",
          "to": "odfi",
          "kind": "exception",
          "label": "Return entry",
          "ordinal": 7
        }
      ]
    }
  },
  {
    "slug": "payroll-via-ach",
    "title": "How payroll runs over ACH",
    "answer": "Payroll is a batch of ACH credit entries: the employer's bank pushes funds toward each employee's bank so they land on a chosen payday.",
    "audience": "Founders and ops teams running US payroll who want to understand why direct deposit clears when it does.",
    "summary": "Running payroll over ACH means originating one credit (push) entry per employee. The employer hands a batch to its bank, the ODFI, which submits it to an ACH operator that routes each entry to the right receiving bank. The employer commonly funds the run ahead of an effective date so the money is ready to settle, and because entries are submitted early, many employees see direct deposit land the night before payday. Settlement is on the scheduled date, typically a day or two after submission.",
    "parties": [
      {
        "name": "Employer",
        "role": "The originator who builds the payroll batch and sets the effective (pay) date"
      },
      {
        "name": "ODFI (employer's bank)",
        "role": "Originates the ACH credit entries and submits the batch to an operator"
      },
      {
        "name": "ACH operator",
        "role": "FedACH or EPN, which sorts and routes the entries to each employee's bank and computes net positions"
      },
      {
        "name": "RDFI (employee's bank)",
        "role": "Receives each credit and posts it to the employee's account"
      },
      {
        "name": "Employee",
        "role": "The receiver whose account is credited on payday"
      }
    ],
    "steps": [
      {
        "n": 1,
        "kind": "message",
        "text": "The employer (often via a payroll provider) builds a batch of ACH credit entries, one per employee, and sets an effective date: the payday the money should land.",
        "party": "Employer"
      },
      {
        "n": 2,
        "kind": "money",
        "text": "The employer commonly funds the run ahead of time, so the cash backing the credits is in place before the effective date. Exact prefunding rules vary by bank and payroll provider.",
        "party": "Employer"
      },
      {
        "n": 3,
        "kind": "message",
        "text": "The employer's bank, the ODFI, originates the batch and submits it to an ACH operator, typically a day or two before the effective date. This is a records hand-off, not money moving.",
        "party": "ODFI"
      },
      {
        "n": 4,
        "kind": "message",
        "text": "The ACH operator sorts the batch and routes each credit entry to the correct employee's bank. It carries instructions and computes the net positions banks owe each other; it does not push the actual cash.",
        "party": "ACH operator"
      },
      {
        "n": 5,
        "kind": "message",
        "text": "Each employee's bank, the RDFI, receives its entries ahead of the effective date and can see the incoming credits. Many banks make funds available the evening before payday, which is why direct deposit often shows up the night before.",
        "party": "RDFI"
      },
      {
        "n": 6,
        "kind": "money",
        "text": "On the effective settlement date, the banks settle their net positions through the Federal Reserve. This bank-to-bank movement is when the funds actually shift and become final; the operator computes the net amounts, but the money moves between the banks.",
        "party": "ODFI and RDFI"
      },
      {
        "n": 7,
        "kind": "money",
        "text": "The RDFI posts each credit to the employee's account, completing the deposit.",
        "party": "RDFI"
      },
      {
        "n": 8,
        "kind": "exception",
        "text": "If an account is closed or details are wrong, the RDFI returns the entry to the ODFI, and the employer reissues the payment. Some returns can arrive after the deposit appears to have landed.",
        "party": "RDFI"
      }
    ],
    "settlementTiming": "Batch, on a scheduled effective date, commonly a business day or two from submission with same-day ACH available for some runs. Funds typically settle on payday, but many employees see the deposit the prior evening because the receiving bank already holds the entry and chooses to make it available early. Exact timing varies by bank and program.",
    "misconceptions": [
      {
        "claim": "Direct deposit landing the night before means I got paid early.",
        "reality": "Settlement still happens on the effective date. The receiving bank already has the entry and chooses to make the funds available early as a courtesy; the actual bank-to-bank money movement occurs on payday, not when the balance first appears."
      },
      {
        "claim": "The ACH network sends each employee their wages.",
        "reality": "The network routes the instructions and computes what banks owe each other. The employer's bank pushes the funds and the employee's bank posts them; settlement of the real money happens between the banks through the Federal Reserve."
      }
    ],
    "relatedTerms": [
      "odfi",
      "rdfi",
      "settlement",
      "clearing"
    ],
    "prompts": [
      {
        "prompt": "Walk through a payroll run as ACH credits: employer to ODFI to ACH operator to each employee's RDFI, landing on payday.",
        "seedId": "ach-payroll",
        "note": "Full push-to-payday flow."
      },
      {
        "prompt": "Show why a direct deposit lands the night before payday even though settlement is on the effective date.",
        "seedId": "ach-payroll",
        "note": "Highlights the early-availability nuance."
      }
    ],
    "seeds": [
      {
        "seedId": "ach-payroll",
        "label": "Payroll over ACH"
      }
    ],
    "sources": [
      {
        "label": "Direct Deposit via ACH and the ACH Network Rules",
        "url": "https://www.nacha.org/rules",
        "publisher": "Nacha",
        "kind": "authority",
        "note": "Defines ACH credit origination, effective dates, and direct deposit mechanics."
      },
      {
        "label": "FedACH Services and same-day ACH",
        "url": "https://www.frbservices.org/financial-services/ach",
        "publisher": "Federal Reserve Financial Services",
        "kind": "operator",
        "note": "Operator detail on routing and settlement timing for ACH batches."
      },
      {
        "label": "ACH settlement through Reserve accounts",
        "url": "https://www.federalreserve.gov/paymentsystems/fedach_about.htm",
        "publisher": "Federal Reserve",
        "kind": "authority",
        "note": "Background on interbank settlement that finalizes payroll funds."
      }
    ],
    "railFamily": "ach",
    "jurisdiction": [
      "US"
    ],
    "updated": "2026-06",
    "diagram": {
      "nodes": [
        {
          "id": "employer",
          "label": "Employer"
        },
        {
          "id": "odfi",
          "label": "Employer's bank (ODFI)"
        },
        {
          "id": "operator",
          "label": "ACH operator"
        },
        {
          "id": "rdfi",
          "label": "Employee's bank (RDFI)"
        },
        {
          "id": "employee",
          "label": "Employee"
        },
        {
          "id": "fed",
          "label": "Federal Reserve"
        }
      ],
      "legs": [
        {
          "from": "employer",
          "to": "odfi",
          "kind": "message",
          "label": "Submit credit batch",
          "ordinal": 1
        },
        {
          "from": "employer",
          "to": "odfi",
          "kind": "money",
          "label": "Prefund the run",
          "ordinal": 2
        },
        {
          "from": "odfi",
          "to": "operator",
          "kind": "message",
          "label": "Originate batch",
          "ordinal": 3
        },
        {
          "from": "operator",
          "to": "rdfi",
          "kind": "message",
          "label": "Route credit entries",
          "ordinal": 4
        },
        {
          "from": "operator",
          "to": "fed",
          "kind": "message",
          "label": "Send net positions",
          "ordinal": 5
        },
        {
          "from": "fed",
          "to": "odfi",
          "kind": "money",
          "label": "Debit ODFI account",
          "ordinal": 6
        },
        {
          "from": "fed",
          "to": "rdfi",
          "kind": "money",
          "label": "Credit RDFI account",
          "ordinal": 7
        },
        {
          "from": "rdfi",
          "to": "employee",
          "kind": "money",
          "label": "Post deposit",
          "ordinal": 8
        },
        {
          "from": "rdfi",
          "to": "odfi",
          "kind": "exception",
          "label": "Return failed entry",
          "ordinal": 9
        }
      ]
    }
  },
  {
    "slug": "eft-and-pads-explained",
    "title": "How EFT files and pre-authorized debits move money in Canada",
    "answer": "Canadian payroll deposits and automatic bill payments ride EFT: batches of AFT credit and debit entries that banks exchange through Payments Canada's ACSS, with the receiving bank posting to your account on the due date and the banks settling their net positions the next business day at the Bank of Canada.",
    "audience": "Canadians, founders, and ops teams who get paid by direct deposit or collect bills by PAD and want to know what actually happens between the file and the money.",
    "summary": "EFT is Canada's batch bank-to-bank rail, the counterpart to US ACH. An originator such as an employer or a biller hands its bank a file of AFT entries: credits push money out, the way payroll direct deposit works, and debits pull money in under a signed pre-authorized debit (PAD) agreement, the way bills and subscriptions work. The entries are exchanged between the banks through the ACSS, Payments Canada's retail batch clearing system, and the receiving bank posts them so pay typically lands on the due date. The interbank money moves separately: the ACSS tallies what each institution owes on a net basis, and those positions settle the next business day across settlement accounts at the Bank of Canada.",
    "parties": [
      {
        "name": "Originator",
        "role": "The employer or biller who starts the run: pushing payroll credits or pulling PAD debits"
      },
      {
        "name": "Originator's bank",
        "role": "Takes in the AFT file and enters the items into clearing; settles at the Bank of Canada as a direct clearer"
      },
      {
        "name": "ACSS (Payments Canada)",
        "role": "Canada's retail batch clearing system, which exchanges the entries and tallies each institution's net position"
      },
      {
        "name": "Receiver's bank",
        "role": "Posts each entry to the customer's account: a credit lands, a debit is drawn"
      },
      {
        "name": "Receiver",
        "role": "The employee being paid or the customer whose account is debited"
      },
      {
        "name": "Bank of Canada",
        "role": "Holds the settlement accounts where the banks' net positions become final"
      }
    ],
    "steps": [
      {
        "n": 1,
        "kind": "message",
        "text": "The originator builds the payment run, one entry per payment, marked as a credit (push money out, like payroll) or a debit (pull money in, like a monthly bill). A debit needs a signed pre-authorized debit (PAD) agreement from the customer first.",
        "party": "Originator"
      },
      {
        "n": 2,
        "kind": "message",
        "text": "The originator's bank packages the entries into an AFT file (Payments Canada's Standard 005 format) and enters the items into clearing, typically a day or two before the due date. This is a records exchange, not money moving.",
        "party": "Originator's bank"
      },
      {
        "n": 3,
        "kind": "message",
        "text": "The entries are exchanged between the banks through the ACSS, which tallies each institution's multilateral net position: one number per bank for what it owes or is owed. Still instructions and arithmetic, not cash.",
        "party": "ACSS (Payments Canada)"
      },
      {
        "n": 4,
        "kind": "message",
        "text": "The receiver's bank gets its entries ahead of the due date and prepares to post them.",
        "party": "Receiver's bank"
      },
      {
        "n": 5,
        "kind": "money",
        "text": "On the due date the receiver's bank posts the entries: the employee's pay is typically available that day, and the PAD is drawn from the bill payer's account.",
        "party": "Receiver's bank"
      },
      {
        "n": 6,
        "kind": "money",
        "text": "The next business day, the banks settle their ACSS net positions in central bank money, across the Lynx settlement accounts they hold at the Bank of Canada. This interbank movement is when the money becomes final between the institutions.",
        "party": "Bank of Canada"
      },
      {
        "n": 7,
        "kind": "exception",
        "text": "If a debit fails, for example insufficient funds or a closed account, it is returned through the ACSS and the biller misses the collection. A personal payor can also have their bank reimburse a PAD that lacked valid authorization within 90 calendar days under Payments Canada's Rule H1.",
        "party": "Receiver's bank"
      }
    ],
    "settlementTiming": "Batch and deferred-net, not real time. Recipients are typically paid on the due date, but the interbank money moves once a day: the ACSS nets each institution's position and settles it the next business day across settlement accounts at the Bank of Canada. Returns mean a posted debit can still bounce back afterward, and an unauthorized personal PAD can be reimbursed up to 90 days later.",
    "misconceptions": [
      {
        "claim": "My pay arrives by Interac e-Transfer; it is all the same system.",
        "reality": "Different rails. Payroll and government deposits, and PAD bill payments, are EFT: batch AFT files cleared through the ACSS. Interac e-Transfer is a separate alias-addressed transfer that feels immediate; EFT runs on files, due dates, and next-day net settlement."
      },
      {
        "claim": "When the deposit shows up in my account, the money has already moved between the banks.",
        "reality": "Posting and settlement are separate steps. Your bank credits you on the due date, but the banks settle their net ACSS positions the next business day at the Bank of Canada. Availability to you and finality between the banks are not the same moment."
      },
      {
        "claim": "EFT is just the Canadian name for ACH, so everything works the same as in the US.",
        "reality": "It is the closest counterpart, but the plumbing differs: Canada has one clearing system (the ACSS, run by Payments Canada) rather than two competing ACH operators, files follow Payments Canada's Standard 005 rather than Nacha's format, and net positions settle at the Bank of Canada. PADs also carry their own protections under Rule H1, like the 90-day reimbursement for a personal debit without valid authorization."
      }
    ],
    "relatedTerms": [
      "eft-aft",
      "pad",
      "acss",
      "lynx",
      "clearing",
      "settlement"
    ],
    "prompts": [
      {
        "prompt": "Show a Canadian payroll run as an EFT direct deposit: the employer's AFT credit file clearing through the ACSS, the employee paid on the due date, and the banks settling net the next business day at the Bank of Canada.",
        "seedId": "acss-eft-aft-ca",
        "note": "Credit (push) example on the batch rail."
      },
      {
        "prompt": "Map a monthly pre-authorized debit pulling a utility bill from a chequing account, including an NSF return.",
        "seedId": "pad-debit-ca",
        "note": "Debit (pull) example with the return path."
      }
    ],
    "seeds": [
      {
        "seedId": "acss-eft-aft-ca",
        "label": "EFT direct deposit through ACSS"
      },
      {
        "seedId": "pad-debit-ca",
        "label": "Pre-authorized debit (Canada)"
      }
    ],
    "sources": [
      {
        "label": "Retail batch payment system (ACSS)",
        "url": "https://www.payments.ca/systems-services/payment-systems/retail-batch-payment-system",
        "publisher": "Payments Canada",
        "kind": "operator",
        "note": "Operator detail on the ACSS: what it clears (direct deposits, pre-authorized debits, cheques, bill payments) and how net balances settle."
      },
      {
        "label": "Pre-authorized debits and Rule H1",
        "url": "https://www.payments.ca/payment-resources/support-guides/consumer-guides/pre-authorized-debit",
        "publisher": "Payments Canada",
        "kind": "authority",
        "note": "PAD agreements, cancellation, and the 90-day reimbursement for an unauthorized debit."
      },
      {
        "label": "Core functions: financial system and settlement",
        "url": "https://www.bankofcanada.ca/core-functions/financial-system/",
        "publisher": "Bank of Canada",
        "kind": "authority",
        "note": "The Bank of Canada provides settlement accounts for Payments Canada's systems and oversees them."
      }
    ],
    "railFamily": "eft",
    "jurisdiction": [
      "CA"
    ],
    "updated": "2026-07",
    "diagram": {
      "nodes": [
        {
          "id": "originator",
          "label": "Employer / biller"
        },
        {
          "id": "ofi",
          "label": "Originator's bank"
        },
        {
          "id": "acss",
          "label": "ACSS (Payments Canada)"
        },
        {
          "id": "rfi",
          "label": "Receiver's bank"
        },
        {
          "id": "receiver",
          "label": "Employee / payor"
        },
        {
          "id": "boc",
          "label": "Bank of Canada"
        }
      ],
      "legs": [
        {
          "from": "originator",
          "to": "ofi",
          "kind": "message",
          "label": "AFT file: credits and PADs",
          "ordinal": 1
        },
        {
          "from": "ofi",
          "to": "acss",
          "kind": "message",
          "label": "Exchange batch entries",
          "ordinal": 2
        },
        {
          "from": "acss",
          "to": "rfi",
          "kind": "message",
          "label": "Deliver entries, net positions",
          "ordinal": 3
        },
        {
          "from": "rfi",
          "to": "receiver",
          "kind": "money",
          "label": "Credit pay on due date",
          "ordinal": 4
        },
        {
          "from": "receiver",
          "to": "rfi",
          "kind": "money",
          "label": "PAD variant: debit drawn",
          "ordinal": 5
        },
        {
          "from": "ofi",
          "to": "boc",
          "kind": "money",
          "label": "Settle net via Lynx accounts",
          "ordinal": 6
        },
        {
          "from": "boc",
          "to": "rfi",
          "kind": "money",
          "label": "Net credit settled next day",
          "ordinal": 7
        },
        {
          "from": "rfi",
          "to": "ofi",
          "kind": "exception",
          "label": "Return: NSF or no authorization",
          "ordinal": 8
        }
      ]
    }
  },
  {
    "slug": "cross-border-wire",
    "title": "How a cross-border wire actually works",
    "answer": "A cross-border wire moves money by debiting and crediting a chain of bank accounts that banks hold with each other, while SWIFT carries the instructions that tell each bank what to do.",
    "audience": "Smart non-experts new to payments: founders, ops, product, and BD who need to understand why an international wire takes days and loses money along the way.",
    "summary": "When you send an international wire, your bank rarely has a direct relationship with the beneficiary's bank. Instead it routes the payment through one or more correspondent banks where each side holds accounts with the other (nostro/vostro). SWIFT carries the messages that instruct each hop; the actual money moves by debiting one account and crediting the next down the chain. FX conversion, per-hop fees, and time-zone cutoffs are why a wire can take one to several business days.",
    "parties": [
      {
        "name": "Sender (originator)",
        "role": "Pays and instructs their bank to send the wire"
      },
      {
        "name": "Sender's bank",
        "role": "Originates the wire and finds a route to the beneficiary's bank"
      },
      {
        "name": "Correspondent bank(s)",
        "role": "Intermediary banks that hold accounts for each other and pass the payment along the chain"
      },
      {
        "name": "Beneficiary's bank",
        "role": "Receives the final credit and pays out to the beneficiary"
      },
      {
        "name": "Beneficiary",
        "role": "The person or business being paid"
      }
    ],
    "steps": [
      {
        "n": 1,
        "kind": "message",
        "text": "The sender gives their bank the payment details: beneficiary name, account/IBAN, the beneficiary bank's BIC, amount, and currency.",
        "party": "Sender"
      },
      {
        "n": 2,
        "kind": "message",
        "text": "The sender's bank works out a route. If it has no direct relationship with the beneficiary's bank, it picks one or more correspondent banks that can bridge the gap.",
        "party": "Sender's bank"
      },
      {
        "n": 3,
        "kind": "money",
        "text": "The bank debits the sender's account for the amount plus its fee. No money has crossed a border yet; this is a local debit.",
        "party": "Sender's bank"
      },
      {
        "n": 4,
        "kind": "message",
        "text": "The bank sends a SWIFT payment instruction (an ISO 20022 message called a pacs.008, which replaced the old MT103 in November 2025) to the first correspondent. SWIFT carries the instruction, not the funds.",
        "party": "Sender's bank"
      },
      {
        "n": 5,
        "kind": "money",
        "text": "Each hop settles by moving money between the accounts the two banks hold with each other: one bank's nostro account is debited and the counterparty's account is credited, and so on down the chain.",
        "party": "Correspondent bank(s)"
      },
      {
        "n": 6,
        "kind": "money",
        "text": "If the currency changes, a bank in the chain converts it at its own FX rate and typically takes a margin. Intermediaries may also deduct their own fees, so the amount can shrink at each hop.",
        "party": "Correspondent bank(s)"
      },
      {
        "n": 7,
        "kind": "message",
        "text": "The final SWIFT message reaches the beneficiary's bank telling it how much to credit and to whom.",
        "party": "Beneficiary's bank"
      },
      {
        "n": 8,
        "kind": "money",
        "text": "The beneficiary's bank credits the beneficiary's account, often after compliance and sanctions screening. The payment is final once this credit is made and any holds clear.",
        "party": "Beneficiary's bank"
      },
      {
        "n": 9,
        "kind": "exception",
        "text": "If a name, account, or compliance detail looks wrong, a bank in the chain can hold the payment for investigation or return it, which adds days and sometimes more fees.",
        "party": "Beneficiary's bank"
      }
    ],
    "settlementTiming": "Often one to several business days. Each correspondent hop settles on its own schedule, and time-zone cutoffs plus weekends and holidays in any country along the route can pause the chain. Modern tracking (such as SWIFT gpi) has shortened many wires, but speed still depends on the route, currencies, and screening involved.",
    "misconceptions": [
      {
        "claim": "SWIFT sends the money internationally.",
        "reality": "SWIFT is a secure messaging network. It carries the instructions that tell banks what to do; the money itself moves through correspondent accounts that banks hold with each other."
      },
      {
        "claim": "The amount you send is exactly what the beneficiary receives.",
        "reality": "Intermediary banks can deduct fees and apply their own FX margin along the way, so the beneficiary may receive less than the sent amount unless fees are pre-arranged."
      },
      {
        "claim": "A wire is instant because it's electronic.",
        "reality": "Electronic doesn't mean instant. Each hop settles separately and is subject to cutoff times and compliance checks, which is why cross-border wires commonly take days."
      }
    ],
    "relatedTerms": [
      "correspondent-bank",
      "nostro-vostro",
      "settlement",
      "clearing"
    ],
    "prompts": [
      {
        "prompt": "Show a CAD-to-USD cross-border wire from a Canadian company to a US supplier, routed through a correspondent bank with an FX conversion step.",
        "seedId": "wire-fx",
        "note": "Highlights the correspondent hop and where FX margin and fees are taken."
      }
    ],
    "seeds": [
      {
        "seedId": "wire-fx",
        "label": "Cross-border wire with FX"
      }
    ],
    "sources": [
      {
        "label": "SWIFT: cross-border messaging and gpi tracking",
        "url": "https://www.swift.com/about-us/discover-swift",
        "publisher": "SWIFT",
        "kind": "operator",
        "note": "How payment instructions are carried between banks and tracked end to end."
      },
      {
        "label": "Correspondent banking and cross-border settlement",
        "url": "https://www.bis.org/cpmi/about/overview.htm",
        "publisher": "BIS / CPMI",
        "kind": "authority",
        "note": "Background on correspondent relationships and how cross-border payments settle."
      },
      {
        "label": "Bank of Canada: payments and settlement systems",
        "url": "https://www.bankofcanada.ca/core-functions/financial-system/",
        "publisher": "Bank of Canada",
        "kind": "authority",
        "note": "Context on how high-value and cross-border settlement works."
      }
    ],
    "railFamily": "cross-border",
    "updated": "2026-06",
    "diagram": {
      "nodes": [
        {
          "id": "sender",
          "label": "Sender"
        },
        {
          "id": "sender-bank",
          "label": "Sender's bank"
        },
        {
          "id": "correspondent",
          "label": "Correspondent bank(s)"
        },
        {
          "id": "beneficiary-bank",
          "label": "Beneficiary's bank"
        },
        {
          "id": "beneficiary",
          "label": "Beneficiary"
        }
      ],
      "legs": [
        {
          "from": "sender",
          "to": "sender-bank",
          "kind": "message",
          "label": "Payment instruction",
          "ordinal": 1
        },
        {
          "from": "sender",
          "to": "sender-bank",
          "kind": "money",
          "label": "Debit sender",
          "ordinal": 2
        },
        {
          "from": "sender-bank",
          "to": "correspondent",
          "kind": "message",
          "label": "SWIFT instruction",
          "ordinal": 3
        },
        {
          "from": "sender-bank",
          "to": "correspondent",
          "kind": "money",
          "label": "Fund via nostro",
          "ordinal": 4
        },
        {
          "from": "correspondent",
          "to": "beneficiary-bank",
          "kind": "message",
          "label": "Onward SWIFT message",
          "ordinal": 5
        },
        {
          "from": "correspondent",
          "to": "beneficiary-bank",
          "kind": "money",
          "label": "Settle less FX/fees",
          "ordinal": 6
        },
        {
          "from": "beneficiary-bank",
          "to": "beneficiary",
          "kind": "money",
          "label": "Credit beneficiary",
          "ordinal": 7
        },
        {
          "from": "beneficiary-bank",
          "to": "sender-bank",
          "kind": "exception",
          "label": "Hold or return",
          "ordinal": 8
        }
      ]
    }
  },
  {
    "slug": "fbo-account-explained",
    "title": "What an FBO account is, and why fintechs use one",
    "answer": "An FBO (\"for benefit of\") account is one pooled account a fintech holds at a real bank on behalf of all its users, while the fintech's own ledger tracks how much of that pool belongs to each individual user.",
    "audience": "Smart non-experts new to payments: founders, ops, and product at fintechs who need to understand how a neobank or prepaid program holds customer money without being a bank.",
    "summary": "Most fintechs are not banks, so they can't hold deposits directly. Instead they open a custodial \"for benefit of\" account at a partner bank that pools all customer funds together, and the fintech keeps an internal ledger mapping every dollar to a specific user. The bank sees one big balance; the fintech knows whose money is whose. Pass-through deposit insurance can extend to end users, but it is conditional on accurate records and other requirements, not automatic.",
    "parties": [
      {
        "name": "Partner bank",
        "role": "Holds the actual pooled FBO account and the real money"
      },
      {
        "name": "Fintech / program",
        "role": "Owns the customer relationship and runs the ledger tracking per-user balances; is not itself a bank"
      },
      {
        "name": "End users",
        "role": "The customers whose individual balances live inside the pooled account"
      },
      {
        "name": "Sponsor bank / processor",
        "role": "In a common pattern, enables card issuing or money movement on top of the FBO structure"
      }
    ],
    "steps": [
      {
        "n": 1,
        "kind": "message",
        "text": "The fintech opens a custodial account at a partner bank titled \"[Fintech] for benefit of its customers.\" The bank is the place the money legally sits.",
        "party": "Fintech / program"
      },
      {
        "n": 2,
        "kind": "money",
        "text": "A user funds their fintech account (for example by an incoming ACH or card load). The money lands in the single pooled FBO account at the bank.",
        "party": "End users"
      },
      {
        "n": 3,
        "kind": "message",
        "text": "The fintech credits that user's balance on its own internal ledger. The bank's record shows one combined pool; the fintech's ledger shows who owns what.",
        "party": "Fintech / program"
      },
      {
        "n": 4,
        "kind": "money",
        "text": "When a user spends or transfers, money moves out of the pooled account at the bank, and the fintech debits that user's ledger balance to keep the two in sync.",
        "party": "Fintech / program"
      },
      {
        "n": 5,
        "kind": "message",
        "text": "The fintech continuously reconciles its ledger against the bank's pooled balance so the sum of all user balances matches the money actually held.",
        "party": "Fintech / program"
      },
      {
        "n": 6,
        "kind": "message",
        "text": "The FBO account is structured as custodial: the funds are held for the benefit of the end users, not owned by the fintech, which is what keeps customer money separate from the fintech's own operating cash. This is a matter of how the account is titled and treated, not a movement of money.",
        "party": "Partner bank"
      },
      {
        "n": 7,
        "kind": "exception",
        "text": "If the fintech's ledger is inaccurate or incomplete, pass-through deposit insurance may not flow to individual users, and untangling who owns what becomes hard, especially if the fintech fails.",
        "party": "Fintech / program"
      }
    ],
    "settlementTiming": "The FBO structure itself is just where balances are held; timing depends on the rails moving money in and out. ACH credits, for example, commonly settle in one to two business days, while card and instant-payment loads can post faster, though exact timing varies by rail and by the bank's processing windows. Internal ledger updates at the fintech are effectively real time, but a ledger entry is not the same as settled funds at the bank.",
    "misconceptions": [
      {
        "claim": "If my app holds my money, the fintech is my bank.",
        "reality": "In a common pattern the fintech is not a bank. Your money sits in a pooled account at a partner bank, and the fintech tracks your share on its own ledger."
      },
      {
        "claim": "Funds in a fintech app are automatically FDIC insured.",
        "reality": "Pass-through deposit insurance can apply, but it is conditional, for example on the funds being at an insured bank and on accurate per-user records, and it is not guaranteed by the app existing."
      },
      {
        "claim": "Each user has their own account at the bank.",
        "reality": "Typically there is one pooled FBO account at the bank covering many users; the per-user separation lives in the fintech's ledger, not in separate bank accounts."
      }
    ],
    "relatedTerms": [
      "fbo-account",
      "sponsor-bank",
      "program-manager",
      "settlement"
    ],
    "prompts": [
      {
        "prompt": "Show a US neobank holding customer deposits in a pooled FBO account at a sponsor bank, with the fintech's ledger tracking per-user balances.",
        "seedId": "neobank-sponsor-us",
        "note": "Illustrates the split between the bank's pooled balance and the fintech's per-user ledger."
      },
      {
        "prompt": "Show a Canadian prepaid program loading funds into a custodial account at a partner bank held for the benefit of cardholders.",
        "seedId": "prepaid-sponsor-ca",
        "note": "Shows the FBO/custodial pattern in a prepaid card context."
      }
    ],
    "seeds": [
      {
        "seedId": "neobank-sponsor-us",
        "label": "US neobank on a sponsor bank"
      },
      {
        "seedId": "prepaid-sponsor-ca",
        "label": "Canadian prepaid program"
      }
    ],
    "sources": [
      {
        "label": "FDIC: deposit insurance and pass-through coverage",
        "url": "https://www.fdic.gov/financial-institution-employees-guide-deposit-insurance/pass-through-deposit-insurance-coverage",
        "publisher": "FDIC",
        "kind": "authority",
        "note": "How deposit insurance and pass-through coverage to end users can work, and its conditions."
      },
      {
        "label": "NACHA: ACH credits and debits that fund FBO accounts",
        "url": "https://www.nacha.org/rules",
        "publisher": "Nacha",
        "kind": "authority",
        "note": "Rules for the ACH transfers commonly used to load and withdraw from pooled accounts."
      },
      {
        "label": "Federal Reserve: ACH and interbank settlement",
        "url": "https://www.federalreserve.gov/paymentsystems/fedach_about.htm",
        "publisher": "Federal Reserve",
        "kind": "authority",
        "note": "Background on the ACH rails and Reserve-account settlement that move money in and out of pooled accounts."
      }
    ],
    "railFamily": "bank",
    "updated": "2026-06",
    "diagram": {
      "nodes": [
        {
          "id": "end-user",
          "label": "End user"
        },
        {
          "id": "fintech",
          "label": "Fintech / program"
        },
        {
          "id": "ledger",
          "label": "Fintech ledger"
        },
        {
          "id": "partner-bank",
          "label": "Partner bank (FBO)"
        },
        {
          "id": "payee",
          "label": "Payee / merchant"
        }
      ],
      "legs": [
        {
          "from": "fintech",
          "to": "partner-bank",
          "kind": "message",
          "label": "Open custodial FBO",
          "ordinal": 1
        },
        {
          "from": "end-user",
          "to": "partner-bank",
          "kind": "money",
          "label": "Fund into pool",
          "ordinal": 2
        },
        {
          "from": "fintech",
          "to": "ledger",
          "kind": "message",
          "label": "Credit user balance",
          "ordinal": 3
        },
        {
          "from": "end-user",
          "to": "fintech",
          "kind": "message",
          "label": "Request payment",
          "ordinal": 4
        },
        {
          "from": "fintech",
          "to": "ledger",
          "kind": "message",
          "label": "Debit user balance",
          "ordinal": 5
        },
        {
          "from": "partner-bank",
          "to": "payee",
          "kind": "money",
          "label": "Pay out from pool",
          "ordinal": 6
        },
        {
          "from": "ledger",
          "to": "partner-bank",
          "kind": "message",
          "label": "Reconcile to pool",
          "ordinal": 7
        },
        {
          "from": "partner-bank",
          "to": "end-user",
          "kind": "exception",
          "label": "Bad records, no pass-through",
          "ordinal": 8
        }
      ]
    }
  },
  {
    "slug": "card-chargebacks",
    "title": "How a card chargeback works (and what representment is)",
    "answer": "A chargeback is the network process for forcibly pulling a disputed card payment back from the merchant to the cardholder; the merchant can fight back by submitting evidence in a step called representment.",
    "audience": "Founders, ops, product, and BD who take card payments and want to understand disputes before one lands.",
    "summary": "When a cardholder disputes a charge, their issuing bank typically credits them and sends a chargeback message through the card network to the merchant's acquirer, tagged with a reason code. The merchant can accept it or 'represent' the charge with evidence (receipts, delivery proof, terms). If the two sides still disagree, the network can move it to arbitration and decide who eats the loss. Money only actually moves on settlement legs between the banks; the network is routing the messages and the rules.",
    "parties": [
      {
        "name": "Cardholder",
        "role": "The person who paid and is now disputing the charge"
      },
      {
        "name": "Issuer",
        "role": "The bank that issued the card and represents the cardholder in a dispute"
      },
      {
        "name": "Card network",
        "role": "Routes dispute messages and sets the reason codes, deadlines, and arbitration rules"
      },
      {
        "name": "Acquirer",
        "role": "The merchant's bank/processor that receives the chargeback on the merchant's behalf"
      },
      {
        "name": "Merchant",
        "role": "The business that took the payment and can contest the dispute"
      }
    ],
    "steps": [
      {
        "n": 1,
        "kind": "message",
        "text": "The cardholder contacts their issuer and disputes a charge (e.g., 'I never got this', 'I didn't authorize this', 'the amount is wrong').",
        "party": "Cardholder"
      },
      {
        "n": 2,
        "kind": "money",
        "text": "The issuer typically posts a provisional credit to the cardholder, often before any merchant has been heard from. This is a real money movement on the cardholder's account, though it can be reversed later.",
        "party": "Issuer"
      },
      {
        "n": 3,
        "kind": "message",
        "text": "The issuer files a chargeback through the card network, attaching a reason code that classifies the dispute (fraud, product-not-received, processing error, and so on).",
        "party": "Issuer"
      },
      {
        "n": 4,
        "kind": "message",
        "text": "The network routes the chargeback to the merchant's acquirer, which notifies the merchant. The merchant now has a deadline to respond.",
        "party": "Acquirer"
      },
      {
        "n": 5,
        "kind": "money",
        "text": "The disputed amount is pulled back from the merchant's settlement on a bank-to-bank leg once the chargeback posts, whether or not the merchant contests, commonly along with a fixed dispute fee charged by the acquirer. Winning representment returns the disputed amount later, though usually not the fee.",
        "party": "Merchant"
      },
      {
        "n": 6,
        "kind": "message",
        "text": "If the merchant believes the charge was valid, it submits representment: evidence answering the specific reason code (signed receipt, AVS/CVV match, delivery tracking, the agreed terms).",
        "party": "Merchant"
      },
      {
        "n": 7,
        "kind": "exception",
        "text": "The issuer reviews the representment. If the evidence is convincing, the dispute is resolved in the merchant's favor and the provisional credit to the cardholder can be reversed.",
        "party": "Issuer"
      },
      {
        "n": 8,
        "kind": "exception",
        "text": "If both sides still disagree, the case can escalate to arbitration, where the network applies its rules and assigns the loss (plus possible arbitration fees) to one party.",
        "party": "Card network"
      }
    ],
    "settlementTiming": "Dispute windows and response deadlines are typically measured in tens of days and vary by network, reason code, and region; the money legs (the provisional credit, the pull-back, any reversal) each settle bank-to-bank on their own timelines rather than instantly.",
    "riskNotes": "Educational framing only, not legal or compliance advice. In the US, credit-card disputes are shaped mainly by Regulation Z, while Regulation E covers many electronic transfers such as debit; equivalents exist elsewhere, and reason codes, deadlines, and evidence requirements differ by network and program. Confirm specifics with your acquirer, processor, and counsel before relying on any timeline or right described here.",
    "misconceptions": [
      {
        "claim": "A chargeback is the same thing as a refund.",
        "reality": "A refund is the merchant voluntarily returning money through the normal payment flow. A chargeback is the issuer forcibly reversing the charge through the network's dispute process, usually with a fee and a paper trail the merchant didn't choose."
      },
      {
        "claim": "The card network decides who wins and pays out the money.",
        "reality": "The network mostly routes the dispute messages and enforces the rules and deadlines. The issuing and acquiring banks move the actual money on settlement legs; the network only adjudicates directly if a case reaches arbitration."
      }
    ],
    "relatedTerms": [
      "chargeback",
      "representment",
      "issuer",
      "acquirer",
      "authorization"
    ],
    "prompts": [
      {
        "prompt": "A cardholder disputes a $120 online order as 'item not received'; show the chargeback from issuer credit through merchant representment.",
        "seedId": "card-dispute-rege",
        "note": "Watch which legs are messages versus the actual money pull-back."
      }
    ],
    "seeds": [
      {
        "seedId": "card-dispute-rege",
        "label": "Card dispute and chargeback flow"
      },
      {
        "seedId": "visa-four-party",
        "label": "Four-party card model"
      }
    ],
    "sources": [
      {
        "label": "Visa dispute and chargeback resources",
        "url": "https://www.visa.com/en-us/support/business/dispute-resolution",
        "publisher": "Visa",
        "kind": "operator",
        "note": "Network guidance on how disputes work and how merchants respond."
      },
      {
        "label": "Mastercard dispute resolution",
        "url": "https://www.mastercard.com/us/en/business/cybersecurity-fraud-prevention/dispute-management.html",
        "publisher": "Mastercard",
        "kind": "operator",
        "note": "Network view of the chargeback and dispute management cycle."
      },
      {
        "label": "Regulation Z / Regulation E consumer protections",
        "url": "https://www.consumerfinance.gov/rules-policy/regulations/1026/",
        "publisher": "CFPB",
        "kind": "authority",
        "note": "Educational context on US cardholder dispute rights; the CFPB now administers Reg E/Z. Not advice."
      },
      {
        "label": "Regulation E electronic fund transfer protections",
        "url": "https://www.consumerfinance.gov/rules-policy/regulations/1005/",
        "publisher": "CFPB",
        "kind": "authority",
        "note": "Covers dispute rights for debit and other electronic fund transfers. Not advice."
      }
    ],
    "railFamily": "card",
    "updated": "2026-06",
    "diagram": {
      "nodes": [
        {
          "id": "cardholder",
          "label": "Cardholder"
        },
        {
          "id": "issuer",
          "label": "Issuer"
        },
        {
          "id": "network",
          "label": "Card network"
        },
        {
          "id": "acquirer",
          "label": "Acquirer"
        },
        {
          "id": "merchant",
          "label": "Merchant"
        }
      ],
      "legs": [
        {
          "from": "cardholder",
          "to": "issuer",
          "kind": "message",
          "label": "Dispute charge",
          "ordinal": 1
        },
        {
          "from": "issuer",
          "to": "cardholder",
          "kind": "money",
          "label": "Provisional credit",
          "ordinal": 2
        },
        {
          "from": "issuer",
          "to": "network",
          "kind": "message",
          "label": "File chargeback",
          "ordinal": 3
        },
        {
          "from": "network",
          "to": "acquirer",
          "kind": "message",
          "label": "Route to acquirer",
          "ordinal": 4
        },
        {
          "from": "merchant",
          "to": "acquirer",
          "kind": "money",
          "label": "Debit merchant account",
          "ordinal": 5
        },
        {
          "from": "acquirer",
          "to": "issuer",
          "kind": "money",
          "label": "Funds settled back",
          "ordinal": 6
        },
        {
          "from": "merchant",
          "to": "acquirer",
          "kind": "message",
          "label": "Submit representment",
          "ordinal": 7
        },
        {
          "from": "acquirer",
          "to": "network",
          "kind": "message",
          "label": "Forward representment",
          "ordinal": 8
        },
        {
          "from": "network",
          "to": "acquirer",
          "kind": "exception",
          "label": "Arbitration decision",
          "ordinal": 9
        }
      ]
    }
  },
  {
    "slug": "marketplace-payouts",
    "title": "How a marketplace pays out its sellers",
    "answer": "A marketplace collects the buyer's card payment into its own settlement account, tracks each seller's share on a ledger, and then pushes payouts out to sellers (often by ACH or an instant rail), minus its fees and any held reserves.",
    "audience": "Founders, ops, and product building or operating a multi-seller marketplace or platform.",
    "summary": "When a buyer checks out, the marketplace (typically using a payment facilitator, or 'payfac', model) collects the card funds into a single settlement account rather than paying each seller directly. An internal ledger records what each seller earned, net of platform fees and any reserve held back for refund/chargeback risk. On a payout schedule, the platform sends each seller their balance over ACH or an instant rail. Sellers usually have to be onboarded and identity-verified before money can flow to them.",
    "parties": [
      {
        "name": "Buyer",
        "role": "Pays for the goods or services at checkout"
      },
      {
        "name": "Marketplace / payfac",
        "role": "Collects funds centrally, runs the ledger, and pays sellers out"
      },
      {
        "name": "Sponsor/acquiring bank",
        "role": "Sponsors the payfac into the card networks and holds the settlement funds"
      },
      {
        "name": "Seller",
        "role": "Provides the goods or services and receives a payout"
      }
    ],
    "steps": [
      {
        "n": 1,
        "kind": "message",
        "text": "The buyer pays at checkout; the card is authorized in real time (a check and hold), confirming the card is good for the amount. No money has moved yet.",
        "party": "Buyer"
      },
      {
        "n": 2,
        "kind": "money",
        "text": "On clearing and settlement, the card funds land in the platform's settlement account at its sponsor/acquiring bank, not in the individual seller's account.",
        "party": "Marketplace / payfac"
      },
      {
        "n": 3,
        "kind": "message",
        "text": "The platform's ledger credits the seller's balance for their share and records the platform's fee and any reserve held back. This is bookkeeping, not a money movement.",
        "party": "Marketplace / payfac"
      },
      {
        "n": 4,
        "kind": "exception",
        "text": "A new or higher-risk seller may need KYC/identity verification completed before any payout is allowed; until then their balance is available on the ledger but locked.",
        "party": "Marketplace / payfac"
      },
      {
        "n": 5,
        "kind": "exception",
        "text": "The platform may hold a rolling reserve or delay payout to cover potential refunds and chargebacks, so the payable balance can be less than the gross sale.",
        "party": "Marketplace / payfac"
      },
      {
        "n": 6,
        "kind": "message",
        "text": "On the payout schedule (e.g., daily or weekly), the platform initiates a payout to the seller for their net available balance.",
        "party": "Marketplace / payfac"
      },
      {
        "n": 7,
        "kind": "money",
        "text": "The payout settles to the seller's bank account, commonly via an ACH credit, or via an instant rail when the platform offers faster (often fee-bearing) payouts.",
        "party": "Sponsor/acquiring bank"
      },
      {
        "n": 8,
        "kind": "exception",
        "text": "If a buyer later disputes or refunds, the platform claws the amount back from the seller's future balance or reserve, since the funds may already have been paid out.",
        "party": "Marketplace / payfac"
      }
    ],
    "settlementTiming": "Card funds typically settle to the platform within a small number of business days; seller payouts then follow the platform's schedule. ACH payouts usually land in one-to-a-few business days, while instant-rail payouts can arrive within minutes when the rail and both banks support it, often for an added fee. Exact timing varies by processor, rail, and risk settings.",
    "riskNotes": "Educational framing only, not legal, compliance, or tax advice. Whether a platform acts as a payfac, a marketplace, or a merchant of record carries different regulatory, KYC/AML, and liability obligations, and reserve and onboarding practices vary by sponsor and processor. Confirm your setup with your sponsor bank, processor, and counsel.",
    "misconceptions": [
      {
        "claim": "The buyer's money goes straight to the seller's bank account.",
        "reality": "In a payfac/marketplace model the funds typically land in the platform's settlement account first. The seller's 'balance' is a ledger entry until the platform runs a separate payout leg to the seller's bank."
      },
      {
        "claim": "A marketplace and a 'merchant of record' are the same thing.",
        "reality": "Being merchant of record means the platform is the seller of record and takes on the merchant obligations (and liabilities) for the transaction. A pure marketplace/payfac can instead facilitate payments between independent sellers and buyers; the legal and liability picture differs and shapes who owns refunds and disputes."
      }
    ],
    "relatedTerms": [
      "sponsor-bank",
      "program-manager",
      "acquirer",
      "settlement",
      "odfi",
      "chargeback"
    ],
    "prompts": [
      {
        "prompt": "Buyer pays $50 on a marketplace; show funds into the platform settlement account, the ledger split, and an ACH payout to the seller.",
        "seedId": "payfac-us",
        "note": "Note where the money sits versus where the ledger just records a balance."
      }
    ],
    "seeds": [
      {
        "seedId": "payfac-us",
        "label": "Payment facilitator marketplace flow"
      },
      {
        "seedId": "ach-payroll",
        "label": "ACH credit payout pattern"
      }
    ],
    "sources": [
      {
        "label": "Visa payment facilitator model",
        "url": "https://usa.visa.com/content/dam/VCOM/global/support-legal/documents/visa-payment-facilitator-model.pdf",
        "publisher": "Visa",
        "kind": "operator",
        "note": "Network rules defining the payfac/sponsor relationship and settlement."
      },
      {
        "label": "ACH rules for credit payouts (ODFI/RDFI)",
        "url": "https://www.nacha.org/rules",
        "publisher": "Nacha",
        "kind": "authority",
        "note": "Governs the ACH credit leg commonly used for seller payouts."
      },
      {
        "label": "Mastercard acceptance and facilitator rules",
        "url": "https://www.mastercard.com/us/en/business/support/rules.html",
        "publisher": "Mastercard",
        "kind": "operator",
        "note": "The Mastercard Rules define acceptance and payment facilitator obligations."
      }
    ],
    "railFamily": "card",
    "updated": "2026-06",
    "diagram": {
      "nodes": [
        {
          "id": "buyer",
          "label": "Buyer"
        },
        {
          "id": "card-rail",
          "label": "Issuer / card network"
        },
        {
          "id": "marketplace",
          "label": "Marketplace / payfac"
        },
        {
          "id": "sponsor-bank",
          "label": "Sponsor/acquiring bank"
        },
        {
          "id": "seller",
          "label": "Seller"
        }
      ],
      "legs": [
        {
          "from": "marketplace",
          "to": "card-rail",
          "kind": "message",
          "label": "Card auth requested",
          "ordinal": 1
        },
        {
          "from": "buyer",
          "to": "card-rail",
          "kind": "money",
          "label": "Card payment captured",
          "ordinal": 2
        },
        {
          "from": "card-rail",
          "to": "sponsor-bank",
          "kind": "money",
          "label": "Card funds settle in",
          "ordinal": 3
        },
        {
          "from": "sponsor-bank",
          "to": "marketplace",
          "kind": "message",
          "label": "Ledger credited",
          "ordinal": 4
        },
        {
          "from": "marketplace",
          "to": "sponsor-bank",
          "kind": "message",
          "label": "Payout initiated",
          "ordinal": 5
        },
        {
          "from": "sponsor-bank",
          "to": "seller",
          "kind": "money",
          "label": "Payout settles",
          "ordinal": 6
        },
        {
          "from": "seller",
          "to": "marketplace",
          "kind": "exception",
          "label": "Clawback on dispute",
          "ordinal": 7
        }
      ]
    }
  },
  {
    "slug": "wallet-top-up",
    "title": "How a wallet top-up works",
    "answer": "You move money from a funding source like a card or bank account to a custodian, who credits your wallet balance with a claim you can spend or hold.",
    "audience": "Founders, ops, and product people who let users load a balance into an app, exchange, or wallet and want to know where the money actually sits.",
    "summary": "A wallet top-up is an on-ramp: you pay in with a card or bank transfer, the custodian (an exchange or wallet provider) receives the real money through banking rails, and then credits your in-app balance. That balance is usually a claim on the custodian, not cash held in your own name. In a common pattern the displayed balance updates instantly even though the underlying bank settlement to the custodian finishes later.",
    "parties": [
      {
        "name": "User",
        "role": "Person loading money into a wallet"
      },
      {
        "name": "Funding source",
        "role": "The user's card issuer or bank that the money comes from"
      },
      {
        "name": "Custodian / exchange",
        "role": "Provider that receives the funds and holds the balance on the user's behalf"
      },
      {
        "name": "Custodian's bank",
        "role": "Bank where the custodian's incoming funds actually settle"
      },
      {
        "name": "Card network or transfer rail",
        "role": "Routes the authorization and clearing messages for the inbound payment"
      }
    ],
    "steps": [
      {
        "n": 1,
        "kind": "message",
        "text": "The user chooses an amount and a funding source (card or bank account) inside the app and confirms the top-up.",
        "party": "User"
      },
      {
        "n": 2,
        "kind": "message",
        "text": "If funding by card, an authorization request checks the card is good for the amount and places a hold. No money has moved yet.",
        "party": "Card network or transfer rail"
      },
      {
        "n": 3,
        "kind": "message",
        "text": "The custodian provisionally credits the user's wallet balance so the app feels instant, while the real payment is still in flight.",
        "party": "Custodian / exchange"
      },
      {
        "n": 4,
        "kind": "message",
        "text": "Clearing exchanges the records that compute who owes whom between the funding bank and the custodian's side. Still messages, not money.",
        "party": "Card network or transfer rail"
      },
      {
        "n": 5,
        "kind": "money",
        "text": "Bank-to-bank settlement moves the actual funds to the custodian's bank account, discharging the obligation. This is when the money is final between the banks.",
        "party": "Custodian's bank"
      },
      {
        "n": 6,
        "kind": "money",
        "text": "The custodian now holds the cash (or buys the token, if topping up a crypto balance) and the user's balance becomes a firm claim against the custodian.",
        "party": "Custodian / exchange"
      },
      {
        "n": 7,
        "kind": "exception",
        "text": "Even after settlement, the funding payment can be pulled back: a cardholder can dispute a card charge for roughly 120 days, and a consumer can return an unauthorized bank (ACH) debit for up to 60 days after settlement, so the custodian may claw back or freeze the credited balance.",
        "party": "Funding source"
      }
    ],
    "settlementTiming": "The visible balance often updates in seconds, but the underlying bank settlement to the custodian can take from near-instant (on a real-time rail) to a few business days (on card or batch bank transfers). Settlement makes the money final between the banks, but card disputes and unauthorized bank-debit returns can still claw the payment back for weeks or months afterward, so the credit stays provisional well beyond settlement.",
    "misconceptions": [
      {
        "claim": "The money in my wallet balance is my cash, sitting in a bank account with my name on it.",
        "reality": "In a custodial setup the balance is typically a claim on the custodian, not a deposit you hold directly. Where and how the underlying money is held, and whether any insurance applies, depends entirely on the provider's structure."
      },
      {
        "claim": "Because my balance updated instantly, the payment has fully cleared and can't be reversed.",
        "reality": "An instant balance update is often just a provisional credit. The actual bank settlement may finish later, and card or bank payments can still be returned or disputed weeks or months afterward."
      }
    ],
    "relatedTerms": [
      "on-ramp",
      "stablecoin",
      "off-ramp",
      "fbo-account",
      "settlement",
      "authorization",
      "clearing"
    ],
    "prompts": [
      {
        "prompt": "Show a user topping up a custodial wallet at a crypto exchange with a bank transfer, separating the instant balance credit from the later bank settlement.",
        "seedId": "crypto-exchange-onramp",
        "note": "Highlights provisional credit vs final settlement to the custodian."
      }
    ],
    "seeds": [
      {
        "seedId": "crypto-exchange-onramp",
        "label": "Crypto exchange on-ramp"
      }
    ],
    "sources": [
      {
        "label": "Custodial balances, on-ramps, and reserves",
        "url": "https://www.circle.com/transparency",
        "publisher": "Circle",
        "kind": "vendor",
        "note": "Vendor view of taking fiat in and crediting a token balance."
      },
      {
        "label": "Deposit insurance scope and pass-through context",
        "url": "https://www.fdic.gov/financial-institution-employees-guide-deposit-insurance/pass-through-deposit-insurance-coverage",
        "publisher": "FDIC",
        "kind": "authority",
        "note": "Context on why a custodial wallet balance is not the same as an insured deposit."
      },
      {
        "label": "Settlement in the payment system",
        "url": "https://www.bis.org/cpmi/about/overview.htm",
        "publisher": "BIS / CPMI",
        "kind": "authority",
        "note": "Authority framing of provisional credit versus final bank settlement."
      }
    ],
    "railFamily": "stablecoin",
    "updated": "2026-06",
    "diagram": {
      "nodes": [
        {
          "id": "user",
          "label": "User"
        },
        {
          "id": "app",
          "label": "Custodian / exchange"
        },
        {
          "id": "rail",
          "label": "Card or transfer rail"
        },
        {
          "id": "funding-bank",
          "label": "Funding source bank"
        },
        {
          "id": "custodian-bank",
          "label": "Custodian's bank"
        }
      ],
      "legs": [
        {
          "from": "user",
          "to": "app",
          "kind": "message",
          "label": "Confirm top-up",
          "ordinal": 1
        },
        {
          "from": "app",
          "to": "rail",
          "kind": "message",
          "label": "Request authorization",
          "ordinal": 2
        },
        {
          "from": "rail",
          "to": "funding-bank",
          "kind": "message",
          "label": "Authorize, place hold",
          "ordinal": 3
        },
        {
          "from": "app",
          "to": "user",
          "kind": "message",
          "label": "Provisional balance credit",
          "ordinal": 4
        },
        {
          "from": "rail",
          "to": "app",
          "kind": "message",
          "label": "Clearing records exchanged",
          "ordinal": 5
        },
        {
          "from": "funding-bank",
          "to": "custodian-bank",
          "kind": "money",
          "label": "Bank-to-bank settlement",
          "ordinal": 6
        },
        {
          "from": "app",
          "to": "user",
          "kind": "message",
          "label": "Wallet balance confirmed",
          "ordinal": 7
        },
        {
          "from": "app",
          "to": "user",
          "kind": "exception",
          "label": "Claw back if reversed",
          "ordinal": 8
        }
      ]
    }
  },
  {
    "slug": "stablecoin-on-off-ramp",
    "title": "On-ramps and off-ramps: moving between cash and stablecoins",
    "answer": "An on-ramp turns bank money into stablecoin tokens after identity checks, and an off-ramp redeems those tokens back into a bank deposit.",
    "audience": "Founders, ops, and product teams using stablecoins for payments or payouts who need to understand where bank money ends and on-chain value begins.",
    "summary": "Going on-chain: you pass identity checks, pay in by bank or card, and a provider issues or transfers stablecoin tokens to your wallet, typically backed by reserves the issuer holds. The tokens move on-chain between wallets with their own settlement finality. Coming back off-chain: an off-ramp provider takes your tokens, redeems them, and sends a normal bank payment to your account. A stablecoin balance is a claim against the issuer or provider, not a bank deposit.",
    "parties": [
      {
        "name": "User / business",
        "role": "Party moving value between cash and stablecoins"
      },
      {
        "name": "On-ramp provider",
        "role": "Takes fiat in, runs KYC, and issues or delivers tokens"
      },
      {
        "name": "Stablecoin issuer",
        "role": "Mints and redeems the token and holds the backing reserves"
      },
      {
        "name": "Blockchain network",
        "role": "Records the on-chain token transfer between wallets"
      },
      {
        "name": "Off-ramp provider",
        "role": "Redeems tokens and pays out fiat to a bank account"
      },
      {
        "name": "Bank",
        "role": "Where the inbound funding and outbound payout actually settle"
      }
    ],
    "steps": [
      {
        "n": 1,
        "kind": "message",
        "text": "The user completes identity verification (KYC) and links a bank account or card. This is onboarding messaging, not money movement.",
        "party": "On-ramp provider"
      },
      {
        "n": 2,
        "kind": "money",
        "text": "The user funds the on-ramp; bank-to-bank settlement moves the fiat to the provider's account. The cash is now real on the provider's side.",
        "party": "Bank"
      },
      {
        "n": 3,
        "kind": "money",
        "text": "Against that funding, stablecoin tokens arrive in the user's wallet, either freshly minted by the issuer or delivered by the provider from tokens it already holds. In a common model these tokens are backed by reserves the issuer holds.",
        "party": "Stablecoin issuer"
      },
      {
        "n": 4,
        "kind": "money",
        "text": "The user sends tokens on-chain to another wallet; the transfer settles on the network per its own finality rules, independent of any bank.",
        "party": "Blockchain network"
      },
      {
        "n": 5,
        "kind": "message",
        "text": "To cash out, the recipient instructs an off-ramp provider where to send fiat, after that provider's own identity checks.",
        "party": "Off-ramp provider"
      },
      {
        "n": 6,
        "kind": "money",
        "text": "The recipient sends tokens to the off-ramp provider, who redeems them (the issuer burns them and releases backing reserves).",
        "party": "Off-ramp provider"
      },
      {
        "n": 7,
        "kind": "money",
        "text": "The off-ramp provider initiates a bank payment; bank-to-bank settlement deposits fiat into the recipient's account. The funds are final once that settles.",
        "party": "Bank"
      },
      {
        "n": 8,
        "kind": "exception",
        "text": "If a payout fails compliance screening or a banking partner blocks it, the off-ramp can be delayed or rejected even though the on-chain transfer was already final.",
        "party": "Off-ramp provider"
      }
    ],
    "settlementTiming": "On-chain token transfers often settle within seconds to minutes, but that finality is separate from bank finality. Funding an on-ramp and receiving an off-ramp payout still depend on bank rails, which can be near-instant or take several business days depending on the country and method.",
    "misconceptions": [
      {
        "claim": "A stablecoin balance is basically a dollar in a bank, just on the blockchain.",
        "reality": "A stablecoin is a claim against the issuer, backed by reserves it holds, not a bank deposit in your name. Reserve composition, redemption rights, and any protections vary by issuer and are not the same as deposit insurance."
      },
      {
        "claim": "Once the tokens land on-chain, the whole payment is final and the cash side is done.",
        "reality": "On-chain settlement is final for the token transfer only. Turning those tokens back into spendable bank money still requires an off-ramp and a separate bank settlement, which can be delayed or blocked."
      }
    ],
    "relatedTerms": [
      "on-ramp",
      "off-ramp",
      "stablecoin",
      "settlement",
      "correspondent-bank",
      "fbo-account"
    ],
    "prompts": [
      {
        "prompt": "Diagram fiat moving onto an on-ramp with KYC and bank settlement, then minting stablecoin into a user wallet.",
        "seedId": "crypto-exchange-onramp",
        "note": "Shows the fiat-in to token-out boundary."
      },
      {
        "prompt": "Diagram a cross-border stablecoin payout: tokens sent on-chain, then off-ramped and redeemed to a recipient's local bank account.",
        "seedId": "usdc-cross-border-payout",
        "note": "Separates on-chain finality from the bank payout leg."
      }
    ],
    "seeds": [
      {
        "seedId": "crypto-exchange-onramp",
        "label": "Crypto exchange on-ramp"
      },
      {
        "seedId": "usdc-cross-border-payout",
        "label": "USDC cross-border payout"
      }
    ],
    "sources": [
      {
        "label": "USDC mechanics and reserves",
        "url": "https://www.circle.com/transparency",
        "publisher": "Circle",
        "kind": "vendor",
        "note": "Issuer view of minting, redemption, and reserve backing."
      },
      {
        "label": "Stablecoins and settlement in the financial system",
        "url": "https://www.bis.org/cpmi/about/overview.htm",
        "publisher": "BIS / CPMI",
        "kind": "authority",
        "note": "Authority framing of on-chain settlement versus bank settlement and risks."
      },
      {
        "label": "Deposit insurance scope and what it does not cover",
        "url": "https://www.fdic.gov/financial-institution-employees-guide-deposit-insurance/pass-through-deposit-insurance-coverage",
        "publisher": "FDIC",
        "kind": "authority",
        "note": "Context on why a stablecoin claim is not an insured bank deposit."
      }
    ],
    "railFamily": "stablecoin",
    "updated": "2026-06",
    "diagram": {
      "nodes": [
        {
          "id": "user",
          "label": "User / business"
        },
        {
          "id": "funding-bank",
          "label": "User's bank"
        },
        {
          "id": "on-ramp",
          "label": "On-ramp provider"
        },
        {
          "id": "chain",
          "label": "Blockchain network"
        },
        {
          "id": "off-ramp",
          "label": "Off-ramp provider"
        },
        {
          "id": "payout-bank",
          "label": "Recipient's bank"
        }
      ],
      "legs": [
        {
          "from": "user",
          "to": "on-ramp",
          "kind": "message",
          "label": "KYC, link account",
          "ordinal": 1
        },
        {
          "from": "funding-bank",
          "to": "on-ramp",
          "kind": "money",
          "label": "Fiat funds on-ramp",
          "ordinal": 2
        },
        {
          "from": "on-ramp",
          "to": "chain",
          "kind": "money",
          "label": "Tokens minted to wallet",
          "ordinal": 3
        },
        {
          "from": "chain",
          "to": "off-ramp",
          "kind": "money",
          "label": "Tokens sent on-chain",
          "ordinal": 4
        },
        {
          "from": "user",
          "to": "off-ramp",
          "kind": "message",
          "label": "Cash-out instruction",
          "ordinal": 5
        },
        {
          "from": "off-ramp",
          "to": "payout-bank",
          "kind": "money",
          "label": "Fiat payout settles",
          "ordinal": 6
        },
        {
          "from": "off-ramp",
          "to": "user",
          "kind": "exception",
          "label": "Payout blocked",
          "ordinal": 7
        }
      ]
    }
  },
  {
    "slug": "remittance-explained",
    "title": "How a cross-border remittance reaches family abroad",
    "answer": "A sender funds a remittance provider in one country, the provider moves value across the border (via correspondent banks, a remittance network, or a stablecoin rail), applies an exchange rate, and pays the recipient out to a bank account, mobile wallet, or cash pickup.",
    "audience": "Smart non-experts new to payments: founders, ops, PMs, BD.",
    "summary": "Sending money home looks like one tap, but underneath it is a chain: the sender funds a provider locally, the provider moves value to a partner in the destination country, foreign exchange is applied, and the recipient is paid out. The amount shown as 'sent' is rarely the amount that lands, because a fee plus an FX margin sits in between. Speed ranges from minutes (instant payout networks or stablecoin rails) to a few business days (traditional correspondent banking). This guide uses an illustrative Canada to India example.",
    "parties": [
      {
        "name": "Sender",
        "role": "Person abroad funding the transfer"
      },
      {
        "name": "Remittance provider",
        "role": "App or money transfer operator that collects funds and arranges the cross-border move"
      },
      {
        "name": "Funding rail",
        "role": "How the sender pays in: card, bank debit, or wallet"
      },
      {
        "name": "Cross-border rail",
        "role": "Correspondent banks, a remittance network, or a stablecoin rail that carries value across the border"
      },
      {
        "name": "Payout partner",
        "role": "Bank, wallet, or cash agent in the destination country"
      },
      {
        "name": "Recipient",
        "role": "Family member who receives the local-currency payout"
      }
    ],
    "steps": [
      {
        "n": 1,
        "kind": "message",
        "text": "The sender enters an amount and recipient details in the provider's app and sees a quote: the send amount, the fee, the exchange rate, and the estimated amount the recipient gets.",
        "party": "Sender"
      },
      {
        "n": 2,
        "kind": "money",
        "text": "The sender funds the transfer through a funding rail (a card, a bank account debit, or a wallet balance). Money moves from the sender into the provider's account.",
        "party": "Sender"
      },
      {
        "n": 3,
        "kind": "message",
        "text": "The provider runs compliance checks (identity, sanctions, and source-of-funds screening) before releasing the transfer.",
        "party": "Remittance provider"
      },
      {
        "n": 4,
        "kind": "money",
        "text": "The provider moves value across the border using its chosen rail: correspondent banking, a remittance network, or a stablecoin transfer between on-ramp and off-ramp partners.",
        "party": "Remittance provider"
      },
      {
        "n": 5,
        "kind": "message",
        "text": "The exchange rate is applied, converting the send currency (say CAD) into the destination currency (say INR). The provider's FX margin is built into this rate.",
        "party": "Cross-border rail"
      },
      {
        "n": 6,
        "kind": "money",
        "text": "The payout partner in the destination country pays the recipient in local currency to a bank account, mobile wallet, or cash pickup. This is often pre-funded by the partner and reconciled with the provider later.",
        "party": "Payout partner"
      },
      {
        "n": 7,
        "kind": "message",
        "text": "The recipient (or sender) gets a confirmation that funds have landed. The amount received reflects the send amount minus the fee and the FX margin.",
        "party": "Recipient"
      }
    ],
    "diagram": {
      "nodes": [
        {
          "id": "sender",
          "label": "Sender"
        },
        {
          "id": "provider",
          "label": "Remittance provider"
        },
        {
          "id": "xborder-rail",
          "label": "Cross-border rail"
        },
        {
          "id": "payout-partner",
          "label": "Payout partner"
        },
        {
          "id": "recipient",
          "label": "Recipient"
        }
      ],
      "legs": [
        {
          "from": "sender",
          "to": "provider",
          "kind": "message",
          "label": "Quote and request",
          "ordinal": 1
        },
        {
          "from": "sender",
          "to": "provider",
          "kind": "money",
          "label": "Fund transfer",
          "ordinal": 2
        },
        {
          "from": "provider",
          "to": "xborder-rail",
          "kind": "money",
          "label": "Move value abroad",
          "ordinal": 3
        },
        {
          "from": "xborder-rail",
          "to": "payout-partner",
          "kind": "message",
          "label": "Apply FX rate",
          "ordinal": 4
        },
        {
          "from": "xborder-rail",
          "to": "payout-partner",
          "kind": "money",
          "label": "Settle / reimburse payout partner",
          "ordinal": 5
        },
        {
          "from": "payout-partner",
          "to": "recipient",
          "kind": "money",
          "label": "Local-currency payout",
          "ordinal": 6
        },
        {
          "from": "payout-partner",
          "to": "sender",
          "kind": "message",
          "label": "Delivery confirmation",
          "ordinal": 7
        }
      ]
    },
    "settlementTiming": "Payout to the recipient can be near-instant to a wallet or cash agent on fast networks and stablecoin rails, or T+1 to a few business days through traditional correspondent banking. Note that the recipient seeing funds is not the same as the underlying interbank settlement, which the provider and its partners reconcile separately.",
    "misconceptions": [
      {
        "claim": "The amount I send is the amount they receive.",
        "reality": "Two costs sit in between: a stated fee and an FX margin (the gap between the rate you get and the mid-market rate). The displayed 'sent' amount is almost always larger than what lands."
      },
      {
        "claim": "The money itself flies across the border in seconds.",
        "reality": "Often no single pot of money crosses instantly. Payout partners frequently pre-fund payouts locally and settle with the provider afterward, so the recipient can be paid before the cross-border settlement fully completes."
      }
    ],
    "relatedTerms": [
      "correspondent-bank",
      "nostro-vostro",
      "on-ramp",
      "off-ramp",
      "stablecoin",
      "float",
      "kyc-aml",
      "remittance"
    ],
    "prompts": [
      {
        "prompt": "Show a US-to-Europe payout that rides a stablecoin rail: dollars fund USDC through an on-ramp, the tokens move on-chain, and the recipient is paid out in euros.",
        "seedId": "usdc-cross-border-payout",
        "note": "Stablecoin-rail variant of a cross-border payout."
      },
      {
        "prompt": "Show a traditional cross-border wire with FX conversion through correspondent banks.",
        "seedId": "wire-fx",
        "note": "Correspondent-banking variant."
      }
    ],
    "seeds": [
      {
        "seedId": "usdc-cross-border-payout",
        "label": "USDC cross-border payout"
      },
      {
        "seedId": "wire-fx",
        "label": "Cross-border wire with FX"
      }
    ],
    "sources": [
      {
        "label": "Cross-border payments and remittances",
        "url": "https://www.bis.org/cpmi/about/overview.htm",
        "publisher": "BIS / CPMI",
        "kind": "authority",
        "note": "Standards work on cross-border payments, correspondent banking, and remittance costs."
      },
      {
        "label": "Cross-border money transfers: consumer guidance",
        "url": "https://www.consumerfinance.gov/rules-policy/regulations/1005/",
        "publisher": "CFPB",
        "kind": "authority",
        "note": "Disclosure rules on fees, FX rates, and amount-to-be-received for remittance transfers."
      },
      {
        "label": "USDC and cross-border value transfer",
        "url": "https://www.circle.com/transparency",
        "publisher": "Circle",
        "kind": "vendor",
        "note": "How a stablecoin rail can carry value between on-ramp and off-ramp partners."
      }
    ],
    "railFamily": "cross-border",
    "jurisdiction": [
      "CA",
      "global"
    ],
    "updated": "2026-06"
  },
  {
    "slug": "instant-payments-explained",
    "title": "How instant payments work: FedNow and RTP",
    "answer": "On US instant rails like FedNow and RTP, the payment message and the interbank settlement happen together in seconds, around the clock, and the payment is final and irrevocable once it lands.",
    "audience": "Smart non-experts new to payments: founders, ops, PMs, BD.",
    "summary": "Instant payments are bank-to-bank transfers that clear and settle in seconds, 24/7/365, including weekends and holidays. The US has two such rails: FedNow, operated by the Federal Reserve, and RTP, operated by The Clearing House. Unlike ACH, which moves in scheduled batches, here the message and the money settle together and the payment is final, so there is no card-style chargeback. This guide uses a business-to-business payment as the example.",
    "parties": [
      {
        "name": "Sender",
        "role": "Business or person initiating the payment"
      },
      {
        "name": "Sender's bank",
        "role": "Holds the sender's account and submits the payment to the rail"
      },
      {
        "name": "Instant rail",
        "role": "FedNow (at the Federal Reserve) or RTP (at The Clearing House)"
      },
      {
        "name": "Receiver's bank",
        "role": "Holds the receiver's account and credits the funds"
      },
      {
        "name": "Receiver",
        "role": "Business or person being paid"
      }
    ],
    "steps": [
      {
        "n": 1,
        "kind": "message",
        "text": "The sender instructs their bank to send an instant payment, providing the receiver's account details and amount.",
        "party": "Sender"
      },
      {
        "n": 2,
        "kind": "message",
        "text": "The sender's bank checks the sender has funds, then submits a payment message to the rail (FedNow or RTP).",
        "party": "Sender's bank"
      },
      {
        "n": 3,
        "kind": "message",
        "text": "The rail forwards the message to the receiver's bank and asks it to confirm it can accept the payment.",
        "party": "Instant rail"
      },
      {
        "n": 4,
        "kind": "message",
        "text": "The receiver's bank validates the account and responds to the rail, accepting (or rejecting) the payment, typically within seconds.",
        "party": "Receiver's bank"
      },
      {
        "n": 5,
        "kind": "money",
        "text": "On acceptance, interbank settlement happens immediately: the rail adjusts the two banks' settlement positions so value moves between them then and there, not in a later batch.",
        "party": "Instant rail"
      },
      {
        "n": 6,
        "kind": "money",
        "text": "The receiver's bank credits the receiver's account with good, final funds. The receiver can use the money right away.",
        "party": "Receiver's bank"
      },
      {
        "n": 7,
        "kind": "message",
        "text": "A confirmation flows back through the rail to the sender's bank and the sender. The payment is now final and irrevocable.",
        "party": "Sender's bank"
      },
      {
        "n": 8,
        "kind": "exception",
        "text": "If something is wrong, there is no chargeback. The sender can only send a request asking the receiver to return the funds; the receiver must agree to send a new payment back.",
        "party": "Sender"
      }
    ],
    "diagram": {
      "nodes": [
        {
          "id": "sender",
          "label": "Sender"
        },
        {
          "id": "sender-bank",
          "label": "Sender's bank"
        },
        {
          "id": "rail",
          "label": "FedNow / RTP"
        },
        {
          "id": "receiver-bank",
          "label": "Receiver's bank"
        },
        {
          "id": "receiver",
          "label": "Receiver"
        }
      ],
      "legs": [
        {
          "from": "sender",
          "to": "sender-bank",
          "kind": "message",
          "label": "Payment instruction",
          "ordinal": 1
        },
        {
          "from": "sender-bank",
          "to": "rail",
          "kind": "message",
          "label": "Submit payment",
          "ordinal": 2
        },
        {
          "from": "rail",
          "to": "receiver-bank",
          "kind": "message",
          "label": "Forward, confirm",
          "ordinal": 3
        },
        {
          "from": "receiver-bank",
          "to": "rail",
          "kind": "message",
          "label": "Accept payment",
          "ordinal": 4
        },
        {
          "from": "rail",
          "to": "receiver-bank",
          "kind": "money",
          "label": "Interbank settlement",
          "ordinal": 5
        },
        {
          "from": "receiver-bank",
          "to": "receiver",
          "kind": "money",
          "label": "Credit account",
          "ordinal": 6
        },
        {
          "from": "rail",
          "to": "sender-bank",
          "kind": "message",
          "label": "Final confirmation",
          "ordinal": 7
        },
        {
          "from": "receiver",
          "to": "sender",
          "kind": "exception",
          "label": "Return request only",
          "ordinal": 8
        }
      ]
    },
    "settlementTiming": "Seconds, end to end, 24/7/365 including weekends and holidays. Settlement is immediate and final at the moment the receiver's bank accepts, with no batch window and no later settlement step.",
    "misconceptions": [
      {
        "claim": "FedNow and RTP are basically faster ACH.",
        "reality": "ACH moves in scheduled batches and settles later; instant rails clear and settle a single payment in seconds, continuously. They are different rails with different rules, not a speed setting on ACH."
      },
      {
        "claim": "If an instant payment goes wrong, I can reverse it like a card charge.",
        "reality": "These payments are final and irrevocable. There is no chargeback. The most you can do is send a request for return, and the receiver has to voluntarily send the money back."
      }
    ],
    "relatedTerms": [
      "rtgs",
      "settlement",
      "clearing",
      "iso-20022",
      "chargeback",
      "odfi",
      "rdfi"
    ],
    "prompts": [
      {
        "prompt": "Show a B2B supplier payment over FedNow where settlement and confirmation happen in seconds.",
        "seedId": "fednow-b2b",
        "note": "FedNow at the Federal Reserve."
      },
      {
        "prompt": "Show a B2B payment over RTP at The Clearing House with immediate finality.",
        "seedId": "rtp-b2b",
        "note": "RTP variant."
      }
    ],
    "seeds": [
      {
        "seedId": "fednow-b2b",
        "label": "FedNow B2B payment"
      },
      {
        "seedId": "rtp-b2b",
        "label": "RTP B2B payment"
      }
    ],
    "sources": [
      {
        "label": "FedNow Service",
        "url": "https://www.frbservices.org/financial-services/fednow/about.html",
        "publisher": "Federal Reserve / FRBservices",
        "kind": "operator",
        "note": "Operator details on instant settlement, availability, and finality for FedNow."
      },
      {
        "label": "RTP network",
        "url": "https://www.theclearinghouse.org/payment-systems/rtp",
        "publisher": "The Clearing House",
        "kind": "operator",
        "note": "Operator details on real-time clearing and settlement and request-for-return messaging."
      },
      {
        "label": "Payment system policy and instant payments",
        "url": "https://www.federalreserve.gov/paymentsystems.htm",
        "publisher": "Federal Reserve",
        "kind": "authority",
        "note": "Background on the role of the central bank in interbank settlement."
      }
    ],
    "railFamily": "rtp",
    "jurisdiction": [
      "US"
    ],
    "updated": "2026-06"
  },
  {
    "slug": "how-pix-works",
    "title": "How Brazil's Pix moves money in seconds",
    "answer": "Pix lets a payer send money to anyone in seconds, any time, by using a simple alias or a QR code, while the central bank's rail clears the instruction and banks settle the funds in central-bank money.",
    "audience": "smart non-experts new to payments (founders, ops, PMs, BD)",
    "summary": "Pix is Brazil's instant payment system, operated by the central bank (Banco Central do Brasil). The payer picks the recipient using a Pix key (an alias like a phone number, email, tax ID, or random key) or scans a QR code, so nobody has to type account numbers. The instruction races through the central bank's rail in seconds, the recipient's bank credits them right away, and each payment is settled instantly, one by one, in central-bank money at the central bank. It runs 24/7 and is typically free for individuals.",
    "parties": [
      {
        "name": "Payer",
        "role": "Person or business sending the money"
      },
      {
        "name": "Payer's bank",
        "role": "Holds the payer's account, debits it, and sends the Pix instruction"
      },
      {
        "name": "Alias directory (DICT)",
        "role": "Central registry that maps a Pix key to the right account"
      },
      {
        "name": "Pix rail (Banco Central do Brasil)",
        "role": "Central-bank-operated system that routes the instruction and settles positions"
      },
      {
        "name": "Recipient's bank",
        "role": "Holds the recipient's account and credits it"
      },
      {
        "name": "Recipient",
        "role": "Person or business receiving the money"
      }
    ],
    "steps": [
      {
        "n": 1,
        "kind": "message",
        "text": "The payer enters a Pix key (phone, email, tax ID, or random key) or scans the recipient's QR code in their banking app.",
        "party": "Payer"
      },
      {
        "n": 2,
        "kind": "message",
        "text": "The payer's bank looks up the key in the central alias directory (DICT) to confirm which account and bank it points to.",
        "party": "Payer's bank"
      },
      {
        "n": 3,
        "kind": "message",
        "text": "The directory returns the matching account details so the payment is addressed correctly.",
        "party": "Alias directory (DICT)"
      },
      {
        "n": 4,
        "kind": "message",
        "text": "The payer's bank debits the payer's account and sends the payment instruction into the central bank's Pix rail.",
        "party": "Payer's bank"
      },
      {
        "n": 5,
        "kind": "message",
        "text": "The rail validates the instruction and forwards it to the recipient's bank within seconds.",
        "party": "Pix rail (Banco Central do Brasil)"
      },
      {
        "n": 6,
        "kind": "money",
        "text": "The rail settles the payment instantly in central-bank money, moving funds between accounts the two banks hold at the central bank. Each Pix is settled on its own, not batched up.",
        "party": "Pix rail (Banco Central do Brasil)"
      },
      {
        "n": 7,
        "kind": "money",
        "text": "With settlement confirmed, the recipient's bank credits the recipient's account within seconds. The money has already arrived at the bank, so it never has to front its own funds.",
        "party": "Recipient's bank"
      },
      {
        "n": 8,
        "kind": "message",
        "text": "Both parties get near-instant confirmation in their apps; the transfer is final and works 24/7.",
        "party": "Payer"
      }
    ],
    "diagram": {
      "nodes": [
        {
          "id": "payer",
          "label": "Payer"
        },
        {
          "id": "payer-bank",
          "label": "Payer's bank"
        },
        {
          "id": "dict",
          "label": "Alias directory"
        },
        {
          "id": "pix-rail",
          "label": "Pix rail (BCB)"
        },
        {
          "id": "recipient-bank",
          "label": "Recipient's bank"
        },
        {
          "id": "recipient",
          "label": "Recipient"
        }
      ],
      "legs": [
        {
          "from": "payer",
          "to": "payer-bank",
          "kind": "message",
          "label": "Pix key or QR",
          "ordinal": 1
        },
        {
          "from": "payer-bank",
          "to": "dict",
          "kind": "message",
          "label": "Resolve key",
          "ordinal": 2
        },
        {
          "from": "dict",
          "to": "payer-bank",
          "kind": "message",
          "label": "Account details",
          "ordinal": 3
        },
        {
          "from": "payer-bank",
          "to": "pix-rail",
          "kind": "message",
          "label": "Send instruction",
          "ordinal": 4
        },
        {
          "from": "pix-rail",
          "to": "recipient-bank",
          "kind": "message",
          "label": "Forward instruction",
          "ordinal": 5
        },
        {
          "from": "pix-rail",
          "to": "recipient-bank",
          "kind": "money",
          "label": "Settle in CB money",
          "ordinal": 6
        },
        {
          "from": "recipient-bank",
          "to": "recipient",
          "kind": "money",
          "label": "Credit account",
          "ordinal": 7
        },
        {
          "from": "pix-rail",
          "to": "payer-bank",
          "kind": "message",
          "label": "Confirm to payer",
          "ordinal": 8
        }
      ]
    },
    "settlementTiming": "Funds reach the recipient in seconds, 24/7, including nights, weekends, and holidays. Interbank settlement is instant too: the central bank's SPI settles each Pix payment one at a time in central-bank money (real-time gross settlement), moving funds between prefunded accounts the banks hold at the central bank, with no netting and no batch cycles, before the recipient is credited.",
    "misconceptions": [
      {
        "claim": "The central bank's Pix rail sends the money to the recipient.",
        "reality": "The rail routes the instruction and settles each payment instantly in central-bank money between the banks' accounts at the central bank; the recipient's bank then credits the recipient."
      },
      {
        "claim": "A Pix key is a special wallet that holds your balance.",
        "reality": "A Pix key is just an alias that points to an existing bank account. The money still lives in your bank account; the key only tells the system where to send it."
      }
    ],
    "relatedTerms": [
      "alias-directory",
      "settlement",
      "rtgs",
      "authorization",
      "iso-20022"
    ],
    "prompts": [
      {
        "prompt": "Show a Pix instant transfer in Brazil where the payer uses a phone-number Pix key to pay an individual, with the alias directory resolving the account and banks settling in central-bank money.",
        "seedId": "brazil-pix",
        "note": "Highlights alias resolution as a message leg vs the money credit."
      }
    ],
    "seeds": [
      {
        "seedId": "brazil-pix",
        "label": "Brazil Pix instant payment"
      },
      {
        "seedId": "india-upi",
        "label": "India UPI bank-to-bank transfer"
      }
    ],
    "sources": [
      {
        "label": "Pix overview",
        "url": "https://www.bcb.gov.br/en/financialstability/pix_en",
        "publisher": "Banco Central do Brasil",
        "kind": "authority",
        "note": "Operator of the Pix instant payment system and the DICT alias directory."
      },
      {
        "label": "Instant payments and fast payment systems",
        "url": "https://www.bis.org/cpmi/about/overview.htm",
        "publisher": "BIS / CPMI",
        "kind": "authority",
        "note": "Background on how instant payment rails clear and settle."
      }
    ],
    "railFamily": "pix",
    "jurisdiction": [
      "BR"
    ],
    "updated": "2026-06"
  },
  {
    "slug": "how-upi-works",
    "title": "How India's UPI moves money between apps",
    "answer": "UPI lets you pay anyone from any participating app using a simple alias (a VPA), while NPCI's rail switches the request between banks in real time and the banks hold and move the actual money.",
    "audience": "smart non-experts new to payments (founders, ops, PMs, BD)",
    "summary": "UPI (Unified Payments Interface) is India's real-time bank-to-bank payment system, operated by NPCI (the National Payments Corporation of India). You pay using a VPA (a virtual payment address like name@bank) or a QR code, so you never share account numbers. Any app can be the front end, but the money sits in your bank account the whole time. NPCI switches the request between the payer's and recipient's banks in real time, and the banks settle their positions in central-bank money. It runs 24/7 and is typically free for everyday personal transfers.",
    "parties": [
      {
        "name": "Payer",
        "role": "Person or business sending the money via an app"
      },
      {
        "name": "Payment app",
        "role": "Front-end app that captures the payment request; big apps like Google Pay and PhonePe ride a partner PSP bank that is the entity actually connected to UPI"
      },
      {
        "name": "Payer's bank",
        "role": "Holds the payer's account and debits it"
      },
      {
        "name": "UPI switch (NPCI)",
        "role": "Routes the request between banks and coordinates settlement"
      },
      {
        "name": "Recipient's bank",
        "role": "Holds the recipient's account and credits it"
      },
      {
        "name": "Recipient",
        "role": "Person or business receiving the money"
      }
    ],
    "steps": [
      {
        "n": 1,
        "kind": "message",
        "text": "The payer enters a VPA (like name@bank) or scans a QR code in their chosen payment app and approves with a UPI PIN.",
        "party": "Payer"
      },
      {
        "n": 2,
        "kind": "message",
        "text": "The app packages the request (who pays whom, how much) and, via its partner PSP bank, sends it to NPCI's UPI switch.",
        "party": "Payment app"
      },
      {
        "n": 3,
        "kind": "message",
        "text": "NPCI resolves the VPA to the right bank account and routes the request to the payer's bank to authorize.",
        "party": "UPI switch (NPCI)"
      },
      {
        "n": 4,
        "kind": "message",
        "text": "The payer's bank checks the PIN and balance, debits the payer's account, and confirms back to NPCI.",
        "party": "Payer's bank"
      },
      {
        "n": 5,
        "kind": "message",
        "text": "NPCI forwards the credit instruction to the recipient's bank in real time.",
        "party": "UPI switch (NPCI)"
      },
      {
        "n": 6,
        "kind": "money",
        "text": "The recipient's bank credits the recipient's account almost immediately.",
        "party": "Recipient's bank"
      },
      {
        "n": 7,
        "kind": "money",
        "text": "Behind the scenes, the banks' net positions are settled in central-bank money so each bank is made whole.",
        "party": "UPI switch (NPCI)"
      },
      {
        "n": 8,
        "kind": "message",
        "text": "Both apps show near-instant confirmation; the transfer is final and available 24/7.",
        "party": "Payer"
      }
    ],
    "diagram": {
      "nodes": [
        {
          "id": "payer",
          "label": "Payer"
        },
        {
          "id": "app",
          "label": "Payment app"
        },
        {
          "id": "payer-bank",
          "label": "Payer's bank"
        },
        {
          "id": "npci",
          "label": "UPI switch (NPCI)"
        },
        {
          "id": "recipient-bank",
          "label": "Recipient's bank"
        },
        {
          "id": "recipient",
          "label": "Recipient"
        }
      ],
      "legs": [
        {
          "from": "payer",
          "to": "app",
          "kind": "message",
          "label": "VPA and PIN",
          "ordinal": 1
        },
        {
          "from": "app",
          "to": "npci",
          "kind": "message",
          "label": "Send request",
          "ordinal": 2
        },
        {
          "from": "npci",
          "to": "payer-bank",
          "kind": "message",
          "label": "Resolve and authorize",
          "ordinal": 3
        },
        {
          "from": "payer-bank",
          "to": "npci",
          "kind": "message",
          "label": "Debit and confirm",
          "ordinal": 4
        },
        {
          "from": "npci",
          "to": "recipient-bank",
          "kind": "message",
          "label": "Credit instruction",
          "ordinal": 5
        },
        {
          "from": "recipient-bank",
          "to": "recipient",
          "kind": "money",
          "label": "Credit account",
          "ordinal": 6
        },
        {
          "from": "npci",
          "to": "recipient-bank",
          "kind": "money",
          "label": "Settle in CB money",
          "ordinal": 7
        }
      ]
    },
    "settlementTiming": "Funds reach the recipient in real time, typically within seconds, 24/7. Interbank settlement happens in central-bank money in scheduled cycles behind the scenes, separate from the instant credit the user sees.",
    "misconceptions": [
      {
        "claim": "The UPI app (like a popular wallet app) holds your money.",
        "reality": "The app is just a front end. Your money stays in your linked bank account; the app initiates a bank-to-bank transfer and NPCI switches it. The banks hold and move the funds."
      },
      {
        "claim": "NPCI moves the money between people.",
        "reality": "NPCI switches and routes the instructions and coordinates settlement. The recipient's bank credits the recipient, and banks settle in central-bank money."
      }
    ],
    "relatedTerms": [
      "alias-directory",
      "psp",
      "authorization",
      "settlement",
      "iso-20022"
    ],
    "prompts": [
      {
        "prompt": "Show an India UPI transfer where a payer uses a VPA in one app to pay someone on another app, with NPCI switching the request between the two banks and settling in central-bank money.",
        "seedId": "india-upi",
        "note": "Emphasizes the app as front end and banks as the holders of funds."
      }
    ],
    "seeds": [
      {
        "seedId": "india-upi",
        "label": "India UPI bank-to-bank transfer"
      },
      {
        "seedId": "brazil-pix",
        "label": "Brazil Pix instant payment"
      }
    ],
    "sources": [
      {
        "label": "UPI product overview",
        "url": "https://www.npci.org.in/what-we-do/upi/product-overview",
        "publisher": "NPCI",
        "kind": "operator",
        "note": "Operator of the UPI real-time payment system."
      },
      {
        "label": "Fast payment systems and instant retail payments",
        "url": "https://www.bis.org/cpmi/about/overview.htm",
        "publisher": "BIS / CPMI",
        "kind": "authority",
        "note": "Background on how real-time rails route messages and settle positions."
      }
    ],
    "railFamily": "upi",
    "jurisdiction": [
      "IN"
    ],
    "updated": "2026-06"
  },
  {
    "slug": "how-a-refund-works",
    "title": "How a card refund actually works",
    "answer": "A card refund is a brand-new transaction that pushes money back from the merchant to the cardholder, not an undo of the original charge, so it clears and settles separately and takes days to land.",
    "audience": "Smart non-experts new to payments: founders, ops, PMs, and BD who handle returns and want to understand why money is not back instantly.",
    "summary": "When a merchant refunds a card payment, the original charge is not reversed or erased. Instead the merchant sends a new instruction in the opposite direction, and the funds travel back through the same chain (merchant to acquirer to network to issuer to cardholder) as a separate event. Because it clears and settles on its own cycle, the cardholder usually waits several business days. This is different from a chargeback, which is a forced reversal that the cardholder starts by disputing the charge.",
    "parties": [
      {
        "name": "Cardholder",
        "role": "The customer who paid and is owed money back"
      },
      {
        "name": "Merchant",
        "role": "The business issuing the refund"
      },
      {
        "name": "Acquirer / processor",
        "role": "The merchant's bank-side partner that routes the refund into the network"
      },
      {
        "name": "Card network",
        "role": "Visa, Mastercard, or similar: routes the refund message and nets positions between banks"
      },
      {
        "name": "Issuer",
        "role": "The cardholder's bank that credits their account"
      }
    ],
    "steps": [
      {
        "n": 1,
        "kind": "message",
        "text": "The customer returns an item or requests a refund directly from the merchant; no money has moved yet.",
        "party": "Cardholder"
      },
      {
        "n": 2,
        "kind": "message",
        "text": "The merchant initiates a refund (also called a credit) for the original amount or part of it, referencing the original sale.",
        "party": "Merchant"
      },
      {
        "n": 3,
        "kind": "message",
        "text": "The acquirer or processor packages the refund and sends it into the card network as a credit transaction.",
        "party": "Acquirer / processor"
      },
      {
        "n": 4,
        "kind": "message",
        "text": "The network routes the refund instruction to the issuer and includes it in clearing, the daily exchange of transaction records between banks.",
        "party": "Card network"
      },
      {
        "n": 5,
        "kind": "message",
        "text": "The issuer receives the credit and schedules it against the cardholder's account; the customer may see a 'pending' credit.",
        "party": "Issuer"
      },
      {
        "n": 6,
        "kind": "money",
        "text": "During settlement the merchant's funds (via the acquirer) move toward the issuer to fund the refund; this is the money leg, handled by banks, not the network.",
        "party": "Merchant"
      },
      {
        "n": 7,
        "kind": "money",
        "text": "The issuer posts the credit to the cardholder's account, completing the return of funds, typically a few business days after step 2.",
        "party": "Issuer"
      },
      {
        "n": 8,
        "kind": "exception",
        "text": "If the merchant refuses or the refund never appears, the cardholder may instead file a chargeback, a separate dispute process that forces a reversal.",
        "party": "Cardholder"
      }
    ],
    "diagram": {
      "nodes": [
        {
          "id": "cardholder",
          "label": "Cardholder"
        },
        {
          "id": "merchant",
          "label": "Merchant"
        },
        {
          "id": "acquirer",
          "label": "Acquirer / processor"
        },
        {
          "id": "network",
          "label": "Card network"
        },
        {
          "id": "issuer",
          "label": "Issuer"
        }
      ],
      "legs": [
        {
          "from": "cardholder",
          "to": "merchant",
          "kind": "message",
          "label": "Refund requested",
          "ordinal": 1
        },
        {
          "from": "merchant",
          "to": "acquirer",
          "kind": "message",
          "label": "Refund initiated",
          "ordinal": 2
        },
        {
          "from": "acquirer",
          "to": "network",
          "kind": "message",
          "label": "Credit submitted",
          "ordinal": 3
        },
        {
          "from": "network",
          "to": "issuer",
          "kind": "message",
          "label": "Routes and clears",
          "ordinal": 4
        },
        {
          "from": "merchant",
          "to": "issuer",
          "kind": "money",
          "label": "Funds settle back",
          "ordinal": 5
        },
        {
          "from": "issuer",
          "to": "cardholder",
          "kind": "money",
          "label": "Credit posted",
          "ordinal": 6
        },
        {
          "from": "cardholder",
          "to": "issuer",
          "kind": "exception",
          "label": "Chargeback if unresolved",
          "ordinal": 7
        }
      ]
    },
    "settlementTiming": "Typically a few business days from when the merchant issues the refund to when it posts to the cardholder's statement. Authorization holds on the original purchase can take their own time to drop off, which sometimes confuses customers.",
    "misconceptions": [
      {
        "claim": "A refund reverses or cancels the original charge.",
        "reality": "It is a separate, new transaction in the opposite direction. The original charge stays on record; the refund clears and settles independently, which is why it is not instant."
      },
      {
        "claim": "A refund and a chargeback are the same thing.",
        "reality": "A refund is voluntarily issued by the merchant. A chargeback is a forced reversal the cardholder starts by disputing the charge with their bank, often with fees and evidence requirements for the merchant."
      }
    ],
    "relatedTerms": [
      "clearing",
      "settlement",
      "chargeback",
      "representment",
      "issuer",
      "acquirer",
      "authorization"
    ],
    "prompts": [
      {
        "prompt": "Show the flow of a $60 card refund from an online store back to a customer's Visa card, marking which legs are messages and which move money.",
        "seedId": "visa-four-party",
        "note": "Highlights the refund as a new reverse transaction, not an undo."
      },
      {
        "prompt": "Compare a merchant-issued refund with a cardholder-initiated chargeback for the same disputed purchase.",
        "seedId": "card-dispute-rege",
        "note": "Contrasts voluntary refund vs forced reversal."
      }
    ],
    "seeds": [
      {
        "seedId": "visa-four-party",
        "label": "Visa four-party model"
      },
      {
        "seedId": "card-dispute-rege",
        "label": "Card dispute (Reg E / chargeback)"
      }
    ],
    "sources": [
      {
        "label": "Visa",
        "url": "https://www.visa.com/en-us/support/visa-rules",
        "publisher": "Visa",
        "kind": "operator",
        "note": "Network rules covering credits and refunds in the four-party model."
      },
      {
        "label": "Mastercard",
        "url": "https://www.mastercard.com/us/en/business/support/rules.html",
        "publisher": "Mastercard",
        "kind": "operator",
        "note": "Rules covering the processing of credits (refunds), clearing, and settlement."
      },
      {
        "label": "Consumer Financial Protection Bureau",
        "url": "https://www.consumerfinance.gov/rules-policy/regulations/1005/",
        "publisher": "CFPB",
        "kind": "authority",
        "note": "Consumer guidance on refunds and disputes."
      }
    ],
    "railFamily": "card",
    "jurisdiction": [
      "global"
    ],
    "updated": "2026-06"
  },
  {
    "slug": "recurring-billing-explained",
    "title": "How recurring and subscription billing works",
    "answer": "Recurring billing relies on a stored mandate or saved payment credential that lets a merchant pull an agreed amount on a schedule, with each pull running as its own authorization and settlement.",
    "audience": "Smart non-experts new to payments: founders, ops, PMs, and BD building subscriptions who need to understand stored credentials, retries, and cancellation.",
    "summary": "Subscriptions work because the customer gives the merchant standing permission to charge them on a schedule. That permission is stored either as a card-on-file credential or as a pre-authorized debit mandate against a bank account (ACH in the US, PAD in Canada). Each billing cycle the merchant triggers a fresh charge using that stored permission, and each charge authorizes and settles on its own. When a charge fails, the merchant retries and sends reminders (dunning); customers can cancel the mandate, and consumer rules govern how that works.",
    "parties": [
      {
        "name": "Customer",
        "role": "The subscriber who grants standing permission to be charged"
      },
      {
        "name": "Merchant",
        "role": "The business that stores the mandate and triggers each cycle's charge"
      },
      {
        "name": "Processor / gateway",
        "role": "Submits each scheduled charge into the right rail"
      },
      {
        "name": "Network or ACH/PAD rail",
        "role": "Routes the charge: card network for card-on-file, or the ACH/PAD system for bank debits"
      },
      {
        "name": "Customer's bank / issuer",
        "role": "Approves or declines and moves the money from the customer's account"
      }
    ],
    "steps": [
      {
        "n": 1,
        "kind": "message",
        "text": "At signup the customer authorizes recurring charges, creating a stored card-on-file credential or a pre-authorized debit (ACH/PAD) mandate. This permission is not a charge.",
        "party": "Customer"
      },
      {
        "n": 2,
        "kind": "message",
        "text": "When a billing cycle arrives, the merchant triggers a new charge using the stored credential or mandate.",
        "party": "Merchant"
      },
      {
        "n": 3,
        "kind": "message",
        "text": "The processor submits the charge into the card network (card-on-file) or the ACH/PAD rail (bank debit).",
        "party": "Processor / gateway"
      },
      {
        "n": 4,
        "kind": "message",
        "text": "The rail routes the request to the customer's bank for authorization (cards) or as a debit entry (ACH/PAD).",
        "party": "Network or ACH/PAD rail"
      },
      {
        "n": 5,
        "kind": "message",
        "text": "For card-on-file, the issuer approves or declines in real time and places a hold on the funds. For ACH/PAD bank debits there is no upfront approval: the debit is presented and settles on schedule, and the merchant only learns of a failure (like insufficient funds) when a return comes back a few days later, or weeks later if the customer disputes the debit as unauthorized.",
        "party": "Customer's bank / issuer"
      },
      {
        "n": 6,
        "kind": "money",
        "text": "On settlement the funds move from the customer's account toward the merchant; banks move the money, the rail just routes and nets.",
        "party": "Customer's bank / issuer"
      },
      {
        "n": 7,
        "kind": "exception",
        "text": "If a charge fails (expired card, insufficient funds), the merchant runs retries and dunning emails to recover the payment before the subscription lapses.",
        "party": "Merchant"
      },
      {
        "n": 8,
        "kind": "exception",
        "text": "The customer can cancel the mandate or dispute an unauthorized charge; consumer protection rules govern how cancellations and reversals must be handled.",
        "party": "Customer"
      }
    ],
    "diagram": {
      "nodes": [
        {
          "id": "customer",
          "label": "Customer"
        },
        {
          "id": "merchant",
          "label": "Merchant"
        },
        {
          "id": "processor",
          "label": "Processor / gateway"
        },
        {
          "id": "rail",
          "label": "Network or ACH/PAD"
        },
        {
          "id": "bank",
          "label": "Customer's bank"
        }
      ],
      "legs": [
        {
          "from": "customer",
          "to": "merchant",
          "kind": "message",
          "label": "Mandate authorized",
          "ordinal": 1
        },
        {
          "from": "merchant",
          "to": "processor",
          "kind": "message",
          "label": "Trigger cycle charge",
          "ordinal": 2
        },
        {
          "from": "processor",
          "to": "rail",
          "kind": "message",
          "label": "Submit charge",
          "ordinal": 3
        },
        {
          "from": "rail",
          "to": "bank",
          "kind": "message",
          "label": "Authorize / debit",
          "ordinal": 4
        },
        {
          "from": "bank",
          "to": "merchant",
          "kind": "money",
          "label": "Funds settle",
          "ordinal": 5
        },
        {
          "from": "merchant",
          "to": "bank",
          "kind": "exception",
          "label": "Retry on failure",
          "ordinal": 6
        },
        {
          "from": "customer",
          "to": "merchant",
          "kind": "exception",
          "label": "Cancel or dispute",
          "ordinal": 7
        }
      ]
    },
    "settlementTiming": "Card-on-file charges typically authorize in seconds and settle in 1 to 2 business days. ACH or PAD bank debits clear over 1 to 3 business days and can fail or be returned several days after the pull, so confirmed receipt is slower than with cards.",
    "misconceptions": [
      {
        "claim": "Each subscription charge needs the customer to re-enter their details.",
        "reality": "The customer grants permission once. After that the merchant pulls on schedule using a stored credential or mandate, with no fresh customer action per cycle."
      },
      {
        "claim": "Authorizing a subscription is the same as being charged.",
        "reality": "The mandate or stored credential is standing permission. The actual money only moves when the merchant triggers each cycle's charge and it settles."
      }
    ],
    "relatedTerms": [
      "authorization",
      "settlement",
      "tokenization",
      "odfi",
      "rdfi",
      "chargeback",
      "psp",
      "payment-gateway"
    ],
    "prompts": [
      {
        "prompt": "Show a monthly card-on-file subscription charge, marking the authorization message and the settlement money leg separately.",
        "seedId": "visa-four-party",
        "note": "Card-on-file (card rail) example, to contrast with the bank-debit pull below."
      },
      {
        "prompt": "Map a Canadian pre-authorized debit (PAD) for a monthly membership, including a failed pull and retry.",
        "seedId": "pad-debit-ca",
        "note": "Shows the PAD mandate and exception/retry path."
      }
    ],
    "seeds": [
      {
        "seedId": "ach-debit-web",
        "label": "ACH debit (web-authorized)"
      },
      {
        "seedId": "pad-debit-ca",
        "label": "Pre-authorized debit (Canada)"
      },
      {
        "seedId": "visa-four-party",
        "label": "Visa four-party model"
      }
    ],
    "sources": [
      {
        "label": "NACHA",
        "url": "https://www.nacha.org/rules",
        "publisher": "NACHA",
        "kind": "authority",
        "note": "Rules for ACH pre-authorized debits and recurring entries (US)."
      },
      {
        "label": "Payments Canada",
        "url": "https://www.payments.ca/payment-resources/support-guides/consumer-guides/pre-authorized-debit",
        "publisher": "Payments Canada",
        "kind": "authority",
        "note": "Rules governing pre-authorized debit (PAD) in Canada."
      },
      {
        "label": "Visa",
        "url": "https://www.visa.com/en-us/support/visa-rules",
        "publisher": "Visa",
        "kind": "operator",
        "note": "Network rules including the stored credential and card-on-file framework for recurring card payments."
      },
      {
        "label": "Consumer Financial Protection Bureau",
        "url": "https://www.consumerfinance.gov/rules-policy/regulations/1005/",
        "publisher": "CFPB",
        "kind": "authority",
        "note": "Consumer rights around recurring charges and cancellation (US)."
      }
    ],
    "railFamily": "card",
    "jurisdiction": [
      "US",
      "CA"
    ],
    "updated": "2026-06"
  }
];
