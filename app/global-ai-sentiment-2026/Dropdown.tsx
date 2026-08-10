"use client";

import { useEffect, useRef, useState } from "react";

type DropdownOption = {
  value: string;
  label: string;
};

type DropdownProps = {
  id: string;
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
};

export default function Dropdown({ id, label, value, options, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => options.findIndex((o) => o.value === value));
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => optionRefs.current[activeIndex]?.focus());
    }
  }, [open, activeIndex]);

  function toggleOpen() {
    setOpen((wasOpen) => {
      const willOpen = !wasOpen;
      if (willOpen) {
        const idx = options.findIndex((o) => o.value === value);
        setActiveIndex(idx === -1 ? 0 : idx);
      }
      return willOpen;
    });
  }

  function commit(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(activeIndex + 1, options.length - 1);
      setActiveIndex(next);
      optionRefs.current[next]?.focus();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(activeIndex - 1, 0);
      setActiveIndex(prev);
      optionRefs.current[prev]?.focus();
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(activeIndex);
    }
  }

  return (
    <div className="gas-dropdown" ref={rootRef}>
      <label id={`${id}-label`} className="gas-dropdown-label">
        {label}
      </label>
      <button
        type="button"
        id={id}
        className="gas-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}`}
        onClick={toggleOpen}
      >
        <span>{selected?.label}</span>
        <svg className="gas-dropdown-caret" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul className="gas-dropdown-menu" role="listbox" aria-labelledby={`${id}-label`} tabIndex={-1} onKeyDown={handleKeyDown}>
          {options.map((option, i) => (
            <li
              key={option.value}
              ref={(el) => {
                optionRefs.current[i] = el;
              }}
              role="option"
              aria-selected={option.value === value}
              tabIndex={-1}
              className={`gas-dropdown-option ${option.value === value ? "selected" : ""} ${i === activeIndex ? "active" : ""}`}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => commit(i)}
            >
              <svg className="gas-dropdown-check" viewBox="0 0 16 16" aria-hidden="true">
                {option.value === value && <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
              </svg>
              <span>{option.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
