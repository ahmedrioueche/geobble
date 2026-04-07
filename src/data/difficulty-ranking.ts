interface RankInfo {
  rank: number;
  stage: number;
}

export const difficultyRanking: Record<string, RankInfo> = {
  // Stage 1 - Explorer (1-25)
  "USA": { rank: 1, stage: 1 }, "CHN": { rank: 2, stage: 1 }, "IND": { rank: 3, stage: 1 }, "GBR": { rank: 4, stage: 1 }, "FRA": { rank: 5, stage: 1 },
  "DEU": { rank: 6, stage: 1 }, "JPN": { rank: 7, stage: 1 }, "RUS": { rank: 8, stage: 1 }, "BRA": { rank: 9, stage: 1 }, "CAN": { rank: 10, stage: 1 },
  "AUS": { rank: 11, stage: 1 }, "ITA": { rank: 12, stage: 1 }, "ESP": { rank: 13, stage: 1 }, "MEX": { rank: 14, stage: 1 }, "KOR": { rank: 15, stage: 1 },
  "IDN": { rank: 16, stage: 1 }, "TUR": { rank: 17, stage: 1 }, "EGY": { rank: 18, stage: 1 }, "ZAF": { rank: 19, stage: 1 }, "NGA": { rank: 20, stage: 1 },
  "PHL": { rank: 21, stage: 1 }, "VNM": { rank: 22, stage: 1 }, "THA": { rank: 23, stage: 1 }, "PAK": { rank: 24, stage: 1 }, "ARG": { rank: 25, stage: 1 },

  // Stage 2 - Navigator (26-50)
  "SAU": { rank: 26, stage: 2 }, "COL": { rank: 27, stage: 2 }, "UKR": { rank: 28, stage: 2 }, "POL": { rank: 29, stage: 2 }, "MAR": { rank: 30, stage: 2 },
  "DZA": { rank: 31, stage: 2 }, "PER": { rank: 32, stage: 2 }, "IRQ": { rank: 33, stage: 2 }, "KEN": { rank: 34, stage: 2 }, "GHA": { rank: 35, stage: 2 },
  "MYS": { rank: 36, stage: 2 }, "UZB": { rank: 37, stage: 2 }, "ROU": { rank: 38, stage: 2 }, "CHL": { rank: 39, stage: 2 }, "KAZ": { rank: 40, stage: 2 },
  "SWE": { rank: 41, stage: 2 }, "NOR": { rank: 42, stage: 2 }, "CHE": { rank: 43, stage: 2 }, "SGP": { rank: 44, stage: 2 }, "DNK": { rank: 45, stage: 2 },
  "FIN": { rank: 46, stage: 2 }, "IRL": { rank: 47, stage: 2 }, "NZL": { rank: 48, stage: 2 }, "ISR": { rank: 49, stage: 2 }, "GRC": { rank: 50, stage: 2 },

  // Stage 3 - Pathfinder (51-75)
  "SYR": { rank: 51, stage: 3 }, "PRT": { rank: 52, stage: 3 }, "AUT": { rank: 53, stage: 3 }, "BEL": { rank: 54, stage: 3 }, "CZE": { rank: 55, stage: 3 },
  "HUN": { rank: 56, stage: 3 }, "ARE": { rank: 57, stage: 3 }, "KWT": { rank: 58, stage: 3 }, "HKG": { rank: 59, stage: 3 }, "TWN": { rank: 60, stage: 3 },
  "CUB": { rank: 61, stage: 3 }, "DOM": { rank: 62, stage: 3 }, "VEN": { rank: 63, stage: 3 }, "ECU": { rank: 64, stage: 3 }, "URY": { rank: 65, stage: 3 },
  "BOL": { rank: 66, stage: 3 }, "PRY": { rank: 67, stage: 3 }, "SRB": { rank: 68, stage: 3 }, "BUL": { rank: 69, stage: 3 }, "HRV": { rank: 70, stage: 3 },
  "JOR": { rank: 71, stage: 3 }, "LBY": { rank: 72, stage: 3 }, "TUN": { rank: 73, stage: 3 }, "AFG": { rank: 74, stage: 3 }, "SDN": { rank: 75, stage: 3 },

  // Stage 4 - Voyager (76-100)
  "ETH": { rank: 76, stage: 4 }, "UGA": { rank: 77, stage: 4 }, "TZA": { rank: 78, stage: 4 }, "AGO": { rank: 79, stage: 4 }, "GTM": { rank: 80, stage: 4 },
  "PAN": { rank: 81, stage: 4 }, "CRI": { rank: 82, stage: 4 }, "NIC": { rank: 83, stage: 4 }, "HND": { rank: 84, stage: 4 }, "SLV": { rank: 85, stage: 4 },
  "JAM": { rank: 86, stage: 4 }, "GEO": { rank: 87, stage: 4 }, "ARM": { rank: 88, stage: 4 }, "AZE": { rank: 89, stage: 4 }, "LBN": { rank: 90, stage: 4 },
  "CYP": { rank: 91, stage: 4 }, "ISL": { rank: 92, stage: 4 }, "LUX": { rank: 93, stage: 4 }, "ALB": { rank: 94, stage: 4 }, "LTU": { rank: 95, stage: 4 },
  "LVA": { rank: 96, stage: 4 }, "EST": { rank: 97, stage: 4 }, "MMR": { rank: 98, stage: 4 }, "KHM": { rank: 99, stage: 4 }, "LAO": { rank: 100, stage: 4 },

  // Stage 5 - Diplomat (101-125)
  "ZMB": { rank: 101, stage: 5 }, "ZWE": { rank: 102, stage: 5 }, "MWI": { rank: 103, stage: 5 }, "NAM": { rank: 104, stage: 5 }, "BWA": { rank: 105, stage: 5 },
  "GAB": { rank: 106, stage: 5 }, "COG": { rank: 107, stage: 5 }, "COD": { rank: 108, stage: 5 }, "CMR": { rank: 109, stage: 5 }, "CIV": { rank: 110, stage: 5 },
  "SEN": { rank: 111, stage: 5 }, "GIN": { rank: 112, stage: 5 }, "MLI": { rank: 113, stage: 5 }, "NER": { rank: 114, stage: 5 }, "TCD": { rank: 115, stage: 5 },
  "CAF": { rank: 116, stage: 5 }, "SSD": { rank: 117, stage: 5 }, "SOM": { rank: 118, stage: 5 }, "RWA": { rank: 119, stage: 5 }, "BDI": { rank: 120, stage: 5 },
  "MDA": { rank: 121, stage: 5 }, "MKD": { rank: 122, stage: 5 }, "MNE": { rank: 123, stage: 5 }, "BIH": { rank: 124, stage: 5 }, "MLT": { rank: 125, stage: 5 },

  // Stage 6 - Cartographer (126-150)
  "TJK": { rank: 126, stage: 6 }, "TKM": { rank: 127, stage: 6 }, "KGZ": { rank: 128, stage: 6 }, "MNG": { rank: 129, stage: 6 }, "BTN": { rank: 130, stage: 6 },
  "NPL": { rank: 131, stage: 6 }, "LKA": { rank: 132, stage: 6 }, "MDV": { rank: 133, stage: 6 }, "MUS": { rank: 134, stage: 6 }, "SYC": { rank: 135, stage: 6 },
  "CPV": { rank: 136, stage: 6 }, "STP": { rank: 137, stage: 6 }, "COM": { rank: 138, stage: 6 }, "DJI": { rank: 139, stage: 6 }, "ERI": { rank: 140, stage: 6 },
  "GMB": { rank: 141, stage: 6 }, "GNB": { rank: 142, stage: 6 }, "SLE": { rank: 143, stage: 6 }, "LBR": { rank: 144, stage: 6 }, "TGO": { rank: 145, stage: 6 },
  "BEN": { rank: 146, stage: 6 }, "BFA": { rank: 147, stage: 6 }, "SUR": { rank: 148, stage: 6 }, "GUY": { rank: 149, stage: 6 }, "BLZ": { rank: 150, stage: 6 },

  // Stage 7 - Globalist (151-175)
  "BHS": { rank: 151, stage: 7 }, "TTO": { rank: 152, stage: 7 }, "BRB": { rank: 153, stage: 7 }, "LCA": { rank: 154, stage: 7 }, "VCT": { rank: 155, stage: 7 },
  "GRD": { rank: 156, stage: 7 }, "ATG": { rank: 157, stage: 7 }, "KNA": { rank: 158, stage: 7 }, "DMA": { rank: 159, stage: 7 }, "PRI": { rank: 160, stage: 7 },
  "FJI": { rank: 161, stage: 7 }, "SLB": { rank: 162, stage: 7 }, "VUT": { rank: 163, stage: 7 }, "TLS": { rank: 164, stage: 7 }, "BRN": { rank: 165, stage: 7 },
  "PRK": { rank: 166, stage: 7 }, "WSM": { rank: 167, stage: 7 }, "TON": { rank: 168, stage: 7 }, "FSM": { rank: 169, stage: 7 }, "MHL": { rank: 170, stage: 7 },
  "PLW": { rank: 171, stage: 7 }, "KIR": { rank: 172, stage: 7 }, "NRU": { rank: 173, stage: 7 }, "TVL": { rank: 174, stage: 7 }, "GUM": { rank: 175, stage: 7 },

  // Stage 8 - Pioneer (176-200)
  "GRL": { rank: 176, stage: 8 }, "FLK": { rank: 177, stage: 8 }, "FRO": { rank: 178, stage: 8 }, "IMN": { rank: 179, stage: 8 }, "JEY": { rank: 180, stage: 8 },
  "GSY": { rank: 181, stage: 8 }, "GIB": { rank: 182, stage: 8 }, "REU": { rank: 183, stage: 8 }, "MTQ": { rank: 184, stage: 8 }, "GLP": { rank: 185, stage: 8 },
  "GUF": { rank: 186, stage: 8 }, "MYT": { rank: 187, stage: 8 }, "SPM": { rank: 188, stage: 8 }, "NFK": { rank: 189, stage: 8 }, "PCN": { rank: 190, stage: 8 },
  "NCL": { rank: 191, stage: 8 }, "PYF": { rank: 192, stage: 8 }, "COK": { rank: 193, stage: 8 }, "NIU": { rank: 194, stage: 8 }, "WLF": { rank: 195, stage: 8 },
  "BMU": { rank: 196, stage: 8 }, "CYM": { rank: 197, stage: 8 }, "TCA": { rank: 198, stage: 8 }, "MSR": { rank: 199, stage: 8 }, "AIA": { rank: 200, stage: 8 },

  // Stage 9 - Vanguard (201-225)
  "SXM": { rank: 201, stage: 9 }, "MAF": { rank: 202, stage: 9 }, "BES": { rank: 203, stage: 9 }, "ABW": { rank: 204, stage: 9 }, "CUW": { rank: 205, stage: 9 },
  "MAC": { rank: 206, stage: 9 }, "TUV": { rank: 207, stage: 9 }, "MNI": { rank: 208, stage: 9 }, "VIR": { rank: 209, stage: 9 }, "TKL": { rank: 210, stage: 9 },
  "CXR": { rank: 211, stage: 9 }, "CCK": { rank: 212, stage: 9 }, "VAT": { rank: 213, stage: 9 }, "MCO": { rank: 214, stage: 9 }, "SMR": { rank: 215, stage: 9 },
  "LIE": { rank: 216, stage: 9 }, "AND": { rank: 217, stage: 9 }, "BVT": { rank: 218, stage: 9 }, "VGB": { rank: 219, stage: 9 }, "ASM": { rank: 220, stage: 9 },
  "SHN": { rank: 221, stage: 9 }, "SGS": { rank: 222, stage: 9 }, "IOT": { rank: 223, stage: 9 }, "ATF": { rank: 224, stage: 9 }, "HMD": { rank: 225, stage: 9 },
};

