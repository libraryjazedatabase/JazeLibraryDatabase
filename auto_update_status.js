// autoUpdate.js
import { db, auth } from './firebase.js';
import { ref, get, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

/* -----------------------------------------------
   Auto Update Borrow Statuses (Global Runner)
   Runs automatically, but only if user is logged in.
   Only one browser tab performs the updates.
-------------------------------------------------- */

// Helper: check if the tab is active
function isActiveTab() {
  localStorage.setItem("autoUpdateLeader", Date.now().toString());
  const latest = parseInt(localStorage.getItem("autoUpdateLeader") || "0");
  return Date.now() - latest < 2000; // within 2 seconds = leader
}

//auto update status function
async function autoUpdateStatuses() {
  // Only run if this tab is the "leader"
  if (!isActiveTab()) return;

  const historySnap = await get(ref(db, "borrow_history"));
  if (!historySnap.exists()) return;

  const updates = {};
  const now = new Date();

    // Library rules
  const closingHour = 18; // 6PM
  const outsideLimitDays = 7; // 7 days limit for outside borrowing

  // Loop through each book_uid
  historySnap.forEach(bookSnap => {
    const bookUID = bookSnap.key;

    // Loop through each history_no
    bookSnap.forEach(recordSnap => {
      const historyNo = recordSnap.key;
      const data = recordSnap.val();

      const borrowDate = data.borrow_date ? new Date(data.borrow_date) : null;

      const returnDate =
        data.return_date && data.return_date.trim() !== ""
          ? new Date(data.return_date)
          : null

      const location = (data.location || "").toLowerCase();

      // Skip if no data found
      if (!borrowDate) return;


      // -------------------- DETERMINE DUE DATE --------------------
      // Convert borrowDate to local time for accurate comparison:
const borrowLocal = borrowDate;     // already local PH time
const returnLocal = returnDate;     // already local PH time
const nowLocal = new Date();        // already local PH time

      const thirtyDaysAgo = new Date(nowLocal);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);


      const dueDate = new Date(borrowLocal);

      if (location === "inside") {
        // Due today at 6 PM local time
        dueDate.setHours(closingHour, 0, 0, 0);
      } else {
        // Outside books: +7 days at 6 PM local time
        dueDate.setDate(dueDate.getDate() + outsideLimitDays);
        dueDate.setHours(closingHour, 0, 0, 0);
      }

// DEBUG LOGS
//console.log("---- Checking Record ----");
//console.log("Raw Borrow Date:", data.borrow_date);
//console.log("Borrow Date (Local):", borrowLocal);
//console.log("Return Date (Local):", returnLocal);
//console.log("Now Local:", nowLocal);
//console.log("Location:", location);
//console.log("Due Date:", dueDate);

      // Skip updates for recent Returned/Late
if (returnLocal && (data.status === "Returned" || data.status === "Late")) {
    if (returnLocal >= thirtyDaysAgo) return;
}


      // -------------------- DETERMINE CURRENT STATUS --------------------
let newStatus = data.status || "Borrowed";

if (!returnLocal) {
    newStatus = nowLocal > dueDate ? "Overdue" : "Borrowed";
} else {
    newStatus = returnLocal > dueDate ? "Late" : "Returned";
}


      // -------------------- Add to update list if status changed --------------------
      if (newStatus !== data.status) {
        updates[`borrow_history/${bookUID}/${historyNo}/status`] = newStatus;
      }
    });
  });

  // -------------------- Apply all updates --------------------
  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
     console.log(`✅ Borrow statuses updated successfully. (${Object.keys(updates).length} records changed)`);
  }
}

// -------------------- Auto-Run When User Is Logged In --------------------
auth.onAuthStateChanged(user => {
  if (user) {
    console.log("👤 User logged in. Starting auto-updater...");
    // Run immediately once logged in
    autoUpdateStatuses();
    // Then repeat every 30 seconds
    setInterval(autoUpdateStatuses, 3000);
  } else {
    console.log("⚠️ User not logged in. Auto-updater disabled.");
  }
});

// -------------------- Refresh Leader Status When Tab Focuses --------------------
window.addEventListener("focus", () => {
  localStorage.setItem("autoUpdateLeader", Date.now().toString());
});
