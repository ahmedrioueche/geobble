/**
 * Canonical country identifiers present in `apps/web-client/public/data/world.json`.
 * Keeps the server's country catalog aligned with territories that actually have
 * clickable geometry on the client world map.
 */
export const WORLD_MAP_NUMERIC_IDS = new Set<string>([
  '004', '008', '010', '012', '016', '020', '024', '028', '031', '032',
  '036', '040', '044', '048', '050', '051', '052', '056', '060', '064',
  '068', '070', '072', '076', '084', '086', '090', '092', '096', '100',
  '104', '108', '112', '116', '120', '124', '132', '136', '140', '144',
  '148', '152', '156', '158', '170', '174', '178', '180', '184', '188',
  '191', '192', '196', '203', '204', '208', '212', '214', '218', '222',
  '226', '231', '232', '233', '234', '238', '239', '242', '246', '248',
  '250', '258', '260', '262', '266', '268', '270', '275', '276', '288',
  '296', '300', '304', '308', '316', '320', '324', '328', '332', '334',
  '336', '340', '344', '348', '352', '356', '360', '364', '368', '372',
  '376', '380', '384', '388', '392', '398', '400', '404', '408', '410',
  '414', '417', '418', '422', '426', '428', '430', '434', '438', '440',
  '442', '446', '450', '454', '458', '462', '466', '470', '478', '480',
  '484', '492', '496', '498', '499', '500', '504', '508', '512', '516',
  '520', '524', '528', '531', '533', '534', '540', '548', '554', '558',
  '562', '566', '570', '574', '578', '580', '583', '584', '585', '586',
  '591', '598', '600', '604', '608', '612', '616', '620', '624', '626',
  '630', '634', '642', '643', '646', '652', '654', '659', '660', '662',
  '663', '666', '670', '674', '678', '682', '686', '688', '690', '694',
  '702', '703', '704', '705', '706', '710', '716', '724', '728', '729',
  '732', '740', '748', '752', '756', '760', '762', '764', '768', '776',
  '780', '784', '788', '792', '795', '796', '800', '804', '807', '818',
  '826', '831', '832', '833', '834', '840', '850', '854', '858', '860',
  '862', '876', '882', '887', '894',
]);

export const WORLD_MAP_CCA3_CODES = new Set<string>([
  'ABW', 'AFG', 'AGO', 'AIA', 'ALA', 'ALB', 'AND', 'ARE', 'ARG', 'ARM',
  'ASM', 'ATA', 'ATF', 'ATG', 'AUS', 'AUT', 'AZE', 'BDI', 'BEL', 'BEN',
  'BFA', 'BGD', 'BGR', 'BHR', 'BHS', 'BIH', 'BLM', 'BLR', 'BLZ', 'BMU',
  'BOL', 'BRA', 'BRB', 'BRN', 'BTN', 'BWA', 'CAF', 'CAN', 'CHE', 'CHL',
  'CHN', 'CIV', 'CMR', 'COD', 'COG', 'COK', 'COL', 'COM', 'CPV', 'CRI',
  'CUB', 'CUW', 'CYM', 'CYP', 'CZE', 'DEU', 'DJI', 'DMA', 'DNK', 'DOM',
  'DZA', 'ECU', 'EGY', 'ERI', 'ESH', 'ESP', 'EST', 'ETH', 'FIN', 'FJI',
  'FLK', 'FRA', 'FRO', 'FSM', 'GAB', 'GBR', 'GEO', 'GGY', 'GHA', 'GIN',
  'GMB', 'GNB', 'GNQ', 'GRC', 'GRD', 'GRL', 'GTM', 'GUM', 'GUY', 'HKG',
  'HMD', 'HND', 'HRV', 'HTI', 'HUN', 'IDN', 'IMN', 'IND', 'IOT', 'IRL',
  'IRN', 'IRQ', 'ISL', 'ISR', 'ITA', 'JAM', 'JEY', 'JOR', 'JPN', 'KAZ',
  'KEN', 'KGZ', 'KHM', 'KIR', 'KNA', 'KOR', 'KWT', 'LAO', 'LBN', 'LBR',
  'LBY', 'LCA', 'LIE', 'LKA', 'LSO', 'LTU', 'LUX', 'LVA', 'MAC', 'MAF',
  'MAR', 'MCO', 'MDA', 'MDG', 'MDV', 'MEX', 'MHL', 'MKD', 'MLI', 'MLT',
  'MMR', 'MNE', 'MNG', 'MNP', 'MOZ', 'MRT', 'MSR', 'MUS', 'MWI', 'MYS',
  'NAM', 'NCL', 'NER', 'NFK', 'NGA', 'NIC', 'NIU', 'NLD', 'NOR', 'NPL',
  'NRU', 'NZL', 'OMN', 'PAK', 'PAN', 'PCN', 'PER', 'PHL', 'PLW', 'PNG',
  'POL', 'PRI', 'PRK', 'PRT', 'PRY', 'PSE', 'PYF', 'QAT', 'ROU', 'RUS',
  'RWA', 'SAU', 'SDN', 'SEN', 'SGP', 'SGS', 'SHN', 'SLB', 'SLE', 'SLV',
  'SMR', 'SOM', 'SPM', 'SRB', 'SSD', 'STP', 'SUR', 'SVK', 'SVN', 'SWE',
  'SWZ', 'SXM', 'SYC', 'SYR', 'TCA', 'TCD', 'TGO', 'THA', 'TJK', 'TKM',
  'TLS', 'TON', 'TTO', 'TUN', 'TUR', 'TWN', 'TZA', 'UGA', 'UKR', 'URY',
  'USA', 'UZB', 'VAT', 'VCT', 'VEN', 'VGB', 'VIR', 'VNM', 'VUT', 'WLF',
  'WSM', 'YEM', 'ZAF', 'ZMB', 'ZWE',
]);

const normalizeNumericCode = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^\d+$/.test(trimmed) ? trimmed.padStart(3, '0') : trimmed;
};

/**
 * Returns true if a country record maps to a polygon in `world.json`.
 * Uses `numericCode` (ISO 3166-1 numeric) when present, falling back to `cca3`
 * only when the upstream payload omits numeric codes.
 */
export const isMapAvailableCountry = (country: {
  cca3: string;
  numericCode: string;
}): boolean => {
  const normalizedNumeric = normalizeNumericCode(country.numericCode);
  if (normalizedNumeric) {
    return WORLD_MAP_NUMERIC_IDS.has(normalizedNumeric);
  }
  return WORLD_MAP_CCA3_CODES.has(country.cca3.toUpperCase());
};

