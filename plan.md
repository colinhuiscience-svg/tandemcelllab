# Tandem Cell Lab — managed website plan

## Implementation

This is a client-side TanStack Start + Vite website with a single `/` route. The existing React Three Fiber scene remains the visualization surface; the pure solar model and pathway modules remain the source of truth for readings, layer order, carrier routes, collection-grid geometry, and qualitative educational behavior. The app is served as a static build from `.output/public`; no server or database capability is needed.

### Project structure

- `src/components/`: simulation scene, controls, layer explorer, notes, and reusable UI primitives.
- `src/lib/`: pure solar electrical model, layer catalog, and photon/carrier pathway rules.
- `src/routes/`: root metadata and the single simulation route.
- `src/assets/`: supplied watermark and uploaded panel asset pointers.
- `public/`: favicon, robots, and the managed route manifest.

## Design direction

- **Design Read:** Responsive scientific-lab explorable; audience is students and engineers; high information density, purposeful motion, and strong preservation of the existing interface.
- **Visual language:** Editorial laboratory instrument panel with warm photon accents, cool carrier colors, thin rules, exposed measurement readouts, and restrained 3D motion.
- **Core principles:** Explain cause and effect; make invisible charge pathways visible; keep model assumptions explicit; prioritize focusable inspection over decoration.
- **Color philosophy:** Cool neutral canvas and conductive blue-green accents establish an analytical lab baseline; warm gold photons and coral holes make energy conversion and recombination legible at a glance.
- **Layout paradigm:** A three-zone instrument bench—controls, live cross-section, and layer explorer—supported by a measured output strip rather than a centered marketing hero.
- **Signature elements:** Exploded layer stack, animated finger/busbar collection grid, and directional current pulses connecting the panel to the selected load.
- **Interaction philosophy:** Controls expose the model inputs directly; changes update electrical readings and the scene together. Layer selection temporarily elevates the chosen material while preserving context.
- **Animation:** Continuous low-amplitude motion for photons, carriers, grid collection, and circuit current; pause control and reduced-motion fallback; bursts reserved for generation and recombination events.
- **Typography:** Manrope for explanatory UI and IBM Plex Mono for measured values.
- **Brand essence:** A transparent solar-cell workbench for learning how light becomes current; precise, inspectable, and alive.
