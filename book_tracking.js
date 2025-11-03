// book_tracking.js
import { db } from "./firebase.js";
import { ref, onValue, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

export function startLocationTracking() {
  let readersData = {};
  let bookUnitsData = {};
  let metasData = {};

  // -------------------- REAL-TIME LISTENERS --------------------
  onValue(ref(db, "readers"), (snapshot) => {
    readersData = snapshot.val() || {};
    updateLocations();
  });

  onValue(ref(db, "book_unit"), (snapshot) => {
    bookUnitsData = snapshot.val() || {};
    updateLocations();
  });

  onValue(ref(db, "book_metadata"), (snapshot) => {
    metasData = snapshot.val() || {};
  });

  // -------------------- UPDATE LOCATIONS --------------------
  function updateLocations() {
    if (!bookUnitsData || !readersData) return;

    Object.entries(bookUnitsData).forEach(([bookUID, bookInfo]) => {
      const tagUID = bookInfo.tag_uid;
      let newLocation = "Not Found";
      let found = false;

      if (tagUID) {
        for (const [readerId, readerInfo] of Object.entries(readersData)) {
          // Case 1: multiple tag_uids
          if (readerInfo.tag_uids && Object.values(readerInfo.tag_uids).includes(tagUID)) {
            newLocation = readerInfo.location || readerId;
            found = true;
            break;
          }
          // Case 2: single tag_uid
          if (readerInfo.tag_uid && readerInfo.tag_uid === tagUID) {
            newLocation = readerInfo.location || readerId;
            found = true;
            break;
          }
        }
      }

      const updatesObj = {};
      if (bookInfo.location !== newLocation) {
        updatesObj.location = newLocation;
        if (found) updatesObj.last_seen = newLocation;
      }

      // If not found by any reader, check status first
      if (!found) {
        const meta = metasData[bookInfo.metadata_id] || {};
        const preferredLoc = meta.preferred_location || null;

        // check book status before marking "Not Found"
        if (bookInfo.status === "Not Available") {
          updatesObj.location = "Borrowed";
//          console.log(`Book ${bookUID} marked as Borrowed.`);
        } else if (bookInfo.status === "Available") {
          updatesObj.location = "Not Found";
//          console.log(`Book ${bookUID} not found on any reader.`);
        }

        updatesObj.last_seen = bookInfo.last_seen || preferredLoc;
      }


      if (Object.keys(updatesObj).length > 0) {
        update(ref(db, `book_unit/${bookUID}`), updatesObj);
      }
    });
  }

  // -------------------- REMOVED PERIODIC FALLBACK --------------------
  // ❌ Removed autoUpdateLocations() and setInterval() to prevent repeated DB loops.
  // The system now relies purely on real-time Firebase updates for efficiency.
}
