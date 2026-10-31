import type { GameModeGroup } from "../../../types/modal";

export interface ModeOption {
  id: GameModeGroup;
  icon: string;
  title: string;
  badge: string;
  description: string;
}

export const MODE_OPTIONS: ModeOption[] = [
  {
    id: "country",
    icon: "🎯",
    title: "COUNTRY MODE",
    badge: "LOCATE OR IDENTIFY",
    description:
      "Choose Locate to find a country from its name, flag, or capital. Choose Identify to name the highlighted country from four choices. Switch prompt types during play.",
  },
  {
    id: "pin",
    icon: "📍",
    title: "PIN DROP",
    badge: "BORDERLESS MAP",
    description:
      "Play without borders. In Locate, place a pin inside the prompted country. In Identify, use the pin on the map to choose the country. Switch prompt types during play.",
  },
];
