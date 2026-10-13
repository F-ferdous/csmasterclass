"use client";

import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import { emulatorHost, firebaseApp, useEmulators } from "./firebase";

let authInstance: Auth | undefined;
let storageInstance: FirebaseStorage | undefined;

export const auth = () => {
  if (authInstance) return authInstance;
  authInstance = getAuth(firebaseApp());
  if (useEmulators) connectAuthEmulator(authInstance, `http://${emulatorHost}:9399`, { disableWarnings: true });
  return authInstance;
};

export const storage = () => {
  if (storageInstance) return storageInstance;
  storageInstance = getStorage(firebaseApp());
  if (useEmulators) connectStorageEmulator(storageInstance, emulatorHost, 9299);
  return storageInstance;
};
