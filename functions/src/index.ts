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
interface DeleteUserData {
  uid: string; // The ID of the user to delete
}

// ===================================================================
// 1. CREATE USER FUNCTION
// ===================================================================
export const createUser = functions.https.onCall(
  async (request: functions.https.CallableRequest<CreateUserData>) => {

  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }

  const callerUid = request.auth.uid;
  const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
  if (callerDoc.data()?.role !== "ADMIN") {
    throw new functions.https.HttpsError("permission-denied", "Only Admin can create users.");
  }

  const { username, password, displayName, role } = request.data;
  const email = `${username}@hcibso.app`;

  if (!email || !password || !displayName || !role) {
    throw new functions.https.HttpsError("invalid-argument", "Missing data.");
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
    });
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      displayName,
      role,
      username,
      email,
    });
    return { success: true, message: `Created ${displayName}` };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// ===================================================================
// 2. DELETE USER FUNCTION
// ===================================================================
export const deleteUser = functions.https.onCall(
  async (request: functions.https.CallableRequest<DeleteUserData>) => {

  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }

  const callerUid = request.auth.uid;
  const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
  if (callerDoc.data()?.role !== "ADMIN") {
    throw new functions.https.HttpsError("permission-denied", "Only Admin can delete users.");
  }

  const uidToDelete = request.data.uid;
  if (callerUid === uidToDelete) {
     throw new functions.https.HttpsError("invalid-argument", "Cannot delete yourself.");
  }

  try {
    await admin.auth().deleteUser(uidToDelete);
    await admin.firestore().collection("users").doc(uidToDelete).delete();
    return { success: true, message: `Deleted user ${uidToDelete}` };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// ===================================================================
// 3. DELETE ALL USERS FUNCTION (DANGER ZONE)
// ===================================================================
export const deleteAllUsers = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }
  const callerUid = request.auth.uid;
  const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
  if (callerDoc.data()?.role !== "ADMIN") {
    throw new functions.https.HttpsError("permission-denied", "Only Admin can perform this.");
  }

  try {
    const usersSnapshot = await admin.firestore().collection("users").get();
    const deletePromises: Promise<any>[] = [];
    let deletedCount = 0;

    for (const doc of usersSnapshot.docs) {
      const uid = doc.id;
      if (uid === callerUid) continue; // Skip self

      deletePromises.push(admin.auth().deleteUser(uid).catch((e) => console.log(`Failed auth delete for ${uid}`, e)));
      deletePromises.push(doc.ref.delete());
      deletedCount++;
    }
    await Promise.all(deletePromises);
    return { success: true, message: `Successfully deleted ${deletedCount} users.` };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});