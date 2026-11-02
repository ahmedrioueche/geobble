import type React from "react";

interface RoomTextFieldProps {
  label: string;
  value: string;
  placeholder: string;
  maxLength: number;
  autoComplete?: string;
  autoCapitalize?: string;
  onChange: (value: string) => void;
}

export const RoomTextField: React.FC<RoomTextFieldProps> = ({
  label,
  value,
  placeholder,
  maxLength,
  autoComplete,
  autoCapitalize,
  onChange,
}) => (
  <label className="block text-xs font-bold uppercase tracking-[0.16em] text-white/65">
    {label}
    <input
      autoCapitalize={autoCapitalize}
      autoComplete={autoComplete}
      className="mt-2 h-14 w-full rounded-xl border border-white/15 bg-slate-950/70 px-4 text-base font-medium text-white outline-none transition placeholder:text-white/30 focus:border-sky-300 focus:ring-2 focus:ring-sky-300/15"
      maxLength={maxLength}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      title={label}
      value={value}
    />
  </label>
);
