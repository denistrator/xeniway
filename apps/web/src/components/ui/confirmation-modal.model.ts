import { type KeyboardEvent, type RefObject, useEffectEvent, useId, useLayoutEffect, useRef } from "react";
import { trapTabFocus } from "../../lib/trap-tab-focus";

export type ConfirmationModalProps = {
  title: string;
  text?: string;
  yesLabel: string;
  noLabel: string;
  onYes: () => void;
  onNo: () => void;
  yesDisabled?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

type ConfirmationLayer = {
  root: HTMLElement;
  initialFocus: HTMLButtonElement;
};

// Body-level portals keep background isolation flat; only the top confirmation is active.
const layers: ConfirmationLayer[] = [];
const isolatedBackground = new Set<Element>();

function updateBackground() {
  for (const element of isolatedBackground) {
    element.removeAttribute("inert");
  }
  isolatedBackground.clear();

  const root = layers.at(-1)?.root;
  if (!root) {
    return;
  }
  for (const sibling of document.body.children) {
    if (sibling === root || sibling.hasAttribute("inert")) {
      continue;
    }
    sibling.setAttribute("inert", "");
    isolatedBackground.add(sibling);
  }
}

function restoreFocus(root: HTMLElement, opener: HTMLElement | null) {
  // Wait for removal; StrictMode replay and replacement dialogs already have focus.
  queueMicrotask(() => {
    if (root.isConnected || document.activeElement !== document.body) {
      return;
    }
    const target = opener?.matches(":disabled") ? opener.closest<HTMLElement>("section") : opener;
    if (target?.isConnected && !target.closest("[inert]")) {
      target.focus();
    }
    if (document.activeElement === document.body) {
      const fallback = layers.at(-1)?.initialFocus ?? document.getElementById("main-content");
      fallback?.focus();
    }
  });
}

export function useConfirmationModal(onNo: () => void, returnFocusRef?: RefObject<HTMLElement | null>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const noButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const id = useId();
  const getReturnTarget = useEffectEvent(() => returnFocusRef?.current ?? openerRef.current);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (layers.at(-1)?.root !== rootRef.current) {
      return;
    }
    switch (event.key) {
      case "Escape": {
        event.preventDefault();
        event.stopPropagation();
        onNo();
        break;
      }
      case "Tab": {
        event.stopPropagation();
        trapTabFocus(event.nativeEvent, event.currentTarget);
        break;
      }
    }
  }

  useLayoutEffect(() => {
    const root = rootRef.current;
    const dialog = dialogRef.current;
    const initialFocus = noButtonRef.current;
    if (!root || !dialog || !initialFocus) {
      return;
    }
    const active = document.activeElement;
    // StrictMode replays setup while focus is already inside this dialog.
    if (active instanceof HTMLElement && active !== document.body && !root.contains(active)) {
      openerRef.current = active;
    }
    const layer = { root, initialFocus };
    layers.push(layer);
    updateBackground();
    initialFocus.focus();

    const containFocus = (event: FocusEvent) => {
      if (layers.at(-1) === layer && event.target instanceof Node && !dialog.contains(event.target)) {
        layer.initialFocus.focus();
      }
    };

    document.addEventListener("focusin", containFocus);
    return () => {
      document.removeEventListener("focusin", containFocus);
      const wasTopLayer = layers.at(-1) === layer;
      layers.splice(layers.indexOf(layer), 1);
      updateBackground();
      if (wasTopLayer) {
        restoreFocus(root, getReturnTarget());
      }
    };
  }, []);

  return { rootRef, dialogRef, noButtonRef, handleKeyDown, titleId: `${id}-title`, textId: `${id}-text` };
}
