// auto_reader_status.js
import { db } from './firebase.js';
import { ref, get, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

/* ---------------------------------------------------------
Reader Status Monitor (Based on last_update)
   Structure:
   readers
        reader_no1
            last_update
            status

   zulu_time  <-- top-level, used as reference

    Behavior:
   - Checks all readers every 10 seconds.
   - If last_update is "" or missing → Offline.
   - If last_update is older than 30 seconds compared to zulu_time → Offline.
   - Else → Online.
--------------------------------------------------------- */

const OFFLINE_THRESHOLD_MS = 30 * 1000; // 30 seconds

async function updateReaderStatus() {
  try {
    // Get zulu_time from database
    const zuluSnapshot = await get(ref(db, 'zulu_time'));
    if (!zuluSnapshot.exists()) {
//      console.warn("⚠️ No zulu_time found in database. Skipping status update.");
      return;
    }
    const zuluTimeStr = zuluSnapshot.val();
    const referenceTime = new Date(zuluTimeStr);

    if (isNaN(referenceTime.getTime())) {
//      console.error("❌ Invalid zulu_time format in database:", zuluTimeStr);
      return;
    }

    // Get all readers
    const snapshot = await get(ref(db, 'readers'));
    if (!snapshot.exists()) {
//      console.log("⚠️ No readers found.");
      return;
    }

    const readers = snapshot.val();
    const updates = {};

    for (const readerNo in readers) {
      const reader = readers[readerNo];
      const lastUpdate = reader?.last_update;

      // If no timestamp or blank -> Offline
      if (!lastUpdate || lastUpdate.trim() === "") {
        updates[`readers/${readerNo}/status`] = "Offline";
        continue;
      }

      // Compare last_update to zulu_time
      const lastSeen = new Date(lastUpdate);
      if (isNaN(lastSeen.getTime())) {
//        console.warn(`⚠️ Invalid last_update for reader ${readerNo}: ${lastUpdate}`);
        updates[`readers/${readerNo}/status`] = "Offline";
        continue;
      }

      const diffMs = referenceTime - lastSeen;
      updates[`readers/${readerNo}/status`] = diffMs > OFFLINE_THRESHOLD_MS ? "Offline" : "Online";
    }

    // Apply updates in one batch
    await update(ref(db), updates);
//   console.log(` Reader statuses updated based on zulu_time: ${zuluTimeStr}`);

  } catch (error) {
//    console.error("❌ Error updating reader statuses:", error);
  }
}

/* ---------------------------------------------------------
   ⏱️ Run automatically every 10 seconds
--------------------------------------------------------- */
updateReaderStatus(); // Run immediately
setInterval(updateReaderStatus, 10 * 1000); // Repeat every 10s
