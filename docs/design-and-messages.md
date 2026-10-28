[← Back to the README](../README.md)

# Design and Messages

Lista is designed to feel like *a quiet place to keep what matters*. A list should take seconds to make, 
and nothing in the app should make you wonder what just happened.

### 🎨 A Calm, Consistent Look
- **Aurora Glass design system**: soft violet, coral and teal gradients, frosted-glass cards, **Fraunces** headings and **DM Sans** body text. 
- **One visual language everywhere**: every page and every pop-up uses the same masthead-style title with a thin rule underneath, 
  the same rounded cards and the same gradient buttons.
- **Your own background**: choose a photo, a gradient or your own picture in Settings, and it applies to every screen. Every screen switches at the same moment, and only once the new picture is complete: until then the old background stays, so there is never a blank or half-painted one.
- **Gentle loading**: a page shows only the three-dot *Aurora Dots* animation until everything it needs has arrived, then appears complete. One shared rule covers every page: the dots appear only when the wait is noticeable (over a quarter of a second), the page, its background photo and its pictures appear together, a page you have already opened comes back at once, and if it cannot load it says so and offers **Try again**. The dots are also what you see the moment the app opens, before the code or the fonts have loaded, instead of a blank screen.

### 🧭 Easy to Understand at a Glance
- **Home shows progress, not paperwork**: each list is a card with a progress badge (`2/5`) and a colored bar, so you see what is done without opening anything.
- **Few buttons, clear icons**: AI ideas, Share, Check All and Delete sit together at the top right of a list, directly on the page (no circles behind them); everything else is on the page itself.
- **A floating bottom bar**: Home and Settings sit in a white pill that floats above the content.
- **Quiet rows**: a photo or camera tile first, the text, and the checkbox on the right, in one soft card with thin dividers; the drag handle is very faint.
- **Checked items look checked**: struck through, with no raw symbols.

### 💬 Clear Feedback After Every Action
- Every success and every problem ends with a **short, specific message** that says what happened and, when possible, what to do next 
  (see [Messages and Notifications](#messages-and-notifications)).
- **Risky actions ask first**: deleting a list shows a confirmation that also warns when the list is shared.
- **Forms explain themselves**: a weak password gets a plain sentence such as *"This password is too short. It must contain at least 8 characters."*

### 🔒 Comfortable and Safe
- The login renews itself quietly, so you are not thrown out in the middle of a list.
- Deleted lists are only hidden, never erased from the database.
- Other people can see or change a list only if you shared it with them, with the permission you chose.

## Design system

Lista uses a small, consistent design system so every screen feels like one product.

- **Theme tokens** (`constants/theme.ts`): colors, fonts, radii and shadows used everywhere.  
- **Aurora palette**: violet `#6A5BD6`, coral `#FF9EB0`, teal `#5FD9CE` on a warm off-white background.  
- **Components** (`components/`):  
  - `GlassCard` - frosted glass surfaces for cards and boxes.  
  - `PrimaryButton` - gradient button with loading and disabled states.  
  - `AuroraBackground` / `AppBackground` - the soft gradient backdrop and the user's chosen background (it keeps the old background until a newly chosen picture is complete, and can tell a screen when its picture has finished loading).  
  - `AuroraDotsLoader` - the three-dot loading animation; `PageLoader` and `PageLoadError` show it for a whole page, or a message with Try again.  
  - `PageGate` - the one loading rule every page uses (dots, background and pictures ready, then the whole page); `StartupScreen` - the dots shown while the app starts.  
  - `FloatingTabBar` - the floating Home / Settings bar.  
  - `SwipeRow` - a row that slides left to reveal Delete; `AutoGrowInput` - a text field that wraps and grows.  
  - `ToastConfig` - custom gradient "wash" cards for success and error toasts.  
- **Masthead style**: a serif title with a short rule underneath, used on every page and every pop-up box.

## Messages and notifications

Every action ends with a short toast that says what happened and, when possible, what to do next.

| Situation | Message |
|-----------|---------|
| List saved / updated / deleted | "Your list was saved." / "...updated." / "...deleted." |
| Several people shared | "List shared with 2 people." |
| Missing title | "Add a title to save your list." |
| No internet or server asleep | "Couldn't save your list" - "Can't reach Lista. Check your internet and try again." |
| Session expired | "Your session expired. Please log in again." |
| No permission | "You don't have permission to do that." |
| Server problem | "Lista's server had a problem. Try again in a moment." |
| Someone not on Lista | "Couldn't find: name@example.com. They need to join Lista first, then share again." |

The wording comes from one helper, `utils/describeError.ts`, so every screen explains problems the same way. 
The password-changed message is *"Password changed. Log in with your new one."*

| Success | Error |
|:-------:|:-----:|
| ![Success](screenshots/messages/success-list-saved.png) | ![No internet](screenshots/messages/error-no-internet.png) |
| ![Share error](screenshots/messages/error-share-nobody-found.png) | ![Session expired](screenshots/messages/error-session-expired.png) |
