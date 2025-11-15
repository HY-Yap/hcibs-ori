import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";

// Set region for all v2 functions (asia-southeast1)
setGlobalOptions({ region: "asia-southeast1" });

type CallableRequest<T> = any;

admin.initializeApp();

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
  submissionUrl?: string; // <-- NEW
  textAnswer?: string; // <-- NEW
}

// add a local alias for readability using the admin SDK types
type QDoc = admin.firestore.QueryDocumentSnapshot;

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
    const role = callerDoc.data()?.role;
    if (role !== "SM" && role !== "ADMIN")
      throw new HttpsError(
        "permission-denied",
        "Unauthorized to update station status."
      );

    // Only require selectedStationId for SM role; admins may manage any station
    if (
      role === "SM" &&
      callerDoc.data()?.selectedStationId !== request.data.stationId
    ) {
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
// 12. SUBMIT SCORE (FIXED 'exists' syntax)
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
    if (callerRole !== "SM" && callerRole !== "ADMIN" && callerRole !== "OGL") {
      throw new HttpsError("permission-denied", "Unauthorized.");
    }

    const {
      groupId,
      points,
      type,
      id,
      adminNote,
      stationId,
      stationPoints,
      sideQuestId,
      sideQuestPoints,
      submissionUrl,
      textAnswer,
    } = request.data;
    if (!groupId) throw new HttpsError("invalid-argument", "Missing group ID.");

    // OGL SECURITY CHECK
    if (callerRole === "OGL") {
      if (groupId !== callerDoc.data()?.groupId)
        throw new HttpsError("permission-denied", "Wrong group.");

      const sId = stationId || (type === "STATION" ? id : null);

      if (type === "STATION" || sId) {
        const stationDoc = await admin
          .firestore()
          .collection("stations")
          .doc(sId!)
          .get();
        // --- THIS IS THE FIX ---
        // It's '.exists' (a property), NOT '.exists()' (a function)
        if (!stationDoc.exists || stationDoc.data()?.type !== "unmanned") {
          // -----------------------
          throw new HttpsError(
            "permission-denied",
            "OGLs can only self-score UNMANNED stations."
          );
        }
      }
    }

    try {
      const batch = admin.firestore().batch();
      const groupRef = admin.firestore().collection("groups").doc(groupId);
      let totalPointsToAdd = 0;
      const updateData: any = {};

      // Normalize inputs
      const sPoints = stationPoints ?? (type === "STATION" ? points : 0);
      const sqPoints = sideQuestPoints ?? (type === "SIDE_QUEST" ? points : 0);
      const sId = stationId ?? (type === "STATION" ? id : null);
      const sqId = sideQuestId ?? (type === "SIDE_QUEST" ? id : null);

      // 1. HANDLE STATION
      if (sPoints !== undefined && sPoints !== null && sPoints > 0 && sId) {
        totalPointsToAdd += sPoints;
        updateData.completedStations =
          admin.firestore.FieldValue.arrayUnion(sId);
        updateData.status = "IDLE";
        updateData.lastStationId = sId;
        updateData.destinationId = admin.firestore.FieldValue.delete();
        updateData.destinationEta = admin.firestore.FieldValue.delete();

        batch.update(admin.firestore().collection("stations").doc(sId), {
          arrivedCount: admin.firestore.FieldValue.increment(-1),
        });

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
          submissionUrl: submissionUrl || null,
          textAnswer: textAnswer || null,
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
          submissionUrl: submissionUrl || null,
          textAnswer: textAnswer || null,
        });
      }

      // 3. UPDATE TOTAL & TIME
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
    groups.docs.forEach((doc: QDoc) => {
      batch.update(doc.ref, {
        totalScore: 0,
        status: "IDLE",
        completedStations: [],
        completedSideQuests: [],
        destinationId: admin.firestore.FieldValue.delete(),
        destinationEta: admin.firestore.FieldValue.delete(),
        lastStationId: admin.firestore.FieldValue.delete(),
        lastScoreTimestamp: admin.firestore.FieldValue.delete(),
      });
    });

    // 2. Reset ALL Station Counters to 0
    const stations = await admin.firestore().collection("stations").get();
    stations.docs.forEach((doc: QDoc) => {
      batch.update(doc.ref, { travelingCount: 0, arrivedCount: 0 });
    });

    // 3. Delete ALL Score Logs
    const logs = await admin.firestore().collection("scoreLog").get();
    logs.docs.forEach((doc: QDoc) => {
      batch.delete(doc.ref);
    });

    // 4. NEW! Delete ALL Announcements
    const announcements = await admin
      .firestore()
      .collection("announcements")
      .get();
    announcements.docs.forEach((doc: QDoc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // Best-effort: delete submissions documents in Firestore (if any)
    try {
      const subsRef = admin.firestore().collection("submissions");
      const subsSnap = await subsRef.get();
      if (!subsSnap.empty) {
        const delBatch = admin.firestore().batch();
        subsSnap.docs.forEach((d) => delBatch.delete(d.ref));
        await delBatch.commit();
        console.log(
          "resetGame: deleted Firestore 'submissions' collection documents."
        );
      } else {
        console.log(
          "resetGame: no documents in 'submissions' collection to delete."
        );
      }
    } catch (err: any) {
      console.warn(
        "resetGame: failed to delete Firestore 'submissions' docs:",
        err?.message || err
      );
    }

    // Best-effort: delete all files under the submissions/ prefix in Cloud Storage
    try {
      const bucket = admin.storage().bucket();
      await bucket.deleteFiles({ prefix: "submissions/" });
      console.log("resetGame: deleted storage files under 'submissions/'");
    } catch (err: any) {
      console.warn(
        "resetGame: failed to delete storage files under 'submissions/':",
        err?.message || err
      );
    }

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
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    if (callerDoc.data()?.role !== "ADMIN")
      throw new HttpsError("permission-denied", "Admin only.");

    const { message } = request.data;
    if (!message)
      throw new HttpsError("invalid-argument", "Message is required.");

    try {
      await admin.firestore().collection("announcements").add({
        message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: request.auth.uid,
      });
      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 24. UPDATE USER PROFILE (Name & Username)
// ===================================================================
export const updateUserProfile = onCall(
  async (
    request: CallableRequest<{ displayName: string; username: string }>
  ) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");

    const { displayName, username } = request.data;
    if (!displayName || !username)
      throw new HttpsError("invalid-argument", "Name/Username required.");

    try {
      // 1. Update Auth profile (this is what updateProfile() does on client)
      await admin.auth().updateUser(request.auth.uid, { displayName });

      // 2. Update Firestore profile
      await admin.firestore().collection("users").doc(request.auth.uid).update({
        displayName,
        username,
      });

      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 25. UPDATE USER EMAIL
// ===================================================================
export const updateUserEmail = onCall(
  async (request: CallableRequest<{ email: string }>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");

    const { email } = request.data;
    if (!email) throw new HttpsError("invalid-argument", "Email is required.");

    try {
      // 1. Update Auth email
      await admin.auth().updateUser(request.auth.uid, { email });

      // 2. Update Firestore email
      await admin.firestore().collection("users").doc(request.auth.uid).update({
        email,
      });

      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 26. ADMIN MANUAL SCORE OVERRIDE
// ===================================================================
export const adminUpdateScore = onCall(
  async (
    request: CallableRequest<{
      groupId: string;
      points: number;
      reason: string;
    }>
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

    const { groupId, points, reason } = request.data;
    if (!groupId || points === undefined || !reason) {
      throw new HttpsError(
        "invalid-argument",
        "Group ID, points, and reason are required."
      );
    }

    if (points === 0) {
      throw new HttpsError("invalid-argument", "Points cannot be zero.");
    }

    try {
      const batch = admin.firestore().batch();
      const groupRef = admin.firestore().collection("groups").doc(groupId);

      // 1. Update the score (increment works for positive or negative numbers)
      batch.update(groupRef, {
        totalScore: admin.firestore.FieldValue.increment(points),
        lastScoreTimestamp: admin.firestore.FieldValue.serverTimestamp(), // Keep leaderboard fair
      });

      // 2. Log the correction for audit
      const logRef = admin.firestore().collection("scoreLog").doc();
      batch.set(logRef, {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        groupId,
        points,
        type: "ADMIN_CORRECTION",
        sourceId: "AdminOverride",
        awardedBy: request.auth.uid,
        awardedByRole: "ADMIN",
        note: reason,
      });

      await batch.commit();
      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 27. DELETE SUBMISSION (delete storage object + clear DB refs)
// ===================================================================
export const deleteSubmission = onCall(
  async (
    request: CallableRequest<{
      groupId: string;
      stationId?: string;
      submissionUrl: string;
    }>
  ) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");

    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    const callerRole = callerDoc.data()?.role;
    if (!["SM", "ADMIN", "OGL"].includes(callerRole))
      throw new HttpsError("permission-denied", "Unauthorized.");

    const { groupId, stationId, submissionUrl } = request.data;
    if (!groupId || !submissionUrl)
      throw new HttpsError(
        "invalid-argument",
        "groupId and submissionUrl required."
      );

    // OGL may only operate on their own group
    if (callerRole === "OGL" && groupId !== callerDoc.data()?.groupId)
      throw new HttpsError(
        "permission-denied",
        "OGL can only delete their group's submission."
      );

    try {
      // Parse storage path from download URL
      let pathPart: string | undefined;
      try {
        const url = new URL(submissionUrl);
        pathPart = url.pathname.split("/o/")[1]?.split("?")[0];
      } catch {
        pathPart = undefined;
      }
      if (!pathPart) {
        throw new HttpsError(
          "invalid-argument",
          "Could not parse Storage path from URL."
        );
      }
      const storagePath = decodeURIComponent(pathPart);

      // Delete storage object (uses default bucket)
      try {
        await admin.storage().bucket().file(storagePath).delete();
      } catch (err: any) {
        // If file not found, continue to clear DB refs; don't fail entirely for missing object
        console.warn(
          "deleteSubmission: storage delete failed or file missing:",
          err?.message || err
        );
      }

      // Clear submissionUrl / textAnswer fields in any matching scoreLog entries
      const logsQuery = admin
        .firestore()
        .collection("scoreLog")
        .where("groupId", "==", groupId)
        .where("submissionUrl", "==", submissionUrl);
      if (stationId) {
        // narrow by stationId when provided
        logsQuery.where("stationId", "==", stationId);
      }
      const logsSnap = await logsQuery.get();
      const batch = admin.firestore().batch();
      logsSnap.docs.forEach((doc) => {
        batch.update(doc.ref, {
          submissionUrl: admin.firestore.FieldValue.delete(),
          textAnswer: admin.firestore.FieldValue.delete(),
        });
      });
      if (!logsSnap.empty) await batch.commit();

      return { success: true, message: "Submission deleted." };
    } catch (error: any) {
      throw new HttpsError("internal", error.message || String(error));
    }
  }
);
