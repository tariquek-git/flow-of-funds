"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FLOW_CATALOG } from "@/lib/flows/catalog";
import { SHOWCASE_SCENARIOS } from "@/lib/flows/showcase";
import { track } from "@/lib/analytics";
import { buildPaymentBrief } from "@/lib/story/brief";
import { FintechNorthMark } from "./FintechNorthMark";
import { PaymentBrief } from "./PaymentBrief";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { usePrefillFlow } from "./usePrefillFlow";

const STUDIO_PATH = "/studio";
const DEFAULT_QUESTION = "When does a Canadian debit card merchant actually get the money?";
const DEFAULT_FLOW = FLOW_CATALOG["interac-debit"];
const TEMPLATE_COUNT = Object.keys(FLOW_CATALOG).length;

function handoff(value: string, source: "input" | "prefill" = "input") {
  const q = value.trim();
  if (!q) return;
  if (q === DEFAULT_QUESTION) {
    handoffSeed("interac-debit", "default-question");
    return;
  }
  track("landing_submit", { source });
  window.location.href = `${STUDIO_PATH}?q=${encodeURIComponent(q)}`;
}

function handoffSeed(seedId: string, source = "chip", mode?: "story" | "system") {
  track("landing_submit", { source, result_type: "curated_template", seedId });
  const modeParam = mode ? `&mode=${mode}` : "";
  window.location.href = `${STUDIO_PATH}?seed=${encodeURIComponent(seedId)}${modeParam}`;
}

function handoffLibrary() {
  track("landing_submit", { source: "library" });
  window.location.href = `${STUDIO_PATH}?library=1`;
}

export function Landing() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const viewLogged = useRef(false);
  const reduce = usePrefersReducedMotion();
  const brief = useMemo(() => buildPaymentBrief(DEFAULT_FLOW), []);

  useEffect(() => {
    if (viewLogged.current) return;
    viewLogged.current = true;
    track("landing_view", { reduced_motion: reduce });
  }, [reduce]);

  usePrefillFlow((description) => handoff(description, "prefill"));

  const resizeQuestion = (element: HTMLTextAreaElement) => {
    element.style.height = "0px";
    const lineHeight = Number.parseFloat(window.getComputedStyle(element).lineHeight) || 24;
    const maxHeight = lineHeight * 5 + 16;
    element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`;
    element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  useEffect(() => {
    if (inputRef.current) resizeQuestion(inputRef.current);
  }, []);

  return (
    <div className="brief-landing">
      <a href="#question" className="brief-skip">Skip to the payment question</a>

      <header className="brief-header">
        <a className="brief-brand" href="https://fintechnorth.ca" aria-label="Fintech North community">
          <FintechNorthMark size={25} />
          <span>Fintech North</span>
          <i aria-hidden />
          <strong>Flow of Funds</strong>
        </a>
        <nav aria-label="Primary navigation">
          <a href="/learn">Payment guides</a>
          <a href="/privacy">Privacy</a>
        </nav>
      </header>

      <main>
        <form
          className="brief-question"
          onSubmit={(event) => {
            event.preventDefault();
            handoff(question);
          }}
        >
          <label htmlFor="question">Ask any payment question</label>
          <div className="brief-question-row">
            <textarea
              id="question"
              ref={inputRef}
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value);
                resizeQuestion(event.target);
              }}
              aria-describedby="question-privacy-note"
              autoComplete="off"
              spellCheck={false}
              maxLength={500}
              rows={2}
            />
            <button type="submit" disabled={!question.trim()}>Build the brief</button>
          </div>
          <div className="brief-entry-notes">
            <p id="question-privacy-note">
              Questions and generated briefs may be logged to improve the tool. Do not enter
              private, client, or account data.
            </p>
            <p>Describe the region, participants, timing, or failure path you want to understand.</p>
          </div>
        </form>

        <section className="brief-showcase" aria-labelledby="showcase-heading">
          <div className="brief-showcase-heading">
            <div>
              <p>Six ways to use the tool</p>
              <h2 id="showcase-heading">Explore rails, regions, programs, and failure paths</h2>
            </div>
            <button type="button" onClick={handoffLibrary}>
              Browse all {TEMPLATE_COUNT} templates →
            </button>
          </div>
          <ul>
            {SHOWCASE_SCENARIOS.map((scenario) => (
              <li key={scenario.seedId}>
                <button type="button" onClick={() => handoffSeed(scenario.seedId, "showcase")}>
                  <span>{scenario.category}</span>
                  <strong>{scenario.question}</strong>
                  <small>{scenario.outcome}</small>
                </button>
              </li>
            ))}
          </ul>
          <p className="brief-showcase-note">
            Open a fixed template instantly or ask your own question for an AI draft. In the brief,
            switch between Story and System, then save or share the exact flow.
          </p>
        </section>

        <div className="brief-workspace">
          <PaymentBrief
            flow={DEFAULT_FLOW}
            mode="story"
            eyebrow="Example answer · Canadian debit"
            onModeChange={(mode) => mode === "system" && handoffSeed("interac-debit", "reader-mode", "system")}
          />

          <aside className="brief-context" aria-label="Recorded payment scope">
            <section>
              <h2>Recorded scope</h2>
              <ul>
                {brief.scope.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          </aside>
        </div>
      </main>

      <footer className="brief-footer">
        <span>A community-built public preview by Fintech North.</span>
        <span>Use professional judgment before relying on a flow.</span>
      </footer>
    </div>
  );
}
