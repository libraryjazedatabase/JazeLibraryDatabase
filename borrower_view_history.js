import { db } from './firebase.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const historyModal = document.getElementById('borrowerHistoryModal');
const closeHistoryBtn = document.getElementById('closeHistoryModalBtn');
const historyContent = document.getElementById('historyContent');

// Format date

function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  if (isNaN(date)) return timestamp;
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
  return date.toLocaleString(undefined, options);
}


// Close modal
closeHistoryBtn.addEventListener('click', () => {
  historyModal.style.display = 'none';
});

// ---------------- Cache book metadata, book units, and all borrow_history ----------------
let booksMeta = {};
let bookUnits = {};
let allHistory = {};

async function loadAllData() {
  // Fetch book metadata
  const metaSnap = await get(ref(db, 'book_metadata'));
  booksMeta = metaSnap.val() || {};

  // Fetch book units
  const unitSnap = await get(ref(db, 'book_unit'));
  bookUnits = unitSnap.val() || {};

  // Fetch all borrow_history once
  const historySnap = await get(ref(db, 'borrow_history'));
  allHistory = historySnap.val() || {};
}

// ---------------- Open modal and render table ----------------
export function openBorrowerHistoryModal(borrowerId) {
  historyContent.innerHTML = '<p style="text-align:center; margin-top:20px;">Loading...</p>';
  historyModal.style.display = 'flex';

  const borrowerHistory = [];

  Object.entries(allHistory).forEach(([bookUID, bookRecords]) => {
    // Loop through each history record
    Object.values(bookRecords).forEach(h => {
      if (h.borrower_id === borrowerId) borrowerHistory.push({ ...h, book_uid: bookUID });
    });
  });

   // Sort by borrow_date descending
  borrowerHistory.sort((a, b) => new Date(b.borrow_date) - new Date(a.borrow_date));


  if (borrowerHistory.length === 0) {
    historyContent.innerHTML = `<p style="text-align:center; margin-top:20px;">No history found.</p>`;
    return;
  }

// Build table
let html = `<div class="history-table-container">
  <table class="history-table">
    <thead>
      <tr>
        <th>Book Title</th>
        <th>Book ID</th>
        <th>Borrow Date</th>
        <th>Return Date</th>
        <th>Location</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>`;


  borrowerHistory.forEach(h => {
    const bookUID = h.book_uid || 'N/A';
    const borrowDate = formatDate(h.borrow_date) || 'N/A';
    const returnDate = (!h.return_date || h.return_date.trim() === '') 
  ? 'Not Returned' 
  : formatDate(h.return_date);

    const status = h.status || 'N/A';
    const location = h.location || 'N/A';

    // Get metadata_id from book_unit
    const bookUnit = bookUnits[bookUID] || {};
    const metadataId = bookUnit.metadata_id || null;

    // Get title from book_metadata using metadata_id
    const bookMeta = metadataId ? booksMeta[metadataId] || {} : {};
    const bookTitle = bookMeta.title || 'Unknown Title';

    html += `<tr style="background:white;">
      <td style="padding:8px; border:1px solid #ccc;">${bookTitle}</td>
      <td style="padding:8px; border:1px solid #ccc;">${bookUID}</td>
      <td style="padding:8px; border:1px solid #ccc;">${borrowDate}</td>
      <td style="padding:8px; border:1px solid #ccc;">${returnDate}</td>
      <td style="padding:8px; border:1px solid #ccc;">${location}</td>
      <td style="padding:8px; border:1px solid #ccc;">${status}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  historyContent.innerHTML = html;
}

// Listen for event from borrower_users.js
document.addEventListener("openBorrowHistoryModal", (e) => {
  openBorrowerHistoryModal(e.detail.borrowerId);
});

// ---------------- Load everything once on page load ----------------
loadAllData();
