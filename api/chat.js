function generateGraphFallbackResponse({ question, context, mode }) {
  let response = '';
  if (mode === 'bridge') {
    response = `### The Philosophical Bridge in the Bhagavad Gita\n\n`;
    response += `This path weaves through the transformative journey of the Gita, revealing how spiritual dilemmas find resolution through higher understanding and disciplined action (*Yoga*).\n\n`;
    if (context) {
      response += `#### Graph-Grounded Traversals & Connections\n`;
      const contextLines = context.split('\n').filter(l => l.trim().length > 0);
      for (const line of contextLines.slice(0, 12)) {
        response += `> ${line}\n`;
      }
      response += `\n`;
    }
    response += `#### Synthesis of the Bridge\n`;
    response += `1. **The Human Dilemma (*Viṣāda*)**: The seeker begins at the crossroads of duty, attachment, and existential doubt—mirroring Arjuna's initial crisis between the two armies (BG 2.3).\n`;
    response += `2. **The Discerning Intellect (*Buddhi Yoga*)**: Krishna instructs that grief stems from confusing the transient body and outcome with the eternal *Ātman*. Through knowledge and detachment, the agitated mind steadies (BG 2.47, BG 2.70).\n`;
    response += `3. **Selfless Dedication (*Niṣkāma Karma & Bhakti*)**: By offering action without selfish clinging to rewards, one transmutes binding duty into liberating practice. This bridge culminates in inner serenity (*Śānti*) and supreme freedom (*Mokṣa*).\n`;
  } else {
    response = `### Gita Sarathi Knowledge Synthesis\n\n`;
    response += `In response to your inquiry: **"${question || 'Contemplating the Gita'}"**\n\n`;
    if (context) {
      response += `#### Grounded Textual Evidence & Graph Lineage\n`;
      const lines = context.split('\n').filter(l => l.trim().length > 0);
      for (const l of lines.slice(0, 8)) {
        response += `- ${l}\n`;
      }
      response += `\n`;
    }
    response += `#### Core Insight from the Gita\n`;
    response += `- **On Right Action**: *karmaṇy-evādhikāras te mā phaleṣhu kadāchana* (BG 2.47) — You have the right to work, but never to the fruits. Do not let results dictate your peace of mind.\n`;
    response += `- **On Equanimity (*Samatvam*)**: Krishna declares that yoga is equanimity of mind (*samatvaṁ yoga ucyate*, BG 2.48). Whether encountering triumph or defeat, the disciplined mind remains rooted in truth.\n`;
    response += `- **On Inner Transformation**: The lower self must be elevated by the higher Self; for the Self alone is one's friend, and the undisciplined mind one's adversary (BG 6.5).\n\n`;
    response += `*Explore the connected nodes on the interactive canvas or switch to Lineage (Darśana) to observe how this truth unfolds across the Gita's 18 chapters.*`;
  }
  return response;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gitasarathi-key, authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  let payload = req.body || {};
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (e) {}
  }

  const { mode, provider, model, question, context, history } = payload;
  const apiKey = req.headers['x-gitasarathi-key'] || (provider ? process.env[provider.toUpperCase() + '_API_KEY'] : '');

  // If cloud provider API key is present
  if (apiKey && provider) {
    const endpoints = {
      groq: 'https://api.groq.com/openai/v1/chat/completions',
      openrouter: 'https://openrouter.ai/api/v1/chat/completions',
      openai: 'https://api.openai.com/v1/chat/completions',
      xai: 'https://api.x.ai/v1/chat/completions'
    };
    const targetUrl = endpoints[provider];
    if (targetUrl) {
      try {
        const systemPrompt = `You are Gita Sarathi, an enlightened, compassionate, and precise knowledge companion grounded in the 701 verses and philosophical graph of the Bhagavad Gita.\n\nGraph Context:\n${context || 'No explicit graph nodes selected.'}`;
        const messages = [
          { role: 'system', content: systemPrompt },
          ...(history || []).map(h => ({ role: h.role, content: h.text || h.content })),
          { role: 'user', content: question }
        ];

        const extRes = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({ model: model || 'default', messages, stream: true })
        });

        if (extRes.ok && extRes.body) {
          res.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-GitaSarathi-Provider': provider.toUpperCase(),
            'X-GitaSarathi-Model': model
          });
          const reader = extRes.body.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const lines = decoder.decode(value).split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  const delta = data.choices[0]?.delta?.content || '';
                  if (delta) res.write(delta);
                } catch (e) {}
              }
            }
          }
          return res.end();
        }
      } catch (err) {
        console.warn('Vercel API forward error:', err.message);
      }
    }
  }

  // Fallback to Graph Synthesis
  const text = generateGraphFallbackResponse({ question, context, mode });
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-GitaSarathi-Provider': 'Gita Knowledge Graph',
    'X-GitaSarathi-Model': 'Graph-RAG'
  });

  const words = text.split(' ');
  let i = 0;
  const interval = setInterval(() => {
    if (i >= words.length) {
      clearInterval(interval);
      return res.end();
    }
    const chunk = (i === 0 ? '' : ' ') + words[i];
    res.write(chunk);
    i++;
  }, 20);
};
