[← Back to the README](../README.md)

# Security and Sessions

- **Tokens**: the backend issues a short-lived **access token** (about 25 minutes) and a long-lived **refresh token** (90 days). 
  Both are kept in the device's `AsyncStorage` and removed when you log out.  
- **Automatic renewal**: when the access token expires, the app quietly exchanges the refresh token for a new one and repeats the request. 
  If renewal is impossible, the app returns to the Login screen.  
- **Private data**: Edit Profile sends the login token and only shows and changes the signed-in user's own profile.  
- **Password reset**: the emailed link contains a **single-use token** that expires after one hour; the Change Password 
  screen sends it and shows a clear message if the link is incomplete, wrong or expired.  
- **AI key**: the Gemini key lives only in Netlify's environment, never in the app.  
- **No secrets in the repository**: the app only contains the public backend address.
