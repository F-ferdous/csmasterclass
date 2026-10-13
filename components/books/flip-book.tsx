"use client";

import { motion } from "motion/react";
import { RotateCw } from "lucide-react";
import { useState } from "react";
import { BookCover } from "./book-cover";
import { Tilt } from "@/components/motion/tilt";
import type { Book } from "@/lib/types";

/** Front cover that flips in 3D to reveal the back cover. */
export function FlipBook({ book }: { book: Book }) {
  const [flipped, setFlipped] = useState(false);
  const hasBack = Boolean(book.backUrl);

  return (
    <div className="w-full max-w-[360px]">
      <Tilt max={10}>
        <button
          type="button"
          disabled={!hasBack}
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? "Show front cover" : "Show back cover"}
          className="block w-full cursor-pointer [perspective:1600px] disabled:cursor-default"
        >
          <motion.div
            className="relative [transform-style:preserve-3d]"
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 70, damping: 14 }}
          >
            <div className="[backface-visibility:hidden]">
              <BookCover book={book} priority sizes="(min-width: 1024px) 360px, 75vw" />
            </div>
            {hasBack && (
              <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <BookCover book={book} side="back" sizes="(min-width: 1024px) 360px, 75vw" />
              </div>
            )}
          </motion.div>
        </button>
      </Tilt>
      {hasBack && (
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="group mx-auto mt-8 flex items-center gap-2 rounded-full border border-line bg-paper/70 px-5 py-2.5 text-sm backdrop-blur transition-colors hover:border-ink"
        >
          <RotateCw className="size-4 transition-transform duration-500 group-hover:rotate-180" aria-hidden />
          {flipped ? "Show the front" : "Flip to the back cover"}
        </button>
      )}
    </div>
  );
}
