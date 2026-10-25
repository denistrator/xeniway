import { type FocusEvent, type ReactNode, type RefObject, useEffect, useEffectEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export const INFO_MESSAGE_DURATION = 10_000;

export type InfoMessageProps = {
  messageId: string | number | object;
  children: ReactNode;
  className?: string;
  closeLabel?: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onDismiss?(): void;
};

type PauseReason = "hover" | "focus" | "hidden";
type TimerControls = { pause(reason: PauseReason, paused: boolean): void; stop(): void };

export function useInfoMessage({ messageId, closeLabel, returnFocusRef, onDismiss }: InfoMessageProps) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const pauses = useRef(new Set<PauseReason>());
  const controls = useRef<TimerControls>({ pause() {}, stop() {} });
  const [dismissed, setDismissed] = useState<{ id: InfoMessageProps["messageId"] } | null>(null);
  const [timing, setTiming] = useState({ id: messageId, remaining: INFO_MESSAGE_DURATION });
  const visible = dismissed?.id !== messageId;

  function dismiss() {
    controls.current.stop();
    pauses.current.clear();
    setDismissed({ id: messageId });
    onDismiss?.();
  }

  const expire = useEffectEvent((expiredId: InfoMessageProps["messageId"]) => {
    if (expiredId === messageId) {
      dismiss();
    }
  });

  useEffect(() => {
    let remaining = INFO_MESSAGE_DURATION;
    let startedAt: number | null = null;
    let deadline: number | undefined;
    let ticker: number | undefined;
    let active = true;
    setTiming({ id: messageId, remaining });

    function stop() {
      window.clearTimeout(deadline);
      window.clearInterval(ticker);
      startedAt = null;
    }

    function updateRemaining() {
      if (startedAt === null) {
        return;
      }
      const now = Date.now();
      remaining = Math.max(0, remaining - (now - startedAt));
      startedAt = now;
      setTiming({ id: messageId, remaining });
    }

    function resume() {
      if (!active || pauses.current.size > 0) {
        return;
      }
      startedAt = Date.now();
      ticker = window.setInterval(updateRemaining, 100);
      deadline = window.setTimeout(() => {
        if (active) {
          expire(messageId);
        }
      }, remaining);
    }

    function pause(reason: PauseReason, paused: boolean) {
      if (pauses.current.has(reason) === paused) {
        return;
      }
      updateRemaining();
      stop();
      if (paused) {
        pauses.current.add(reason);
      } else {
        pauses.current.delete(reason);
      }
      resume();
    }

    function handleVisibility() {
      pause("hidden", document.hidden);
    }

    controls.current = {
      pause,
      stop() {
        active = false;
        stop();
        document.removeEventListener("visibilitychange", handleVisibility);
      },
    };
    if (document.hidden) {
      pauses.current.add("hidden");
    } else {
      pauses.current.delete("hidden");
    }
    if (rootRef.current?.contains(document.activeElement)) {
      pauses.current.add("focus");
    } else {
      pauses.current.delete("focus");
    }
    resume();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      active = false;
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [messageId]);

  function close() {
    const restoreFocus = rootRef.current?.contains(document.activeElement);
    dismiss();
    if (restoreFocus) {
      queueMicrotask(() => {
        const caller = returnFocusRef?.current;
        const target = caller?.isConnected ? caller : document.getElementById("main-content");
        target?.focus();
      });
    }
  }

  function hover() {
    controls.current.pause("hover", true);
  }

  function leave() {
    controls.current.pause("hover", false);
  }

  function focus() {
    controls.current.pause("focus", true);
  }

  function blur(event: FocusEvent<HTMLDivElement>) {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    controls.current.pause("focus", false);
  }

  const remaining = timing.id === messageId ? timing.remaining : INFO_MESSAGE_DURATION;
  return {
    rootRef,
    visible,
    close,
    hover,
    leave,
    focus,
    blur,
    progressOffset: 100 * (1 - remaining / INFO_MESSAGE_DURATION),
    closeLabel: closeLabel ?? t("common.actions.closeMessage"),
  };
}
