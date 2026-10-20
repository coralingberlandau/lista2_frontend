[← Back to the README](../README.md)

# AI Ideas

From a list's page, the lightbulb icon opens **Ideas for your list**: five short, related items you might want to add.

- **Clear states**: *Thinking* (loading dots), *Ideas*, *No ideas this time*, *Nothing to go on yet* (an empty list) and *Couldn't load ideas* with a **Try again** button.  
- **Pick what you like**: tick ideas and tap **Add N to list**; the ideas are added as new rows and the box stays open so you can add more.  
- **New ideas**: asks for a fresh set that does not repeat the ones you have already seen. If some ideas are ticked, the app asks before replacing them; if none are ticked, it explains once that the shown ideas will be replaced.  
- **Close warning**: closing the box with ticked ideas asks whether to keep editing or discard and close.  
- **How it works**: the app sends the list's items to the Netlify function `recommendations.js`, which asks **Google Gemini** and returns the suggestions. 
  The function is the only place that holds the Gemini key, so it never reaches the app or the repository.  
- **Setup**: add `GEMINI_API_KEY` in Netlify's environment variables. The model can be changed without touching code with `GEMINI_MODEL` 
  (default `gemini-3.5-flash-lite`), because Google retires models from time to time. Netlify keeps the key secret, so it is never shown in the dashboard after saving.  
- **Without a key**, or when Gemini is unreachable, the box shows *Couldn't load ideas* and **Try again**, and the rest of the app is unaffected.  

*Note: the function does not ask the visitor to log in, so on a public site anyone who knows its address could use your Gemini quota. 
Keep an eye on usage in Google AI Studio.*
