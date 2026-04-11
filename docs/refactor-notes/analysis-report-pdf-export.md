# Analysis Report PDF Export

- Module: analysis report PDF export only.
- Replaced the blank-window print flow with direct browser-side PDF generation and download.
- Reuses the hydrated analysis report payload to render a dedicated off-screen export sheet.
- Uses `html2canvas + jspdf` to generate a real `.pdf` file instead of asking the browser to print.
- Keeps the existing report page structure and Word export flow unchanged.
- The PDF button now shows an in-progress state while the file is being generated.
- Build verification: `npm run build` passed.
