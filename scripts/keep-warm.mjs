// ===================================================================
// 🔥 AUTOMATED FIREBASE WARM-UP LOOP
// ===================================================================
// Usage: node scripts/keep-warm.mjs
// Press Ctrl + C to stop.

const PROJECT_ID = "hcibso";
const REGION = "asia-southeast1";
const INTERVAL_MINUTES = 2; // Run every 10 minutes

// The critical list (Same as warmup.mjs)
const FUNCTIONS = [
  "getUserEmailFromUsername",
  "oglStartTravel",
  "oglArrive",
  "submitScore",
  "getPublicLeaderboard",
  "makeAnnouncement",
  "sendChatMessage",
  "oglDepart",
  "oglToggleLunch",
  "setStation",
  "updateStationStatus",
  "toggleGameStatus",
  "deleteSubmission"
];

async function pingFunction(functionName) {
  const url = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${functionName}`;
  try {
    const startTime = Date.now();
    // Send dummy request
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: {} }),
    });
    const duration = Date.now() - startTime;
    return { name: functionName, status: response.status, time: duration };
  } catch (error) {
    return { name: functionName, error: error.message };
  }
}

async function runWarmupCycle() {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`\n[${timestamp}] 🔥 Warming up ${FUNCTIONS.length} functions...`);

  const results = await Promise.all(FUNCTIONS.map(pingFunction));

  // Print a summary line
  const successCount = results.filter(r => !r.error).length;
  console.log(`   ✅ Pings sent: ${successCount}/${FUNCTIONS.length}`);
  
  // Optional: Print details if anything took > 1000ms (Cold Start detected)
  const slowFunctions = results.filter(r => r.time > 1000);
  if (slowFunctions.length > 0) {
    console.log("   🥶 Cold starts detected (and fixed):");
    slowFunctions.forEach(r => console.log(`      - ${r.name}: ${r.time}ms`));
  }
}

// --- MAIN LOOP ---
console.log(`
==================================================
    🚀 AUTOMATED WARM-UP SYSTEM ACTIVATED
    Target: ${PROJECT_ID}
    Interval: Every ${INTERVAL_MINUTES} minutes
    Control: Press Ctrl + C to STOP
==================================================
`);

// Run immediately on start
runWarmupCycle();

// Set interval loop
setInterval(runWarmupCycle, INTERVAL_MINUTES * 60 * 1000);