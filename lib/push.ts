/** Key for one device's subscription inside pushSubscriptions/{uid}.subs (stable per endpoint). */
export function endpointKey(endpoint: string) {
  let h = 5381;
  for (let i = 0; i < endpoint.length; i++) h = ((h << 5) + h + endpoint.charCodeAt(i)) >>> 0;
  return `d${h.toString(36)}${endpoint.length.toString(36)}`;
}

export const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
