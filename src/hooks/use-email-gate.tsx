"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * The email gate shared by the PDF download and the Critical/High issue
 * details.
 *
 * There is no app-wide store in this project, and the gate only needs to
 * coordinate a handful of sibling components inside <Results>, so the state
 * lives in sessionStorage with window CustomEvents as the notification channel.
 * That keeps every consumer a plain hook call — no provider to thread through
 * the tree — and it survives a refresh without surviving the tab, which is
 * exactly the lifetime we want for a soft gate.
 */
export const UNLOCKED_KEY = "simultrans-unlocked";
export const EMAIL_KEY = "simultrans-email";

/** Fired by the modal once an email has been captured. */
export const UNLOCKED_EVENT = "simultrans:unlocked";
/** Fired by openGate(); the mounted <EmailGateModal /> listens for it. */
export const OPEN_GATE_EVENT = "simultrans:open-gate";

/** Carried on OPEN_GATE_EVENT so the opener can act the moment we unlock. */
export type OpenGateDetail = { onUnlocked?: () => void };

export function readUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(UNLOCKED_KEY) === "true";
  } catch {
    // Private-mode / blocked storage — treat as locked rather than throwing.
    return false;
  }
}

export function useEmailGate() {
  // Always starts locked so the server HTML and the first client render agree;
  // the effect below corrects it before paint.
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    setIsUnlocked(readUnlocked());

    const onUnlocked = () => setIsUnlocked(true);
    window.addEventListener(UNLOCKED_EVENT, onUnlocked);
    return () => window.removeEventListener(UNLOCKED_EVENT, onUnlocked);
  }, []);

  /**
   * Opens the gate modal. `onUnlocked` runs once, only if that visit to the
   * modal ends in a successful capture — closing it discards the callback, so
   * unlocking from an issue card never kicks off a PDF download.
   */
  const openGate = useCallback((onUnlocked?: () => void) => {
    window.dispatchEvent(
      new CustomEvent<OpenGateDetail>(OPEN_GATE_EVENT, {
        detail: { onUnlocked },
      }),
    );
  }, []);

  return { isUnlocked, openGate };
}
