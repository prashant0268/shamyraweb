// Adds catalog products missing from Firestore (same as Admin → Products → "Add missing defaults").
//
//   npx -y firebase-tools@15 emulators:exec --project shamyra-web --only functions \
//     "node functions/scripts/seed-missing-products.mjs [--apply]"
//
// Without --apply it only lists what it would add. Never overwrites existing products.

import { readFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

delete process.env.FIRESTORE_EMULATOR_HOST;
const apply = process.argv.includes("--apply");

initializeApp({ projectId: "shamyra-web" });
const db = getFirestore();

const catalog = JSON.parse(readFileSync(new URL("../../src/data/catalog.json", import.meta.url), "utf8"));
const existing = new Set((await db.collection("products").get()).docs.map((d) => d.id));
const missing = catalog.filter((p) => !existing.has(p.id));

console.log(`${existing.size} products in Firestore, ${missing.length} missing: ${missing.map((p) => p.id).join(", ") || "none"}`);
if (apply && missing.length) {
  const batch = db.batch();
  for (const { id, ...data } of missing) batch.set(db.doc(`products/${id}`), { ...data, updatedAt: FieldValue.serverTimestamp() });
  await batch.commit();
  console.log(`added ${missing.length}`);
}