export const SORTED_POOL = Object.keys(difficultyRanking).sort(
  (a, b) => difficultyRanking[a].rank - difficultyRanking[b].rank,
);

export interface TierRange {
  start: number;
  end: number;
  size: number;
}

export const getTierRanges = (count: number): TierRange[] => {
  if (!count) return [];

  const total = SORTED_POOL.length;
  const numLevels = Math.floor(total / count);
  const remainder = total % count;

  const ranges: TierRange[] = [];

  for (let i = 0; i < numLevels; i++) {
    ranges.push({
      start: i * count,
      end: (i + 1) * count,
      size: count,
    });
  }

  if (remainder > 0) {
    // If remainder is less than half of the target count, merge it with the last level
    if (remainder < count / 2 && ranges.length > 0) {
      const lastRange = ranges[ranges.length - 1];
      lastRange.end = total;
      lastRange.size = total - lastRange.start;
    } else {
      // Otherwise, it becomes its own final level
      ranges.push({
        start: numLevels * count,
        end: total,
        size: remainder,
      });
    }
  }

  return ranges;
};

export const getMaxLevels = (count: number): number => {
  if (!count) return 9; // Default for World Mode (9 tiers)
  return getTierRanges(count).length;
};

export const STAGES = [
  { id: 1, name: "Explorer", description: "Global anchors and most famous nations" },
  { id: 2, name: "Navigator", description: "Major regional powers and common destinations" },
  { id: 3, name: "Pathfinder", description: "Well-known continental leaders and hubs" },
  { id: 4, name: "Voyager", description: "Standard mid-sized countries and regions" },
  { id: 5, name: "Diplomat", description: "Lesser-known but significant sovereign states" },
  { id: 6, name: "Cartographer", description: "Specialized regions and smaller territories" },
  { id: 7, name: "Globalist", description: "Island nations and autonomous territories" },
  { id: 8, name: "Pioneer", description: "Remote regions and overseas dependencies" },
  { id: 9, name: "Vanguard", description: "Isolated outposts and tiny statelets" },
];

export const getDifficulty = (cca3: string): number => {
  return difficultyRanking[cca3]?.stage || 5; 
};

export const getRank = (cca3: string): number => {
  return difficultyRanking[cca3]?.rank || 125;
};
