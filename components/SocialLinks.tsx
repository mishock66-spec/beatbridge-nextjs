// Shared social link icons used on /artists and individual artist pages.
// Only Instagram and Twitter/X are shown — no other platforms.
// Email icon is shown when an artist has a public email.

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function IconEmail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  );
}

const ICONS: Record<string, { icon: () => JSX.Element; label: string }> = {
  instagram: { icon: IconInstagram, label: "Instagram" },
  twitter:   { icon: IconX,         label: "X / Twitter" },
};

export function SocialLinks({
  socials,
  email,
}: {
  socials: { instagram?: string; twitter?: string };
  email?: string;
}) {
  const entries = (Object.keys(ICONS) as (keyof typeof ICONS)[]).filter(
    (k) => socials[k as keyof typeof socials]
  );
  if (entries.length === 0 && !email) return null;

  return (
    <div className="flex items-center gap-2.5 mt-1.5">
      {entries.map((key) => {
        const { icon: Icon, label } = ICONS[key];
        const url = socials[key as keyof typeof socials];
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="text-[#505050] hover:text-orange-400 transition-colors duration-150"
          >
            <Icon />
          </a>
        );
      })}
      {email && (
        <a
          href={`mailto:${email}`}
          aria-label="Email"
          className="text-[#505050] hover:text-orange-400 transition-colors duration-150"
        >
          <IconEmail />
        </a>
      )}
    </div>
  );
}
