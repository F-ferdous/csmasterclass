import Image from "next/image";
import type { Book, CoverMotif } from "@/lib/types";
import { cn } from "@/lib/utils";

type CoverBook = Pick<Book, "title" | "subtitle" | "category" | "coverColor" | "coverAccent" | "motif" | "coverUrl" | "backUrl">;

type Props = {
  book: CoverBook;
  className?: string;
  priority?: boolean;
  sizes?: string;
  side?: "front" | "back";
};

/**
 * A designed typographic cover. If the book has an uploaded `coverUrl`
 * that image is used instead, with the same spine and sheen on top.
 */
export function BookCover({ book, className, priority, sizes = "(min-width: 1024px) 320px, 60vw", side = "front" }: Props) {
  const image = side === "back" ? book.backUrl : book.coverUrl;
  return (
    <div
      className={cn(
        "@container relative aspect-[1/1.414] w-full overflow-hidden rounded-[3px_8px_8px_3px] shadow-lift",
        className,
      )}
      style={{ backgroundColor: book.coverColor }}
    >
      {image ? (
        <Image
          src={image}
          alt={`${side === "back" ? "Back cover" : "Cover"} of ${book.title}`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col p-[9cqw] pl-[13cqw]" role="img" aria-label={`Cover of ${book.title}`}>
          <p className="font-mono text-[3.6cqw] uppercase tracking-[0.25em]" style={{ color: book.coverAccent, opacity: 0.85 }}>
            CS Masterclass
          </p>
          <div className="relative my-auto aspect-square w-[62%] self-end">
            <Motif motif={book.motif} color={book.coverAccent} />
          </div>
          <p className="mb-[2cqw] font-mono text-[3.4cqw] uppercase tracking-[0.2em]" style={{ color: book.coverAccent }}>
            {book.category}
          </p>
          <h3 className="font-display text-[11cqw] leading-[0.98] tracking-tight text-[#F7F3EC] text-balance">{book.title}</h3>
          {book.subtitle && (
            <p className="mt-[3cqw] text-[4.2cqw] leading-snug text-[#F7F3EC]/70 text-pretty">{book.subtitle}</p>
          )}
        </div>
      )}
      {/* spine */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[6%]"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,.28), rgba(255,255,255,.12) 55%, rgba(0,0,0,.15) 80%, transparent)",
        }}
      />
      {/* sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(115deg, rgba(255,255,255,.14) 0%, transparent 35%, transparent 70%, rgba(0,0,0,.12))" }}
      />
    </div>
  );
}

function Motif({ motif, color }: { motif: CoverMotif; color: string }) {
  const common = { fill: "none", stroke: color, strokeWidth: 1.2, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
      {motif === "orbit" && (
        <g {...common}>
          {[44, 34, 24, 14].map((r, i) => (
            <circle key={r} cx="50" cy="50" r={r} opacity={0.35 + i * 0.18} />
          ))}
          <circle cx="94" cy="50" r="3.5" fill={color} stroke="none" />
          <circle cx="50" cy="16" r="2.5" fill={color} stroke="none" />
        </g>
      )}
      {motif === "grid" && (
        <g {...common}>
          {Array.from({ length: 25 }, (_, i) => {
            const x = (i % 5) * 19 + 5;
            const y = Math.floor(i / 5) * 19 + 5;
            const filled = [1, 7, 8, 12, 16, 18, 23].includes(i);
            return <rect key={i} x={x} y={y} width="14" height="14" rx="2" fill={filled ? color : "none"} opacity={filled ? 0.9 : 0.5} />;
          })}
        </g>
      )}
      {motif === "stairs" && (
        <g {...common}>
          <path d="M5 95 H25 V75 H45 V55 H65 V35 H85 V15 H95" strokeWidth="2" />
          <path d="M5 95 H25 V75 H45 V55 H65 V35 H85 V15" opacity="0.35" transform="translate(0 -10)" />
          <circle cx="95" cy="15" r="3.5" fill={color} stroke="none" />
        </g>
      )}
      {motif === "wave" && (
        <g {...common}>
          {[20, 35, 50, 65, 80].map((y, i) => (
            <path key={y} d={`M2 ${y} Q 26 ${y - 14} 50 ${y} T 98 ${y}`} opacity={0.3 + i * 0.16} strokeWidth={i === 2 ? 2 : 1.2} />
          ))}
        </g>
      )}
      {motif === "nodes" && (
        <g {...common}>
          <path d="M50 12 L26 42 M50 12 L74 42 M26 42 L14 74 M26 42 L38 74 M74 42 L62 74 M74 42 L86 74" opacity="0.7" />
          {[
            [50, 12], [26, 42], [74, 42], [14, 74], [38, 74], [62, 74], [86, 74],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="6" fill={i === 0 ? color : "none"} />
          ))}
          <path d="M8 92 H92" opacity="0.35" />
        </g>
      )}
      {motif === "gate" && (
        <g {...common}>
          <path d="M30 22 H52 A28 28 0 0 1 52 78 H30 Z" strokeWidth="2" />
          <path d="M6 36 H30 M6 64 H30 M80 50 H96" />
          <circle cx="6" cy="36" r="2.5" fill={color} stroke="none" />
          <circle cx="6" cy="64" r="2.5" fill={color} stroke="none" />
          <circle cx="96" cy="50" r="3.5" fill={color} stroke="none" />
          <path d="M18 88 H82" opacity="0.35" />
        </g>
      )}
    </svg>
  );
}
