// Keeps a page range such as "pp. 367–372" on one line so it never breaks
// away from the rest of the venue. Display only; writing.json is unchanged.
const PAGE_RANGE = /(pp\.\s*\d+\s*[–-]\s*\d+)/;

export function Venue({ text }: { text: string }) {
  const parts = text.split(PAGE_RANGE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="nowrap">
            {part.replace(/^pp\.\s*/, "pp. ")}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}
