import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import type { CountryData } from "../../../data/country-data";
import { useGameStore } from "../../../store/useGameStore";

interface TargetSplashProps {
  currentCountry: CountryData | undefined;
  onDockStart: () => void;
  onDockComplete: () => void;
}

export const TargetSplash: React.FC<TargetSplashProps> = ({
  currentCountry,
  onDockStart,
  onDockComplete,
}) => {
  const { gameStatus, mode, pinDirection, subMode, feedback, revealed } =
    useGameStore();
  const shouldAnimateTarget =
    mode === "identify" || (mode === "pin" && pinDirection === "locate");
  const [isVisible, setIsVisible] = useState(false);
  const [targetOffset, setTargetOffset] = useState({ x: 250, y: -250 });

  useEffect(() => {
    if (
      gameStatus !== "playing" ||
      !shouldAnimateTarget ||
      !currentCountry ||
      feedback !== null ||
      revealed
    ) {
      setIsVisible(false);
      return;
    }

    // Measure target dock anchor position on screen for pixel-perfect arc flight
    const anchor = document.getElementById("target-dock-anchor");
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const destX = rect.left + rect.width / 2 - window.innerWidth / 2;
      const destY = rect.top + rect.height / 2 - window.innerHeight / 2;
      setTargetOffset({ x: destX, y: destY });
    } else {
      setTargetOffset({
        x: Math.max(80, window.innerWidth / 2 - 130),
        y: -(window.innerHeight / 2) + (window.innerWidth < 768 ? 125 : 105),
      });
    }

    setIsVisible(true);

    // Trigger the target panel to reveal sooner (at 620ms as flight initiates)
    // so there is zero dead-time and seamless overlap
    const dockStartTimer = setTimeout(() => {
      onDockStart();
    }, 620);

    return () => {
      clearTimeout(dockStartTimer);
    };
  }, [
    currentCountry?.cca3,
    subMode,
    mode,
    pinDirection,
    shouldAnimateTarget,
    gameStatus,
    feedback,
    revealed,
    onDockStart,
  ]);

  if (gameStatus !== "playing" || !shouldAnimateTarget || !currentCountry) {
    return null;
  }

  const capitalName = currentCountry.capital?.[0] || currentCountry.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none select-none px-4 overflow-hidden">
      <AnimatePresence>
        {isVisible && !feedback && !revealed && (
          <motion.div
            key={`${currentCountry.cca3}-${subMode}`}
            initial={{
              opacity: 0,
              scale: 0.8,
              x: 0,
              y: 0,
            }}
            animate={{
              opacity: [0, 1, 1, 0.95, 0],
              scale: [0.8, 1.0, 1.02, 0.6, 0.35],
              x: [0, 0, 0, targetOffset.x * 0.5, targetOffset.x],
              y: [0, 0, 0, targetOffset.y * 0.82, targetOffset.y],
            }}
            transition={{
              duration: 1.05,
              times: [0, 0.22, 0.6, 0.84, 1],
              ease: [
                [0.16, 1, 0.3, 1],  // In: fast smooth deceleration
                [0.37, 0, 0.63, 1], // Mid: subtle living drift
                [0.45, 0, 0.25, 1], // Arc flight launch
                [0.25, 1, 0.5, 1],  // Dock landing
              ],
            }}
            onAnimationComplete={() => {
              setIsVisible(false);
              onDockComplete();
            }}
            style={{ willChange: "transform, opacity" }}
            className="flex flex-col items-center justify-center text-center max-w-[92vw] md:max-w-4xl transform-gpu"
          >
            {subMode === "flag" ? (
              <img
                src={`https://flagcdn.com/w320/${currentCountry.cca2.toLowerCase()}.png`}
                alt={currentCountry.name}
                decoding="async"
                className="h-20 sm:h-28 md:h-36 w-auto max-w-[75vw] max-h-[35vh] object-contain rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.85)] border-2 border-white/30"
              />
            ) : subMode === "capital" ? (
              <span className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight text-sky-400 drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] drop-shadow-[0_0_20px_rgba(56,189,248,0.7)] leading-tight text-balance">
                {capitalName}
              </span>
            ) : (
              <span className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] drop-shadow-[0_0_20px_rgba(255,255,255,0.45)] leading-tight text-balance">
                {currentCountry.name}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
