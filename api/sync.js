const SUPA_URL = 'https://dscpfoilkqtfnvojkqzv.supabase.co';
const SUPA_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPA_KEY,
    'Authorization': `Bearer ${SUPA_KEY}`,
    'Prefer': 'return=representation',
  };

  // GET：讀取資料
  if (req.method === 'GET') {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/portfolio?id=eq.main&select=*`, { headers });
      const data = await r.json();
      return res.status(200).json(data[0] || null);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST：寫入資料
  if (req.method === 'POST') {
    try {
      const body = { ...req.body, id: 'main', updated_at: new Date().toISOString() };
      const r = await fetch(`${SUPA_URL}/rest/v1/portfolio?id=eq.main`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      });
      const data = await r.json();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
