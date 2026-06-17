type LogoProps = {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { icon: 32, title: "text-lg", subtitle: "text-[10px]" },
  md: { icon: 40, title: "text-xl", subtitle: "text-xs" },
  lg: { icon: 56, title: "text-3xl", subtitle: "text-sm" },
};

export function Logo({
  className = "",
  showWordmark = true,
  size = "md",
}: LogoProps) {
  const s = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="48" height="48" rx="12" fill="#0C1929" />
        <path
          d="M10 34L18 24L24 28L34 14"
          stroke="#B8933F"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M30 14H34V18"
          stroke="#B8933F"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="34" cy="14" r="2" fill="#14B8A6" />
        <text
          x="24"
          y="41"
          textAnchor="middle"
          fill="#F8FAFC"
          fontSize="7"
          fontWeight="700"
          fontFamily="Georgia, serif"
        >
          IV
        </text>
      </svg>

      {showWordmark ? (
        <div className="min-w-0">
          <p
            className={`font-semibold tracking-tight text-slate-900 dark:text-slate-50 ${s.title}`}
          >
            IIC4
          </p>
          <p
            className={`truncate font-medium uppercase tracking-[0.18em] text-amber-700/90 dark:text-amber-400/90 ${s.subtitle}`}
          >
            Independent Investment Club IV
          </p>
        </div>
      ) : null}
    </div>
  );
}
