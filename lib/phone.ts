/** Bangladesh numbers like 01712345678 → 8801712345678 for wa.me links. */
export function waNumber(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("880") ? d : d.startsWith("0") ? `88${d}` : d;
}

/** WhatsApp chat link for a phone number, optionally with a pre-filled message. */
export function waLink(phone: string, text?: string) {
  return `https://wa.me/${waNumber(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** A Bangladeshi mobile number as 8801XXXXXXXXX, or "" if it isn't one. Students sign in with it. */
export function phoneKey(phone: string) {
  const d = waNumber(phone);
  return /^8801[3-9]\d{8}$/.test(d) ? d : "";
}
