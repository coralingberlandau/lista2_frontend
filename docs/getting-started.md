[← Back to the README](../README.md)

# Run It Locally and Deploy

## Run it locally

Follow these steps to run the app on your computer (Node.js 20 recommended):  

1. Clone the repository:  
   ```bash
   git clone https://github.com/coralingberlandau/lista2_frontend.git
   cd lista2_frontend
   ```
2. Install dependencies:  
   ```bash
   npm install
   ```
3. Point the app at a backend (optional). Copy `.env.example` to `.env.local` and set, for example:  
   ```bash
   EXPO_PUBLIC_API_URL=http://localhost:8000
   ```
   Without it the app uses the default address in `constants/config.ts`.
4. Start the app:  
   ```bash
   npm run web        # in the browser
   npx expo start     # Expo menu (web, Android, iOS)
   ```

> The AI suggestions use a Netlify function, so they only work on the deployed site (or with `netlify dev`). 
> Locally the AI box shows *"Couldn't load ideas"*, which is expected.

## Deploy to Netlify

The frontend is a static site built by Expo and hosted on **Netlify**; the backend runs on **PythonAnywhere**.

1. **Deploy the backend first** and note its address (see the backend README).  
2. In Netlify choose **Add new site > Import an existing project** and select this repository. 
   `netlify.toml` already sets the build command (`npx expo export -p web`), the publish folder (`dist`), 
   Node 20, and the rules that make page reloads and the password-reset link work.  
3. Under **Site configuration > Environment variables** add:  
   - `EXPO_PUBLIC_API_URL` = your backend address (live: `https://coral8.pythonanywhere.com`)  
   - `GEMINI_API_KEY` = a key from Google AI Studio  
   - `GEMINI_MODEL` (optional) = a current Gemini model name  
4. **Deploy** (variables are read at build time, so deploy again after changing them). After this, every push to the `main` branch deploys automatically.  
5. Copy your Netlify address into the backend's `CORS_ALLOWED_ORIGINS` and `FRONTEND_URL` settings (live: `https://listaa2.netlify.app`).  
6. Test: register, create a list, attach a picture, share it, ask for AI ideas, and request a password reset.  
7. **Rolling back:** in Netlify open **Deploys**, choose an earlier deploy and press **Publish deploy**; the previous version is live again in seconds.

**Why this split?** Netlify serves the static site and the serverless AI function (both fit its free plan) and keeps the Gemini key out of the app. 
PythonAnywhere runs the Django API with a persistent disk for the SQLite database and uploaded images. 
Each part can be redeployed on its own.
