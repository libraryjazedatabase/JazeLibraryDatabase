// book_delete_unit.js
import { db } from './firebase.js';
import { ref, remove, get } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";


// delete book unit only if status is available
export async function deleteUnit(bookUid, status, showConfirmModal, showSuccessModal) {
  if (!bookUid) {
    showSuccessModal('❌ Error: Missing book unit ID.');
    return;
  }

  if (!status || status.toLowerCase() !== 'available') {
    showSuccessModal('❌ Cannot delete: This book unit is not available.');
    return;
  }

  const confirmDelete = await showConfirmModal(
    `Are you sure you want to delete book unit ${bookUid}?`
  );
  if (!confirmDelete) return;

  try {
    await remove(ref(db, `book_unit/${bookUid}`));

    // Also remove the tag_uid from tag_index
    const tagIndexSnapshot = await get(ref(db, 'tag_index'));
    if (tagIndexSnapshot.exists()) {
      const tagIndex = tagIndexSnapshot.val();
      for (const tagUid in tagIndex) {
        if (tagIndex[tagUid] === bookUid) {
          await remove(ref(db, `tag_index/${tagUid}`));
          break; // Only one tag_uid points to this bookUid, so we can stop
        }
      }
    }

    // Now, delete the book's history from the 'borrow_history' collection
    const borrowHistorySnapshot = await get(ref(db, 'borrow_history'));
    if (borrowHistorySnapshot.exists()) {
      // Loop through all records in borrow_history
      for (const bookUidKey in borrowHistorySnapshot.val()) {
        // Check if the current bookUid in borrow_history matches the bookUid to be deleted
        if (bookUidKey === bookUid) {
          // Remove all history records under this bookUid
          await remove(ref(db, `borrow_history/${bookUidKey}`)); // Delete the entire book's history
          break; // Exit loop once history is deleted
        }
      }
    }



    showSuccessModal(`✅ Book unit ${bookUid} and its tag removed successfully.`);
  } catch (err) {
    showSuccessModal('❌ Error deleting book unit: ' + err.message);
  }
}
