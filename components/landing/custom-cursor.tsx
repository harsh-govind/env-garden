"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, select, [role="button"], [data-cursor="interactive"]';

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) {
      return;
    }

    let frame = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    const root = document.documentElement;
    const dot = dotRef.current;
    const ring = ringRef.current;

    if (!dot || !ring) {
      return;
    }

    const update = () => {
      dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      frame = 0;
    };

    const setHidden = (hidden: boolean) => {
      dot.classList.toggle("is-hidden", hidden);
      ring.classList.toggle("is-hidden", hidden);
    };

    const onPointerMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;

      const target = event.target;
      const isInteractive =
        target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR));

      dot.classList.toggle("is-active", isInteractive);
      ring.classList.toggle("is-active", isInteractive);
      setHidden(false);

      if (!frame) {
        frame = window.requestAnimationFrame(update);
      }
    };
    const onPointerLeave = () => setHidden(true);
    const onBlur = () => setHidden(true);

    root.classList.add("has-custom-cursor");
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("blur", onBlur);

    return () => {
      root.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onBlur);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="custom-cursor-dot is-hidden" aria-hidden="true" />
      <div ref={ringRef} className="custom-cursor-ring is-hidden" aria-hidden="true" />
    </>
  );
}
