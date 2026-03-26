# Analysis Report PDF Export

- Module: analysis report PDF export only.
- Replaced the fragile blank-window print flow with a standalone printable HTML document built from the hydrated report payload.
- Waits until the print window document is ready before calling `print()`.
- Keeps the existing report page structure and Word export flow unchanged.
- Build verification: `npm run build` passed.
