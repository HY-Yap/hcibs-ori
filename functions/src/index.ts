import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize the Firebase Admin SDK
admin.initializeApp();

// --- 1. DEFINE THE SHAPE OF OUR DATA ---
// This tells TypeScript what 'request.data' will look like
interface CreateUserData {
  username: string;
  password: string;
  displayName: string;
  role: 'ADMIN' | 'SM' | 'OGL';
}

/**
 * A (callable) Cloud Function to create a new user.
 * This function can only be called by a user who is already an Admin.
 */

// --- 2. USE THE MODERN v2+ FUNCTION SIGNATURE ---
export const createUser = functions.https.onCall(
  async (request: functions.https.CallableRequest<CreateUserData>) => {

  // 1. CHECK AUTHENTICATION & AUTHORIZATION
  // In v2+, auth info is inside request.auth
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to create a user."
    );
  }

  // Check if the user is an Admin.
  const callerUid = request.auth.uid;
  const callerDoc = await admin
    .firestore()
    .collection("users")
    .doc(callerUid)
    .get();
  
  const callerRole = callerDoc.data()?.role;

  if (callerRole !== "ADMIN") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only an Admin can create new users."
    );
  }

  // 2. GET DATA FROM THE FRONT-END
  // In v2+, data is inside request.data
  const { username, password, displayName, role } = request.data;
  const email = `${username}@hcibso.app`; // Create a "fake" email

  // Validation
  if (!email || !password || !displayName || !role) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required user data."
    );
  }

  try {
    // 3. CREATE THE USER IN FIREBASE AUTHENTICATION
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: displayName,
    });

    const newUserId = userRecord.uid;

    // 4. CREATE THE USER'S PROFILE IN FIRESTORE
    await admin.firestore().collection("users").doc(newUserId).set({
      displayName: displayName,
      role: role,
      username: username,
      email: email,
    });

    // 5. RETURN SUCCESS
    return {
      success: true,
      message: `Successfully created user ${displayName} (${email})`,
      uid: newUserId,
    };
  } catch (error: any) {
    // Handle errors (e.g., "email already exists")
    console.error("Error creating user:", error);
    throw new functions.https.HttpsError(
      "internal",
      error.message || "An unknown error occurred."
    );
  }
});