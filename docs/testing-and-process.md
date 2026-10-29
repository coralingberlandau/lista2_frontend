[← Back to the README](../README.md)

# Testing, Reliability and How Lista Is Built

- **Backend**: 81 automated tests replay the app's real requests and cover accounts, permissions, sharing, pictures, backgrounds and password reset (see the backend README).  
- **Frontend**: every release is built for production (`npx expo export -p web`) and tried in a browser at phone, tablet and desktop widths and on an iPhone, including the error cases: no internet, an expired session, a refused request, a missing title, sharing with someone who is not on Lista, and a weak password; a new background followed by a quick move to another page (never blank or half-drawn); and the Log out button at seven screen widths from 320 to 1920 px (always on screen, never scrolling sideways); and titles in English, Hebrew and both together on Home and in an open list (each letter drawn in the intended font, English pixel-for-pixel unchanged); and long titles being typed, pasted, saved and reopened (whole title visible, nothing scrolling, Enter adding no line) at five screen widths from 320 to 1280 px.  
- **Predictable errors**: every failure becomes one short, plain sentence.  
- **Graceful AI failures**: if Gemini cannot be reached, the AI box says so and offers **Try again**; the list is never affected.  
- **Known type errors**: `npx tsc --noEmit` reports 5 type errors in older files. They do not affect building or running the app.

## Development process

1. **Planning and Design**  
   - Market research, wireframes, and user interface design.  
   - The Aurora Glass design system was designed as mock-ups and approved screen by screen before it was built.  

2. **Frontend Development**  
   - Built with React Native and Expo.  

3. **Backend Development**  
   - Developed using Django for API, authentication, and security.  

4. **Integration**  
   - Seamless data exchange using Axios.  

5. **Quality Assurance (QA)**  
   - Manual and automated feature testing.  
   - The backend has **81 automated tests**; the frontend screens were checked in a browser, including the error cases above.  

6. **Release and Feedback**  
   - Release followed by user feedback for continuous improvement.  

7. **Development Process**  
    Responsive Design Implementation
   - Developed a mobile-first approach using modern CSS techniques and frameworks.
   - Checked at phone width and in a desktop browser to keep the layout and functionality consistent.
