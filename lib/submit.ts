import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export type SubmitResult = { ok: true; demo: boolean } | { ok: false; error: string };

async function write(collectionName: string, data: Record<string, string>): Promise<SubmitResult> {
  if (!isFirebaseConfigured) {
    // Lets the UI be previewed before Firebase is connected.
    console.info(`[demo] would write to "${collectionName}":`, data);
    return { ok: true, demo: true };
  }
  try {
    await addDoc(collection(db(), collectionName), { ...data, createdAt: serverTimestamp() });
    return { ok: true, demo: false };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Something went wrong. Please try again in a moment." };
  }
}

export function subscribe(email: string) {
  return write("subscribers", { email: email.trim().toLowerCase() });
}

export function sendMessage(msg: { name: string; email: string; topic: string; message: string }) {
  return write("messages", msg);
}
