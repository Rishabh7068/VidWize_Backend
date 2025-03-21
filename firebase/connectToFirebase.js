import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "service-account.json"), "utf8")
);

const app = initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth(app);

export { app, auth };
