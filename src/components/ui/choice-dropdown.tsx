"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import styles from "./choice-dropdown.module.css";

export type ChoiceOption = { value: string; label: string };

type ChoiceDropdownProps = {
  label: string;
  value: string;
  options: readonly ChoiceOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
};

type MenuPosition = { top: number; left: number; width: number; maxHeight: number; side: "up" | "down" };

export function ChoiceDropdown({ label, value, options, onChange, className = "", disabled = false }: ChoiceDropdownProps) {
  const id = useId().replace(/:/g, "");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((option) => option.value === value)));
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const closeTimer = useRef<number | null>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];
  const activeOptionId = `${id}-option-${activeIndex}`;

  const close = useCallback(() => {
    if (!open || closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setPosition(null);
      closeTimer.current = null;
    }, 120);
  }, [open, closing]);

  function choose(option: ChoiceOption) {
    onChange(option.value);
    setActiveIndex(options.indexOf(option));
    close();
    triggerRef.current?.focus();
  }

  function updatePosition() {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const rect = trigger.getBoundingClientRect();
    const gutter = 12;
    const desiredHeight = Math.min(menu.scrollHeight, 280);
    const below = window.innerHeight - rect.bottom - gutter;
    const above = rect.top - gutter;
    const side = below >= desiredHeight || below >= above ? "down" : "up";
    const maxHeight = Math.max(0, Math.min(desiredHeight, side === "down" ? below : above));
    const width = Math.min(Math.max(rect.width, 180), window.innerWidth - gutter * 2);
    const left = Math.max(gutter, Math.min(rect.left, window.innerWidth - width - gutter));
    const top = side === "down" ? Math.min(rect.bottom + 8, window.innerHeight - maxHeight - gutter) : Math.max(gutter, rect.top - maxHeight - 8);
    setPosition({ top, left, width, maxHeight, side });
  }

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, close]);

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
        setActiveIndex(selectedIndex);
        setOpen(true);
      } else {
        setActiveIndex((index) => (index + (event.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
      }
    } else if (open && event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (open && event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (open && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) choose(option);
    } else if (event.key === "Tab" && open) {
      close();
    }
  }

  return <div className={`${styles.field} ${className}`}>
    <span id={`${id}-label`} className={styles.label}>{label}</span>
    <button
      ref={triggerRef}
      id={`${id}-trigger`}
      type="button"
      role="combobox"
      className={styles.trigger}
      disabled={disabled}
      aria-labelledby={`${id}-label ${id}-value`}
      aria-haspopup="listbox"
      aria-expanded={open && !closing}
      aria-controls={open && !closing ? `${id}-listbox` : undefined}
      aria-activedescendant={open && !closing ? activeOptionId : undefined}
      onClick={() => {
        if (open && closing) {
          if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
          closeTimer.current = null;
          setClosing(false);
        } else if (open) close();
        else {
          setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
          setClosing(false);
          setOpen(true);
        }
      }}
      onKeyDown={handleKeyDown}
    >
      <span id={`${id}-value`}>{selected?.label ?? "Choose an option"}</span>
      <svg className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 6 4.5 4 4.5-4" /></svg>
    </button>
    {open && typeof document !== "undefined" && createPortal(
      <div
        ref={menuRef}
        id={`${id}-listbox`}
        role="listbox"
        aria-labelledby={`${id}-label`}
        aria-hidden={closing}
        className={`${styles.menu} ${position?.side === "up" ? styles.menuUp : styles.menuDown} ${closing ? styles.menuClosing : ""}`}
        style={position ? { top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight, visibility: "visible" } : { top: 0, left: 0, width: triggerRef.current?.getBoundingClientRect().width, visibility: "hidden" }}
      >
        {options.map((option, index) => <div
          id={`${id}-option-${index}`}
          key={option.value}
          role="option"
          aria-selected={option.value === value}
          className={`${styles.option} ${index === activeIndex ? styles.optionActive : ""} ${option.value === value ? styles.optionSelected : ""}`}
          onPointerDown={(event) => event.preventDefault()}
          onPointerMove={() => setActiveIndex(index)}
          onClick={() => choose(option)}
        >
          <span>{option.label}</span>
          {option.value === value && <span className={styles.check} aria-hidden="true">✓</span>}
        </div>)}
      </div>,
      document.body,
    )}
  </div>;
}
