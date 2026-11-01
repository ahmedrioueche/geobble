import { AnimatePresence, motion } from "framer-motion";

type MapPoint = [number, number] | null;

interface MapMarkersProps {
  targetPinPoint: MapPoint;
  guessPinPoint: MapPoint;
  sonarPoint: MapPoint;
  feedback: "correct" | "wrong" | null;
  gameStatus: "idle" | "playing" | "finished";
  pulseKey: number;
  pinScale: number;
}

const PIN_PATH = "M0 1C-3-5-12-12-12-20a12 12 0 1 1 24 0C12-12 3-5 0 1Z";

export const MapMarkers: React.FC<MapMarkersProps> = ({
  targetPinPoint,
  guessPinPoint,
  sonarPoint,
  feedback,
  gameStatus,
  pulseKey,
  pinScale,
}) => (
  <>
    {targetPinPoint && (
      <g
        transform={`translate(${targetPinPoint[0]}, ${targetPinPoint[1]}) scale(${pinScale})`}
        className="pointer-events-none"
        aria-label="Target location"
      >
        <path
          d={PIN_PATH}
          fill="#22c55e"
          stroke="#fff"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx="0" cy="-20" r="4" fill="#fff" />
      </g>
    )}

    {guessPinPoint && (
      <g
        transform={`translate(${guessPinPoint[0]}, ${guessPinPoint[1]}) scale(${pinScale})`}
        className="pointer-events-none"
        aria-label="Your pin"
      >
        <path
          d={PIN_PATH}
          fill={
            feedback === "correct"
              ? "#22c55e"
              : feedback === "wrong"
                ? "#ef4444"
                : "#f59e0b"
          }
          stroke="#fff"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx="0" cy="-20" r="4" fill="#fff" />
      </g>
    )}

    <AnimatePresence>
      {sonarPoint && gameStatus === "playing" && pulseKey > 0 && (
        <motion.g
          key={pulseKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {[0, 1, 2].map((index) => (
            <motion.circle
              key={index}
              cx={sonarPoint[0]}
              cy={sonarPoint[1]}
              r={20}
              fill="none"
              stroke="#22c55e"
              strokeWidth={2}
              initial={{ scale: 3, opacity: 0 }}
              animate={{ scale: 0.5, opacity: [0, 0.8, 0] }}
              transition={{
                duration: 1.5,
                delay: index * 0.4,
                repeat: 2,
                ease: "easeOut",
              }}
            />
          ))}
        </motion.g>
      )}
    </AnimatePresence>
  </>
);
