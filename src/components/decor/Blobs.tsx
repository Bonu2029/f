/**
 * Soft gradient fields. Pure CSS so they cost nothing, positioned per-section
 * rather than repeated, and always well under the type for contrast.
 */

type Blob = {
  className: string;
  color: string;
  size: string;
  anim?: "a" | "b";
  blur?: string;
};

export default function Blobs({ blobs }: { blobs: Blob[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {blobs.map((b, i) => (
        <div
          key={i}
          className={`absolute ${b.size} ${b.className} ${
            b.anim === "b" ? "animate-drift-b" : "animate-drift-a"
          } animate-morph`}
          style={{
            background: b.color,
            filter: `blur(${b.blur ?? "70px"})`,
            animationDelay: `${i * -6}s`,
          }}
        />
      ))}
    </div>
  );
}

/* Reusable field presets — each section gets a different one. */

export const FIELD_HERO: Blob[] = [
  {
    className: "-top-32 -left-24",
    size: "h-[38rem] w-[38rem]",
    color:
      "radial-gradient(circle at 35% 35%, rgba(239,224,203,0.85), rgba(230,198,189,0.32) 55%, transparent 72%)",
  },
  {
    className: "top-1/3 -right-40",
    size: "h-[44rem] w-[44rem]",
    color:
      "radial-gradient(circle at 60% 40%, rgba(210,204,221,0.62), rgba(179,195,170,0.28) 58%, transparent 74%)",
    anim: "b",
  },
  {
    className: "bottom-[-14rem] left-1/4",
    size: "h-[32rem] w-[32rem]",
    color:
      "radial-gradient(circle at 50% 50%, rgba(217,162,115,0.30), transparent 68%)",
  },
];

export const FIELD_SERVICES: Blob[] = [
  {
    className: "top-[12%] right-[-12rem]",
    size: "h-[36rem] w-[36rem]",
    color:
      "radial-gradient(circle at 45% 45%, rgba(179,195,170,0.5), transparent 70%)",
    anim: "b",
  },
  {
    className: "bottom-[8%] left-[-14rem]",
    size: "h-[40rem] w-[40rem]",
    color:
      "radial-gradient(circle at 55% 45%, rgba(239,224,203,0.72), transparent 72%)",
  },
];

export const FIELD_SOFT: Blob[] = [
  {
    className: "top-[-10rem] left-1/2 -translate-x-1/2",
    size: "h-[34rem] w-[52rem]",
    color:
      "radial-gradient(ellipse at 50% 40%, rgba(230,198,189,0.55), transparent 70%)",
    blur: "90px",
  },
];

export const FIELD_LAVENDER: Blob[] = [
  {
    className: "top-[6%] left-[-10rem]",
    size: "h-[34rem] w-[34rem]",
    color:
      "radial-gradient(circle at 50% 50%, rgba(210,204,221,0.7), transparent 70%)",
  },
  {
    className: "bottom-[-8rem] right-[-8rem]",
    size: "h-[30rem] w-[30rem]",
    color:
      "radial-gradient(circle at 50% 50%, rgba(239,224,203,0.66), transparent 70%)",
    anim: "b",
  },
];
