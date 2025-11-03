// latest_history.js
import { db } from './firebase.js';
import { ref, get, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

async function updateLatestHistory() {
  try {
    const historyRef = ref(db, 'borrow_history');
    const snapshot = await get(historyRef);

    if (!snapshot.exists()) {
      console.log("⚠️ No borrow history found.");
      return;
    }

    const historyData = snapshot.val();
    const updates = {};

    for (const book_uid in historyData) {
      const bookHistory = historyData[book_uid];
      let latestNum = null;

      // Find all history keys 
      const historyKeys = Object.keys(bookHistory).filter(k => k.startsWith('history_'));
      if (historyKeys.length === 0) {
        updates[`borrow_history/${book_uid}/latest_history`] = 0;
        continue;
      }

      // First, look for any history with empty or missing return_date
      let openHistoryNum = null;
      for (const key of historyKeys) {
        const historyEntry = bookHistory[key];
        const hasReturnDate = historyEntry && historyEntry.return_date && historyEntry.return_date.trim() !== "";
        if (!hasReturnDate) {
          // Found one with no return_date
          openHistoryNum = parseInt(key.replace('history_', ''));
          break;
        }
      }

      if (openHistoryNum) {
        latestNum = openHistoryNum; // unreturned book
      } else {
        // 2️⃣ If all have return_date, fallback to highest number
        const numbers = historyKeys.map(k => parseInt(k.replace('history_', ''))).filter(n => !isNaN(n));
        latestNum = Math.max(...numbers);
      }

      updates[`borrow_history/${book_uid}/latest_history`] = latestNum ? latestNum : 0;
    }

    await update(ref(db), updates);
//    console.log("✅ Latest history updated in Firebase:", updates);

  } catch (error) {
//    console.error("❌ Error updating latest history:", error);
  }
}

// Run once immediately
updateLatestHistory();

// Repeat every 3 seconds (you can adjust this)
setInterval(updateLatestHistory, 3000);
