"use client";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ComingSoonCard({
  name,
  role,
  igHandle,
}: {
  name: string;
  role: string;
  igHandle: string;
}) {
  return (
    <div className="bg-white/[0.025] backdrop-blur-md border border-white/[0.08] rounded-2xl p-5 flex flex-col items-center text-center hover:border-white/[0.15] transition-all duration-200">
      <div className="relative w-20 h-20 rounded-2xl overflow-hidden mb-4 flex-shrink-0 border border-white/[0.08]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://unavatar.io/instagram/${igHandle}`}
          alt={name}
          className="w-full h-full object-cover opacity-60"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = "flex";
          }}
        />
        <div className="absolute inset-0 backdrop-blur-[1px] bg-black/20" />
        <div
          className="absolute inset-0 items-center justify-center text-orange-500 text-xl font-semibold bg-white/[0.04]"
          style={{ display: "none" }}
        >
          {getInitials(name)}
        </div>
      </div>

      <h3 className="font-medium text-sm tracking-[0.01em] mb-1 leading-snug">
        {name}
      </h3>
      <p className="text-[#606060] text-xs mb-3">{role}</p>

      <span className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-bold px-2.5 py-1 rounded-full tracking-[0.08em] uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        Coming Soon
      </span>
    </div>
  );
}
