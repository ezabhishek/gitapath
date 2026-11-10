module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gitapath-key, authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  res.status(200).json({
    models: ["openai/gpt-oss-120b", "meta-llama/llama-3.3-70b-instruct:free", "grok-2-latest", "gpt-4o-mini", "llama3.1"],
    recommended: ["openai/gpt-oss-120b", "meta-llama/llama-3.3-70b-instruct:free"]
  });
};
