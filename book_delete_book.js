import { db } from './firebase.js';
import { ref, remove } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

/**
 * Deletes a book metadata and all its related units if they are available
 */
export async function deleteBook(metaId, units, allAvailable, showConfirmModal, showSuccessModal) {
  if (!allAvailable) {
    showSuccessModal('Cannot delete: some book units are not available.');
    return;
  }

  const confirmDelete = await showConfirmModal(
    'Are you sure you want to delete this book and all its units?'
  );
  if (!confirmDelete) return;

  try {
    // delete metadata
    await remove(ref(db, `book_metadata/${metaId}`));

    // delete all related units
    for (const uid in units) {
      if (String(units[uid].metadata_id) === String(metaId)) {
        // delete the book unit
        await remove(ref(db, `book_unit/${uid}`));

        // delete the book from borrow_history if it exists
        await remove(ref(db, `borrow_history/${uid}`));

        // delete the tag from tag_index if it exists
        await remove(ref(db, `tag_index/${units[uid].tag_uid}`));
      }
    }

    showSuccessModal('Book, its units, borrow history, and tag index deleted successfully.');
  } catch (err) {
    showSuccessModal('Error deleting book: ' + err.message);
  }
}
