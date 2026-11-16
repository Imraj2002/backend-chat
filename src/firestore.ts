import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { config } from "./config.js";

const app = getApps()[0] ?? initializeApp({
  credential: applicationDefault(),
  projectId: config.firebaseProjectId,
});

export const firestore = getFirestore(app);
