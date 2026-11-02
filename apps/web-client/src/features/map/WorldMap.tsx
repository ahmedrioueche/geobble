import React from "react";
import { useGameStore } from "../../store/useGameStore";
import { useGameUiStore } from "../../store/useGameUiStore";
import { useMapUiStore } from "../../store/useMapUiStore";
import { useShallow } from "zustand/react/shallow";
import {
  selectWorldMapMapUi,
  selectWorldMapSession,
  selectWorldMapUi,
  type WorldMapGameState,
  type WorldMapGameUiState,
  type WorldMapMapUiState,
} from "./worldMapStoreSelectors";
import { WorldMapView, type WorldMapViewProps } from "./WorldMapView";
import { useWorldMap } from "./useWorldMap";

type WorldMapWrapperProps = Omit<
  WorldMapViewProps,
  | "geoData"
  | "projection"
  | "loading"
  | "error"
  | "game"
  | "gameUi"
  | "mapUi"
  | "countries"
  | "targetMapAnchor"
> & {
  countries?: WorldMapViewProps["countries"];
  gameOverride?: WorldMapGameState;
  gameUiOverride?: WorldMapGameUiState;
  mapUiOverride?: WorldMapMapUiState;
  targetMapAnchor?: [number, number];
};

export const WorldMap: React.FC<WorldMapWrapperProps> = ({
  onCountryClick,
  selectedCountry,
  selectedCountryCode,
  selectedCountryName,
  missionId,
  countries = [],
  gameOverride,
  gameUiOverride,
  mapUiOverride,
  targetMapAnchor,
}) => {
  const storedGame = useGameStore(useShallow(selectWorldMapSession));
  const storedGameUi = useGameUiStore(useShallow(selectWorldMapUi));
  const storedMapUi = useMapUiStore(useShallow(selectWorldMapMapUi));
  const { geoData, projection, loading, error } = useWorldMap();

  return (
    <WorldMapView
      geoData={geoData}
      projection={projection}
      loading={loading}
      error={error}
      onCountryClick={onCountryClick}
      selectedCountry={selectedCountry}
      selectedCountryCode={selectedCountryCode}
      selectedCountryName={selectedCountryName}
      countries={countries}
      missionId={missionId}
      game={gameOverride ?? storedGame}
      gameUi={gameUiOverride ?? storedGameUi}
      mapUi={mapUiOverride ?? storedMapUi}
      targetMapAnchor={targetMapAnchor}
    />
  );
};
