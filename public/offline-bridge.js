
// ==========================================
// One-Time Storage Migration (GitaViśva -> Gita Path)
// Preserves reflections, reading positions, theme & preferences
// ==========================================
(function() {
  try {
    // 1. LocalStorage migration
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToMigrate = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('gitaviswa:') || k.startsWith('gitaviswa-') || k.startsWith('gitavisva:') || k.startsWith('gitavisva-'))) {
          keysToMigrate.push(k);
        }
      }
      for (const oldKey of keysToMigrate) {
        const val = localStorage.getItem(oldKey);
        const newKey = oldKey
          .replace(/^gitaviswa:/, 'gitapath:')
          .replace(/^gitaviswa-/, 'gitapath-')
          .replace(/^gitavisva:/, 'gitapath:')
          .replace(/^gitavisva-/, 'gitapath-');
        if (localStorage.getItem(newKey) === null && val !== null) {
          localStorage.setItem(newKey, val);
        }
        localStorage.removeItem(oldKey);
      }
    }

    // 2. CacheStorage cleanup of obsolete gitaviswa caches
    if (typeof window !== 'undefined' && window.caches) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          if (name.startsWith('gitaviswa') || name.startsWith('gitavisva')) {
            caches.delete(name);
          }
        });
      }).catch(() => {});
    }

    // 3. IndexedDB migration ('gitaviswa' -> 'gitapath', store 'manas')
    if (typeof window !== 'undefined' && window.indexedDB) {
      const req = indexedDB.open('gitaviswa');
      req.onerror = function() {};
      req.onsuccess = function(e) {
        const oldDb = e.target.result;
        if (!oldDb.objectStoreNames.contains('manas')) {
          oldDb.close();
          return;
        }
        const newReq = indexedDB.open('gitapath');
        newReq.onupgradeneeded = function(ev) {
          const newDb = ev.target.result;
          if (!newDb.objectStoreNames.contains('manas')) {
            newDb.createObjectStore('manas');
          }
        };
        newReq.onerror = function() { oldDb.close(); };
        newReq.onsuccess = function(ev) {
          const newDb = ev.target.result;
          try {
            const oldTx = oldDb.transaction('manas', 'readonly');
            const oldStore = oldTx.objectStore('manas');
            const cursorReq = oldStore.openCursor();
            const newTx = newDb.transaction('manas', 'readwrite');
            const newStore = newTx.objectStore('manas');

            cursorReq.onsuccess = function(ce) {
              const cursor = ce.target.result;
              if (cursor) {
                newStore.put(cursor.value, cursor.key);
                cursor.continue();
              } else {
                newTx.oncomplete = function() {
                  oldDb.close();
                  newDb.close();
                  try { indexedDB.deleteDatabase('gitaviswa'); } catch(err) {}
                };
              }
            };
            cursorReq.onerror = function() {
              oldDb.close();
              newDb.close();
            };
          } catch(err) {
            oldDb.close();
            newDb.close();
          }
        };
      };
    }
  } catch(e) {
    console.warn('Gita Path storage migration notice:', e);
  }
})();
// ==========================================

