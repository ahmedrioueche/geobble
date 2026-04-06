export const difficultyRanking: Record<string, number> = {
  // Stage 1 - Explorer (Most famous/Large)
  "USA": 1, "GBR": 1, "FRA": 1, "DEU": 1, "CHN": 1, "JPN": 1, "IND": 1, "BRA": 1, "RUS": 1, "ITA": 1, 
  "CAN": 1, "AUS": 1, "MEX": 1, "ESP": 1, "EGY": 1, "KOR": 1, "TUR": 1, "ARG": 1, "ZAF": 1, "SWE": 1,

  // Stage 2 - Navigator (Regional powers/Well known)
  "IDN": 2, "SAU": 2, "NGA": 2, "PAK": 2, "VNM": 2, "THA": 2, "POL": 2, "UKR": 2, "DZA": 2, "GRC": 2,
  "PRT": 2, "CHE": 2, "AUT": 2, "NOR": 2, "DNK": 2, "IRL": 2, "CHL": 2, "PER": 2, "KWT": 2, "ARE": 2,

  // Stage 3 - Voyager (Mid-sized/Common)
  "PHL": 3, "MAR": 3, "ISR": 3, "IRN": 3, "IRQ": 3, "CZE": 3, "HUN": 3, "ROU": 3, "MYS": 3, "KAZ": 3,
  "NZL": 3, "COL": 3, "VEN": 3, "KEN": 3, "ETH": 3, "GHA": 3, "TZA": 3, "UGA": 3, "AGO": 3, "MMR": 3,

  // Stage 4 - Cartographer (Specialized/Smaller)
  "FIN": 4, "SVK": 4, "HRV": 4, "SRB": 4, "BGR": 4, "JOR": 4, "LBN": 4, "AZE": 4, "UZB": 4, "CUB": 4,
  "GTM": 4, "DOM": 4, "PAN": 4, "CRI": 4, "URY": 4, "BOL": 4, "PYY": 4, "ECU": 4, "TUN": 4, "SEN": 4,

  // Stage 5 - Globalist (Obscure/Autonomous)
  "MNE": 5, "ALB": 5, "MKD": 5, "MLT": 5, "CYP": 5, "GEO": 5, "ARM": 5, "KIR": 5, "TUV": 5, "NRU": 5,
  "SUR": 5, "GUY": 5, "BLZ": 5, "NAM": 5, "BWA": 5, "ZWE": 5, "ZMB": 5, "MWI": 5, "GAB": 5, "COG": 5,

  // Stage 6 - Conqueror (Tiny islands/Remote)
  "VGB": 6, "VIR": 6, "COK": 6, "NIU": 6, "TKL": 6, "WLF": 6, "SPM": 6, "SHN": 6, "FLK": 6, "SGS": 6,
  "IOT": 6, "ATF": 6, "BVT": 6, "HMD": 6, "PCN": 6, "NFK": 6, "CXR": 6, "CCK": 6, "ASM": 6, "GUM": 6
};

export const getDifficulty = (cca3: string): number => {
  return difficultyRanking[cca3] || 4; // Default to mid-high for unknown
};
