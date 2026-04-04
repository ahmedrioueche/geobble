import { motion } from "framer-motion";
import React from "react";
import type { CountryData } from "../../../data/country-data";

interface CountryPopupProps {
  country: CountryData | undefined;
  onClose: () => void;
}

export const CountryPopup: React.FC<CountryPopupProps> = ({
  country,
  onClose,
}) => {
  if (!country) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      className="bg-slate-900/95 backdrop-blur-3xl px-5 py-4 rounded-3xl border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] flex flex-col gap-3 min-w-[280px] max-w-[320px] relative overflow-hidden group"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500/50 via-sky-400/20 to-sky-500/50 opacity-50"></div>

      {/* Header: Flag, Name, ISO */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={`https://flagcdn.com/w80/${country.cca2.toLowerCase()}.png`}
            alt={country.name}
            className="h-5 w-auto rounded shadow-sm border border-white/5"
          />
          <span className="text-[10px] font-black text-white/30 uppercase tracking-tight">
            ISO-{country.cca3}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
        >
          <span className="text-sm font-black">×</span>
        </button>
      </div>

      <div className="flex flex-col">
        <h3 className="text-xl font-black text-white leading-none uppercase tracking-tight mb-1">
          {country.name}
        </h3>
        
        <div className="flex items-center gap-3 border-t border-white/5 pt-3 mt-1">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-white/20 uppercase tracking-wide">
              Capital
            </span>
            <span className="text-xs font-black text-sky-400 uppercase">
              {country.capital[0] || "N/A"}
            </span>
          </div>
          
          <div className="w-[1px] h-6 bg-white/5"></div>
          
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-white/20 uppercase tracking-wide">
              Region
            </span>
            <span className="text-xs font-black text-white/80 uppercase">
              {country.region}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
