import * as d3 from 'd3';
import React, { useMemo, useRef, useEffect } from 'react';
import { useWorldMap, type CountryFeature } from './useWorldMap';
import type { CountryData } from '../../data/country-data';
import { useGameStore } from '../../store/useGameStore';

interface MapProps {
  onCountryClick?: (name: string) => void;
  selectedCountry?: string;
  selectedCountryCode?: string | null;
  countries?: CountryData[];
}

const REGION_COLORS: Record<string, string> = {
  'Africa': '#f59e0b', // Amber
  'Americas': '#38bdf8', // Sky
  'Asia': '#ef4444', // Red
  'Europe': '#8b5cf6', // Violet
  'Oceania': '#10b981', // Emerald
  'Antarctic': '#94a3b8', // Slate
};

export const WorldMap: React.FC<MapProps> = ({ 
  onCountryClick, 
  selectedCountry,
  selectedCountryCode,
  countries = []
}) => {
  const { geoData, loading, error, projection } = useWorldMap();
  const { gameStatus, mode } = useGameStore();
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

  // Create a quick lookup for region by code
  const regionLookup = useMemo(() => {
    const map: Record<string, string> = {};
    countries.forEach((c) => {
      map[c.cca3] = c.region;
    });
    return map;
  }, [countries]);

  const handleCountryClick = React.useCallback(
    (name: string) => {
      if (onCountryClick) {
        onCountryClick(name);
      }
    },
    [onCountryClick],
  );

  const mapElements = useMemo(() => {
    if (!geoData || !pathGenerator) return null;
    return (geoData.features as unknown as CountryFeature[]).map(
      (feature, index: number) => {
        const name = feature.properties.name;
        const code = feature.id;
        const path = pathGenerator(feature as any);
        const region = regionLookup[code] || "Unknown";
        const regionColor = REGION_COLORS[region] || "var(--color-map-land)";

        const isSelected =
          (selectedCountry &&
            name.toLowerCase() === selectedCountry.toLowerCase()) ||
          (selectedCountryCode && code === selectedCountryCode);

        return (
          <path
            key={`${name}-${index}`}
            d={path || ""}
            style={{
              fill: isSelected ? "#22d3ee" : regionColor,
              fillOpacity: isSelected ? 1 : 0.6,
              strokeWidth: isSelected
                ? "var(--map-selected-stroke-width)"
                : "var(--map-stroke-width)",
            }}
            className={`
            stroke-[var(--color-map-stroke)] 
            transition-all 
            duration-500 
            hover:fill-opacity-100
            hover:stroke-white/60
            cursor-pointer
            ${isSelected ? "stroke-[#22d3ee] drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] z-50" : ""}
          `}
            onClick={() => handleCountryClick(name)}
          >
            {gameStatus !== "playing" && (
              <title>
                {name} ({region})
              </title>
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
    handleCountryClick,
    regionLookup,
    gameStatus,
    mode,
  ]);

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