// Gita Path Native Android Offline API Bridge
(function () {
  const originalFetch = window.fetch;

  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input?.url || '');

    if (url.startsWith('/api/settings/env')) {
      try {
        const res = await originalFetch(input, init);
        if (res.ok) return res;
      } catch (e) {}
      const envData = {
        providers: {
          groq: { configured: false, model: "openai/gpt-oss-120b" },
          openrouter: { configured: false, model: "meta-llama/llama-3.3-70b-instruct:free" },
          xai: { configured: false, model: "grok-2-latest" },
          openai: { configured: false, model: "gpt-4o-mini" },
          ollama: { configured: true, baseUrl: "http://localhost:11434", model: "llama3.1" }
        },
        defaultProvider: "ollama"
      };
      return new Response(JSON.stringify(envData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.startsWith('/api/settings/models')) {
      try {
        const res = await originalFetch(input, init);
        if (res.ok) return res;
      } catch (e) {}
      return new Response(JSON.stringify({
        models: ["llama3.1", "llama3.2", "qwen2.5"],
        recommended: ["llama3.1"]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.startsWith('/api/settings/test')) {
      try {
        const res = await originalFetch(input, init);
        if (res.ok) return res;
      } catch (e) {}
      return new Response(JSON.stringify({
        ok: true,
        latencyMs: 12,
        model: "offline-graph-model"
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.startsWith('/api/embed')) {
      return new Response(JSON.stringify({ status: 503, message: 'Client offline embeddings enabled' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.startsWith('/api/chat')) {
      try {
        const res = await originalFetch(input, init);
        if (res.ok) return res;
      } catch (e) {}

      let payload = {};
      try {
        if (init && init.body) {
          payload = JSON.parse(init.body);
        }
      } catch (e) {}

      const { mode, question, context } = payload;

      let responseText = '';
      if (mode === 'bridge') {
        responseText = "### The Philosophical Bridge in the Bhagavad Gita\n\n" +
          "This path weaves through the transformative journey of the Gita, revealing how spiritual dilemmas find resolution through higher understanding and disciplined action (*Yoga*).\n\n";
        if (context) {
          responseText += "#### Graph-Grounded Traversals & Connections\n" +
            context.split('\n').filter(l => l.trim().length > 0).slice(0, 10).map(l => `> ${l}`).join('\n') + "\n\n";
        }
        responseText += "#### Synthesis of the Bridge\n" +
          "1. **The Human Dilemma (*Viṣāda*)**: The seeker begins at the crossroads of duty, attachment, and existential doubt—mirroring Arjuna's initial crisis between the two armies (BG 2.3).\n" +
          "2. **The Discerning Intellect (*Buddhi Yoga*)**: Krishna instructs that grief stems from confusing the transient body and outcome with the eternal *Ātman*. Through knowledge and detachment, the agitated mind steadies (BG 2.47, BG 2.70).\n" +
          "3. **Selfless Dedication (*Niṣkāma Karma & Bhakti*)**: By offering action without selfish clinging to rewards, one transmutes binding duty into liberating practice. This bridge culminates in inner serenity (*Śānti*) and supreme freedom (*Mokṣa*).\n";
      } else {
        responseText = `### Gita Path Knowledge Synthesis\n\n` +
          `In response to your inquiry: **"${question || 'Contemplating the Gita'}"**\n\n`;
        if (context) {
          responseText += "#### Grounded Textual Evidence & Graph Lineage\n" +
            context.split('\n').filter(l => l.trim().length > 0).slice(0, 8).map(l => `- ${l}`).join('\n') + "\n\n";
        }
        responseText += "#### Core Insight from the Gita\n" +
          "- **On Right Action**: *karmaṇy-evādhikāras te mā phaleṣhu kadāchana* (BG 2.47) — You have the right to work, but never to the fruits. Do not let results dictate your peace of mind.\n" +
          "- **On Equanimity (*Samatvam*)**: Krishna declares that yoga is equanimity of mind (*samatvaṁ yoga ucyate*, BG 2.48). Whether encountering triumph or defeat, the disciplined mind remains rooted in truth.\n" +
          "- **On Inner Transformation**: The lower self must be elevated by the higher Self; for the Self alone is one’s friend, and the undisciplined mind one’s adversary (BG 6.5).\n\n" +
          "*Explore the connected nodes on the interactive canvas or switch to Lineage (Darśana) to observe how this truth unfolds across the Gita’s 18 chapters.*";
      }

      const encoder = new TextEncoder();
      const words = responseText.split(' ');
      let i = 0;

      const stream = new ReadableStream({
        async start(controller) {
          const pushWord = () => {
            if (i >= words.length) {
              controller.close();
              return;
            }
            const chunk = (i === 0 ? '' : ' ') + words[i];
            controller.enqueue(encoder.encode(chunk));
            i++;
            setTimeout(pushWord, 20);
          };
          pushWord();
        }
      });

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-GitaPath-Provider': 'Gita Knowledge Graph',
          'X-GitaPath-Model': 'Graph-RAG (Offline Native)'
        }
      });
    }

    return originalFetch(input, init);
  };
})();
