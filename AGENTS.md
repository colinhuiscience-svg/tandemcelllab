<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the solar simulator client-only on the index route so WebGL never runs during server rendering.
- Keep electrical calculations in a pure model module and use shared readings for the UI and scene so load and environment changes remain consistent.
- Load uploaded geometry through its asset pointer and label educational layers as schematic; STL geometry alone does not establish physical materials or electrical specifications.
- Keep layer definitions and panel benchmark assumptions in one shared catalog; the scene and explorer derive from it to preserve order and single-junction versus tandem differences.
- Preset efficiency is an assumed reference maximum-power benchmark; report the actual load-dependent conversion efficiency separately and never imply that a generic stack reproduces a manufacturer's proprietary design.
- Keep qualitative photon destinations and selective carrier routes in the pure pathway module; the instanced scene visualizes these rules without claiming a spectral or device-physics solution.
- Model identical series-connected cells by adding voltage and incident area while retaining per-cell current, and expose device activation through shared readings.
- Preserve supplied layer numbering but use physical passivation-before-metal ordering in compact assembly; drawings exaggerate thin films and surface relief.
