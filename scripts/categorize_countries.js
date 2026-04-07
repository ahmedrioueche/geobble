import axios from 'axios';

const fetchCountries = async () => {
  try {
    const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,cca3,population,flag');
    const countries = response.data.map((c) => ({
      name: c.name.common,
      cca3: c.cca3,
      population: c.population,
      flag: c.flag,
    }));
    
    // Sort by population descending
    countries.sort((a, b) => b.population - a.population);
    
    // Split into 16 groups
    const groupSize = Math.ceil(countries.length / 16);
    const groups = [];
    for (let i = 0; i < 16; i++) {
        groups.push(countries.slice(i * groupSize, (i + 1) * groupSize));
    import fs from 'fs';
    fs.writeFileSync('c:/dev26/geobble/scripts/groups.json', JSON.stringify(groups, null, 2));
    console.log('Groups written to groups.json');

  } catch (error) {
    console.error('Error:', error);
  }
};

fetchCountries();
