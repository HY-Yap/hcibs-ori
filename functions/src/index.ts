import {
  onCall,
  onRequest,
  HttpsError,
  CallableOptions,
} from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import archiver from "archiver"; // Default import for zipping!
import { file as makeTmpFile } from "tmp-promise"; // For temporary file storage
import * as fs from "fs";

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
  area?: string; // ADDED
  bonusType?: "none" | "early-bird" | "late-game";
  minPoints?: number; // ADDED
  maxPoints?: number; // ADDED
  points?: number;
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
  submissionUrl?: string;
  textAnswer?: string;
}

interface HouseData {
  name: string;
  color?: string;
}

// --- HELPER: SEND PUSH TO SPECIFIC STATION MASTER ---
const notifyStationMaster = async (stationId: string, message: string) => {
  console.log(`🔔 notifyStationMaster called for Station: ${stationId}`);
  try {
    // 1. Find the user who is an SM AND has selected this station
    const smQuery = await admin
      .firestore()
      .collection("users")
      .where("role", "==", "SM")
      .where("selectedStationId", "==", stationId)
      .get();

    console.log(`   Found ${smQuery.size} SM(s) assigned to this station.`);

    const tokens: string[] = [];
    smQuery.forEach((doc) => {
      const data = doc.data();
      if (data.fcmToken) {
        console.log(`   -> Found token for SM: ${data.displayName}`);
        tokens.push(data.fcmToken);
      } else {
        console.log(`   -> Found SM ${data.displayName}, but NO TOKEN.`);
      }
    });

    if (tokens.length > 0) {
      console.log(`   🚀 Sending push to ${tokens.length} tokens...`);
      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        data: {
          title: "Station Alert",
          body: message,
          url: "/sm",
        },
      });
      console.log(
        `   ✅ Success: ${response.successCount}, Failed: ${response.failureCount}`
      );
      if (response.failureCount > 0) {
        console.log(
          "   ❌ Failure details:",
          JSON.stringify(response.responses)
        );
      }
    } else {
      console.log("   ⚠️ No tokens found. Notification NOT sent.");
    }
  } catch (err) {
    console.error("   🔥 Failed to notify SM:", err);
  }
};

// --- HELPER: SEND PUSH TO OGLs OF A GROUP ---
const notifyGroup = async (groupId: string, message: string) => {
  console.log(`🔔 notifyGroup called for Group: ${groupId}`);
  try {
    const oglQuery = await admin
      .firestore()
      .collection("users")
      .where("role", "==", "OGL")
      .where("groupId", "==", groupId)
      .get();

    console.log(`   Found ${oglQuery.size} OGL(s) assigned to this group.`);

    const tokens: string[] = [];
    oglQuery.forEach((doc) => {
      const data = doc.data();
      if (data.fcmToken) {
        console.log(`   -> Found token for OGL: ${data.displayName}`);
        tokens.push(data.fcmToken);
      } else {
        console.log(`   -> Found OGL ${data.displayName}, but NO TOKEN.`);
      }
    });

    if (tokens.length > 0) {
      console.log(`   🚀 Sending push to ${tokens.length} tokens...`);
      await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        data: {
          title: "New Message",
          body: message,
          url: "/ogl/journey",
        },
      });
      console.log("   ✅ Notification sent.");
    } else {
      console.log("   ⚠️ No tokens found. Notification NOT sent.");
    }
  } catch (err) {
    console.error("   🔥 Failed to notify Group:", err);
  }
};

// --- HELPER: SEND PUSH TO SPECIFIC USER ---
const notifyUser = async (uid: string, message: string, url: string) => {
  console.log(`🔔 notifyUser called for UID: ${uid}`);
  try {
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    const data = userDoc.data();
    if (data?.fcmToken) {
      console.log(`   🚀 Sending push to ${data.displayName}...`);
      await admin.messaging().send({
        token: data.fcmToken,
        data: {
          title: "New Message",
          body: message,
          url: url,
        },
      });
      console.log("   ✅ Notification sent.");
    } else {
      console.log("   ⚠️ No token found for user.");
    }
  } catch (err) {
    console.error("   🔥 Failed to notify user:", err);
  }
};

