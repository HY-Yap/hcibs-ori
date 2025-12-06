// ===================================================================
// 🔥 FIREBASE FUNCTIONS WARM-UP SCRIPT
// ===================================================================
// Run this 10 minutes before the event starts, and every 5-10 mins during lulls.
// Usage: node scripts/warmup.mjs

const PROJECT_ID = "hcibso"; // Your Project ID
const REGION = "asia-southeast1"; // Your Region

// The critical list of functions to wake up
const FUNCTIONS = [
  // --- TIER 1: CRITICAL (Immediate UX) ---
  "getUserEmailFromUsername", // Login speed
  "oglStartTravel",           // OGL gameplay loop
  "oglArrive",                // OGL gameplay loop
  "submitScore",              // Scoring (Heavy function)
  "getPublicLeaderboard",     // Guest view
  "makeAnnouncement",         // Emergency comms
  "sendChatMessage",          // Chat latency
  
  // --- TIER 2: HIGH PRIORITY (Operational) ---
  "oglDepart",
  "oglToggleLunch",
  "setStation",
  "updateStationStatus",
  "toggleGameStatus",
  "deleteSubmission"          // OGL fix workflow
];

async function warmUp(functionName) {
  const url = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${functionName}`;
  
  try {
    // We send a POST request with empty data.
    // This will trigger the function container to load.
    // It will almost certainly return 401 (Unauthenticated) or 400 (Bad Request).
    // THAT IS GOOD! It means the code loaded and rejected us.
    const startTime = Date.now();
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: {} }),
    });

    const duration = Date.now() - startTime;
    const status = response.status;
    
    // 401/403 means "I am awake, but you are not logged in." -> SUCCESS
    // 200 means "I am awake and it worked." -> SUCCESS
    // 500/503 means "I crashed." -> FAIL
    
    const isAwake = status !== 500 && status !== 503 && status !== 404;
    const icon = isAwake ? "✅" : "❌";
    
    console.log(`${icon} ${functionName.padEnd(25)} | Status: ${status} | Time: ${duration}ms`);

  } catch (error) {
    console.error(`❌ ${functionName.padEnd(25)} | Network Error: ${error.message}`);
  }
}

console.log(`\n🔥 Warming up ${FUNCTIONS.length} functions for ${PROJECT_ID}...\n`);

// Run all pings in parallel
await Promise.all(FUNCTIONS.map(warmUp));

console.log(`\n✨ Warm-up complete. System is hot.`);

// ===================================================================
// run in terminal: node scripts/warmup.mjs
// ===================================================================
