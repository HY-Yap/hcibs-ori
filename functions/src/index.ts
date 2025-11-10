import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";

admin.initializeApp();
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
interface SideQuestData {
  id?: string;
  name: string;
  description: string;
  points: number;
  submissionType: "photo" | "video" | "none";
  isSmManaged: boolean;
}
interface ScoreData {
  groupId: string;
  adminNote?: string;
  type?: "STATION" | "SIDE_QUEST";
  id?: string;
  points?: number;
  stationId?: string;
  stationPoints?: number;
  sideQuestId?: string;
  sideQuestPoints?: number;
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
// 6. CREATE SIDE QUEST
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
// 7. DELETE SIDE QUEST
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
// 8. UPDATE SIDE QUEST
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

    try {
      const { id, ...data } = request.data;
      await admin.firestore().collection("sideQuests").doc(id).update(data);
      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 9. UPDATE STATION
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

    try {
      const { id, name, type, description, location } = request.data;
      await admin
        .firestore()
        .collection("stations")
        .doc(id)
        .update({ name, type, description, location });
      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 10. SET STATION (FOR SM LOGIN)
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
// 12. SUBMIT SCORE (FIXED: Updates Queue Count & Last Location)
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
    if (callerRole !== "SM" && callerRole !== "ADMIN" && callerRole !== "OGL")
      throw new HttpsError("permission-denied", "Unauthorized.");

    const {
      groupId,
      stationId,
      stationPoints,
      adminNote,
      sideQuestId,
      sideQuestPoints,
      type,
      id,
      points,
    } = request.data;

    // OGL Security Check
    if (callerRole === "OGL") {
      if (groupId !== callerDoc.data()?.groupId)
        throw new HttpsError("permission-denied", "Wrong group.");
      if (type === "STATION" || stationId)
        throw new HttpsError(
          "permission-denied",
          "OGLs cannot self-score stations."
        );
    }

    if (!groupId) throw new HttpsError("invalid-argument", "Missing group ID.");

    try {
      const batch = admin.firestore().batch();
      const groupRef = admin.firestore().collection("groups").doc(groupId);
      let totalPointsToAdd = 0;
      const updateData: any = {};

      const sPoints = stationPoints ?? (type === "STATION" ? points : 0);
      const sqPoints = sideQuestPoints ?? (type === "SIDE_QUEST" ? points : 0);
      const sId = stationId ?? (type === "STATION" ? id : null);
      const sqId = sideQuestId ?? (type === "SIDE_QUEST" ? id : null);

      // 1. HANDLE STATION SCORING
      if (sPoints !== undefined && sPoints !== null && sPoints > 0 && sId) {
        totalPointsToAdd += sPoints;
        updateData.completedStations =
          admin.firestore.FieldValue.arrayUnion(sId);
        updateData.status = "IDLE";
        // --- FIX 1: Save where they just were ---
        updateData.lastStationId = sId;
        // ---------------------------------------
        updateData.destinationId = admin.firestore.FieldValue.delete();
        updateData.destinationEta = admin.firestore.FieldValue.delete();

        // --- FIX 2: Decrement the station's 'arrived' count! ---
        batch.update(admin.firestore().collection("stations").doc(sId), {
          arrivedCount: admin.firestore.FieldValue.increment(-1),
        });
        // -------------------------------------------------------

        const logRef = admin.firestore().collection("scoreLog").doc();
        batch.set(logRef, {
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          groupId,
          stationId: sId,
          points: sPoints,
          type: "STATION",
          awardedBy: request.auth.uid,
          awardedByRole: callerRole,
          note: adminNote || "",
        });
      }

      // 2. HANDLE SIDE QUEST
      if (sqPoints !== undefined && sqPoints !== null && sqPoints > 0 && sqId) {
        totalPointsToAdd += sqPoints;
        updateData.completedSideQuests =
          admin.firestore.FieldValue.arrayUnion(sqId);
        const sqLogRef = admin.firestore().collection("scoreLog").doc();
        batch.set(sqLogRef, {
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          groupId,
          sourceId: sqId,
          points: sqPoints,
          type: "SIDE_QUEST",
          awardedBy: request.auth.uid,
          awardedByRole: callerRole,
        });
      }

      if (totalPointsToAdd > 0) {
        updateData.totalScore =
          admin.firestore.FieldValue.increment(totalPointsToAdd);
        updateData.lastScoreTimestamp =
          admin.firestore.FieldValue.serverTimestamp();
      }

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
// 13. LEAVE STATION
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
    await userRef.update({
      selectedStationId: admin.firestore.FieldValue.delete(),
    });
    return { success: true };
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

    try {
      const ref = admin.firestore().collection("groups").doc();
      await ref.set({
        name: request.data.name,
        status: "IDLE",
        totalScore: 0,
        completedStations: [],
        completedSideQuests: [],
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
  async (
    request: CallableRequest<{ userId: string; groupId: string | null }>
  ) => {
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
      const userRef = admin
        .firestore()
        .collection("users")
        .doc(request.data.userId);
      if (request.data.groupId) {
        await userRef.update({ groupId: request.data.groupId });
      } else {
        await userRef.update({ groupId: admin.firestore.FieldValue.delete() });
      }
      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 17. OGL START TRAVEL
// ===================================================================
export const oglStartTravel = onCall(
  async (request: CallableRequest<{ stationId: string; eta: string }>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");

    // Helper logic inlined for simplicity/safety in this full file replacement
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    if (userDoc.data()?.role !== "OGL")
      throw new HttpsError("permission-denied", "Only OGLs.");
    const groupId = userDoc.data()?.groupId;
    if (!groupId)
      throw new HttpsError("failed-precondition", "No group assigned.");

    const { stationId, eta } = request.data;
    if (!stationId || !eta)
      throw new HttpsError("invalid-argument", "Missing data.");

    const stationDoc = await admin
      .firestore()
      .collection("stations")
      .doc(stationId)
      .get();
    if (stationDoc.data()?.status !== "OPEN")
      throw new HttpsError("failed-precondition", "Station closed.");

    try {
      const batch = admin.firestore().batch();
      batch.update(admin.firestore().collection("groups").doc(groupId), {
        status: "TRAVELING",
        destinationId: stationId,
        destinationEta: eta,
      });
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
// 18. OGL ARRIVE
// ===================================================================
export const oglArrive = onCall(async (request: CallableRequest<void>) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Must be logged in.");
  const userDoc = await admin
    .firestore()
    .collection("users")
    .doc(request.auth.uid)
    .get();
  if (userDoc.data()?.role !== "OGL")
    throw new HttpsError("permission-denied", "Only OGLs.");
  const groupId = userDoc.data()?.groupId;

  const groupDoc = await admin
    .firestore()
    .collection("groups")
    .doc(groupId)
    .get();
  const currentDestination = groupDoc.data()?.destinationId;
  if (!currentDestination)
    throw new HttpsError("failed-precondition", "No destination.");

  try {
    const batch = admin.firestore().batch();
    batch.update(admin.firestore().collection("groups").doc(groupId), {
      status: "ARRIVED",
    });
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
// 19. OGL DEPART (FIXED: Updates Last Location)
// ===================================================================
export const oglDepart = onCall(async (request: CallableRequest<void>) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Must be logged in.");
  // ... (getCallerGroupId helper logic here if you didn't use the standalone function) ...
  const userDoc = await admin
    .firestore()
    .collection("users")
    .doc(request.auth.uid)
    .get();
  if (userDoc.data()?.role !== "OGL")
    throw new HttpsError("permission-denied", "Only OGLs.");
  const groupId = userDoc.data()?.groupId;
  // ...

  const groupDoc = await admin
    .firestore()
    .collection("groups")
    .doc(groupId)
    .get();
  const currentStationId = groupDoc.data()?.destinationId;

  try {
    const batch = admin.firestore().batch();
    if (groupDoc.data()?.status === "ARRIVED" && currentStationId) {
      batch.update(
        admin.firestore().collection("stations").doc(currentStationId),
        {
          arrivedCount: admin.firestore.FieldValue.increment(-1),
        }
      );
    }
    batch.update(admin.firestore().collection("groups").doc(groupId), {
      status: "IDLE",
      // --- FIX 3: Save where they departed from ---
      lastStationId: currentStationId,
      // -------------------------------------------
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
  const userDoc = await admin
    .firestore()
    .collection("users")
    .doc(request.auth.uid)
    .get();
  if (userDoc.data()?.role !== "OGL")
    throw new HttpsError("permission-denied", "Only OGLs.");
  const groupId = userDoc.data()?.groupId;

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
      throw new HttpsError("failed-precondition", "Can only lunch when IDLE.");
    }
    return { success: true };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

// ===================================================================
// 21. TOGGLE GAME STATUS (START / STOP)
// ===================================================================
export const toggleGameStatus = onCall(
  async (request: CallableRequest<{ status: "RUNNING" | "STOPPED" }>) => {
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
      // We use 'merge: true' so we don't accidentally overwrite other future config settings
      await admin.firestore().collection("game").doc("config").set(
        {
          status: request.data.status,
        },
        { merge: true }
      );
      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 22. RESET GAME (DANGER ZONE - WIPES ALL PROGRESS)
// ===================================================================
export const resetGame = onCall(async (request: CallableRequest<void>) => {
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
    const batch = admin.firestore().batch();

    // 1. Reset ALL Groups to 0
    const groups = await admin.firestore().collection("groups").get();
    groups.docs.forEach((doc) => {
      batch.update(doc.ref, {
        totalScore: 0,
        status: "IDLE",
        completedStations: [],
        completedSideQuests: [],
        // Remove all travel/location data
        destinationId: admin.firestore.FieldValue.delete(),
        destinationEta: admin.firestore.FieldValue.delete(),
        lastStationId: admin.firestore.FieldValue.delete(),
        lastScoreTimestamp: admin.firestore.FieldValue.delete(),
      });
    });

    // 2. Reset ALL Station Counters to 0
    const stations = await admin.firestore().collection("stations").get();
    stations.docs.forEach((doc) => {
      batch.update(doc.ref, { travelingCount: 0, arrivedCount: 0 });
    });

    // 3. Delete ALL Score Logs
    const logs = await admin.firestore().collection("scoreLog").get();
    logs.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // NOTE: Firestore batches handle up to 500 operations.
    // If you have more than 500 groups+stations+logs combined during testing,
    // this might fail and need a more complex "chunked" delete.
    // For now, this should be fine for testing.
    await batch.commit();

    return { success: true, message: "Game has been COMPLETELY reset." };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

// ===================================================================
// 23. MAKE ANNOUNCEMENT (ADMIN ONLY)
// ===================================================================
export const makeAnnouncement = onCall(
  async (request: CallableRequest<{ message: string }>) => {
    
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
  const callerDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== "ADMIN") throw new HttpsError("permission-denied", "Admin only.");

  const { message } = request.data;
  if (!message) throw new HttpsError("invalid-argument", "Message is required.");

  try {
    await admin.firestore().collection("announcements").add({
      message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: request.auth.uid
    });
    return { success: true };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});
