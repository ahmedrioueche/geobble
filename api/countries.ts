type VercelRequest = { query: Record<string, string | string[] | undefined> };
type VercelResponse = {
  status: (code: number) => { json: (body: unknown) => void };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.RC_API_KEY || process.env.VITE_RC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'REST Countries API key is not configured' });
    return;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path' || value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else {
      params.set(key, value);
    }
  }

  const url = `https://api.restcountries.com/countries/v5?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch {
    res.status(502).json({ error: 'Failed to reach REST Countries API' });
  }
}
