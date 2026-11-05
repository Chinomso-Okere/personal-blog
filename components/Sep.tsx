interface SepProps {
  /** Class for the visible dot; omit for a hidden space only. */
  className?: string;
}

// Separator between two text items in a flex row (date · tag, venue · date).
// The visible dot is decorative. A plain space would never reach screen
// readers: whitespace between flex items is not laid out, so Chrome drops it
// from the accessibility tree and reads "Nigeria30 March". A visually hidden
// no-break space cannot collapse, stays in the tree, and is out of the flex
// flow, so the layout does not move.
export function Sep({ className }: SepProps) {
  return (
    <>
      {className && <span className={className} aria-hidden="true"></span>}
      <span className="sr-only">{" "}</span>
    </>
  );
}
