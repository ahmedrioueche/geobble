import React from "react";
import { useGameStore } from "../../store/useGameStore";
import { useGameUiStore } from "../../store/useGameUiStore";
import { useMapUiStore } from "../../store/useMapUiStore";
import { useShallow } from "zustand/react/shallow";
import {
  selectWorldMapMapUi,
  selectWorldMapSession,
  selectWorldMapUi,
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
> & {
  countries?: WorldMapViewProps["countries"];
};

export const WorldMap: React.FC<WorldMapWrapperProps> = ({
  onCountryClick,
  selectedCountry,
  selectedCountryCode,
  selectedCountryName,
  missionId,
  countries = [],
}) => {
  const game = useGameStore(useShallow(selectWorldMapSession));
  const gameUi = useGameUiStore(useShallow(selectWorldMapUi));
  const mapUi = useMapUiStore(useShallow(selectWorldMapMapUi));
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
      game={game}
      gameUi={gameUi}
      mapUi={mapUi}
    />
  );
};
