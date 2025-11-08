import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";

admin.initializeApp();

// --- CONFIGURE REGION ONCE FOR ALL FUNCTIONS ---
setGlobalOptions({ region: 'asia-southeast1' });

// --- INTERFACES ---
interface CreateUserData {
  username: string;
  password: string;
  displayName: string;
  role: 'ADMIN' | 'SM' | 'OGL';
}
interface DeleteUserData {
  uid: string;
}
interface StationData {
  id?: string;
  name: string;
  type: 'manned' | 'unmanned';
  description: string;
  location: string;
}
// --- NEW INTERFACE FOR SIDE QUESTS ---
interface SideQuestData {
  id?: string;
  name: string;
  description: string;
  points: number;
  submissionType: 'photo' | 'video' | 'none';
  isSmManaged: boolean;
}

// ===================================================================
// 1. CREATE USER
// ===================================================================
export const createUser = onCall(
  async (request: CallableRequest<CreateUserData>) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
  const callerDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== "ADMIN") throw new HttpsError("permission-denied", "Admin only.");

  const { username, password, displayName, role } = request.data;
  const email = `${username}@hcibso.app`;

  try {
    const userRecord = await admin.auth().createUser({ email, password, displayName });
    await admin.firestore().collection("users").doc(userRecord.uid).set({ displayName, role, username, email });
    return { success: true, message: `Created ${displayName}` };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

// ===================================================================
// 2. DELETE USER
// ===================================================================
export const deleteUser = onCall(
  async (request: CallableRequest<DeleteUserData>) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
  const callerDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== "ADMIN") throw new HttpsError("permission-denied", "Admin only.");
  if (request.auth.uid === request.data.uid) throw new HttpsError("invalid-argument", "Cannot delete self.");

  try {
    await admin.auth().deleteUser(request.data.uid);
    await admin.firestore().collection("users").doc(request.data.uid).delete();
    return { success: true };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

// ===================================================================
// 3. DELETE ALL USERS
// ===================================================================
export const deleteAllUsers = onCall(
  async (request: CallableRequest<void>) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
  const callerDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== "ADMIN") throw new HttpsError("permission-denied", "Admin only.");

  try {
    const usersSnapshot = await admin.firestore().collection("users").get();
    const promises: Promise<any>[] = [];
    let deletedCount = 0;
    for (const doc of usersSnapshot.docs) {
      if (doc.id === request.auth.uid) continue;
      promises.push(admin.auth().deleteUser(doc.id).catch(() => {}));
      promises.push(doc.ref.delete());
      deletedCount++;
    }
    await Promise.all(promises);
    return { success: true, message: `Deleted ${deletedCount} users.` };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

// ===================================================================
// 4. CREATE STATION
// ===================================================================
export const createStation = onCall(
  async (request: CallableRequest<StationData>) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
  const callerDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== "ADMIN") throw new HttpsError("permission-denied", "Admin only.");

  try {
    const ref = admin.firestore().collection("stations").doc();
    await ref.set({ ...request.data, status: "OPEN", travelingCount: 0, arrivedCount: 0 });
    return { success: true, id: ref.id };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

// ===================================================================
// 5. DELETE STATION
// ===================================================================
export const deleteStation = onCall(
  async (request: CallableRequest<{ id: string }>) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
  const callerDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== "ADMIN") throw new HttpsError("permission-denied", "Admin only.");

  try {
    await admin.firestore().collection("stations").doc(request.data.id).delete();
    return { success: true };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

// ===================================================================
// 6. CREATE SIDE QUEST (NEW! V2 SYNTAX)
// ===================================================================
export const createSideQuest = onCall(
  async (request: CallableRequest<SideQuestData>) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
  const callerDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== "ADMIN") throw new HttpsError("permission-denied", "Admin only.");

  try {
    const ref = admin.firestore().collection("sideQuests").doc();
    await ref.set(request.data);
    return { success: true, id: ref.id };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

// ===================================================================
// 7. DELETE SIDE QUEST (NEW! V2 SYNTAX)
// ===================================================================
export const deleteSideQuest = onCall(
  async (request: CallableRequest<{ id: string }>) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
  const callerDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== "ADMIN") throw new HttpsError("permission-denied", "Admin only.");

  try {
    await admin.firestore().collection("sideQuests").doc(request.data.id).delete();
    return { success: true };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

// ===================================================================
// 8. UPDATE SIDE QUEST (NEW!)
// ===================================================================
export const updateSideQuest = onCall(
  async (request: CallableRequest<SideQuestData & { id: string }>) => {
  
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
  const callerDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== "ADMIN") throw new HttpsError("permission-denied", "Admin only.");

  const { id, name, description, points, submissionType, isSmManaged } = request.data;
  
  if (!id || !name || points === undefined) {
    throw new HttpsError("invalid-argument", "ID, Name, and Points are required.");
  }

  try {
    await admin.firestore().collection("sideQuests").doc(id).update({
      name, description, points, submissionType, isSmManaged
    });
    return { success: true, message: "Side quest updated." };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

// ===================================================================
// 9. UPDATE STATION (NEW!)
// ===================================================================
export const updateStation = onCall(
  async (request: CallableRequest<StationData & { id: string }>) => {
    
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
  const callerDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== "ADMIN") throw new HttpsError("permission-denied", "Admin only.");

  const { id, name, type, description, location } = request.data;
  
  if (!id || !name || !type) {
    throw new HttpsError("invalid-argument", "ID, Name, and Type are required.");
  }

  try {
    // We only update the editable fields, NOT the status or counts
    await admin.firestore().collection("stations").doc(id).update({
      name, type, description: description || "", location: location || ""
    });
    return { success: true, message: `Updated station: ${name}` };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});