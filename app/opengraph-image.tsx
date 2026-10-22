import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

// The preview card shown when a page is shared on WhatsApp, Facebook, etc. (book pages use their cover instead).
export const alt = `${site.brand} — Cambridge IGCSE & O Level Computer Science`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "linear-gradient(135deg, #121412 0%, #1e3b33 100%)",
          color: "#ede8de",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 36 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "#9cc7b1",
              color: "#0f1411",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            {"{}"}
          </div>
          {site.brand}
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 76, lineHeight: 1.1, fontWeight: 700 }}>
          <span>Making computer science</span>
          <span style={{ color: "#e3895f" }}>feel like common sense.</span>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#b0aa9e" }}>
          IGCSE &amp; O Level 0478 / 2210 · AS &amp; A Level 9618 · Classes · Books
        </div>
      </div>
    ),
    size,
  );
}
