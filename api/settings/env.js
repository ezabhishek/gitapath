module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gitasarathi-key, authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const envConfig = {
    providers: {
      groq: { configured: !!process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL || "openai/gpt-oss-120b" },
      openrouter: { configured: !!process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free" },
      xai: { configured: !!process.env.XAI_API_KEY, model: process.env.XAI_MODEL || "grok-2-latest" },
      openai: { configured: !!process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || "gpt-4o-mini" },
      ollama: { configured: false, baseUrl: "http://localhost:11434", model: "llama3.1" }
    },
    defaultProvider: process.env.GROQ_API_KEY ? "groq" : (process.env.OPENROUTER_API_KEY ? "openrouter" : "ollama")
  };

  res.status(200).json(envConfig);
};
