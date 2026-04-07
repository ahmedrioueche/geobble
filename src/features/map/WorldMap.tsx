import * as d3 from "d3";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useRef } from "react";
import type { CountryData } from "../../data/country-data";
import { nameMapping } from "../../data/name-mapping";
import { useGameStore } from "../../store/useGameStore";
import { useWorldMap, type CountryFeature } from "./useWorldMap";

interface MapProps {
  onCountryClick?: (name: string, code: string) => void;
  selectedCountry?: string;
  selectedCountryCode?: string | null;
  selectedCountryName?: string | null;
  countries?: CountryData[];
  missionId?: string | null;
}

export const WorldMap: React.FC<MapProps> = ({
  onCountryClick,
  selectedCountry,
  selectedCountryCode,
  selectedCountryName,
  missionId,
  countries = [],
}) => {
  const { geoData, loading, error, projection } = useWorldMap();
  const {
    gameStatus,
    pulseKey,
    feedback,
    clickedCode,
    clickedName,
    mode,
    revealed,
    tempHighlightCode,
  } = useGameStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  // Resize listener
  useEffect(() => {
    if (!containerRef.current) return;

    const observeTarget = containerRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(observeTarget);
    return () => resizeObserver.unobserve(observeTarget);
  }, []);

  // Update Dynamic Projection
  const pathGenerator = useMemo(() => {
    if (!geoData || dimensions.width === 0 || dimensions.height === 0)
      return null;

    // Fit the map to our current container bounds
    const p = projection.fitSize(
      [dimensions.width, dimensions.height],
      geoData,
    );
    return d3.geoPath().projection(p);
  }, [geoData, dimensions, projection]);

  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Initialize Zoom behavior
  useEffect(() => {
    if (!svgRef.current || !gRef.current || !pathGenerator) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 40])
      .extent([
        [0, 0],
        [dimensions.width, dimensions.height],
      ])
      .translateExtent([
        [0, 0],
        [dimensions.width, dimensions.height],
      ])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        // Ensure strokes stay visible at high zoom levels
        g.style(
          "--map-stroke-width",
          `${Math.max(0.12, 0.5 / event.transform.k)}px`,
        );
        g.style(
          "--map-selected-stroke-width",
          `${Math.max(0.4, 1.2 / event.transform.k)}px`,
        );
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    g.style("--map-stroke-width", "0.5px");
    g.style("--map-selected-stroke-width", "1.2px");
  }, [pathGenerator]);

  // Map each feature ID to its logical country code (cca3)
  const idToCodeLookup = useMemo(() => {
    if (!geoData || countries.length === 0) return {};
    const map: Record<string, string> = {};

    (geoData.features as any[]).forEach((f) => {
      const id = f.id?.toString();
      const name = f.properties?.name || "";

      const findMappedName = (n: string) => {
        if (!n) return "";
        if (nameMapping[n]) return nameMapping[n];
        const titleCase = n
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
        if (nameMapping[titleCase]) return nameMapping[titleCase];
        const entry = Object.entries(nameMapping).find(
          ([k]) => k.toLowerCase() === n.toLowerCase(),
        );
        return entry ? entry[1] : n;
      };

      const mappedName = findMappedName(name);

      const country = countries.find(
        (c) =>
          (id &&
            (c.cca3 === id ||
              c.cca2 === id ||
              c.ccn3 === id ||
              parseInt(c.ccn3 || "0", 10).toString() === id)) ||
          (mappedName && c.name.toLowerCase() === mappedName.toLowerCase()),
      );

      if (country) {
        if (id) {
          map[id] = country.cca3;
        }
        if (name) {
          map[name.toLowerCase()] = country.cca3;
        }
      }
    });

    return map;
  }, [geoData, countries]);

  // Handle Home View for Desktop/Mobile
  const homeTransform = useMemo(() => {
    if (dimensions.width === 0) return d3.zoomIdentity;
    const isMobile = dimensions.width < 768;

    if (isMobile) {
      // On mobile, a flat 1x zoom is too small due to vertical screen aspect ratio.
      // 1.8x zoom provides a much better tactical feel while keeping the context.
      return d3.zoomIdentity
        .translate(dimensions.width / 2, dimensions.height / 2)
        .scale(1.8)
        .translate(-dimensions.width / 2, -dimensions.height / 2);
    }

    // On desktop, 1.3x zoom feels more tactical for identify missions and reduces context switching.
    return d3.zoomIdentity
      .translate(dimensions.width / 2, dimensions.height / 2)
      .scale(1.3)
      .translate(-dimensions.width / 2, -dimensions.height / 2);
  }, [dimensions]);

  // Camera Animation for Missions (Smart Transitions)
  useEffect(() => {
    if (
      !geoData ||
      !pathGenerator ||
      !svgRef.current ||
      !zoomRef.current ||
      gameStatus !== "playing" ||
      dimensions.width === 0
    )
      return;

    const svg = d3.select(svgRef.current);
    const currentTransform = d3.zoomTransform(svgRef.current);

    // Case 1: Stealth Smart Zoom for Identify search phase
    if (mode === "identify" && !revealed) {
      if (!selectedCountryCode) return;

      const feature = (geoData.features as unknown as CountryFeature[]).find(
        (f) => {
          const code = f.id?.toString() || "";
          const mappedCode =
            idToCodeLookup[code] ||
            idToCodeLookup[f.properties?.name?.toLowerCase() || ""];
          return mappedCode === selectedCountryCode;
        },
      );

      if (!feature) return;

      const [[fx0, fy0], [fx1, fy1]] = pathGenerator.bounds(feature as any);

      // Visibility check
      const p0 = currentTransform.apply([fx0, fy0]);
      const p1 = currentTransform.apply([fx1, fy1]);
      const margin = 30;
      const isInView =
        p0[0] > margin &&
        p0[1] > margin &&
        p1[0] < dimensions.width - margin &&
        p1[1] < dimensions.height - margin;

      // If already clearly in view at a sane zoom level, don't move
      if (isInView && currentTransform.k < 6.0) return;

      // --- Stealth Logic: Zoom out to show target relative to previous center ---
      const isMobile = dimensions.width < 768;
      const viewCX = isMobile ? dimensions.width * 0.35 : dimensions.width / 2;
      const viewCY = isMobile
        ? dimensions.height * 0.65
        : dimensions.height / 2;

      // Current center in projection space
      const curProjCX = (viewCX - currentTransform.x) / currentTransform.k;
      const curProjCY = (viewCY - currentTransform.y) / currentTransform.k;

      // Build bounding box containing BOTH current center and target country
      const contextMinX = Math.min(curProjCX, fx0);
      const contextMaxX = Math.max(curProjCX, fx1);
      const contextMinY = Math.min(curProjCY, fy0);
      const contextMaxY = Math.max(curProjCY, fy1);

      const cdx = contextMaxX - contextMinX;
      const cdy = contextMaxY - contextMinY;
      const contextMidX = (contextMinX + contextMaxX) / 2;
      const contextMidY = (contextMinY + contextMaxY) / 2;

      // Calculate context scale to fit the entire movement range
      const targetContextScale = Math.min(
        currentTransform.k, // Never zoom in durante the search advance
        0.65 / Math.max(cdx / dimensions.width, cdy / dimensions.height),
      );

      // Final scale: Zoom out but don't go beyond world level (homeTransform)
      const finalScale = Math.max(homeTransform.k, targetContextScale);

      const transform = d3.zoomIdentity
        .translate(viewCX, viewCY)
        .scale(finalScale)
        .translate(-contextMidX, -contextMidY);

      svg
        .transition()
        .duration(1400) // Slightly slower for a more 'scouring' feel
        .ease(d3.easeCubicInOut)
        .call(zoomRef.current.transform, transform);
      return;
    }

    // Case 2: Target Selection (Reverse Ops or Identify Reveal) - Perform Smart Feature Zoom
    if (!selectedCountryCode) return;

    const feature = (geoData.features as unknown as CountryFeature[]).find(
      (f) => {
        const code = f.id?.toString() || "";
        const mappedCode =
          idToCodeLookup[code] ||
          idToCodeLookup[f.properties?.name?.toLowerCase() || ""];
        return mappedCode === selectedCountryCode;
      },
    );

    if (!feature) return;

    const [[x0, y0], [x1, y1]] = pathGenerator.bounds(feature as any);

    const dx = x1 - x0;
    const dy = y1 - y0;
    const x = (x0 + x1) / 2;
    const y = (y0 + y1) / 2;

    const targetScaleFactor = mode === "reverse" ? 0.425 : 0.5;
    const scale = Math.max(
      1,
      Math.min(
        25,
        targetScaleFactor /
          Math.max(dx / dimensions.width, dy / dimensions.height),
      ),
    );

    const isMobile = dimensions.width < 768;
    const targetCenterX = isMobile
      ? dimensions.width * 0.35
      : dimensions.width / 2;
    const targetCenterY = isMobile
      ? dimensions.height * 0.65
      : dimensions.height / 2;

    const transform = d3.zoomIdentity
      .translate(targetCenterX, targetCenterY)
      .scale(scale)
      .translate(-x, -y);

    // Smart View Check: Only animate if the target is significantly out of view or improperly scaled
    const p0 = currentTransform.apply([x0, y0]);
    const p1 = currentTransform.apply([x1, y1]);

    // Check if the country is within the visible viewport with a safety margin
    const margin = 40;
    const isInView =
      p0[0] > margin &&
      p0[1] > margin &&
      p1[0] < dimensions.width - margin &&
      p1[1] < dimensions.height - margin;

    // Check if the current zoom level is approximately the same as the target zoom level
    const isGoodScale = Math.abs(Math.log2(currentTransform.k / scale)) < 1;

    if (isInView && isGoodScale) return;

    svg
      .transition()
      .duration(1200)
      .ease(d3.easeCubicInOut)
      .call(zoomRef.current.transform, transform);
  }, [
    missionId,
    selectedCountryCode,
    revealed,
    mode,
    gameStatus,
    geoData,
    pathGenerator,
    dimensions,
    idToCodeLookup,
    homeTransform,
  ]);

  const handleCountryClick = React.useCallback(
    (name: string, code: string) => {
      if (onCountryClick) {
        onCountryClick(name, code);
      }
    },
    [onCountryClick],
  );

  const mapElements = useMemo(() => {
    if (!geoData || !pathGenerator) return null;

    return (geoData.features as unknown as CountryFeature[]).map(
      (feature, index: number) => {
        const name = feature.properties.name;
        const code = feature.id?.toString() || "";
        const path = pathGenerator(feature as any);

        const mappedCode =
          idToCodeLookup[code] || idToCodeLookup[name.toLowerCase()];
        const shouldShowSelection = mode === "reverse" || revealed;
        const isSelected =
          shouldShowSelection &&
          ((selectedCountryCode && mappedCode === selectedCountryCode) ||
            (selectedCountry &&
              name.toLowerCase() === selectedCountry.toLowerCase()));

        const isFeedbackItem =
          (clickedCode && idToCodeLookup[clickedCode] === mappedCode) ||
          (clickedName &&
            idToCodeLookup[clickedName.toLowerCase()] === mappedCode);

        let fillColor = "var(--color-map-land)";
        if (isFeedbackItem && feedback) {
          fillColor = feedback === "correct" ? "#22c55e" : "#ef4444";
        } else if (isSelected || (tempHighlightCode && mappedCode === tempHighlightCode)) {
          fillColor = "#22c55e";
        }

        const isHighlighted = isSelected || (isFeedbackItem && feedback) || (tempHighlightCode && mappedCode === tempHighlightCode);
        const area = pathGenerator.area(feature as any);

        // Visibility Tresholds
        const SMALL_COUNTRY_THRESHOLD = 150; // Below this area, we show the pulsing 'Solar' effect
        const TINY_ISLAND_THRESHOLD = 30;    // Below this area, we show the 'White Circle' guide

        const isSmall = area < SMALL_COUNTRY_THRESHOLD;
        const isTiny = area < TINY_ISLAND_THRESHOLD;

        // Island Guide: Show a white dashed circle around tiny islands when they are target/feedback
        let guideCircle = null;
        if (isTiny && isHighlighted) {
          const [[x0, y0], [x1, y1]] = pathGenerator.bounds(feature as any);
          const cx = (x0 + x1) / 2;
          const cy = (y0 + y1) / 2;
          // Determine radius that covers the entire extent plus padding
          const r = Math.max((x1 - x0) / 2, (y1 - y0) / 2) + 12;

          guideCircle = (
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="white"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              className="pointer-events-none animate-[pulse_2s_infinite] drop-shadow-[0_0_5px_white]"
              style={{ vectorEffect: "non-scaling-stroke" }}
            />
          );
        }

        return (
          <React.Fragment key={`${name}-${index}`}>
            <path
              d={path || ""}
              style={{
                fill: fillColor,
                fillOpacity: isHighlighted ? 1 : 0.6,
                strokeWidth: isHighlighted
                  ? "var(--map-selected-stroke-width)"
                  : "var(--map-stroke-width)",
              }}
              className={`
                stroke-white/20 
                transition-all 
                duration-500 
                hover:fill-opacity-100
                hover:stroke-white/60
                cursor-pointer
                ${isHighlighted ? `stroke-${isFeedbackItem && feedback === "wrong" ? "[#ef4444]" : "[#22c55e]"} drop-shadow-[0_0_25px_rgba(${isFeedbackItem && feedback === "wrong" ? "239,68,68" : "34,197,94"},0.9)] z-50 ${isSmall ? "animate-pulse" : ""}` : ""}
              `}
              onClick={() => handleCountryClick(name, code)}
            >
              {gameStatus !== "playing" && <title>{name}</title>}
            </path>
            {guideCircle}
          </React.Fragment>
        );
      },
    );
  }, [
    geoData,
    pathGenerator,
    selectedCountry,
    selectedCountryCode,
    selectedCountryName,
    idToCodeLookup,
    handleCountryClick,
    gameStatus,
    feedback,
    clickedCode,
    tempHighlightCode,
  ]);

  // Find centroid of the selected country for the sonar effect
  const sonarPoint = useMemo(() => {
    // Hide sonar until revealed in Identify mode to prevent cheating
    const shouldShowSonar = mode === "reverse" || revealed;

    if (
      !geoData ||
      !pathGenerator ||
      !shouldShowSonar ||
      (!selectedCountryCode && !selectedCountryName)
    )
      return null;

    const feature = (geoData.features as unknown as CountryFeature[]).find(
      (f) => {
        const code = f.id?.toString() || "";
        const mappedCode =
          idToCodeLookup[code] ||
          idToCodeLookup[f.properties?.name?.toLowerCase() || ""];
        return selectedCountryCode && mappedCode === selectedCountryCode;
      },
    );

    if (!feature) return null;

    // Only show the sonar ring effect for smaller countries (below average)
    const area = pathGenerator.area(feature as any);
    if (area > 150) return null;

    return pathGenerator.centroid(feature as any);
  }, [
    geoData,
    pathGenerator,
    selectedCountryCode,
    selectedCountryName,
    idToCodeLookup,
    revealed,
    mode,
  ]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-slate-950 mt-20"
    >
      {loading || !pathGenerator ? (
        <div className="flex items-center justify-center h-full text-white/40 font-bold uppercase tracking-tight text-[10px]">
          {error ? error : "Establishing Orbital Link..."}
        </div>
      ) : (
        <>
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="w-full h-full select-none cursor-move"
          >
            <g ref={gRef} className="map-features">
              {mapElements}

              {/* Tactical Sonar Animation */}
              <AnimatePresence>
                {sonarPoint && gameStatus === "playing" && pulseKey > 0 && (
                  <motion.g
                    key={pulseKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.circle
                        key={i}
                        cx={sonarPoint[0]}
                        cy={sonarPoint[1]}
                        r={20}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth={2}
                        initial={{ scale: 3, opacity: 0 }}
                        animate={{
                          scale: 0.5,
                          opacity: [0, 0.8, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          delay: i * 0.4,
                          repeat: 2,
                          ease: "easeOut",
                        }}
                      />
                    ))}
                  </motion.g>
                )}
              </AnimatePresence>
            </g>
          </svg>

          {/* Zoom Instructions Overlay */}
          <div className="absolute bottom-6 left-6 pointer-events-none hidden md:block">
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-tight bg-slate-900/60 px-4 py-2 rounded-2xl backdrop-blur-md border border-white/5 shadow-2xl">
              Drag to Pan • Scroll to Zoom
            </span>
          </div>
        </>
      )}
    </div>
  );
};
