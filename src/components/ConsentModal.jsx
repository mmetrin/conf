import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getSheetDragDistance,
  SHEET_CLOSE_DISTANCE,
} from "../utils/bottomSheet.js";

export function ConsentModal({
  title,
  titleId,
  onClose,
  returnFocusRef,
  children,
}) {
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const dragRef = useRef(null);
  const closeTimerRef = useRef(null);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const [closing, setClosing] = useState(false);
  onCloseRef.current = onClose;

  function finishClose() {
    if (!closingRef.current) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    onCloseRef.current();
  }

  function requestClose() {
    if (closingRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onCloseRef.current();
      return;
    }
    closingRef.current = true;
    setClosing(true);
    closeTimerRef.current = window.setTimeout(finishClose, 360);
  }

  function isMobileSheet() {
    return window.matchMedia("(max-width: 599px)").matches;
  }

  function startSheetDrag(event) {
    if (
      !isMobileSheet() ||
      event.target.closest("button, a") ||
      (event.button !== undefined && event.button !== 0)
    )
      return;

    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      currentY: event.clientY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dialogRef.current.classList.add("is-dragging");
  }

  function moveSheet(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.currentY = event.clientY;
    const distance = getSheetDragDistance(drag.startY, drag.currentY);
    dialogRef.current.style.setProperty("--sheet-drag-y", `${distance}px`);
  }

  function finishSheetDrag(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = getSheetDragDistance(drag.startY, drag.currentY);
    dragRef.current = null;
    dialogRef.current.classList.remove("is-dragging");
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (distance >= SHEET_CLOSE_DISTANCE) {
      requestClose();
      return;
    }
    dialogRef.current.style.removeProperty("--sheet-drag-y");
  }

  function cancelSheetDrag(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    dialogRef.current.classList.remove("is-dragging");
    dialogRef.current.style.removeProperty("--sheet-drag-y");
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function handleKeydown(event) {
      if (event.key === "Escape") {
        requestClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = [
        ...dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeydown);
    return () => {
      window.clearTimeout(closeTimerRef.current);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeydown);
      returnFocusRef.current?.focus();
    };
  }, [onClose, returnFocusRef]);

  return createPortal(
    <div
      className={`consent-modal${closing ? " is-closing" : ""}`}
      role="presentation"
      data-cursor="pointer"
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && closing) finishClose();
      }}
    >
      <div
        ref={dialogRef}
        className="consent-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div
          className="consent-modal__header"
          onPointerDown={startSheetDrag}
          onPointerMove={moveSheet}
          onPointerUp={finishSheetDrag}
          onPointerCancel={cancelSheetDrag}
        >
          <h2 id={titleId}>{title}</h2>
          <button
            ref={closeRef}
            className="consent-modal__close"
            type="button"
            aria-label="Закрыть"
            onClick={requestClose}
          >
            <img
              src="assets/cross.svg"
              width="28"
              height="28"
              alt=""
              aria-hidden="true"
            />
          </button>
        </div>
        <div className="consent-modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
