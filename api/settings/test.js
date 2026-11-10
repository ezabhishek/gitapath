module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gitasarathi-key, authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  res.status(200).json({
    ok: true,
    latencyMs: 12,
    model: 'active'
  });
};
