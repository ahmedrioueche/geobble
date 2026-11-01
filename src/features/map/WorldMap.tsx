import React from "react";
import type { CountryData } from "../../data/country-data";
import { useGameStore } from "../../store/useGameStore";
import { useGameUiStore } from "../../store/useGameUiStore";
import { useMapUiStore } from "../../store/useMapUiStore";
import { useShallow } from "zustand/react/shallow";
import {
  selectWorldMapSession,
  selectWorldMapUi,
} from "./worldMapStoreSelectors";
import { WorldMapView } from "./WorldMapView";

interface MapProps {
  onCountryClick?: (
    name: string,
    code: string,
    coordinates?: [number, number],
  ) => void;
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
  const { gameStatus, mode, pinDirection, pinLocation, revealed } =
    useGameStore(useShallow(selectWorldMapSession));
  const { feedback, clickedCode, clickedName } = useGameUiStore(
    useShallow(selectWorldMapUi),
  );
  const { pulseKey, sonarKey, tempHighlightCode } = useMapUiStore(
    useShallow((state) => ({
      pulseKey: state.pulseKey,
      sonarKey: state.sonarKey,
      tempHighlightCode: state.tempHighlightCode,
    })),
  );

  return (
    <WorldMapView
      onCountryClick={onCountryClick}
      selectedCountry={selectedCountry}
      selectedCountryCode={selectedCountryCode}
      selectedCountryName={selectedCountryName}
      countries={countries}
      missionId={missionId}
      gameStatus={gameStatus}
      mode={mode}
      pinDirection={pinDirection}
      pinLocation={pinLocation}
      revealed={revealed}
      feedback={feedback}
      clickedCode={clickedCode}
      clickedName={clickedName}
      pulseKey={pulseKey}
      sonarKey={sonarKey}
      tempHighlightCode={tempHighlightCode}
    />
  );
};
