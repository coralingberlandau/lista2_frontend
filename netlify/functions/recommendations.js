// Netlify serverless function: suggests additional list items using Google Gemini.
// Keeps the Gemini API key server-side (set as GEMINI_API_KEY in the Netlify dashboard),
// never exposed to the app bundle.

const GEMINI_MODEL = 'gemini-1.5-flash';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }) };
  }

  let items;
  try {
    ({ items } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No items provided' }) };
  }

  const prompt = `A user has a list with these items: ${items.join(', ')}. ` +
    'Suggest 5 short, related items they might also want to add. ' +
    'Reply with ONLY a comma-separated list of item names, no numbering, no extra text.';

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini API error:', errorBody);
      return { statusCode: 502, body: JSON.stringify({ error: 'Gemini API error' }) };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const recommendations = text
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return {
      statusCode: 200,
      body: JSON.stringify({ recommendations }),
    };
  } catch (error) {
    console.error('Error calling Gemini:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch recommendations' }) };
  }
};
