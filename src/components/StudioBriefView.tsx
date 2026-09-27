"use client";

import { BookOpen, BookmarkPlus, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { buildPaymentBrief } from "@/lib/story/brief";
import { useStudio } from "@/lib/state/store";
import { ChatDock } from "./ChatDock";
import { ElementEditor } from "./ElementEditor";
import { FeedbackButton } from "./FeedbackButton";
import { FintechNorthMark } from "./FintechNorthMark";
import { FlowCanvas } from "./FlowCanvas";
import { PaymentBrief } from "./PaymentBrief";
import { ShareMenu } from "./ShareMenu";
import { StudioTools } from "./StudioTools";
import { TemplateLibrary } from "./TemplateLibrary";
import styles from "./StudioBriefView.module.css";

export function StudioBriefView({ launched }: { launched: boolean }) {
  const flow = useStudio((state) => state.flow);
  const busy = useStudio((state) => state.busy);
  const chatOpen = useStudio((state) => state.chatOpen);
  const setChatOpen = useStudio((state) => state.setChatOpen);
  const readerMode = useStudio((state) => state.readerMode);
  const setReaderMode = useStudio((state) => state.setReaderMode);
  const setViewMode = useStudio((state) => state.setViewMode);
  const setPopover = useStudio((state) => state.setPopover);
  const saveMyFlow = useStudio((state) => state.saveMyFlow);
  const brief = flow ? buildPaymentBrief(flow) : null;

  const changeMode = (mode: "story" | "system") => {
    setReaderMode(mode);
    if (mode === "system") setViewMode("lanes");
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Flow of Funds home">
          <FintechNorthMark size={24} />
          <span className={styles.brandCopy}>
            <span>Fintech North · Flow of Funds</span>
            <strong>{flow?.metadata.title || "Question to brief"}</strong>
          </span>
        </Link>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.action}
            onClick={() => setPopover("library")}
            aria-label="Open curated templates"
          >
            <BookOpen size={15} aria-hidden />
            <span className={styles.desktopOnly}>Templates</span>
          </button>
          <button
            type="button"
            className={styles.action}
            onClick={saveMyFlow}
            disabled={!flow || busy}
            aria-label="Save this flow"
          >
            <BookmarkPlus size={15} aria-hidden />
            <span className={styles.desktopOnly}>Save</span>
          </button>
          <StudioTools />
          <ShareMenu compact />
          <button
            type="button"
            className={styles.primaryAction}
            onClick={() => setChatOpen(true)}
            aria-label="Ask or edit this payment brief"
          >
            <MessageSquareText size={15} aria-hidden />
            <span className={styles.desktopOnly}>Ask or edit</span>
          </button>
        </div>
      </header>

      {!launched ? (
        <div className={styles.empty}>
          <div className={styles.emptyCard}>
            <h1>Ask a payment question</h1>
            <p>Start from the homepage or open a curated template. The brief will separate what the user sees from when institutions settle.</p>
            <button className={styles.primaryAction} type="button" onClick={() => setChatOpen(true)}>
              <MessageSquareText size={15} aria-hidden /> Ask a question
            </button>
          </div>
        </div>
      ) : flow && readerMode === "story" ? (
        <div className={styles.storyScroll}>
          <div className={styles.storyLayout}>
            <PaymentBrief flow={flow} mode={readerMode} onModeChange={changeMode} />
            <aside className={styles.context} aria-label="Recorded payment scope">
              <section>
                <h2>Recorded scope</h2>
                {brief?.scope.length ? (
                  <ul>{brief.scope.map((item) => <li key={item}>{item}</li>)}</ul>
                ) : (
                  <p>No jurisdiction, currency, or rail scope is recorded.</p>
                )}
              </section>
            </aside>
          </div>
        </div>
      ) : flow ? (
        <div className={styles.system}>
          <FlowCanvas />
          <div className={styles.systemTitle}>
            <p>System view</p>
            <h1 className={styles.systemHeading}>{flow.metadata.title}</h1>
            <button type="button" onClick={() => changeMode("story")}>Return to the brief</button>
            <p className={styles.mobileSystemNote}>Use the zoom controls to inspect the graph. Story is easier to read on a phone.</p>
          </div>
          <ElementEditor />
        </div>
      ) : (
        <div className={styles.empty}>
          <div className={styles.emptyCard} role="status" aria-live="polite">
            <h1>{busy ? "Building the brief" : "The brief could not be built"}</h1>
            <p>{busy ? "The payment document will appear here as soon as the first complete result is ready." : "Open the question panel to revise the request or choose a curated template."}</p>
          </div>
        </div>
      )}

      {chatOpen && (
        <>
          <button type="button" className={styles.scrim} aria-label="Close question panel" onClick={() => setChatOpen(false)} />
          <ChatDock onCollapse={() => setChatOpen(false)} />
        </>
      )}
      <TemplateLibrary />
      <FeedbackButton />
    </main>
  );
}
