import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";

admin.initializeApp();

// --- CONFIGURE REGION ONCE FOR ALL FUNCTIONS ---
setGlobalOptions({ region: "asia-southeast1" });

// --- INTERFACES ---
interface CreateUserData {
  username: string;
  password: string;
  displayName: string;
  role: "ADMIN" | "SM" | "OGL";
}
interface DeleteUserData {
  uid: string;
}
interface StationData {
  id?: string;
  name: string;
  type: "manned" | "unmanned";
  description: string;
  location: string;
}
// --- NEW INTERFACE FOR SIDE QUESTS ---
interface SideQuestData {
  id?: string;
  name: string;
  description: string;
  points: number;
  submissionType: "photo" | "video" | "none";
  isSmManaged: boolean;
}

// --- NEW INTERFACE FOR SCORE SUBMISSION ---
interface ScoreData {
  groupId: string;
  stationId: string; // The SM's current station
  stationPoints?: number; // Optional: The main task points
  adminNote?: string; // Optional: Note for the main task
  sideQuestId?: string; // Optional: ID of a side quest to award
  sideQuestPoints?: number; // Optional: Points for that side quest
}

// ===================================================================
// 1. CREATE USER
// ===================================================================
export const createUser = onCall(
  async (request: CallableRequest<CreateUserData>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    if (callerDoc.data()?.role !== "ADMIN")
      throw new HttpsError("permission-denied", "Admin only.");

    const { username, password, displayName, role } = request.data;
    const email = `${username}@hcibso.app`;

    try {
      const userRecord = await admin
        .auth()
        .createUser({ email, password, displayName });
      await admin
        .firestore()
        .collection("users")
        .doc(userRecord.uid)
        .set({ displayName, role, username, email });
      return { success: true, message: `Created ${displayName}` };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 2. DELETE USER
// ===================================================================
export const deleteUser = onCall(
  async (request: CallableRequest<DeleteUserData>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    if (callerDoc.data()?.role !== "ADMIN")
      throw new HttpsError("permission-denied", "Admin only.");
    if (request.auth.uid === request.data.uid)
      throw new HttpsError("invalid-argument", "Cannot delete self.");

    try {
      await admin.auth().deleteUser(request.data.uid);
      await admin
        .firestore()
        .collection("users")
        .doc(request.data.uid)
        .delete();
      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 3. DELETE ALL USERS
// ===================================================================
export const deleteAllUsers = onCall(async (request: CallableRequest<void>) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Must be logged in.");
  const callerDoc = await admin
    .firestore()
    .collection("users")
    .doc(request.auth.uid)
    .get();
  if (callerDoc.data()?.role !== "ADMIN")
    throw new HttpsError("permission-denied", "Admin only.");

  try {
    const usersSnapshot = await admin.firestore().collection("users").get();
    const promises: Promise<any>[] = [];
    let deletedCount = 0;
    for (const doc of usersSnapshot.docs) {
      if (doc.id === request.auth.uid) continue;
      promises.push(
        admin
          .auth()
          .deleteUser(doc.id)
          .catch(() => {})
      );
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
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    if (callerDoc.data()?.role !== "ADMIN")
      throw new HttpsError("permission-denied", "Admin only.");

    try {
      const ref = admin.firestore().collection("stations").doc();
      await ref.set({
        ...request.data,
        status: "OPEN",
        travelingCount: 0,
        arrivedCount: 0,
      });
      return { success: true, id: ref.id };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 5. DELETE STATION
// ===================================================================
export const deleteStation = onCall(
  async (request: CallableRequest<{ id: string }>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    if (callerDoc.data()?.role !== "ADMIN")
      throw new HttpsError("permission-denied", "Admin only.");

    try {
      await admin
        .firestore()
        .collection("stations")
        .doc(request.data.id)
        .delete();
      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 6. CREATE SIDE QUEST (NEW! V2 SYNTAX)
// ===================================================================
export const createSideQuest = onCall(
  async (request: CallableRequest<SideQuestData>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    if (callerDoc.data()?.role !== "ADMIN")
      throw new HttpsError("permission-denied", "Admin only.");

    try {
      const ref = admin.firestore().collection("sideQuests").doc();
      await ref.set(request.data);
      return { success: true, id: ref.id };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 7. DELETE SIDE QUEST (NEW! V2 SYNTAX)
// ===================================================================
export const deleteSideQuest = onCall(
  async (request: CallableRequest<{ id: string }>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    if (callerDoc.data()?.role !== "ADMIN")
      throw new HttpsError("permission-denied", "Admin only.");

    try {
      await admin
        .firestore()
        .collection("sideQuests")
        .doc(request.data.id)
        .delete();
      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 8. UPDATE SIDE QUEST (NEW!)
// ===================================================================
export const updateSideQuest = onCall(
  async (request: CallableRequest<SideQuestData & { id: string }>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    if (callerDoc.data()?.role !== "ADMIN")
      throw new HttpsError("permission-denied", "Admin only.");

    const { id, name, description, points, submissionType, isSmManaged } =
      request.data;

    if (!id || !name || points === undefined) {
      throw new HttpsError(
        "invalid-argument",
        "ID, Name, and Points are required."
      );
    }

    try {
      await admin.firestore().collection("sideQuests").doc(id).update({
        name,
        description,
        points,
        submissionType,
        isSmManaged,
      });
      return { success: true, message: "Side quest updated." };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 9. UPDATE STATION (NEW!)
// ===================================================================
export const updateStation = onCall(
  async (request: CallableRequest<StationData & { id: string }>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    if (callerDoc.data()?.role !== "ADMIN")
      throw new HttpsError("permission-denied", "Admin only.");

    const { id, name, type, description, location } = request.data;

    if (!id || !name || !type) {
      throw new HttpsError(
        "invalid-argument",
        "ID, Name, and Type are required."
      );
    }

    try {
      // We only update the editable fields, NOT the status or counts
      await admin
        .firestore()
        .collection("stations")
        .doc(id)
        .update({
          name,
          type,
          description: description || "",
          location: location || "",
        });
      return { success: true, message: `Updated station: ${name}` };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 10. SET STATION (FOR SM LOGIN) - THIS WAS MISSING!
// ===================================================================
export const setStation = onCall(
  async (request: CallableRequest<{ stationId: string }>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");
    const userRef = admin.firestore().collection("users").doc(request.auth.uid);
    const userDoc = await userRef.get();
    if (userDoc.data()?.role !== "SM")
      throw new HttpsError(
        "permission-denied",
        "Only SMs can select a station."
      );

    try {
      await userRef.update({ selectedStationId: request.data.stationId });
      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 11. UPDATE STATION STATUS (FOR SM DASHBOARD)
// ===================================================================
export const updateStationStatus = onCall(
  async (
    request: CallableRequest<{ stationId: string; newStatus: string }>
  ) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    if (callerDoc.data()?.role !== "SM")
      throw new HttpsError("permission-denied", "Only SMs can update status.");
    if (callerDoc.data()?.selectedStationId !== request.data.stationId) {
      throw new HttpsError(
        "permission-denied",
        "You can only manage your selected station."
      );
    }

    try {
      await admin
        .firestore()
        .collection("stations")
        .doc(request.data.stationId)
        .update({
          status: request.data.newStatus,
        });
      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 12. SUBMIT SCORE (UNIFIED - HANDLES BOTH STATION & SIDE QUEST)
// ===================================================================
export const submitScore = onCall(
  async (request: CallableRequest<ScoreData>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");

    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    const callerRole = callerDoc.data()?.role;
    if (callerRole !== "SM" && callerRole !== "ADMIN") {
      throw new HttpsError("permission-denied", "Unauthorized.");
    }

    const {
      groupId,
      stationId,
      stationPoints,
      adminNote,
      sideQuestId,
      sideQuestPoints,
    } = request.data;
    if (!groupId || !stationId) {
      throw new HttpsError("invalid-argument", "Missing group or station ID.");
    }

    try {
      const batch = admin.firestore().batch();
      const groupRef = admin.firestore().collection("groups").doc(groupId);
      let totalPointsToAdd = 0;
      const updateData: any = {};

      // 1. HANDLE STATION SCORE (If provided)
      if (stationPoints !== undefined && stationPoints !== null) {
        totalPointsToAdd += stationPoints;
        // Mark station as completed
        updateData.completedStations =
          admin.firestore.FieldValue.arrayUnion(stationId);
        // **CRITICAL: This is what "departs" them**
        updateData.status = "IDLE";
        updateData.destinationId = admin.firestore.FieldValue.delete();
        updateData.destinationEta = admin.firestore.FieldValue.delete();

        // Log it
        const logRef = admin.firestore().collection("scoreLog").doc();
        batch.set(logRef, {
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          groupId,
          stationId,
          points: stationPoints,
          type: "STATION",
          awardedBy: request.auth.uid,
          awardedByRole: callerRole,
          note: adminNote || "",
        });
      }

      // 2. HANDLE SIDE QUEST (If provided)
      if (sideQuestId && sideQuestPoints !== undefined) {
        totalPointsToAdd += sideQuestPoints;
        // Mark side quest as completed
        updateData.completedSideQuests =
          admin.firestore.FieldValue.arrayUnion(sideQuestId);

        // Log it
        const sqLogRef = admin.firestore().collection("scoreLog").doc();
        batch.set(sqLogRef, {
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          groupId,
          sourceId: sideQuestId,
          points: sideQuestPoints,
          type: "SIDE_QUEST",
          awardedBy: request.auth.uid,
          awardedByRole: callerRole,
        });
      }

      // 3. UPDATE TOTAL SCORE (If we added any points)
      if (totalPointsToAdd > 0) {
        updateData.totalScore =
          admin.firestore.FieldValue.increment(totalPointsToAdd);
      }

      // Only run update if we actually have data to update
      if (Object.keys(updateData).length > 0) {
        batch.update(groupRef, updateData);
      }

      await batch.commit();
      return { success: true, message: "Scores submitted." };
    } catch (error: any) {
      console.error("Score error:", error);
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 13. LEAVE STATION (FOR SMs)
// ===================================================================
export const leaveStation = onCall(async (request: CallableRequest<void>) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Must be logged in.");

  const userRef = admin.firestore().collection("users").doc(request.auth.uid);
  const userDoc = await userRef.get();

  if (userDoc.data()?.role !== "SM")
    throw new HttpsError(
      "permission-denied",
      "Only SMs can perform this action."
    );

  try {
    // We use FieldValue.delete() to completely remove the field
    await userRef.update({
      selectedStationId: admin.firestore.FieldValue.delete(),
    });
    return { success: true, message: "Station un-selected." };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

// ===================================================================
// 14. CREATE GROUP
// ===================================================================
export const createGroup = onCall(
  async (request: CallableRequest<{ name: string }>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    if (callerDoc.data()?.role !== "ADMIN")
      throw new HttpsError("permission-denied", "Admin only.");

    const { name } = request.data;
    if (!name) throw new HttpsError("invalid-argument", "Name is required.");

    try {
      const ref = admin.firestore().collection("groups").doc();
      // Initialize with default game state
      await ref.set({
        name,
        status: "IDLE", // Default starting status
        totalScore: 0, // Start with 0 points
        completedStations: [], // No stations done yet
        completedSideQuests: [], // No quests done yet
      });
      return { success: true, id: ref.id };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 15. DELETE GROUP
// ===================================================================
export const deleteGroup = onCall(
  async (request: CallableRequest<{ id: string }>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    if (callerDoc.data()?.role !== "ADMIN")
      throw new HttpsError("permission-denied", "Admin only.");

    try {
      await admin
        .firestore()
        .collection("groups")
        .doc(request.data.id)
        .delete();
      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 16. ASSIGN OGL TO GROUP
// ===================================================================
export const assignOglToGroup = onCall(
  async (request: CallableRequest<{ userId: string; groupId: string }>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    if (callerDoc.data()?.role !== "ADMIN")
      throw new HttpsError("permission-denied", "Admin only.");

    const { userId, groupId } = request.data;
    // Allow passing null/empty groupId to "unassign" an OGL

    try {
      const batch = admin.firestore().batch();

      // 1. If we are assigning a new OGL, we might need to "unassign" the previous one for this group.
      // (This is a bit complex to do perfectly atomically without more reads,
      // so we'll trust the Admin UI to handle displaying it correctly for now).
      // A simpler way: We just update THIS user.

      const userRef = admin.firestore().collection("users").doc(userId);
      if (groupId) {
        batch.update(userRef, { groupId: groupId });
      } else {
        // If groupId is empty, we are unassigning
        batch.update(userRef, { groupId: admin.firestore.FieldValue.delete() });
      }

      await batch.commit();
      return { success: true, message: "OGL assigned." };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// HELPER: GET OGL'S GROUP ID SECURELY
// ===================================================================
async function getCallerGroupId(uid: string): Promise<string> {
  const userDoc = await admin.firestore().collection("users").doc(uid).get();
  if (userDoc.data()?.role !== "OGL") {
    throw new HttpsError(
      "permission-denied",
      "Only OGLs can perform this action."
    );
  }
  const groupId = userDoc.data()?.groupId;
  if (!groupId) {
    throw new HttpsError(
      "failed-precondition",
      "You are not assigned to a group."
    );
  }
  return groupId;
}

// ===================================================================
// 17. OGL START TRAVEL
// ===================================================================
export const oglStartTravel = onCall(
  async (request: CallableRequest<{ stationId: string; eta: string }>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");

    const groupId = await getCallerGroupId(request.auth.uid);
    const { stationId, eta } = request.data;

    if (!stationId || !eta)
      throw new HttpsError("invalid-argument", "Missing destination or ETA.");

    // Optional: Check if station is OPEN
    const stationDoc = await admin
      .firestore()
      .collection("stations")
      .doc(stationId)
      .get();
    if (stationDoc.data()?.status !== "OPEN") {
      throw new HttpsError(
        "failed-precondition",
        "Station is currently closed."
      );
    }

    try {
      const batch = admin.firestore().batch();

      // 1. Update Group Status
      batch.update(admin.firestore().collection("groups").doc(groupId), {
        status: "TRAVELING",
        destinationId: stationId,
        destinationEta: eta,
      });

      // 2. Increment Station's "Traveling" counter
      batch.update(admin.firestore().collection("stations").doc(stationId), {
        travelingCount: admin.firestore.FieldValue.increment(1),
      });

      await batch.commit();
      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 18. OGL ARRIVE AT STATION
// ===================================================================
export const oglArrive = onCall(async (request: CallableRequest<void>) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Must be logged in.");
  const groupId = await getCallerGroupId(request.auth.uid);

  const groupDoc = await admin
    .firestore()
    .collection("groups")
    .doc(groupId)
    .get();
  const currentDestination = groupDoc.data()?.destinationId;

  if (!currentDestination)
    throw new HttpsError("failed-precondition", "You have no destination.");

  try {
    const batch = admin.firestore().batch();

    // 1. Update Group Status
    batch.update(admin.firestore().collection("groups").doc(groupId), {
      status: "ARRIVED",
    });

    // 2. Move them from "Traveling" queue to "Arrived" queue
    const stationRef = admin
      .firestore()
      .collection("stations")
      .doc(currentDestination);
    batch.update(stationRef, {
      travelingCount: admin.firestore.FieldValue.increment(-1),
      arrivedCount: admin.firestore.FieldValue.increment(1),
    });

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

// ===================================================================
// 19. OGL DEPART (SKIP STATION)
// ===================================================================
export const oglDepart = onCall(async (request: CallableRequest<void>) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Must be logged in.");
  const groupId = await getCallerGroupId(request.auth.uid);

  const groupDoc = await admin
    .firestore()
    .collection("groups")
    .doc(groupId)
    .get();
  const currentStationId = groupDoc.data()?.destinationId;

  try {
    const batch = admin.firestore().batch();

    // 1. If they were at a station, remove them from the "Arrived" count
    if (groupDoc.data()?.status === "ARRIVED" && currentStationId) {
      batch.update(
        admin.firestore().collection("stations").doc(currentStationId),
        {
          arrivedCount: admin.firestore.FieldValue.increment(-1),
        }
      );
    }

    // 2. Reset group to IDLE
    batch.update(admin.firestore().collection("groups").doc(groupId), {
      status: "IDLE",
      destinationId: admin.firestore.FieldValue.delete(),
      destinationEta: admin.firestore.FieldValue.delete(),
    });

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

// ===================================================================
// 20. OGL TOGGLE LUNCH
// ===================================================================
export const oglToggleLunch = onCall(async (request: CallableRequest<void>) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Must be logged in.");
  const groupId = await getCallerGroupId(request.auth.uid);

  const groupDoc = await admin
    .firestore()
    .collection("groups")
    .doc(groupId)
    .get();
  const currentStatus = groupDoc.data()?.status;

  try {
    if (currentStatus === "ON_LUNCH") {
      await groupDoc.ref.update({ status: "IDLE" });
    } else if (currentStatus === "IDLE") {
      await groupDoc.ref.update({ status: "ON_LUNCH" });
    } else {
      throw new HttpsError(
        "failed-precondition",
        "Can only take lunch when IDLE."
      );
    }
    return { success: true };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});
