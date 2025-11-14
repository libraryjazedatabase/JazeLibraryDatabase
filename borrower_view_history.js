import { db } from './firebase.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const historyModal = document.getElementById('borrowerHistoryModal');
const closeHistoryBtn = document.getElementById('closeHistoryModalBtn');
const historyContent = document.getElementById('historyContent');

let booksMeta = {};
let bookUnits = {};
let allHistory = {};
let currentBorrowerId = null; // track currently open borrower

// ---------------- Format date ----------------
function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  if (isNaN(date)) return timestamp;
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
  return date.toLocaleString(undefined, options);
}

// ---------------- Close modal ----------------
closeHistoryBtn.addEventListener('click', () => {
  historyModal.style.display = 'none';
});

// ---------------- Open modal ----------------
export function openBorrowerHistoryModal(borrowerId) {
  currentBorrowerId = borrowerId;
  historyModal.style.display = 'flex';
  renderBorrowerHistory(borrowerId);
}

// ---------------- Render table ----------------
function renderBorrowerHistory(borrowerId) {
  historyContent.innerHTML = '<p style="text-align:center; margin-top:20px;">Loading...</p>';

  const borrowerHistory = [];

  Object.entries(allHistory).forEach(([bookUID, bookRecords]) => {
    Object.values(bookRecords).forEach(h => {
      if (h.borrower_id === borrowerId && h.borrow_date) {
        borrowerHistory.push({ ...h, book_uid: bookUID, borrowDt: new Date(h.borrow_date) });
      }
    });
  });

  borrowerHistory.sort((a, b) => b.borrowDt - a.borrowDt);

  if (!borrowerHistory.length) {
    historyContent.innerHTML = `<p style="text-align:center; margin-top:20px;">No history found.</p>`;
    return;
  }

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
    const borrowDate = formatDate(h.borrowDt);
    const returnDate = (!h.return_date || h.return_date.trim() === '') ? 'Not Returned' : formatDate(h.return_date);
    const status = h.status || 'N/A';
    const location = h.location || 'N/A';

    const bookUnit = bookUnits[bookUID] || {};
    const metadataId = bookUnit.metadata_id || null;
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

  html += `</tbody></table></div>`;
  historyContent.innerHTML = html;
}

// ---------------- Real-time listeners ----------------
function initRealTimeListeners() {
  onValue(ref(db, 'book_metadata'), snap => {
    booksMeta = snap.val() || {};
    if (currentBorrowerId) renderBorrowerHistory(currentBorrowerId);
  });
  onValue(ref(db, 'book_unit'), snap => {
    bookUnits = snap.val() || {};
    if (currentBorrowerId) renderBorrowerHistory(currentBorrowerId);
  });
  onValue(ref(db, 'borrow_history'), snap => {
    allHistory = snap.val() || {};
    if (currentBorrowerId) renderBorrowerHistory(currentBorrowerId);
  });
}

// ---------------- Event listener from borrower_users.js ----------------
document.addEventListener("openBorrowHistoryModal", (e) => {
  openBorrowerHistoryModal(e.detail.borrowerId);
});

// ---------------- Start listeners ----------------
initRealTimeListeners();
