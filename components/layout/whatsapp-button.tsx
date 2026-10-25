"use client";

import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/phone";
import { site } from "@/lib/site";

/** WhatsApp's own green — the button should read as WhatsApp at a glance. */
export const whatsappGreen = "#25D366";

/** Floating "chat on WhatsApp" button on the public pages. */
export function WhatsAppButton() {
  // The order form has its own sticky bar at the bottom on phones.
  const hidden = usePathname().startsWith("/order");
  if (!site.whatsapp || hidden) return null;

  return (
    <motion.a
      href={waLink(site.whatsapp, "Hello! I have a question about CS Masterclass.")}
      target="_blank"
      rel="noreferrer"
      aria-label={`Chat on WhatsApp — ${site.phone}`}
      className="group fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full p-3.5 text-white shadow-lift sm:bottom-6 sm:right-6"
      style={{ backgroundColor: whatsappGreen }}
      initial={{ opacity: 0, scale: 0.6, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span aria-hidden className="absolute inset-0 -z-10 animate-ping rounded-full opacity-30 [animation-duration:2.5s]" style={{ backgroundColor: whatsappGreen }} />
      <MessageCircle className="size-6" aria-hidden />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-[max-width,padding] duration-500 group-hover:max-w-40 group-hover:pr-1.5">
        {site.phone}
      </span>
    </motion.a>
  );
}
