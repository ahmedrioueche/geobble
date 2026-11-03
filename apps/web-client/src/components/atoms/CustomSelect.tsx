import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type CustomSelectOption<T extends string = string> = {
  value: T;
  label: string;
  flag?: string;
  name?: string;
};

export type CustomSelectProps<T extends string = string> = {
  title: string;
  options: CustomSelectOption<T>[];
  selectedOption: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
  ariaLabel?: string;
};

export default function CustomSelect<T extends string>({
  title,
  options,
  selectedOption,
  onChange,
  disabled = false,
  className = "",
  triggerClassName = "",
  placeholder = "Select…",
  ariaLabel,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = options.findIndex(
    (option) => option.value === selectedOption,
  );
  const selectedOptionData = options[selectedIndex];

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    optionRefs.current[selectedIndex >= 0 ? selectedIndex : 0]?.focus();
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, selectedIndex]);

  const focusOption = (index: number) => {
    if (options.length === 0) return;
    const nextIndex = (index + options.length) % options.length;
    optionRefs.current[nextIndex]?.focus();
  };

  const selectOption = (value: T) => {
    onChange(value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      className={`relative space-y-2 ${className}`}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
      ref={rootRef}
    >
      <span className="block text-xs font-bold uppercase tracking-wider text-white/70">
        {title}
      </span>
      <button
        ref={triggerRef}
        aria-controls={`${selectId}-options`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel ?? title}
        className={`flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-white/15 bg-slate-950 px-4 text-left text-sm font-semibold text-white outline-none transition-colors hover:border-sky-300/50 hover:bg-slate-900 focus:border-sky-300 focus:ring-2 focus:ring-sky-300/20 disabled:cursor-not-allowed disabled:opacity-50 ${triggerClassName}`}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
              return;
            }
            focusOption(selectedIndex + (event.key === "ArrowDown" ? 1 : -1));
          } else if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selectedOptionData?.flag && (
            <span aria-hidden="true" className="shrink-0">
              {selectedOptionData.flag}
            </span>
          )}
          <span className="truncate">
            {selectedOptionData?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-sky-300 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-60 overflow-y-auto rounded-xl border border-white/15 bg-slate-900 p-1.5 shadow-2xl"
          id={`${selectId}-options`}
          role="listbox"
          aria-label={title}
        >
          {options.map((option, index) => (
            <button
              aria-selected={option.value === selectedOption}
              className={`flex min-h-10 w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-sky-300/10 hover:text-sky-100 focus:bg-sky-300/10 focus:text-sky-100 focus:outline-none ${
                option.value === selectedOption
                  ? "bg-sky-300/10 text-sky-100"
                  : "text-white/75"
              }`}
              key={option.value}
              onClick={() => selectOption(option.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  focusOption(index + 1);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  focusOption(index - 1);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setIsOpen(false);
                  triggerRef.current?.focus();
                } else if (event.key === "Home") {
                  event.preventDefault();
                  focusOption(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  focusOption(options.length - 1);
                }
              }}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              role="option"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
