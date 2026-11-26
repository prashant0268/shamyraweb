import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = 'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

const focusables = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hasAttribute('inert') && el.getClientRects().length > 0);

/**
 * Modal dialog focus handling: while `active`, focus moves into `ref` (to `initial` if given, else the first
 * focusable element, else the container), Tab / Shift+Tab wrap inside it, Escape calls `onEscape`, and when it
 * deactivates or unmounts focus returns to whatever had it before (usually the button that opened it).
 */
export function useFocusTrap(active: boolean, ref: RefObject<HTMLElement | null>, onEscape?: () => void, initial?: RefObject<HTMLElement | null>) {
  const escRef = useRef(onEscape);
  useEffect(() => { escRef.current = onEscape; });

  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;
    const previous = document.activeElement as HTMLElement | null;
    const target = initial?.current ?? focusables(root)[0] ?? root;
    if (target === root && !root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (escRef.current) { e.stopPropagation(); escRef.current(); } return; }
      if (e.key !== 'Tab') return;
      const els = focusables(root);
      if (!els.length) { e.preventDefault(); root.focus(); return; }
      const first = els[0]!, last = els[els.length - 1]!;
      const cur = document.activeElement;
      if (e.shiftKey && (cur === first || !root.contains(cur))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (cur === last || !root.contains(cur))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      if (previous && previous.isConnected && typeof previous.focus === 'function') previous.focus({ preventScroll: true });
    };
  }, [active, ref, initial]);
}
