// Region presets for geo questions and helpers to keep answer options in sync.
export const REGION_PRESETS = {
  world: {
    label: 'World',
    geoChartRegion: 'world',
    countries: []
  },
  custom: {
    label: 'Custom (keep current answers)',
    geoChartRegion: 'world',
    countries: []
  },
  europe: {
    label: 'Europe',
    geoChartRegion: '150',
    countries: [
      'Albania', 'Andorra', 'Armenia', 'Austria', 'Azerbaijan', 'Belarus', 'Belgium',
      'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark',
      'Estonia', 'Finland', 'France', 'Georgia', 'Germany', 'Greece', 'Hungary', 'Iceland',
      'Ireland', 'Italy', 'Kazakhstan', 'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania',
      'Luxembourg', 'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands',
      'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia', 'San Marino',
      'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Turkey',
      'Ukraine', 'United Kingdom', 'Vatican City'
    ]
  },
  africa: {
    label: 'Africa',
    geoChartRegion: '002',
    countries: [
      'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cabo Verde',
      'Cameroon', 'Central African Republic', 'Chad', 'Comoros', 'Congo',
      'Democratic Republic of the Congo', 'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea',
      'Eswatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau',
      "Cote d'Ivoire", 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi',
      'Mali', 'Mauritania', 'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger',
      'Nigeria', 'Rwanda', 'Sao Tome and Principe', 'Senegal', 'Seychelles', 'Sierra Leone',
      'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia',
      'Uganda', 'Zambia', 'Zimbabwe'
    ]
  },
  asia: {
    label: 'Asia',
    geoChartRegion: '142',
    countries: [
      'Afghanistan', 'Bahrain', 'Bangladesh', 'Bhutan', 'Brunei', 'Cambodia', 'China',
      'India', 'Indonesia', 'Iran', 'Iraq', 'Israel', 'Japan', 'Jordan', 'Kazakhstan',
      'Kuwait', 'Kyrgyzstan', 'Laos', 'Lebanon', 'Malaysia', 'Maldives', 'Mongolia',
      'Myanmar', 'Nepal', 'North Korea', 'Oman', 'Pakistan', 'Philippines', 'Qatar',
      'Saudi Arabia', 'Singapore', 'South Korea', 'Sri Lanka', 'Syria', 'Taiwan',
      'Tajikistan', 'Thailand', 'Timor-Leste', 'Turkmenistan', 'United Arab Emirates',
      'Uzbekistan', 'Vietnam', 'Yemen', 'Armenia', 'Azerbaijan', 'Georgia'
    ]
  },
  northAmerica: {
    label: 'North America',
    geoChartRegion: '021',
    countries: [
      'Antigua and Barbuda', 'Bahamas', 'Barbados', 'Belize', 'Canada', 'Costa Rica', 'Cuba',
      'Dominica', 'Dominican Republic', 'El Salvador', 'Grenada', 'Guatemala', 'Haiti',
      'Honduras', 'Jamaica', 'Mexico', 'Nicaragua', 'Panama', 'Saint Kitts and Nevis',
      'Saint Lucia', 'Saint Vincent and the Grenadines', 'Trinidad and Tobago',
      'United States', 'Greenland'
    ]
  },
  southAmerica: {
    label: 'South America',
    geoChartRegion: '005',
    countries: [
      'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador', 'Guyana', 'Paraguay',
      'Peru', 'Suriname', 'Uruguay', 'Venezuela'
    ]
  },
  oceania: {
    label: 'Oceania',
    geoChartRegion: '009',
    countries: [
      'Australia', 'Fiji', 'Kiribati', 'Marshall Islands', 'Micronesia', 'Nauru',
      'New Zealand', 'Palau', 'Papua New Guinea', 'Samoa', 'Solomon Islands', 'Tonga',
      'Tuvalu', 'Vanuatu', 'Cook Islands', 'Niue'
    ]
  },
  antarctica: {
    label: 'Antarctica',
    geoChartRegion: 'AQ',
    countries: ['Antarctica']
  }
};

// Fill the world list with the union of all other regions to keep a single source of truth.
const worldCountries = Array.from(
  new Set(
    Object.entries(REGION_PRESETS)
      .filter(([key]) => key !== 'world')
      .flatMap(([, region]) => region.countries)
  )
).sort();
REGION_PRESETS.world.countries = worldCountries;

export function getCountriesForRegion(regionKey = 'world') {
  if (regionKey === 'custom') {
    return [];
  }
  return REGION_PRESETS[regionKey]?.countries || REGION_PRESETS.world.countries;
}

export function detectRegionFromAnswers(answers = []) {
  const answerNames = answers
    .map((a) => (typeof a === 'string' ? a : a?.answerText || a?.text || ''))
    .filter((name) => name && typeof name === 'string')
    .map((name) => name.trim());

  if (answerNames.length === 0) {
    return 'world';
  }

  const answerSet = new Set(answerNames);
  for (const [key, region] of Object.entries(REGION_PRESETS)) {
    if (key === 'world') continue;
    const regionSet = new Set(region.countries);
    if (answerSet.size === regionSet.size && [...answerSet].every((c) => regionSet.has(c))) {
      return key;
    }
  }

  return 'custom';
}

export function geoChartRegionForAnswers(answers = []) {
  const regionKey = detectRegionFromAnswers(answers);
  return REGION_PRESETS[regionKey]?.geoChartRegion || REGION_PRESETS.world.geoChartRegion;
}
