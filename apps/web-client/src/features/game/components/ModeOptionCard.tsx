import { motion } from "framer-motion";
import { Check } from "lucide-react";
import React from "react";
import type { GameModeGroup } from "../../../types/modal";
import type { ModeOption } from "./modeOptions";

interface ModeOptionCardProps {
  mode: ModeOption;
  selected: boolean;
  index: number;
  onSelect: (mode: GameModeGroup) => void;
}

export const ModeOptionCard: React.FC<ModeOptionCardProps> = ({
  mode,
  selected,
  index,
  onSelect,
}) => (
  <motion.button
    type="button"
    aria-pressed={selected}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    onClick={() => onSelect(mode.id)}
    className={`
      group relative flex min-h-[240px] min-w-0 flex-col overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-300 sm:min-h-[270px] md:p-7
      ${
        selected
          ? "border-[var(--color-accent)] bg-slate-900 shadow-[0_0_40px_rgba(56,189,248,0.2)]"
          : "border-white/20 bg-slate-900/80 hover:border-white/40 hover:bg-slate-900"
      }
    `}
  >
    <div className="mb-4 flex items-center justify-between gap-2 md:mb-6">
      <div className="text-4xl transition-transform duration-300 group-hover:scale-110 md:text-5xl">
        {mode.icon}
      </div>
      <span className="inline-flex rounded-full border border-sky-400/30 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-sky-400 sm:text-[10px]">
        {mode.badge}
      </span>
    </div>

    <h3 className="mb-3 break-words text-lg font-black uppercase leading-tight tracking-tight text-white md:text-2xl">
      {mode.title}
    </h3>
    <p className="text-sm font-medium leading-relaxed text-slate-300 md:text-base">
      {mode.description}
    </p>

    <div className="mt-auto flex min-h-8 items-end pt-5">
      {selected && (
        <motion.span
          layoutId="active-indicator"
          className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-accent)]"
        >
          <Check className="h-3.5 w-3.5" />
          Selected
        </motion.span>
      )}
    </div>
  </motion.button>
);
