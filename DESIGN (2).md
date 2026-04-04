# Design System Specification: The Immersive Pulse

## 1. Overview & Creative North Star
**Creative North Star: "The Neon Cinematic"**
This design system is engineered to disappear. In a landscape of short-form content, the UI must act as a high-energy frame that enhances rather than competes with the video. We move beyond the "template" look by utilizing **Kinetic Asymmetry** and **Tonal Depth**. By leaning into a deep, obsidian-based palette with neon punctures, we create a "night-mode" editorial experience that feels like a premium digital gallery, not a standard social feed. 

The system rejects rigid, boxy layouts in favor of overlapping elements and "floating" containers that mimic the fluid motion of modern video transitions.

---

## 2. Colors: High-Octane Depth
Our color strategy relies on a deep base (`#23020f`) to maximize the perceived brightness of video content and our neon accents.

### The "No-Line" Rule
**Explicit Instruction:** Prohibition of 1px solid borders for sectioning. Structural boundaries must be defined solely through background color shifts. For example, a profile header uses `surface-container-low` while the video grid sits on `surface`. This creates a seamless, high-end feel.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical, stacked layers.
*   **Base:** `surface` (#23020f) - The foundation.
*   **Layer 1:** `surface-container-low` (#2b0414) - Subtle grouping.
*   **Layer 2:** `surface-container-high` (#3e0d21) - Interactive elements or cards.
*   **Accent Pops:** Use `secondary` (#29fcf3) for "New Post" indicators and `tertiary` (#f3ffca) for "Trending" tags to create high-energy focal points.

### The "Glass & Gradient" Rule
To elevate the experience, floating overlays (like comment sheets or share menus) should utilize **Glassmorphism**. 
*   **Implementation:** Apply `surface-container` colors at 70% opacity with a `20px` backdrop-blur. 
*   **Signature Textures:** For primary CTAs, use a linear gradient: `primary` (#ff8c95) to `primary-dim` (#e80048). This provides a "glowing" effect that feels more premium than a flat color.

---

## 3. Typography: Editorial Sans
We pair two modern sans-serifs to balance high-energy headlines with extreme mobile readability.

*   **Display & Headlines (Plus Jakarta Sans):** Chosen for its wide aperture and modern geometric feel. Use `display-lg` (3.5rem) for major content milestones and `headline-sm` (1.5rem) for creator names in feeds. 
*   **Body & Labels (Be Vietnam Pro):** A highly legible, technical sans-serif. Use `body-md` (0.875rem) for comments and `label-sm` (0.6875rem) for metadata like view counts.
*   **The Intentional Scale:** We use aggressive contrast between `headline-lg` and `body-sm` to create an editorial hierarchy that guides the eye quickly during fast scrolling.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are forbidden. We define hierarchy through "Atmospheric Perspective."

*   **The Layering Principle:** Stacking surface tiers creates natural lift. Place a `surface-container-highest` button on a `surface-container-low` bar to create depth without a single line of CSS shadow.
*   **Ambient Shadows:** When an element *must* float (e.g., a modal), use an ultra-diffused shadow: `box-shadow: 0 12px 40px rgba(35, 2, 15, 0.4);`. The shadow color is a tinted version of our background, not black.
*   **The "Ghost Border" Fallback:** For accessibility in forms, use the `outline-variant` (#693949) at **15% opacity**. It should be felt, not seen.
*   **Glassmorphism:** Use for bottom navigation bars. The video content should subtly bleed through the bar as the user scrolls, maintaining a sense of total immersion.

---

## 5. Components: Fluid Primitives

### Buttons
*   **Primary:** Rounded `full` (9999px). Background: `primary` to `primary-dim` gradient. Text: `on-primary` (#64001a).
*   **Secondary (Action):** `surface-container-highest` background with `secondary` (#29fcf3) icon/text. 
*   **Tertiary:** No background. `primary` text. High-energy, low-friction.

### Cards & Feed Items
*   **The "Zero-Divider" Rule:** Forbid the use of line dividers between videos or comments. Use `spacing-6` (1.5rem) of vertical white space or a shift from `surface` to `surface-container-low` to define boundaries.
*   **Rounding:** All content containers must use `xl` (3rem) or `lg` (2rem) corner radii to maintain the "Sleek & Rounded" brand promise.

### Input Fields
*   **Style:** `surface-container-highest` background, `xl` (3rem) rounding. 
*   **Interaction:** On focus, the "Ghost Border" increases to 40% opacity using the `secondary` (#29fcf3) color.

### Signature Component: The "Pulse" Interaction
For the "Like" or "Follow" actions, use a `primary-fixed-dim` (#ff576e) glow effect that expands momentarily behind the icon, reinforcing the "Energetic" personality.

---

## 6. Do’s and Don'ts

### Do:
*   **Use Asymmetry:** Place engagement metrics (likes/comments) on the right vertical axis, but offset them slightly to create a dynamic feel.
*   **Prioritize Content:** Ensure the `background` (#23020f) is the dominant color to let the 16:9 video aspect ratio shine.
*   **Embrace Large Radii:** Use `xl` (3rem) rounding for buttons and cards to create a futuristic, soft-touch interface.

### Don't:
*   **No 1px Lines:** Never use a solid line to separate UI elements. Use spacing or tonal shifts.
*   **No Pure Black:** Avoid `#000000` except for the `surface-container-lowest` in extreme high-contrast moments. Our deep plum-tinted background is more "expensive."
*   **No Small Tap Targets:** Given the energetic nature of the app, all interactive chips and buttons must have a minimum height of `spacing-12` (3rem).