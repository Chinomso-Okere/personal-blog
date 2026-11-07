"use client";

// Opens the browser's print dialog, where "Save as PDF" is a destination.
// Rendered on the server so it takes its space from the first paint (no
// layout shift); it works once the page has hydrated. Hidden in print.
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn btn--ghost cv__print" onClick={() => window.print()}>
      {label}
    </button>
  );
}
