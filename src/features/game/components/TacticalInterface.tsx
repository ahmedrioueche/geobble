import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChoicePanel } from "./ChoicePanel";
import { FeedbackPill } from "./FeedbackPill";
import { TargetPanel } from "./TargetPanel";
import { TargetSplash } from "./TargetSplash";
import type { CountryData } from "../../../data/country-data";
import { useGameStore } from "../../../store/useGameStore";

interface TacticalInterfaceProps {
  currentCountry: CountryData | undefined;
  countries: CountryData[];
  onChoiceSelect: (choice: string) => void;
  onReveal: () => void;
}

export const TacticalInterface: React.FC<TacticalInterfaceProps> = ({
  currentCountry,
  countries,
  onChoiceSelect,
  onReveal,
}) => {
  const {
    gameStatus,
    mode,
    pinDirection,
    subMode,
    feedback,
    clickedName,
    choices,
    revealed,
  } = useGameStore();
  const shouldAnimateTarget =
    mode === "identify" || (mode === "pin" && pinDirection === "locate");
  const targetKey = currentCountry
    ? `${currentCountry.cca3}:${subMode}:${mode}:${pinDirection}`
    : null;
  const [dockedTargetKey, setDockedTargetKey] = useState<string | null>(null);
  const [justDockedTargetKey, setJustDockedTargetKey] = useState<string | null>(
    null,
  );
  const dockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDocked =
    !shouldAnimateTarget ||
    feedback !== null ||
    revealed ||
    (targetKey !== null && dockedTargetKey === targetKey);
  const isJustDocked =
    targetKey !== null && justDockedTargetKey === targetKey;

  const handleDockStart = useCallback(() => {
    if (targetKey) setDockedTargetKey(targetKey);
  }, [targetKey]);

  const handleDockComplete = useCallback(() => {
    if (!targetKey) return;
    setDockedTargetKey(targetKey);
    setJustDockedTargetKey(targetKey);
    if (dockTimerRef.current !== null) clearTimeout(dockTimerRef.current);
    dockTimerRef.current = setTimeout(() => {
      setJustDockedTargetKey((currentKey) =>
        currentKey === targetKey ? null : currentKey,
      );
      dockTimerRef.current = null;
    }, 500);
  }, [targetKey]);

  useEffect(
    () => () => {
      if (dockTimerRef.current !== null) clearTimeout(dockTimerRef.current);
    },
    [],
  );

  return (
    <>
      <TargetSplash
        currentCountry={currentCountry}
        onDockStart={handleDockStart}
        onDockComplete={handleDockComplete}
      />
      <div
        id="target-dock-anchor"
        className="absolute top-28 md:top-24 landscape:top-16 landscape:md:top-24 right-4 z-40 pointer-events-none"
      >
        <div className="flex flex-col items-end gap-3 max-w-[calc(100vw-2rem)] md:max-w-full">
          <AnimatePresence>
            {gameStatus === "playing" &&
              currentCountry &&
              isDocked && (
                <motion.div
                  key={currentCountry.cca3}
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="pointer-events-auto flex flex-col items-end gap-3"
                >
                  <div className="w-full flex flex-col items-end gap-3">
                    {!(mode === "pin" && pinDirection === "identify") && (
                      <TargetPanel
                        country={currentCountry}
                        feedback={feedback}
                        onReveal={onReveal}
                        isJustDocked={isJustDocked}
                      />
                    )}
                  </div>

              {(mode === "reverse" || (mode === "pin" && pinDirection === "identify")) && (
                <div className="shadow-2xl rounded-3xl bg-slate-900/95 backdrop-blur-3xl border border-white/10 p-3 w-fit">
                  <ChoicePanel
                    choices={choices}
                    onChoice={onChoiceSelect}
                    disabled={!!feedback}
                    countries={countries}
                  />
                </div>
              )}

              <FeedbackPill 
                feedback={feedback} 
                clickedName={clickedName} 
                subMode={subMode}
                countries={countries}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </>
  );
};
