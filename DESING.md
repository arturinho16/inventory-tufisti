---
name: Tufis Liquid Neo-Soft
stack: Next.js, Tailwind CSS, TypeScript, Zustand
colors:
  bg-deep: '#0B0F19'
  bg-surface: '#161B26'
  liquid-purple-start: '#8B5CF6'
  liquid-purple-end: '#6D28D9'
  neon-pink-start: '#F472B6'
  neon-pink-end: '#EC4899'
  glass-border: 'rgba(255, 255, 255, 0.6)'
  glass-surface: 'rgba(255, 255, 255, 0.4)'
  text-primary: '#ffffff'
  text-secondary: '#94a3b8'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
  label-tech:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2.5rem
  full: 9999px
---

## 🤖 SYSTEM DIRECTIVES FOR AI GENERATION (STRICT RULES)
1. **IDIOMA OBLIGATORIO (SPANISH ONLY):** Todo el código frontend generado (textos, placeholders, tooltips, menús y variables de UI orientadas al usuario) DEBE estar exclusivamente en idioma ESPAÑOL.
2. **FULL RESPONSIVE DESIGN:** Todas las pantallas e interfaces deben ser 100% responsivas. Utiliza siempre los breakpoints de Tailwind (`sm:`, `md:`, `lg:`, `xl:`) para asegurar una adaptabilidad perfecta. El sistema debe verse y funcionar impecablemente en teléfonos móviles, tabletas y computadoras de escritorio. Las tablas de datos deben tener scroll horizontal en móviles o transformarse en formato de tarjetas apiladas.
3. **CERO INVENTOS (NO HALLUCINATIONS):** Está estrictamente prohibido inventar colores nuevos, clases CSS personalizadas o estilos de diseño alternativos. Debes ceñirte única y exclusivamente a la paleta de colores, tipografías y reglas de geometría definidas en este documento.
4. **ICONOGRAPHY:** Usa estrictamente Boxicons (Light/Thin variants). No importes FontAwesome ni Lucide a menos que se indique lo contrario.
5. **COMPONENT ATOMICITY:** Reutiliza las estructuras de "Glass Cards" y "Primary Action Buttons" especificadas. No crees contenedores con estilos diferentes a los aprobados.

## Brand & Style
The design system is a fusion of **Liquid Glass** and **Neo-Soft** aesthetics, tailored for high-precision inventory management and visual parallel matching. It evokes a premium, futuristic, and tactile emotional response. The UI relies on depth, translucency, and soft illumination to guide the user's eye through dense technical specifications.

## Colors
The palette is centered on a soft, cool-toned environment that allows vibrant accents to pop. 
- **Liquid Purple (#8B5CF6 to #6D28D9):** Used for primary actions, success states, and key data highlights.
- **Neon Pink (#F472B6 to #EC4899):** Used for warnings, interactive toggles, or secondary emphasis in data comparisons.
- **Deep Black (#111827):** Reserved for "Focus Cards" or high-contrast sidebars to ground the translucent interface.
- **Surface Strategy:** Backgrounds utilize a soft linear gradient. Containers use `bg-white/40` with high background blur to maintain the "liquid glass" effect.

## Typography
The system uses **Hanken Grotesk** for its clean, sharp, and contemporary geometry.
For technical data—such as resolutions (1264 × 2736) or densities (460 ppi)—**JetBrains Mono** is employed in label roles to provide a "developer-precise" feel. Typography hierarchy emphasizes clarity in comparison tables. Use semi-bold weights for category headers and regular weights for data values.

## Layout & Spacing (Responsive Rules)
The layout follows a **Fluid Grid** model ensuring mobile-first adaptability.
- **Mobile (`< 768px`):** 4-column grid. Cards stack vertically. Forms and inputs take 100% width. Reduce padding to `p-4` to maximize screen real estate.
- **Tablet (`md:`):** 8-column grid with 20px gutters.
- **Desktop (`lg:` & `xl:`):** 12-column grid. Main inventory lists use a wide-card layout.
- **Spacing:** Use liberal padding (e.g., `p-6` or `p-8`) on desktop to create "breathing room" around glass containers so the background gradients remain visible through the translucency.

## Elevation, Depth & Animations (Liquid Physics)
Depth is achieved through the **Liquid Glass** effect and iOS-style tactile physics.
- **Layers & Refraction:** Surface layers MUST use `backdrop-blur-xl` and a 1px border of `border-white/60` to act as a highlight on the "glass" edge.
- **Shadows:** Use extremely diffused, low-opacity ambient shadows (e.g., `shadow-[0_20px_50px_rgba(0,0,0,0.05)]`).
- **Tactile Bounce (Active State):** ALL interactive elements (buttons, rows, cards) MUST include an active state that reduces scale: `active:scale-95 transition-all duration-300`.
- **Liquid Ripple Effect:** The global layout must support a click listener that spawns a temporary radial gradient div (white, semi-transparent) scaling from `scale-0` to `scale-4` and fading out over 600ms, mimicking a water drop impact.

## Shapes
Geometry is a defining characteristic of this system. 
- **Master Containers:** Use a hyper-organic `rounded-[2.5rem]` (40px) radius. 
- **Interactive Elements:** Buttons, search bars, and tabs use `rounded-full` (pill-shaped).
- **Inner Elements:** Nested items within cards use a `rounded-2xl` (16px) radius.

## Components
- **Glass Cards:** `bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem]`.
- **Primary Action Buttons:** Pill-shaped `bg-gradient-to-r from-purple-500 to-indigo-600` with text `text-white`. Include `hover:brightness-110 active:scale-95`.
- **Data Chips:** Small, semi-transparent pills (`bg-slate-200/50 text-slate-700`) used for technical specs.
- **Search & Filter Bars:** Full-width rounded-full inputs with a squishy focus state (`focus:ring-2 focus:ring-purple-500/50`).
- **Comparison Rows:** Use alternating soft-tinted glass rows (e.g., `hover:bg-white/20`) to make scanning large tables easier.