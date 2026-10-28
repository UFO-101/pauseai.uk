"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import type { MailingAttachmentSummary } from "@/lib/server/mailing-drafts";
import styles from "./MailingFiles.module.css";

const copy = staffCopy.mailingPages;

/** A file's size in words: "800 bytes", "12 KB", "1.4 MB". */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return copy.bytes(bytes);
  if (bytes < 1024 * 1024) return copy.kilobytes(Math.round(bytes / 1024));
  return copy.megabytes(Math.round((bytes / (1024 * 1024)) * 10) / 10);
}

/** A PDF's first page, drawn in the browser by pdf.js, which loads only when there's one to draw. */
function PdfPage({ href }: { href: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let gone = false;
    (async () => {
      const data = new Uint8Array(await (await fetch(href)).arrayBuffer());
      const { getDocumentProxy } = await import("unpdf");
      const page = await (await getDocumentProxy(data)).getPage(1);
      const viewport = page.getViewport({ scale: 180 / page.getViewport({ scale: 1 }).width });
      if (gone) return;
      const sheet = canvas.current!;
      sheet.width = viewport.width;
      sheet.height = viewport.height;
      await page.render({ canvas: sheet, canvasContext: sheet.getContext("2d")!, viewport }).promise;
    })().catch(() => !gone && setFailed(true));
    return () => {
      gone = true;
    };
  }, [href]);
  if (failed) return <Sheet extension="pdf" />;
  return <canvas ref={canvas} className={styles.thumb} aria-hidden="true" />;
}

/** A file with no picture of it: a sheet of paper with its kind on it. */
function Sheet({ extension }: { extension: string }) {
  return (
    <span className={`${styles.thumb} ${styles.sheet}`} aria-hidden="true">
      {extension.toUpperCase()}
    </span>
  );
}

/** A file's kind, by the end of its name: "pdf". */
function extensionOf(filename: string): string {
  return filename.includes(".") ? filename.split(".").pop()! : "";
}

/** A paperclip (Lucide's, ISC licence), as attachments are shown in mail apps. */
function Paperclip() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable={false} className={styles.clip}>
      <path
        d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** An image's own small picture, or its sheet if it can't be loaded. */
function ImageThumb({ file, href }: { file: MailingAttachmentSummary; href: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Sheet extension={extensionOf(file.filename) || "?"} />;
  // A file a staff member attached, served by our own route, so no next/image.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={href} alt="" className={styles.thumb} onError={() => setFailed(true)} />;
}

/** A small picture of a file: an image itself, a PDF's first page, or a sheet with its kind. */
function Thumbnail({ file, href }: { file: MailingAttachmentSummary; href: string }) {
  if (file.contentType.startsWith("image/")) return <ImageThumb file={file} href={href} />;
  if (file.contentType === "application/pdf") return <PdfPage href={href} />;
  return <Sheet extension={extensionOf(file.filename) || "?"} />;
}

/**
 * A mailing's files, each a small card, as Email your MP shows a letter's
 * (AttachmentChips): a thumbnail, made in the browser, then a paperclip and
 * the name over its kind and size, opening the file. With `onAdd`, after
 * them, a card's size of dotted box to drop files on or pick them from, and
 * with `onRemove`, a × on each card's corner.
 */
export default function MailingFiles({
  files,
  base,
  onAdd,
  onRemove,
  problem,
}: {
  files: MailingAttachmentSummary[];
  /** Where the files can be opened: each at this, then its ID. A string, as a server page hands it in. */
  base: string;
  onAdd?: (files: File[]) => void;
  onRemove?: (id: number) => void;
  /** What's wrong with the last file added, if anything. */
  problem?: string;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const hint = useId();
  const [over, setOver] = useState(false);
  return (
    <div className={styles.files}>
      {(files.length > 0 || onAdd) && (
        <ul className={styles.list} aria-label={copy.attachments}>
          {files.map((file) => (
            <li key={file.id}>
              <a href={`${base}/${file.id}`} target="_blank" rel="noreferrer">
                <Thumbnail file={file} href={`${base}/${file.id}`} />
                <span className={styles.text}>
                  <strong>
                    <Paperclip />
                    {file.filename}
                  </strong>
                  <span>{`${extensionOf(file.filename) || "?"} · ${fileSize(file.size)}`.toUpperCase()}</span>
                </span>
              </a>
              {onRemove && (
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={copy.removeFile(file.filename)}
                  onClick={() => onRemove(file.id)}
                >
                  ×
                </button>
              )}
            </li>
          ))}
          {onAdd && (
            <li
              className={styles.drop}
              data-over={over || undefined}
              onDragOver={(event) => {
                event.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setOver(false);
                onAdd([...event.dataTransfer.files]);
              }}
            >
              <span id={hint}>{copy.dropFiles}</span>
              <Button variant="ghost" size="small" fit aria-describedby={hint} onClick={() => picker.current!.click()}>
                {copy.addFiles}
              </Button>
              <input
                ref={picker}
                type="file"
                multiple
                hidden
                onChange={(event) => {
                  const chosen = [...event.target.files!];
                  event.target.value = "";
                  onAdd(chosen);
                }}
              />
            </li>
          )}
        </ul>
      )}
      {problem && <p className={styles.problem}>{problem}</p>}
    </div>
  );
}
