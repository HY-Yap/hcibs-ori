import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize the Firebase Admin SDK
admin.initializeApp();

// --- 1. DEFINE THE SHAPE OF OUR DATA ---
interface CreateUserData {
  username: string;
  password: string;
  displayName: string;
  role: 'ADMIN' | 'SM' | 'OGL';
}
// --- NEW! ---
interface DeleteUserData {
  uid: string; // The ID of the user to delete
}

// ===================================================================
// CREATE USER FUNCTION (Already built)
// ===================================================================
export const createUser = functions.https.onCall(
  async (request: functions.https.CallableRequest<CreateUserData>) => {

  // 1. CHECK AUTHENTICATION & AUTHORIZATION
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to create a user."
    );
  }

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
  const { username, password, displayName, role } = request.data;
  const email = `${username}@hcibso.app`;

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
    console.error("Error creating user:", error);
    throw new functions.https.HttpsError(
      "internal",
      error.message || "An unknown error occurred."
    );
  }
});


// ===================================================================
// NEW! DELETE USER FUNCTION
// ===================================================================
export const deleteUser = functions.https.onCall(
  async (request: functions.https.CallableRequest<DeleteUserData>) => {

  // 1. CHECK AUTHENTICATION & AUTHORIZATION (Same as before)
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to delete a user."
    );
  }

  const callerUid = request.auth.uid;
  const callerDoc = await admin
    .firestore()
    .collection("users")
    .doc(callerUid)
    .get();
  
  if (callerDoc.data()?.role !== "ADMIN") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only an Admin can delete users."
    );
  }

  // 2. GET DATA
  const uidToDelete = request.data.uid;
  if (!uidToDelete) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing user ID."
    );
  }
  
  // You can't delete yourself
  if (callerUid === uidToDelete) {
     throw new functions.https.HttpsError(
      "invalid-argument",
      "You cannot delete your own account."
    );
  }

  try {
    // 3. DELETE USER FROM FIREBASE AUTHENTICATION
    await admin.auth().deleteUser(uidToDelete);
    
    // 4. DELETE USER FROM FIRESTORE
    await admin.firestore().collection("users").doc(uidToDelete).delete();

    // 5. RETURN SUCCESS
    return {
      success: true,
      message: `Successfully deleted user ${uidToDelete}`,
    };
  } catch (error: any) {
    console.error("Error deleting user:", error);
    throw new functions.https.HttpsError(
      "internal",
      error.message || "An unknown error occurred."
    );
  }
});