# Gita Path (गीता पथ) · Full Local Clone

A complete, high-fidelity offline Progressive Web Application (PWA) that models the entire **Bhagavad Gita** as an interactive knowledge graph.

## Features

1. **Complete Knowledge Graph**:
   - **857 Nodes**: 18 Chapters, 701 Verses, 67 Sanskrit Concepts, 33 Emotions/States of Mind (Afflictive vs. Healing), 22 Life Dilemmas, and 16 Characters.
   - **5,350 Connections**: 22 distinct edge semantics (`DEFINES_CONCEPT`, `HEALS`, `ANTIDOTE_TO`, `CULTIVATES`, `RESOLVED_THROUGH`, `ADDRESSES_DILEMMA`, etc.).
   - **Precomputed 2D/3D Layout**: Loaded from `/data/gita-layout.json` for 60fps canvas performance.
   - **Vector Embeddings**: Precomputed semantic embeddings in `/data/gita-embeddings.json`.

2. **Explore View (Viśvarūpa)**:
   - High-performance HTML5 Canvas 2D engine using `Float32Array` coordinate matrices.
   - Orbital rotation, pan, zoom, point selection, camera fly-to animation.
   - **Find a Path**: Hop-by-hop BFS pathfinding bridging any two entities with graph narration and AI synthesis.
   - Entity type legend toggling with size-proportional connectivity rendering.

3. **Lineage View (Darśana)**:
   - Focus on any individual verse or concept to follow antecedent causes and downstream consequences.

4. **Read View (Adhyayana)**:
   - Multi-script support across 10 scripts: Devanagari, IAST, Phonetic English, Odia, Bengali, Gujarati, Tamil, Telugu, Kannada, and Malayalam.
   - Authentic Sanskrit audio recitation streaming from `holy-bhagavad-gita.org`.
   - Web Speech API text-to-speech commentary reading.
   - 21 Classical and modern commentators across 6 philosophical traditions:
     - Advaita Vedānta (Shankaracharya, Anandgiri, Madhusudan Saraswati, Dhanpati, Neelkanth, Swami Gambhirananda, Swami Chinmayananda)
     - Viśiṣṭādvaita Vedānta (Ramanujacharya, Venkatanatha, Swami Adidevananda)
     - Dvaita Vedānta (Madhavacharya, Jayatritha)
     - Kashmir Śaivism (Abhinavagupta, Dr. S. Sankaranarayan)
     - Śuddhādvaita (Vallabhacharya, Purushottamji)
     - Integral & Bhakti (Swami Sivananda, Swami Ramsukhdas, Swami Tejomayananda, Shri Purohit Swami)

5. **Reflect View (Manas)**:
   - Zero-cloud private journal stored locally in IndexedDB (`gitapath:reflections`).
   - Semantic mapping from personal feelings to corresponding Gita verses and remedies.
   - Empathetic distress detection with built-in helpline safety checks.
   - JSON export and import for reflection notes.

6. **Agni Kuṇḍa AI Companion (Graph-RAG)**:
   - Graph-grounded question answering at `/api/chat`.
   - Multi-provider support: Groq, OpenRouter, xAI (Grok), OpenAI, and local Ollama.
   - **Graph-Only Offline Fallback**: Generates deep textual answers synthesized directly from the knowledge graph and verse definitions when no external LLM is configured.

7. **Global Search (Ctrl+K)**:
   - Instant search across verses, concepts, emotions, and chapters.

8. **PWA & Offline Operation**:
   - `sw.js` Service Worker caches application shell, graph data, and verses for complete offline usability.
   - LocalStorage persistence for user themes (`dark`, `light`, `system`), script selection, and commentator preferences.

---

## Running the Application

To start the local server:

```bash
npm start
```

Or directly with Node:

```bash
node server.js
```

Then open your browser at:
- **Home**: [http://localhost:3000](http://localhost:3000)
- **Explore (Viśvarūpa)**: [http://localhost:3000/?view=cosmos](http://localhost:3000/?view=cosmos)
- **Lineage (Darśana)**: [http://localhost:3000/?view=darshana](http://localhost:3000/?view=darshana)
- **Read (Adhyayana)**: [http://localhost:3000/?view=adhyayana](http://localhost:3000/?view=adhyayana)
- **Reflect (Manas)**: [http://localhost:3000/?view=manas](http://localhost:3000/?view=manas)
