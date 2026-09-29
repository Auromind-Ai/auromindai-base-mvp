import Link from "next/link";

export default function ErrorPage({
  code = "404",
  title,
  backgroundLabel = "PAGE NOT FOUND",
  description = "We couldn't find the page you were looking for. Let's get you back on track.",
  actionHref = "/",
  actionLabel = "Back to home",
  embedded = false,
}) {
  return (
    <div
      className={`relative flex w-full min-w-0 items-center justify-center overflow-hidden bg-[#050505] text-white ${embedded ? "min-h-[420px] flex-1" : "min-h-screen"}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex select-none flex-col justify-around overflow-hidden py-2"
      >
        {Array.from({ length: 9 }, (_, index) => (
          <div
            key={index}
            className={`whitespace-nowrap text-4xl font-bold leading-none tracking-widest text-[#814AC824] sm:text-6xl md:text-7xl lg:text-[85px] ${index % 2 === 0 ? "-translate-x-12" : "translate-x-4"}`}
          >
            {`${index % 2 === 0 ? `ERROR ${code}` : backgroundLabel} `.repeat(
              8,
            )}
          </div>
        ))}
      </div>

      <div
        role={embedded ? "alert" : undefined}
        className="relative z-10 mx-auto flex max-w-xl flex-col items-center px-4 py-12 text-center"
      >
        <h1 className="mb-3 select-none text-8xl font-bold leading-none tracking-tight sm:mb-4 sm:text-[130px] md:text-[170px] lg:text-[200px]">
          {code}
        </h1>
        {title && (
          <h2 className="mb-3 text-lg font-semibold sm:text-xl">{title}</h2>
        )}
        <p className="mb-6 max-w-[280px] text-xs leading-relaxed text-white/70 sm:mb-7 sm:max-w-md sm:text-sm md:text-base">
          {description}
        </p>
        {actionHref && (
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center rounded-full border border-white/70 px-6 py-2.5 text-[10px] font-semibold uppercase tracking-widest transition-all hover:scale-105 hover:border-white hover:bg-white hover:text-black hover:shadow-[0_0_25px_rgba(129,74,200,0.45)] focus-visible:outline-2 focus-visible:outline-purple-400 active:scale-95 sm:px-7 sm:py-3 sm:text-xs"
          >
            {actionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
