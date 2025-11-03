import { db } from './firebase.js';
import { ref, get, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// References
const bookUnitsRef = ref(db, 'book_unit');
const readersRef = ref(db, 'readers');
const bookMetadataRef = ref(db, 'book_metadata');

// Update book locations
async function updateBookLocations() {
  try {
    const [unitsSnap, readersSnap, metasSnap] = await Promise.all([
      get(bookUnitsRef),
      get(readersRef),
      get(bookMetadataRef)
    ]);

    const units = unitsSnap.val() || {};
    const readers = readersSnap.val() || {};
    const metas = metasSnap.val() || {};

    // Build tag_uid -> reader location map
    const tagLocationMap = {};
    Object.values(readers).forEach(reader => {
      if (!reader) return;
      if (reader.tag_uid) tagLocationMap[reader.tag_uid] = reader.location;
      if (reader.tag_uids && typeof reader.tag_uids === "object") {
        Object.values(reader.tag_uids).forEach(tag => {
          if (tag) tagLocationMap[tag] = reader.location;
        });
      }
    });

    // Loop through all book units
    for (const bookUid in units) {
      const book = units[bookUid];
      if (!book || book.status !== "Available") continue; // Only available books

      const meta = metas[book.metadata_id] || {};
      const preferredLoc = meta.preferred_location || 'N/A';
      const currentTag = book.tag_uid;
      const readerLoc = tagLocationMap[currentTag] || 'Not Found';

      if (book.location !== readerLoc) {
        const bookRef = ref(db, `book_unit/${bookUid}`);
        await update(bookRef, { location: readerLoc });
        console.log(`Updated ${bookUid}: location = ${readerLoc}`);
      }
    }
  } catch (err) {
    console.error("Error updating book locations:", err);
  }
}

// Initial run
updateBookLocations();

// Auto-update every 30 seconds
setInterval(updateBookLocations, 3000);
