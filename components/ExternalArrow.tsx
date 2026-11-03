interface ExternalArrowProps {
  className?: string;
}

export function ExternalArrow({ className = "" }: ExternalArrowProps) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ml-1 opacity-70 ${className}`}
      style={{ verticalAlign: "0.05em" }}
      aria-hidden="true"
    >
      <path
        d="M2.5 7.5L7.5 2.5M7.5 2.5H3.75M7.5 2.5V6.25"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

