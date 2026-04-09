```markdown
# Design System: Immersive Social Framework

## 1. Overview & Creative North Star: "The Kinetic Stage"
This design system is built to dissolve the interface and elevate the creator. Our Creative North Star is **The Kinetic Stage**—a philosophy where the UI acts not as a container, but as a transparent lens. We move away from the "app-in-a-box" aesthetic by using high-contrast typography, intentional asymmetry, and depth achieved through light and blur rather than lines. 

The goal is a "Premium Social" experience: high-energy, neon-infused, yet sophisticated enough to feel like a high-end digital editorial. We break the grid by allowing engagement elements to "float" in a 3D Z-space, utilizing the full height of the mobile viewport to create total immersion.

---

## 2. Colors: High-Voltage Contrast
The palette is rooted in a "Pure Dark" foundation to ensure the TikTok-inspired vibrance feels electric, not overwhelming.

### Palette Strategy
- **Primary High-Energy:** `primary` (#ffb3b6) and `primary_container` (#ff5168) drive action.
- **Secondary Neon:** `secondary` (#affffb) provides the "TikTok Cyan" counterpoint, used for highlights and active states.
- **Surface Depth:** The system relies on a monochromatic dark range from `surface_container_lowest` (#0e0e0e) to `surface_bright` (#3a3939).

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections. Boundaries must be established through tonal shifts. For example, a `surface_container_high` card should sit directly on a `surface` background. The contrast in hex values is the divider.

### The "Glass & Gradient" Rule
To achieve a signature look, floating engagement clusters must use **Glassmorphism**. Apply `surface_variant` at 40% opacity with a `20px` backdrop blur. 
*   **Signature Texture:** Use a subtle linear gradient for primary buttons, transitioning from `primary` to `primary_container` at a 135-degree angle to add "soul" and depth.

---

## 3. Typography: Editorial Impact
We utilize a dual-font strategy to balance high-energy expression with utility.

- **Display & Headlines (Plus Jakarta Sans):** Used for "moment" moments—usernames, high-impact stats, and headers. The wide apertures of Plus Jakarta Sans feel modern and premium.
- **Body & Labels (Inter):** The workhorse. Used for captions, comments, and settings to ensure maximum legibility at small scales.

**Hierarchy Strategy:** 
- Use `display-md` for viral milestones (e.g., "1.2M Likes").
- Use `title-sm` for captions to maintain a compact, readable vertical footprint.
- Always use `on_surface_variant` for timestamps to create a visual hierarchy that recedes behind the main content.

---

## 4. Elevation & Depth: Tonal Layering
In a dark, video-first environment, traditional drop shadows are often invisible. We use **Tonal Layering**.

- **The Layering Principle:** Stack `surface_container_highest` (#353434) elements over `surface` (#141313) to create a sense of physical lift. 
- **Ambient Shadows:** For floating action buttons, use a shadow color derived from `primary_fixed_variant` (#920027) at 10% opacity with a `32px` blur. This creates a "glow" rather than a "shadow," mimicking the light bleed of a neon sign.
- **The "Ghost Border" Fallback:** If a container (like an input field) risks disappearing, use `outline_variant` at **15% opacity**. Never use a 100% opaque stroke.
- **Immersive Blur:** The bottom navigation bar must use a `surface_container_lowest` fill at 70% opacity with a heavy `backdrop-blur (16px)`, allowing the video content to peak through the bottom of the screen.

---

## 5. Components: Built for Motion

### Full-Screen Video Containers
- **Edge-to-Edge:** Zero padding. The video is the background.
- **Safe Zones:** Top 10% (Status bar/Search) and Bottom 20% (Navigation/Caption) must have a subtle `surface_dim` gradient overlay (0% to 40% opacity) to ensure text legibility over unpredictable video content.

### Floating Engagement Icons (The Interaction Cluster)
- **Styling:** Vertical stack on the right gutter.
- **Visuals:** Icons use `on_primary_fixed` color. The labels (count) use `label-md`. 
- **Glass Backing:** Each icon sits on a circular `surface_variant` glass disc with 20% opacity.

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`), `md` (12px) border radius. 
- **Secondary/Ghost:** `outline` stroke at 20% opacity with `on_surface` text. No fill.

### Cards & Lists
- **The Divider Ban:** Lists must never use horizontal lines. Use 16px of vertical whitespace (`spacing-md`) and a background shift to `surface_container_low` for individual list items.

### Bottom Navigation Bar
- **Architecture:** Fixed height (84px). 
- **Active State:** The active icon uses `secondary_fixed` (#35fbf5) with a 4px `secondary` "glow" dot underneath.

---

## 6. Do's and Don'ts

### Do:
- **Do** use `plusJakartaSans` for any numerical data to make it feel like an editorial stat.
- **Do** lean into asymmetry. A profile picture can slightly overlap the edge of a glass container to create depth.
- **Do** use `surface_bright` for active touch states (Haptic/Visual feedback).

### Don't:
- **Don't** use pure white (#FFFFFF). Use `on_surface` (#e5e2e1) to reduce eye strain in high-energy dark mode.
- **Don't** use standard Material or iOS "grey" borders. If it’s not a tonal shift, it shouldn't exist.
- **Don't** clutter the video field. If a component isn't essential for the current second of the "user journey," it should be at 0% opacity.

---
**Director's Note:** This system is about the tension between the dark void of the background and the electric energy of the content. Keep it tight, keep it layered, and never let a border ruin a good gradient.```