// zulu_time.js
import { db } from './firebase.js';
import { ref, set } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

/* -----------------------------------------------
   🔹 Update Global Zulu Time in Firebase
   Uses current UTC time and updates every minute
-------------------------------------------------- */
async function updateGlobalZuluTime() {
  // Get current UTC time as ISO string
  const utcTime = new Date().toISOString(); // automatically in UTC, ends with Z

  try {
    await set(ref(db, 'zulu_time'), utcTime);
//    console.log(`✅ Global Zulu time updated: ${utcTime}`);
  } catch (error) {
//    console.error('❌ Failed to update global zulu_time:', error);
  }
}

// Run immediately
updateGlobalZuluTime();

// Repeat every 10 seconds
setInterval(updateGlobalZuluTime,  10000);
