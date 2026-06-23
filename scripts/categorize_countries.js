import axios from 'axios';
import fs from 'fs';

const apiKey = process.env.VITE_RC_API_KEY
  ?? fs.readFileSync(new URL('../.env', import.meta.url), 'utf8').match(/VITE_RC_API_KEY=(.+)/)?.[1]?.trim();

const fetchCountries = async () => {
  try {
    const countries = [];
    let offset = 0;
    let more = true;

    while (more) {
      const response = await axios.get('https://api.restcountries.com/countries/v5', {
        params: {
          response_fields: 'names.common,codes.alpha_3,population,flag.emoji',
          limit: 100,
          offset,
        },
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const { objects, meta } = response.data.data;
      countries.push(...objects.map((c) => ({
        name: c.names.common,
        cca3: c.codes.alpha_3,
        population: c.population,
        flag: c.flag.emoji,
      })));
      more = meta.more;
      offset += 100;
    }
    
    // Sort by population descending
    countries.sort((a, b) => b.population - a.population);
    
    // Split into 16 groups
    const groupSize = Math.ceil(countries.length / 16);
    const groups = [];
    for (let i = 0; i < 16; i++) {
      groups.push(countries.slice(i * groupSize, (i + 1) * groupSize));
    }
    fs.writeFileSync('c:/dev26/geobble/scripts/groups.json', JSON.stringify(groups, null, 2));
    console.log('Groups written to groups.json');

  } catch (error) {
    console.error('Error:', error);
  }
};

fetchCountries();
