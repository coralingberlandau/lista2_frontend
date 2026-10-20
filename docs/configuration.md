[← Back to the README](../README.md)

# Configuration

| Setting | Where | Purpose |
|---------|-------|---------|
| `EXPO_PUBLIC_API_URL` | `.env.local` locally, Netlify environment variables online | Address of the Lista backend. **Live value: `https://coral8.pythonanywhere.com`**. If unset, the built-in default in `constants/config.ts` is used, which is still the address of Lista's first version (a Render server), so always set it on a real deployment |
| `GEMINI_API_KEY` | Netlify environment variables | Google Gemini key used by the AI function |
| `GEMINI_MODEL` | Netlify environment variables (optional) | Gemini model to use. Default: `gemini-3.5-flash-lite` |

**Why one setting?** The backend address is defined once in `constants/config.ts` and every screen imports it, 
so moving to a new server means changing one value, with no code edits. 
Copy `.env.example` to `.env.local` to try it locally, for example `EXPO_PUBLIC_API_URL=http://localhost:8000`.
