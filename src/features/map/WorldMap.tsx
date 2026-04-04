import * as d3 from 'd3';
import React, { useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorldMap, type CountryFeature } from './useWorldMap';
import type { CountryData } from '../../data/country-data';
import { useGameStore } from '../../store/useGameStore';

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
  countries = []
}) => {
  const { geoData, loading, error, projection } = useWorldMap();
  const { gameStatus, pulseKey } = useGameStore();
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
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(observeTarget);
    return () => resizeObserver.unobserve(observeTarget);
  }, []);

  // Update Dynamic Projection
  const pathGenerator = useMemo(() => {
    if (!geoData || dimensions.width === 0 || dimensions.height === 0) return null;
    
    // Fit the map to our current container bounds
    const p = projection.fitSize([dimensions.width, dimensions.height], geoData);
    return d3.geoPath().projection(p);
  }, [geoData, dimensions, projection]);

  // Initialize Zoom behavior
  useEffect(() => {
    if (!svgRef.current || !gRef.current || !pathGenerator) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        g.style("--map-stroke-width", `${0.5 / event.transform.k}px`);
        g.style("--map-selected-stroke-width", `${1.2 / event.transform.k}px`);
      });

    svg.call(zoom);

    g.style("--map-stroke-width", "0.5px");
    g.style("--map-selected-stroke-width", "1.2px");
  }, [pathGenerator]);

  // Create a robust lookup mapping all possible country codes to the map's feature ID
  const featureIdLookup = useMemo(() => {
    if (!geoData || countries.length === 0) return {};
    const map: Record<string, string> = {};
    
    // Map geometry features to their own IDs and names for fallback
    (geoData.features as any[]).forEach(f => {
      const id = f.id?.toString();
      if (id) {
        // Find the country in our dataset that matches this map ID
        const country = countries.find(c => 
          c.cca3 === id || 
          c.cca2 === id || 
          c.ccn3 === id ||
          parseInt(c.ccn3 || "0", 10).toString() === id
        );

        if (country) {
          map[country.cca3] = id;
          map[country.cca2] = id;
          map[country.ccn3] = id;
          map[country.name.toLowerCase()] = id;
        }
      }
    });

    return map;
  }, [geoData, countries]);

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
    
    // Resolve the map's internal ID for the currently selected country
    const targetMapId = selectedCountryCode ? (featureIdLookup[selectedCountryCode] || selectedCountryCode) : null;
    const targetMapIdByName = selectedCountryName ? featureIdLookup[selectedCountryName.toLowerCase()] : null;

    return (geoData.features as unknown as CountryFeature[]).map(
      (feature, index: number) => {
        const name = feature.properties.name;
        const code = feature.id?.toString() || "";
        const path = pathGenerator(feature as any);
        
        const isSelected = 
          (targetMapId && code === targetMapId) ||
          (targetMapIdByName && code === targetMapIdByName) ||
          (selectedCountry && name.toLowerCase() === selectedCountry.toLowerCase());

        return (
          <path
            key={`${name}-${index}`}
            d={path || ""}
            style={{
              fill: isSelected ? "#22c55e" : "var(--color-map-land)",
              fillOpacity: isSelected ? 1 : 0.6,
              strokeWidth: isSelected
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
              ${isSelected ? "stroke-[#22c55e] drop-shadow-[0_0_25px_rgba(34,197,94,0.9)] z-50 animate-pulse" : ""}
            `}
            onClick={() => handleCountryClick(name, code)}
          >
            {gameStatus !== "playing" && (
              <title>{name}</title>
            )}
          </path>
        );
      },
    );
  }, [
    geoData,
    pathGenerator,
    selectedCountry,
    selectedCountryCode,
    selectedCountryName,
    featureIdLookup,
    handleCountryClick,
    gameStatus,
  ]);

  // Find centroid of the selected country for the sonar effect
  const sonarPoint = useMemo(() => {
    if (!geoData || !pathGenerator || (!selectedCountryCode && !selectedCountryName)) return null;
    
    const targetMapId = selectedCountryCode ? (featureIdLookup[selectedCountryCode] || selectedCountryCode) : null;
    const targetMapIdByName = selectedCountryName ? featureIdLookup[selectedCountryName.toLowerCase()] : null;

    const feature = (geoData.features as unknown as CountryFeature[]).find(f => {
      const code = f.id?.toString() || "";
      return (targetMapId && code === targetMapId) || (targetMapIdByName && code === targetMapIdByName);
    });
    
    if (!feature) return null;
    return pathGenerator.centroid(feature as any);
  }, [geoData, pathGenerator, selectedCountryCode, selectedCountryName, featureIdLookup]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-slate-950">
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
                {sonarPoint && gameStatus === 'playing' && (
                  <motion.g
                    key={`${missionId}-${pulseKey}`}
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
                          ease: "easeOut"
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