// --- HELPER: SEND PUSH TO ALL ADMINS ---
const notifyAdmins = async (message: string, url: string) => {
  console.log("🔔 notifyAdmins called");
  try {
    const adminQuery = await admin
      .firestore()
      .collection("users")
      .where("role", "==", "ADMIN")
      .get();

    const tokens: string[] = [];
    adminQuery.forEach((doc) => {
      const data = doc.data();
      if (data.fcmToken) {
        tokens.push(data.fcmToken);
      }
    });

    if (tokens.length > 0) {
      console.log(`   🚀 Sending push to ${tokens.length} admins...`);
      await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        data: {
          title: "New Help Request",
          body: message,
          url: url,
        },
      });
      console.log("   ✅ Notifications sent.");
    } else {
      console.log("   ⚠️ No admin tokens found.");
    }
  } catch (err) {
    console.error("   🔥 Failed to notify admins:", err);
  }
};

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
        points: request.data.points || 0,
        minPoints: request.data.minPoints || request.data.points || 0, // ADDED
        maxPoints: request.data.maxPoints || request.data.points || 0, // ADDED
        area: request.data.area || "Others", // ADDED
        bonusType: request.data.bonusType || "none",
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
      const { id, name, type, description, location, area, bonusType, minPoints, maxPoints } = request.data; // ADDED area
      await admin
        .firestore()
        .collection("stations")
        .doc(id)
        .update({
          name,
          type,
          description,
          location,
          area: area || "Others", // ADDED
          bonusType: bonusType || "none",
          points: request.data.points || 0,
          minPoints: minPoints || request.data.points || 0, // ADDED
          maxPoints: maxPoints || request.data.points || 0, // ADDED
        });
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
// 12. SUBMIT SCORE (UPDATED: Handle Manned vs Unmanned Stations)
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
      points, // Custom points (for manned stations by SM/ADMIN)
      type,
      id,
      adminNote,
      stationId,
      sideQuestId,
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
        if (!stationDoc.exists || stationDoc.data()?.type !== "unmanned") {
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
      const groupDoc = await groupRef.get();
      const groupData = groupDoc.data();

      let totalPointsToAdd = 0;
      const updateData: any = {};

      // Normalize IDs
      const sId = stationId ?? (type === "STATION" ? id : null);
      const sqId = sideQuestId ?? (type === "SIDE_QUEST" ? id : null);

      // --- HANDLE POINTS LOGIC: MANNED vs UNMANNED ---
      let sPoints = 0;
      let sqPoints = 0;
      let isPending = false;
      let isStageOneCompletion = false; // ADDED

      // Lifted variables for scope access
      let stationData: any = null;
      let isManned = false;

      if (sId) {
        const stationDoc = await admin
          .firestore()
          .collection("stations")
          .doc(sId)
          .get();
        stationData = stationDoc.data();
        const stationName = stationData?.name;
        isManned = stationData?.type === "manned";
        const hasSecondStage = stationData?.hasSecondStage;
        
        // 1. Determine Area
        const areaName = stationData?.area || "Others";

        // 2. Determine Prerequisites (All manned stations in this area)
        // Fetch all stations to find prerequisites dynamically
        const allStationsSnap = await admin.firestore().collection("stations").get();
        const allStations = allStationsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        
        const areaStations = allStations.filter(s => (s.area || "Others") === areaName);
        const prereqStations = areaStations.filter(s => s.type === "manned");
        const prereqIds = prereqStations.map(s => s.id);

        // 3. Check if Prerequisites are met
        const completedIds = new Set(groupData?.completedStations || []);
        // Add current station to completed set for the check (if it's one of them)
        completedIds.add(sId);
        
        const arePrereqsMet = prereqIds.every(pid => completedIds.has(pid));

        // 4. Calculate Points & Handle Pending Logic
        if (isManned && (callerRole === "SM" || callerRole === "ADMIN")) {
          // Manned stations always get points immediately
          sPoints = points || 0;
          
          // If this manned station completes the prereqs, release pending points!
          if (arePrereqsMet) {
            const pendingStations = groupData?.pendingStations || [];
            if (pendingStations.length > 0) {
              // Filter pending stations that belong to THIS area
              // We can use the allStations array we already fetched
              const pendingInArea = allStations.filter(s => 
                pendingStations.includes(s.id) && (s.area || "Others") === areaName
              );
              
              for (const pData of pendingInArea) {
                  const releasedPoints = pData.points || 50;
                  totalPointsToAdd += releasedPoints;
                  
                  // Log the release
                  const releaseLogRef = admin.firestore().collection("scoreLog").doc();
                  batch.set(releaseLogRef, {
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    groupId,
                    stationId: pData.id,
                    sourceId: pData.id,
                    points: releasedPoints,
                    type: "STATION",
                    awardedBy: "SYSTEM",
                    awardedByRole: "SYSTEM",
                    note: `Points released upon completion of ${stationName}`,
                  });

                  // NEW: Check for pending bonus
                  const pendingBonus = groupData?.pendingBonuses?.[pData.id];
                  if (pendingBonus) {
                      totalPointsToAdd += pendingBonus.points;
                      
                      const bonusReleaseLogRef = admin.firestore().collection("scoreLog").doc();
                      batch.set(bonusReleaseLogRef, {
                          timestamp: admin.firestore.FieldValue.serverTimestamp(),
                          groupId,
                          stationId: pData.id,
                          sourceId: pData.id,
                          points: pendingBonus.points,
                          type: "STATION",
                          awardedBy: "SYSTEM",
                          awardedByRole: "SYSTEM",
                          note: `Points awarded as part of the ${pendingBonus.name} Bonus (Released)`,
                      });
                      
                      // Remove from pendingBonuses
                      updateData[`pendingBonuses.${pData.id}`] = admin.firestore.FieldValue.delete();
                  }

                  // Remove from pending
                  updateData.pendingStations = admin.firestore.FieldValue.arrayRemove(pData.id);
              }
            }
          }

        } else {
          // Unmanned Station
          // 2nd Stage Logic
          const stageOneCompleted = groupData?.stageOneCompletedStations?.includes(sId);
          
          if (hasSecondStage && !stageOneCompleted) {
            // Completing Stage 1
            sPoints = 0;
            isStageOneCompletion = true;
            updateData.stageOneCompletedStations = admin.firestore.FieldValue.arrayUnion(sId);
          } else {
            // Completing Stage 2 OR Single Stage
            if (arePrereqsMet) {
              sPoints = stationData?.points || 50;
            } else {
              // Prereqs NOT met -> Pending
              sPoints = 0;
              isPending = true;
              updateData.pendingStations = admin.firestore.FieldValue.arrayUnion(sId);
            }
          }
        }
      }

      if (sqId) {
        const sqDoc = await admin
          .firestore()
          .collection("sideQuests")
          .doc(sqId)
          .get();
        const sqData = sqDoc.data();
        const isSmManaged = sqData?.isSmManaged;
        const hasSecondStage = sqData?.hasSecondStage; // ADDED
        
        if (isSmManaged && (callerRole === "SM" || callerRole === "ADMIN")) {
          // For SM-managed side quests: SM/ADMIN can set custom points
          sqPoints = points || 0;
        } else {
          // For regular side quests
          // ADDED: 2nd Stage Logic
          const stageOneCompleted = groupData?.stageOneCompletedSideQuests?.includes(sqId);

          if (hasSecondStage && !stageOneCompleted) {
             // Completing Stage 1
             sqPoints = 0;
             isStageOneCompletion = true;
             updateData.stageOneCompletedSideQuests = admin.firestore.FieldValue.arrayUnion(sqId);
          } else {
             // Completing Stage 2 OR Single Stage
             sqPoints = sqData?.points || 0;
          }
        }
      }
      // ------------------------------------------------------------

      // 1. HANDLE STATION
      if (sId) { // Always process if sId exists
        // MODIFIED: Only mark as fully completed if NOT just stage 1
        if (!isStageOneCompletion) {
            // --- BONUS LOGIC ---
            const bonusType = stationData?.bonusType || "none";
            if (bonusType !== "none") {
                const now = new Date();
                const sgTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Singapore" }));
                const hours = sgTime.getHours();
                const minutes = sgTime.getMinutes();
                const isBefore330 = hours < 15 || (hours === 15 && minutes < 30);
                
                let bonusPoints = 0;
                let bonusName = "";
                
                if (bonusType === "early-bird") {
                    if (isBefore330) {
                        bonusPoints = stationData?.type === "manned" ? 150 : 100;
                        bonusName = "Early-Bird";
                    }
                } else if (bonusType === "late-game") {
                    if (!isBefore330) {
                        bonusPoints = stationData?.type === "manned" ? 200 : 100;
                        bonusName = "Late-Game";
                    }
                }
                
                if (bonusPoints > 0) {
                    if (isPending) {
                        // Store pending bonus
                        if (!groupData?.pendingBonuses) {
                             updateData.pendingBonuses = {
                                 [sId]: { points: bonusPoints, name: bonusName }
                             };
                        } else {
                             updateData[`pendingBonuses.${sId}`] = { points: bonusPoints, name: bonusName };
                        }
                    } else {
                        totalPointsToAdd += bonusPoints;
                        
                        const bonusLogRef = admin.firestore().collection("scoreLog").doc();
                        batch.set(bonusLogRef, {
                          timestamp: admin.firestore.FieldValue.serverTimestamp(),
                          groupId,
                          stationId: sId,
                          sourceId: sId,
                          points: bonusPoints,
                          type: "STATION",
                          awardedBy: "SYSTEM",
                          awardedByRole: "SYSTEM",
                          note: `Points awarded as part of the ${bonusName} Bonus`,
                        });
                    }
                }
            }
            // -------------------

            totalPointsToAdd += sPoints;
            updateData.completedStations = admin.firestore.FieldValue.arrayUnion(sId);
            updateData.status = "IDLE";
            updateData.lastStationId = sId;
            updateData.destinationId = admin.firestore.FieldValue.delete();
            updateData.destinationEta = admin.firestore.FieldValue.delete();

            batch.update(admin.firestore().collection("stations").doc(sId), {
              arrivedCount: admin.firestore.FieldValue.increment(-1),
            });
        }

        const logRef = admin.firestore().collection("scoreLog").doc();
        batch.set(logRef, {
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          groupId,
          stationId: sId,
          sourceId: sId,
          points: sPoints, 
          type: "STATION",
          awardedBy: request.auth.uid,
          awardedByRole: callerRole,
          note: isStageOneCompletion ? "Stage 1 Completed" : (isPending ? "Pending Prerequisites" : (adminNote || "")),
          submissionUrl: submissionUrl || null,
          textAnswer: textAnswer || null,
        });
      }

      // 2. HANDLE SIDE QUEST
      if (sqId) { // MODIFIED: Process even if points 0 (for stage 1)
        if (!isStageOneCompletion) {
            totalPointsToAdd += sqPoints;
            updateData.completedSideQuests = admin.firestore.FieldValue.arrayUnion(sqId);
        }
        
        const sqLogRef = admin.firestore().collection("scoreLog").doc();
        batch.set(sqLogRef, {
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          groupId,
          sourceId: sqId,
          points: sqPoints,
          type: "SIDE_QUEST",
          awardedBy: request.auth.uid,
          awardedByRole: callerRole,
          note: isStageOneCompletion ? "Stage 1 Completed" : "",
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
      return { success: true, message: isStageOneCompletion ? "Proceed to 2nd Stage." : (isPending ? "Station completed. Points pending prerequisites." : "Scores submitted.") };
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
// 17. OGL START TRAVEL (UPDATED WITH CHAT)
// ===================================================================
export const oglStartTravel = onCall(
  async (request: CallableRequest<{ stationId: string; eta: string }>) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");

    // Helper logic inlined for transaction safety scope
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    if (userDoc.data()?.role !== "OGL") throw new HttpsError("permission-denied", "Only OGLs.");
    const groupId = userDoc.data()?.groupId;
    if (!groupId) throw new HttpsError("failed-precondition", "No group assigned.");

    const { stationId, eta } = request.data;
    if (!stationId || !eta) throw new HttpsError("invalid-argument", "Missing data.");

    try {
      // START ATOMIC TRANSACTION
      await db.runTransaction(async (t) => {
        // 1. READ: Get fresh data for Station and Group
        // (We MUST do reads before writes in a transaction)
        const stationRef = db.collection("stations").doc(stationId);
        const groupRef = db.collection("groups").doc(groupId);
        
        const stationSnap = await t.get(stationRef);
        const groupSnap = await t.get(groupRef);

        if (!stationSnap.exists) throw new HttpsError("not-found", "Station not found.");
        const sData = stationSnap.data();
        const targetArea = sData?.area || "Others"; // ADDED

        // 2. LOGIC CHECKS (The "Gatekeeper")
        if (sData?.status !== "OPEN") {
             throw new HttpsError("failed-precondition", "Station is closed.");
        }
        
        // --- THE RACE CONDITION FIX ---
        // We check the LIVE count inside the frozen transaction
        const currentTraffic = sData?.travelingCount || 0;
        const MAX_GROUPS = 3; // Hard limit

        if (currentTraffic >= MAX_GROUPS) {
            throw new HttpsError("resource-exhausted", "Station is full! Please choose another.");
        }

        // --- NEW: AREA CAPACITY CHECK (RACE CONDITION FIX) ---
        if (targetArea !== "Others") {
            // Query all stations in this area within the transaction
            const areaQuery = db.collection("stations").where("area", "==", targetArea);
            const areaSnaps = await t.get(areaQuery);
            
            let currentAreaOccupancy = 0;
            areaSnaps.forEach(doc => {
                const d = doc.data();
                // Sum up traveling + arrived for each station in the area
                currentAreaOccupancy += (d.travelingCount || 0) + (d.arrivedCount || 0);
            });

            const MAX_AREA_GROUPS = 8;
            if (currentAreaOccupancy >= MAX_AREA_GROUPS) {
                 throw new HttpsError("resource-exhausted", `Area '${targetArea}' is full (8/8 groups)!`);
            }
        }

        // Check if group is already busy (prevent double-clicking)
        if (groupSnap.data()?.status === 'TRAVELING') {
            throw new HttpsError("failed-precondition", "You are already traveling!");
        }

        // 3. WRITES (If we passed the checks)
        
        // Update Group
        t.update(groupRef, {
          status: 'TRAVELING', 
          destinationId: stationId, 
          destinationEta: eta,
        });

        // Update Station Count
        t.update(stationRef, {
            travelingCount: admin.firestore.FieldValue.increment(1)
        });

        // Setup Chat
        const chatId = `chat_${groupId}_${stationId}`;
        const chatRef = db.collection("chats").doc(chatId);
        t.set(chatRef, {
            groupId,
            stationId,
            groupName: groupSnap.data()?.name || "Group",
            stationName: sData?.name || "Station",
            isActive: true,
            lastMessage: "Trip started",
            lastMessageTime: admin.firestore.FieldValue.serverTimestamp(),
            unreadCountSM: 1,
            unreadCountOGL: 0
        }, { merge: true });

        // Announcement
        const message = `${groupSnap.data()?.name} is heading towards your station (ETA: ${eta}).`;
        const announceRef = db.collection("announcements").doc();
        t.set(announceRef, {
          message: message,
          targets: [`SM:${stationId}`], 
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: "SYSTEM",
        });
      });

      // 4. NON-TRANSACTIONAL ACTIONS (Push Notifications)
      // These happen only if the transaction succeeds
      // We reconstruct the message since we can't export it from the transaction easily
      const groupName = (await db.collection("groups").doc(groupId).get()).data()?.name;
      const msg = `${groupName} is heading towards your station (ETA: ${eta}).`;
      await notifyStationMaster(stationId, msg);

      return { success: true };
      
    } catch (error: any) {
      // If the transaction failed (e.g. station full), we catch it here
      console.error("Travel error:", error);
      // Pass the specific error (like "Station is full") back to the frontend
      throw new HttpsError(error.code || "internal", error.message);
    }
  }
);

// ===================================================================
// 18. OGL ARRIVE (UPDATED WITH CHAT)
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

    // CLOSE CHAT (NEW!)
    const chatId = `chat_${groupId}_${currentDestination}`;
    batch.update(admin.firestore().collection("chats").doc(chatId), {
      isActive: false,
    });

    // Announcement
    const groupName = groupDoc.data()?.name;
    const message = `${groupName} has ARRIVED at your station.`;
    const announceRef = admin.firestore().collection("announcements").doc();
    batch.set(announceRef, {
      message: message,
      targets: [`SM:${currentDestination}`],
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: "SYSTEM",
    });

    await batch.commit();
    await notifyStationMaster(currentDestination, message);

    return { success: true };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

// ===================================================================
// 19. OGL DEPART (UPDATED WITH CHAT)
// ===================================================================
export const oglDepart = onCall(async (request: CallableRequest<void>) => {
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
      lastStationId: currentStationId,
      destinationId: admin.firestore.FieldValue.delete(),
      destinationEta: admin.firestore.FieldValue.delete(),
    });

    // CLOSE CHAT (NEW!)
    if (currentStationId) {
      const chatId = `chat_${groupId}_${currentStationId}`;
      // Check if exists first to avoid crash if no chat was started
      const chatRef = admin.firestore().collection("chats").doc(chatId);
      const chatDoc = await chatRef.get();
      if (chatDoc.exists) {
        batch.update(chatRef, { isActive: false });
      }
    }

    // Notify SM
    if (currentStationId) {
      const groupName = groupDoc.data()?.name;
      const message = `${groupName} has LEFT the station.`;
      const announceRef = admin.firestore().collection("announcements").doc();
      batch.set(announceRef, {
        message: message,
        targets: [`SM:${currentStationId}`],
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: "SYSTEM",
      });
      await batch.commit();
      await notifyStationMaster(currentStationId, message);
    } else {
      await batch.commit();
    }

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

    // 5. NEW! Delete ALL Chats
    const chats = await admin.firestore().collection("chats").get();
    chats.docs.forEach((doc: QDoc) => {
      // Note: Subcollections (messages) don't delete automatically in Firestore
      // A true recursive delete is hard in a simple loop,
      // but invalidating the parent 'chat' doc usually breaks the UI link enough for testing.
      // For production, use the Firebase CLI to delete collections if they get huge.
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
// 23. MAKE ANNOUNCEMENT (FIXED: DATA-ONLY PAYLOAD)
// ===================================================================
export const makeAnnouncement = onCall(
  async (request: CallableRequest<{ message: string; targets?: string[] }>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    if (callerDoc.data()?.role !== "ADMIN")
      throw new HttpsError("permission-denied", "Admin only.");

    const { message, targets } = request.data;
    if (!message)
      throw new HttpsError("invalid-argument", "Message is required.");

    const finalTargets =
      targets && targets.length > 0 ? targets : ["OGL", "SM", "ADMIN", "GUEST"];

    try {
      // 1. Save to Firestore
      await admin.firestore().collection("announcements").add({
        message,
        targets: finalTargets,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: request.auth.uid,
      });

      // 2. SEND PUSH NOTIFICATIONS
      const usersSnap = await admin
        .firestore()
        .collection("users")
        .where("role", "in", finalTargets)
        .get();

      const uniqueTokens = new Set<string>();

      usersSnap.forEach((doc) => {
        const data = doc.data();
        if (data.fcmToken) {
          uniqueTokens.add(data.fcmToken);
        }
      });

      const tokens = Array.from(uniqueTokens);

      if (tokens.length > 0) {
        // --- DATA-ONLY PAYLOAD ---
        // By NOT including the 'notification' key, we prevent the
        // browser from showing a duplicate automatic notification.
        const payload = {
          tokens: tokens,
          data: {
            title: "HCIBSO Amazing Race",
            body: message,
            url: "/", // Open the app
          },
        };

        const response = await admin.messaging().sendEachForMulticast(payload);
        console.log(
          `Sent to ${tokens.length} devices. Success: ${response.successCount}`
        );
      }

      return { success: true };
    } catch (error: any) {
      console.error("Announcement Error:", error);
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

      // 2. Log with type "ADMIN" (CHANGED)
      const logRef = admin.firestore().collection("scoreLog").doc();
      batch.set(logRef, {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        groupId,
        points,
        type: "OVERRIDE",
        sourceId: "ADMIN",
        awardedBy: request.auth.uid,
        awardedByRole: "ADMIN",
        note: reason,
      });

      await batch.commit();
      // 3. Create announcement for the affected group and send push
      const verb = points > 0 ? "added" : "deducted";
      const prep = points > 0 ? "to" : "from";
      const magnitude = Math.abs(points);
      const groupDoc = await admin.firestore().collection("groups").doc(groupId).get();
      const groupName = groupDoc.data()?.name || "Your group";
      const message = `An admin has ${verb} ${magnitude} points ${prep} ${groupName} for ${reason}`;

      await admin.firestore().collection("announcements").add({
        message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        targets: ["OGL"],
        groupId,
        createdBy: request.auth.uid,
        type: "ADMIN_SCORE_UPDATE",
      });

      // Push notification to OGLs of this group
      await notifyGroup(groupId, message);

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

// ===================================================================
// 28. CONVERT HEIC SUBMISSION SERVER-SIDE
// ===================================================================
export const convertHeicSubmission = onCall(
  async (request: CallableRequest<{ submissionUrl: string }>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");

    const { submissionUrl } = request.data;
    if (!submissionUrl)
      throw new HttpsError("invalid-argument", "submissionUrl required.");

    try {
      // parse storage path from download URL
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

      const bucket = admin.storage().bucket();
      const file = bucket.file(storagePath);
      const [exists] = await file.exists();
      if (!exists) {
        throw new HttpsError("not-found", "Source file not found in storage.");
      }

      // download original
      const [buffer] = await file.download();

      // dynamic require of sharp (so deployment fails only if dependency missing)
      let sharp: any;
      try {
        sharp = require("sharp");
      } catch (err) {
        throw new HttpsError(
          "failed-precondition",
          "Server conversion dependency missing. Run `npm install sharp` in functions/ and redeploy."
        );
      }

      // Convert to JPEG
      const jpegBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();

      // Save converted file next to original with .jpg extension
      const newPath = storagePath.replace(/\.[^/.]+$/, "") + ".jpg";
      const newFile = bucket.file(newPath);
      await newFile.save(jpegBuffer, {
        metadata: { contentType: "image/jpeg" },
      });

      // Make the new file readable — generate signed URL (long lived)
      const [signedUrl] = await newFile.getSignedUrl({
        action: "read",
        expires: "03-09-2491", // adjust if you want different expiry
      });

      return { success: true, url: signedUrl, storagePath: newPath };
    } catch (error: any) {
      console.error("convertHeicSubmission error:", error);
      throw new HttpsError("internal", error.message || String(error));
    }
  }
);

// ===================================================================
// 29. ZIP TASK SUBMISSIONS (SECURE V2)
// ===================================================================
export const zipTaskSubmissions = onCall(
  // V2 Options: We can set timeout/memory right here!
  {
    timeoutSeconds: 540,
    memory: "1GiB",
    region: "asia-southeast1",
  },
  async (request: CallableRequest<{ taskId: string; taskName: string }>) => {
    // 1. AUTH CHECK (Now works perfectly because it's onCall)
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    if (callerDoc.data()?.role !== "ADMIN") {
      throw new HttpsError("permission-denied", "Admin only.");
    }

    const { taskId, taskName } = request.data;
    if (!taskId)
      throw new HttpsError("invalid-argument", "taskId is required.");

    console.log(`Starting ZIP for task ${taskId} (${taskName})`);

    try {
      // 2. FETCH LOGS (Your logic)
      // Note: We query for stationId AND sourceId to catch both stations and side quests
      const qStation = admin
        .firestore()
        .collection("scoreLog")
        .where("stationId", "==", taskId)
        .where("submissionUrl", "!=", null);
      const qQuest = admin
        .firestore()
        .collection("scoreLog")
        .where("sourceId", "==", taskId)
        .where("submissionUrl", "!=", null);

      const [stationLogs, questLogs] = await Promise.all([
        qStation.get(),
        qQuest.get(),
      ]);
      const allLogs = [...stationLogs.docs, ...questLogs.docs];

      // Deduplicate by submissionUrl to be safe
      const uniqueUrls = new Set<string>();
      const submissions = [];

      for (const doc of allLogs) {
        const data = doc.data();
        if (data.submissionUrl && !uniqueUrls.has(data.submissionUrl)) {
          uniqueUrls.add(data.submissionUrl);
          submissions.push(data);
        }
      }

      if (submissions.length === 0) {
        throw new HttpsError("not-found", "No files to zip.");
      }

      // 3. CREATE TEMP FILE
      const { path: tmpZipPath, cleanup } = await makeTmpFile({
        postfix: ".zip",
      });
      const output = fs.createWriteStream(tmpZipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.pipe(output);

      const bucket = admin.storage().bucket();
      let filesAdded = 0;

      // 4. ADD FILES TO ZIP
      for (const sub of submissions) {
        try {
          const url = new URL(sub.submissionUrl);
          // Extract path from URL (works for standard Firebase Storage URLs)
          const pathPart = url.pathname.split("/o/")[1]?.split("?")[0];

          if (pathPart) {
            const storagePath = decodeURIComponent(pathPart);
            const file = bucket.file(storagePath);

            // Download file buffer
            const [buffer] = await file.download();

            // Create a nice folder structure inside the zip: "GroupName/filename.jpg"
            // (We use groupId if name isn't readily available to save a read)
            const fileName = `${sub.groupId}/${storagePath.split("/").pop()}`;

            archive.append(buffer, { name: fileName });
            filesAdded++;
          }
        } catch (e: any) {
          console.warn(`Skipping file ${sub.submissionUrl}:`, e.message);
        }
      }

      await archive.finalize();
      await new Promise<void>((resolve, reject) => {
        output.on("close", resolve);
        output.on("error", reject);
        archive.on("error", reject);
      });

      // 5. UPLOAD ZIP
      const safeTaskName = taskName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      // Add timestamp to prevent name collisions
      const zipPath = `zips/${safeTaskName}_${taskId}_${Date.now()}.zip`;
      const zipFile = bucket.file(zipPath);

      await zipFile.save(fs.readFileSync(tmpZipPath), {
        metadata: { contentType: "application/zip" },
      });

      // Clean up temp file
      cleanup();

      // 6. GENERATE SECURE SIGNED URL (Expires in 15 mins)
      // This replaces makePublic()
      const [signedUrl] = await zipFile.getSignedUrl({
        action: "read",
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      });

      return { success: true, url: signedUrl };
    } catch (error: any) {
      console.error("Zip Error:", error);
      throw new HttpsError(
        "internal",
        error.message || "Zip generation failed"
      );
    }
  }
);

// ===================================================================
// 30. GET USER EMAIL FROM USERNAME (for Login)
// ===================================================================
export const getUserEmailFromUsername = onCall(
  async (request: CallableRequest<{ username: string }>) => {
    const { username } = request.data;
    if (!username)
      throw new HttpsError("invalid-argument", "Username is required.");

    try {
      // Use ADMIN SDK methods (not client SDK)
      const userSnapshot = await admin
        .firestore()
        .collection("users")
        .where("username", "==", username)
        .limit(1)
        .get();

      // Check if we found a user
      if (userSnapshot.empty) {
        throw new HttpsError("not-found", "No user found with that username.");
      }

      // Return the user's email
      const userData = userSnapshot.docs[0].data();
      if (!userData.email) {
        throw new HttpsError("internal", "User found, but email is missing.");
      }

      return { email: userData.email };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 31. PUBLIC LEADERBOARD (UPDATED FOR HOUSES)
// ===================================================================
let leaderboardCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 5000; // 5 seconds

export const getPublicLeaderboard = onRequest(
  { cors: true },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      const now = Date.now();
      if (leaderboardCache && now - leaderboardCache.timestamp < CACHE_TTL) {
        res.json(leaderboardCache.data);
        return;
      }

      // Fetch everything in parallel
      const [groupsSnap, housesSnap, configSnap] = await Promise.all([
        admin.firestore().collection("groups").get(),
        admin.firestore().collection("houses").get(),
        admin.firestore().collection("game").doc("config").get(),
      ]);

      const isHouseEnabled = configSnap.data()?.houseSystemEnabled || false;

      // 1. Process Groups
      const groups = groupsSnap.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        totalScore: doc.data().totalScore || 0,
        houseId: doc.data().houseId,
        lastScoreTimestamp: doc.data()?.lastScoreTimestamp,
      }));

      // Sort Groups: Score DESC, Time ASC (Earlier time wins ties)
      groups.sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        const timeA = a.lastScoreTimestamp?.toMillis() || 0;
        const timeB = b.lastScoreTimestamp?.toMillis() || 0;
        return timeA - timeB;
      });

      // 2. Process Houses (if enabled)
      let houses: any[] = [];
      if (isHouseEnabled) {
        const houseMap: Record<string, any> = {};
        // Init houses
        housesSnap.forEach((h) => {
          houseMap[h.id] = {
            id: h.id,
            name: h.data().name,
            color: h.data().color,
            totalScore: 0,
          };
        });
        // Sum scores from groups
        groups.forEach((g) => {
          if (g.houseId && houseMap[g.houseId]) {
            houseMap[g.houseId].totalScore += g.totalScore;
          }
        });
        // Convert to array and sort
        houses = Object.values(houseMap).sort(
          (a, b) => b.totalScore - a.totalScore
        );
      }

      // 3. Send Response
      const responseData = {
        groups: groups.map(({ id, name, totalScore }) => ({
          id,
          name,
          totalScore,
        })),
        houses,
        isHouseEnabled,
      };

      leaderboardCache = { data: responseData, timestamp: now };
      res.json(responseData);
    } catch (error: any) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  }
);

// ===================================================================
// HOUSE SYSTEM FUNCTIONS
// ===================================================================

// 32. CREATE HOUSE
export const createHouse = onCall(
  async (request: CallableRequest<{ name: string; color: string }>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
    if (callerDoc.data()?.role !== "ADMIN")
      throw new HttpsError("permission-denied", "Admin only.");

    const { name, color } = request.data;
    if (!name) throw new HttpsError("invalid-argument", "Name is required.");

    try {
      const ref = admin.firestore().collection("houses").doc();
      await ref.set({
        name,
        color: color || "#000000",
        totalPoints: 0, // Future proofing for leaderboard
      });
      return { success: true, id: ref.id };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// 33. DELETE HOUSE (And un-assign groups)
export const deleteHouse = onCall(
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

    const houseId = request.data.id;
    try {
      const batch = admin.firestore().batch();

      // 1. Delete the house
      const houseRef = admin.firestore().collection("houses").doc(houseId);
      batch.delete(houseRef);

      // 2. Unassign all groups currently in this house
      const groupsSnap = await admin
        .firestore()
        .collection("groups")
        .where("houseId", "==", houseId)
        .get();
      groupsSnap.docs.forEach((doc) => {
        batch.update(doc.ref, { houseId: admin.firestore.FieldValue.delete() });
      });

      await batch.commit();
      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// 34. ASSIGN GROUP TO HOUSE
export const assignGroupToHouse = onCall(
  async (
    request: CallableRequest<{ groupId: string; houseId: string | null }>
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

    const { groupId, houseId } = request.data;
    try {
      const groupRef = admin.firestore().collection("groups").doc(groupId);
      if (houseId) {
        await groupRef.update({ houseId });
      } else {
        await groupRef.update({ houseId: admin.firestore.FieldValue.delete() });
      }
      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// 35. TOGGLE HOUSE SYSTEM
export const toggleHouseSystem = onCall(
  async (request: CallableRequest<{ enabled: boolean }>) => {
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
      await admin.firestore().collection("game").doc("config").set(
        {
          houseSystemEnabled: request.data.enabled,
        },
        { merge: true }
      );
      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// 36. UPDATE HOUSE
export const updateHouse = onCall(
  async (
    request: CallableRequest<{ id: string; name: string; color: string }>
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

    const { id, name, color } = request.data;
    if (!id || !name)
      throw new HttpsError("invalid-argument", "ID and Name required.");

    try {
      await admin
        .firestore()
        .collection("houses")
        .doc(id)
        .update({
          name,
          color: color || "#000000",
        });
      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 37. DELETE ALL ANNOUNCEMENTS (ADMIN ONLY)
// ===================================================================
export const deleteAllAnnouncements = onCall(
  async (request: CallableRequest<void>) => {
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
      const snapshot = await admin
        .firestore()
        .collection("announcements")
        .get();

      if (snapshot.empty) {
        return { success: true, message: "No announcements to delete." };
      }

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return {
        success: true,
        message: `Deleted ${snapshot.size} announcements.`,
      };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 38. DELETE SINGLE ANNOUNCEMENT (ADMIN ONLY)
// ===================================================================
export const deleteAnnouncement = onCall(
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
        .collection("announcements")
        .doc(request.data.id)
        .delete();
      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 38. SEND CHAT MESSAGE (NEW!)
// ===================================================================
export const sendChatMessage = onCall(
  async (request: CallableRequest<{ chatId: string; message: string }>) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Must be logged in.");
    const { chatId, message } = request.data;
    if (!chatId || !message)
      throw new HttpsError("invalid-argument", "Missing data.");

    try {
      const chatRef = admin.firestore().collection("chats").doc(chatId);
      const chatDoc = await chatRef.get();
      if (!chatDoc.exists) throw new HttpsError("not-found", "Chat not found.");

      const chatData = chatDoc.data();
      // Determine sender role based on Auth
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(request.auth.uid)
        .get();
      const senderRole = userDoc.data()?.role;

      if (senderRole !== "SM" && senderRole !== "OGL" && senderRole !== "ADMIN") {
        throw new HttpsError("permission-denied", "Unauthorized.");
      }

      const batch = admin.firestore().batch();

      // 1. Add Message
      const msgRef = chatRef.collection("messages").doc();
      batch.set(msgRef, {
        text: message,
        senderId: request.auth.uid,
        senderRole: senderRole,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 2. Update Parent Chat (Counters & Last Message)
      const updateData: any = {
        lastMessage: message,
        lastMessageTime: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (chatData?.type === "REQUEST") {
        // --- HELP REQUEST CHAT ---
        if (senderRole === "ADMIN") {
          const requesterUid = chatData.requesterUid;
          const requesterDoc = await admin.firestore().collection("users").doc(requesterUid).get();
          const requesterRole = requesterDoc.data()?.role;
          
          if (requesterRole === "OGL") {
            updateData.unreadCountOGL = admin.firestore.FieldValue.increment(1);
          } else if (requesterRole === "SM") {
            updateData.unreadCountSM = admin.firestore.FieldValue.increment(1);
          }
          
          await notifyUser(requesterUid, `Admin: ${message}`, requesterRole === "OGL" ? "/ogl" : "/sm");
        } else {
          // Requester sent message to Admin
          await notifyAdmins(
            `Message from ${chatData?.requesterName}: ${message}`,
            "/admin/requests"
          );
        }
      } else {
        // --- STANDARD CHAT (OGL <-> SM) ---
        if (senderRole === "OGL") {
          updateData.unreadCountSM = admin.firestore.FieldValue.increment(1);
          await notifyStationMaster(
            chatData?.stationId,
            `New message from ${chatData?.groupName}: ${message}`
          );
        } else if (senderRole === "SM") {
          updateData.unreadCountOGL = admin.firestore.FieldValue.increment(1);
          await notifyGroup(
            chatData?.groupId,
            `New message from ${chatData?.stationName}: ${message}`
          );
        } else if (senderRole === "ADMIN") {
          // Admin intervening
          updateData.unreadCountOGL = admin.firestore.FieldValue.increment(1);
          updateData.unreadCountSM = admin.firestore.FieldValue.increment(1);
        }
      }

      batch.update(chatRef, updateData);
      await batch.commit();

      return { success: true };
    } catch (error: any) {
      throw new HttpsError("internal", error.message);
    }
  }
);

// ===================================================================
// 38.5. NOTIFY ADMINS ON NEW REQUEST
// ===================================================================
export const onRequestCreated = onDocumentCreated("requests/{requestId}", async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const title = data.title || "No Title";
  const sender = data.sentByName || "Someone";
  
  await notifyAdmins(
    `${sender} needs help: ${title}`,
    "/admin/requests"
  );
});

// ===================================================================
// 39. PUBLIC GAME INFO (For Guests)
// ===================================================================
// Cache for 60 seconds to save money and speed up loading
let gameInfoCache: { data: any; timestamp: number } | null = null;
const INFO_CACHE_TTL = 60000; 

export const getPublicGameInfo = onRequest(
  { cors: true, region: "asia-southeast1" },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      const now = Date.now();
      if (gameInfoCache && now - gameInfoCache.timestamp < INFO_CACHE_TTL) {
        res.json(gameInfoCache.data);
        return;
      }

      // Fetch Stations and Side Quests in parallel
      const [stationsSnap, questsSnap] = await Promise.all([
        admin.firestore().collection("stations").get(),
        admin.firestore().collection("sideQuests").get()
      ]);
      // Process Stations
      const stations = stationsSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          type: data.type,
          points: data.points || 50,
          minPoints: data.minPoints || data.points || 50, // ADDED
          maxPoints: data.maxPoints || data.points || 50, // ADDED
          location: data.location,
          area: data.area,
          bonusType: data.bonusType || "none",
          
          // LOGIC: If data.description is "" (or null/undefined), use the default.
          // Otherwise, use the text from the DB.
          description: data.description || "Game will be conducted by the Station Master."
        };
      }).sort((a, b) => a.name.localeCompare(b.name));
      // Process Side Quests
      const sideQuests = questsSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          points: data.points || 50,
          description: data.description,
          isSmManaged: data.isSmManaged,
          submissionType: data.submissionType
        };
      }).sort((a, b) => a.name.localeCompare(b.name));

      const responseData = { stations, sideQuests };
      gameInfoCache = { data: responseData, timestamp: now };
      
      res.json(responseData);

    } catch (error: any) {
      console.error("Error fetching game info:", error);
      res.status(500).json({ error: "Failed to load game info" });
    }
  }
);
