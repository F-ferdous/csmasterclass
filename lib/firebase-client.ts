"use client";

import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { firebaseApp } from "./firebase";

export const auth = () => getAuth(firebaseApp());
export const storage = () => getStorage(firebaseApp());

export const googleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
};
