import { AnimatePresence } from "framer-motion";
import React from "react";
import { CountryPopup } from "./CountryPopup";
import type { CountryData } from "../../../data/country-data";
import { useGameStore } from "../../../store/useGameStore";
import { StreakLostToast } from "./StreakLostToast";

interface GlobalOverlaysProps {
  clickedCountry: CountryData | null;
  onClosePopup: () => void;
}

export const GlobalOverlays: React.FC<GlobalOverlaysProps> = ({
  clickedCountry,
  onClosePopup,
}) => {
  const { gameStatus } = useGameStore();

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {/* Ambient Map Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_0%,rgba(15,23,42,0.4)_80%,rgba(15,23,42,0.8)_100%)]"></div>

      {/* Country Info Popup */}
      <div className="absolute top-14 md:top-18 right-4 md:right-8 pointer-events-auto">
        <AnimatePresence>
          {clickedCountry && gameStatus !== "playing" && (
            <CountryPopup
              country={clickedCountry}
              onClose={onClosePopup}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Streak Lost Notification */}
      <div className="pointer-events-auto">
        <StreakLostToast />
      </div>
    </div>
  );
};
