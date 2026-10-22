import { initializeApp, cert, getApps, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

function resolveServiceAccount(): ServiceAccount | null {
  // 1. Check distinct environment variables
  const envProjectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const envPrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (envProjectId && envClientEmail && envPrivateKey) {
    return {
      projectId: envProjectId,
      clientEmail: envClientEmail,
      privateKey: envPrivateKey,
    };
  }

  // 2. Check full JSON in single env variable (useful for Vercel / Cloud deployments)
  const singleKeyEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (singleKeyEnv) {
    const trimmed = singleKeyEnv.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.client_email && parsed.private_key) {
          return {
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key,
          };
        }
      } catch (err) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:", err);
      }
    } else if (fs.existsSync(/*turbopackIgnore: true*/ trimmed)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ trimmed, "utf8"));
        if (parsed.client_email && parsed.private_key) {
          return {
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key,
          };
        }
      } catch (err) {
        console.error("Failed to read credentials file from env:", err);
      }
    }
  }

  // 3. Check common local file locations
  const fileCandidates = [
    path.resolve(process.cwd(), "Service Key.json"),
    path.resolve(process.cwd(), "../Service Key.json"),
    path.resolve(process.cwd(), "serviceAccountKey.json"),
    path.resolve(process.cwd(), "../serviceAccountKey.json"),
  ];

  for (const candidate of fileCandidates) {
    if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
      try {
        const fileContent = fs.readFileSync(/*turbopackIgnore: true*/ candidate, "utf8");
        const parsed = JSON.parse(fileContent);
        if (parsed.client_email && parsed.private_key) {
          return {
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key,
          };
        }
      } catch {
        // Continue to next candidate
      }
    }
  }

  return null;
}

if (!getApps().length) {
  const credentials = resolveServiceAccount();
  if (credentials) {
    try {
      initializeApp({
        credential: cert(credentials),
      });
    } catch (e) {
      console.error("Firebase admin init error:", e);
    }
  } else {
    console.warn("Firebase Admin credentials missing. Check environment variables or Service Key.json.");
  }
}

export const adminDb = getApps().length ? getFirestore() : null;
if (adminDb) {
  try {
    adminDb.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Ignore if already configured
  }
}
