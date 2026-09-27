"use client";

import { useId, useMemo, useState } from "react";
import type { FoFEdge, FlowOfFunds } from "@/lib/schema/flow";
import { buildPaymentBrief } from "@/lib/story/brief";
import { TrustReceipt } from "./TrustReceipt";
import styles from "./PaymentBrief.module.css";

export type ReaderMode = "story" | "system";

type Props = {
  flow: FlowOfFunds;
  mode?: ReaderMode;
  onModeChange?: (mode: ReaderMode) => void;
  eyebrow?: string;
};

function edgeSentence(flow: FlowOfFunds, edge: FoFEdge): string {
  const from = flow.nodes.find((node) => node.id === edge.source)?.label || edge.source;
  const to = flow.nodes.find((node) => node.id === edge.target)?.label || edge.target;
  const event = edge.label || edge.description || edge.type;
  return `${from} → ${to}: ${event}${edge.timing ? ` (${edge.timing})` : ""}.`;
}

function BriefDetails({
  title,
  summary,
  edges,
  flow,
  defaultOpen = false,
}: {
  title: string;
  summary: string;
  edges: FoFEdge[];
  flow: FlowOfFunds;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className={styles.accordion} data-open={open || undefined}>
      <button
        type="button"
        className={styles.accordionButton}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.accordionName}>{title}</span>
        <span className={styles.accordionSummary}>{summary}</span>
        <span className={styles.accordionIcon} aria-hidden>+</span>
      </button>
      {open && (
        <div id={id}>
          {edges.length ? (
            <ol className={styles.legList}>
              {edges.map((edge) => <li key={edge.id}>{edgeSentence(flow, edge)}</li>)}
            </ol>
          ) : (
            <p className={`${styles.legList} ${styles.empty}`}>
              {title === "Exceptions"
                ? "No separate exception path is recorded in this document. Operational exceptions may still exist."
                : `No separate ${title.toLowerCase()} path is recorded.`}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export function PaymentBrief({ flow, mode = "story", onModeChange, eyebrow = "Your brief" }: Props) {
  const brief = useMemo(() => buildPaymentBrief(flow), [flow]);
  return (
    <article className={styles.brief} aria-labelledby="payment-brief-title">
      <div className={styles.headingRow}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 id="payment-brief-title" className={styles.title}>{brief.title}</h1>
          <p className={styles.answer}>{brief.answer.join(" ")}</p>
        </div>
        {onModeChange && (
          <div className={styles.modeSwitch} role="group" aria-label="Reader mode">
            {(["story", "system"] as const).map((readerMode) => (
              <button
                key={readerMode}
                type="button"
                className={styles.modeButton}
                aria-pressed={mode === readerMode}
                onClick={() => onModeChange(readerMode)}
              >
                {readerMode === "story" ? "Story" : "System"}
              </button>
            ))}
          </div>
        )}
      </div>

      <TrustReceipt flow={flow} className={styles.inlineReceipt} />

      <section className={styles.stageGrid} aria-label="Payment timing story">
        {brief.stages.length ? brief.stages.map((stage) => (
          <section
            key={stage.id}
            className={`${styles.stage} ${stage.id === "settlement" ? styles.settlement : ""}`}
          >
            <div className={styles.stageHead}>
              <span className={styles.stageNumber}>{stage.ordinal}</span>
              <div>
                <h2>{stage.title}</h2>
                <p className={styles.stageSubtitle}>{stage.subtitle}</p>
              </div>
            </div>
            <p className={styles.visibility}>
              {stage.visibility === "customer-visible" ? "Customer-visible" : "Not customer-visible"}
            </p>
            <dl className={styles.stageFacts}>
              <div className={styles.stageFact}><dt>Who acts</dt><dd>{stage.actor}</dd></div>
              <div className={styles.stageFact}><dt>Event</dt><dd>{stage.event}</dd></div>
              <div className={styles.stageFact}><dt>Time</dt><dd className={styles.time}>{stage.timing}</dd></div>
            </dl>
            <div className={styles.clockRule} />
            <p className={styles.clockCaption}>
              {stage.id === "settlement" ? "Institutional settlement" : "What the user sees"}
            </p>
          </section>
        )) : (
          <p className={styles.noStages}>
            No approval, availability, or institutional-settlement event is explicitly recorded.
          </p>
        )}
      </section>

      <section className={styles.participants} aria-labelledby="participant-title">
        <p id="participant-title" className={styles.sectionLabel}>Participants in this flow</p>
        <div className={styles.participantList}>
          {brief.participants.map((participant, index) => (
            <span key={participant.id} className={styles.participantStep}>
              {index > 0 && <span className={styles.participantArrow} aria-hidden>→</span>}
              <span className={styles.participant}>
                <strong>{participant.label}</strong>
                <span>{participant.description || participant.type}</span>
              </span>
            </span>
          ))}
        </div>
      </section>

      <section className={styles.accordions} aria-label="Flow detail">
        <BriefDetails title="Money" summary="Where principal value moves and who keeps what." edges={brief.money} flow={flow} defaultOpen />
        <BriefDetails title="Messages" summary="The instructions and confirmations exchanged." edges={brief.messages} flow={flow} />
        <BriefDetails title="Exceptions" summary="Only returns, reversals, refunds, and disputes recorded in this document; others may exist." edges={brief.exceptions} flow={flow} />
      </section>
    </article>
  );
}
