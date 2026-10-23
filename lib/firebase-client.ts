"use client";

import {
  browserLocalPersistence,
  browserSessionPersistence,
  connectAuthEmulator,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import { emulatorHost, firebaseApp, useEmulators } from "./firebase";

let authInstance: Auth | undefined;
let storageInstance: FirebaseStorage | undefined;

/**
 * Like getAuth() but without the popup/redirect resolver: admins only sign in with email + password, and on
 * iPhones the resolver loads a Google iframe before every sign-in (suspect for Chrome on iOS "Network error").
 */
export const auth = () => {
  if (authInstance) return authInstance;
  try {
    authInstance = initializeAuth(firebaseApp(), {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
    });
  } catch {
    authInstance = getAuth(firebaseApp()); // already initialised (hot reload)
  }
  if (useEmulators) connectAuthEmulator(authInstance, `http://${emulatorHost}:9399`, { disableWarnings: true });
  return authInstance;
};

export const storage = () => {
  if (storageInstance) return storageInstance;
  storageInstance = getStorage(firebaseApp());
  if (useEmulators) connectStorageEmulator(storageInstance, emulatorHost, 9299);
  return storageInstance;
};
