"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Download, ImageDown, RedoDot, Undo2, Upload } from "lucide-react";
import { track } from "@/lib/analytics";
import { exportExhibitPng } from "@/lib/export/exhibit";
import { toMermaid } from "@/lib/export/mermaid";
import { validateFlow } from "@/lib/schema/validate";
import { useStudio } from "@/lib/state/store";
import styles from "./StudioTools.module.css";

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

export function StudioTools() {
  const flow = useStudio((state) => state.flow);
  const busy = useStudio((state) => state.busy);
  const historyLength = useStudio((state) => state.history.length);
  const undo = useStudio((state) => state.undo);
  const loadFlow = useStudio((state) => state.loadFlow);
  const setReaderMode = useStudio((state) => state.setReaderMode);
  const setViewMode = useStudio((state) => state.setViewMode);
  const flashExportToast = useStudio((state) => state.flashExportToast);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const close = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };

  const downloadJson = () => {
    if (!flow) return;
    track("export_json");
    let json: string;
    try {
      json = JSON.stringify(flow, null, 2);
    } catch {
      alert("This flow could not be serialized because its structure is too deep.");
      return;
    }
    const blob = new Blob([json], { type: "application/json" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${slug(flow.metadata.title) || flow.id}.fof.json`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    close();
  };

  const openJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      try {
        JSON.stringify(parsed);
      } catch {
        alert("File structure is too deep.");
        return;
      }
      const result = validateFlow(parsed);
      if (!result.ok) {
        alert(`Not a valid flow file:\n${result.errors.slice(0, 3).join("\n")}`);
        return;
      }
      const imported = {
        ...result.flow,
        metadata: { ...result.flow.metadata, source: "user-edited" as const },
      };
      loadFlow(imported, `Opened **${imported.metadata.title}** from ${file.name}.`);
      close();
    } catch {
      alert("That file is not valid JSON.");
    }
  };

  const copyMermaid = async () => {
    if (!flow) return;
    track("export_mermaid");
    const mermaid = toMermaid(flow);
    try {
      await navigator.clipboard.writeText(mermaid);
      setCopyState("copied");
    } catch {
      try {
        window.prompt("Copy this Mermaid definition:", mermaid);
      } catch {
        // The visible error state remains when both clipboard and prompt are blocked.
      }
      setCopyState("error");
    }
    setTimeout(() => setCopyState("idle"), 1800);
  };

  const exportPng = async () => {
    if (!flow) return;
    close();
    const state = useStudio.getState();
    if (state.readerMode !== "system") {
      setReaderMode("system");
      setViewMode("lanes");
      await nextPaint();
    }
    const current = useStudio.getState();
    if (!current.flow) return;
    track("export_exhibit", { detail: current.detail });
    const ok = await exportExhibitPng(current.flow, current.detail, current.viewMode);
    if (ok) {
      flashExportToast("Exhibit downloaded with its trust receipt attached.");
    }
  };

  return (
    <details ref={detailsRef} className={styles.tools}>
      <summary className={styles.summary} aria-label="Open tools and exports">
        <Download size={15} aria-hidden />
        <span className={styles.label}>Tools</span>
      </summary>
      <div className={styles.menu} role="group" aria-label="Tools and exports">
        <p className={styles.intro}>Keep the first read simple. Open the deeper tools when you need them.</p>
        <button type="button" onClick={undo} disabled={!historyLength || busy}>
          <Undo2 size={15} aria-hidden />
          <span>Undo last edit</span>
          <kbd>⌘Z</kbd>
        </button>
        <button type="button" onClick={() => void exportPng()} disabled={!flow || busy}>
          <ImageDown size={15} aria-hidden />
          <span>Export exhibit (PNG)</span>
        </button>
        <button type="button" onClick={() => void copyMermaid()} disabled={!flow || busy}>
          <RedoDot size={15} aria-hidden />
          <span>{copyState === "copied" ? "Mermaid copied" : copyState === "error" ? "Copy failed" : "Copy Mermaid"}</span>
        </button>
        <button type="button" onClick={downloadJson} disabled={!flow || busy}>
          <Download size={15} aria-hidden />
          <span>Download flow (JSON)</span>
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Upload size={15} aria-hidden />
          <span>Open flow (JSON)</span>
        </button>
        <input
          ref={fileRef}
          className={styles.file}
          type="file"
          accept=".json,application/json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void openJson(file);
            event.target.value = "";
          }}
        />
        <Link href="/learn" onClick={close}>Payment guides and glossary</Link>
        <p className={styles.note}>Exact-flow links contain the flow itself. Do not put confidential or client-identifying data in a shared flow.</p>
      </div>
    </details>
  );
}
