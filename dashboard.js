import { db } from './firebase.js';
import { ref, get ,onValue } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// -------------------- DOM Elements --------------------
const dashTotalMaterials = document.getElementById("dashTotalMaterials");
const dashBooksBorrowed = document.getElementById("dashBooksBorrowed");
const dashBooksOverdue = document.getElementById("dashBooksOverdue");
const dashTotalBorrowers = document.getElementById("dashTotalBorrowers");
const dashOfflineReaders = document.getElementById("dashOfflineReaders");
const dashLastUpdated = document.getElementById("dashLastUpdated");
const topBooksContainer = document.getElementById("dash-top-books");
const topBorrowersContainer = document.getElementById("dash-top-borrowers");
const misplacedBooksTableBody = document.getElementById("dash-misplaced-books-body");
const borrowingsTodayTableBody = document.getElementById("dash-borrowings-today-body");

// -------------------- Helper: Same Day Checker --------------------
function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// -------------------- Helper: Format Borrower Name --------------------
function getBorrowerName(borrower) {
  if (!borrower) return "Unknown";
  return [
    borrower.fname || "",
    borrower.mname || "",
    borrower.lname || "",
    borrower.abbrname || ""
  ].join(" ").replace(/\s+/g, " ").trim() || "Unknown";
}


// -------------------- Offline Reader Count --------------------
function countOfflineReaders(readers) {
  return Object.values(readers).filter(r => r?.status === "Offline").length;
}

// -------------------- Data Cache --------------------
const cache = {
  book_units: {},
  borrow_history: {},
  books: {},
  borrowers: {},
  readers: {}
};

// -------------------- Dashboard Renderer --------------------
function loadDashboardData() {
  const bookUnits = cache.book_units;
  const borrowHistory = cache.borrow_history;
  const books = cache.books;
  const borrowers = cache.borrowers;
  const readers = cache.readers;

  // -------------------- Initialize Counters --------------------
  dashTotalMaterials.textContent = Object.keys(bookUnits).length;
  let borrowedCount = 0;
  let overdueCount = 0;
  let offlineReadersCount = countOfflineReaders(readers);


  const misplacedBooks = [];
  const borrowingsToday = [];
  const bookCountThisMonth = {};
  const borrowerCountThisMonth = {};

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // -------------------- Borrow History Processing --------------------
  for (const bookUID in borrowHistory) {
    const histories = borrowHistory[bookUID];
    if (!histories) continue;

    // Find latest history for each book
const latestHistoryNo = Object.keys(histories)
  .sort((a, b) => {
    const numA = parseInt(a.split('_')[1]);
    const numB = parseInt(b.split('_')[1]);
    return numB - numA; // sort descending by number
  })[0];


    const latestHistory = histories[latestHistoryNo];
    if (!latestHistory) continue;

    const status = latestHistory.status || "Unknown";

    // 🔢 Update counters for Borrowed & Overdue
    if (status === "Borrowed" || status === "Overdue") borrowedCount++;
    if (status === "Overdue") overdueCount++;

// 📅 Borrowings Today
Object.values(histories).forEach(h => {
    const borrowDt = h.borrow_date ? new Date(h.borrow_date) : null;
    if (!borrowDt) return;

    // Only today's borrowings
    if (isSameDay(borrowDt, now)) {
      const borrower = borrowers[h.borrower_id] || {};
      const bookUnit = bookUnits[bookUID] || {};
      const meta = books[bookUnit.metadata_id] || {};

      borrowingsToday.push({
        borrower: getBorrowerName(borrower),
        book: meta.title || "Unknown",
        borrowDt // store the actual Date object
      });
    }
  });

// 🏆 Top Books / Borrowers This Month
Object.keys(histories)
  .sort((a, b) => {
    const numA = parseInt(a.split('_')[1]);
    const numB = parseInt(b.split('_')[1]);
    return numA - numB; // ascending order
  })
  .forEach(historyNo => {
    const h = histories[historyNo];
    const borrowDt = h.borrow_date ? new Date(h.borrow_date) : null;
    if (!borrowDt) return;

    if (borrowDt >= monthStart && borrowDt <= monthEnd) {
      const bookUnit = bookUnits[bookUID] || {};
      const meta = books[bookUnit.metadata_id] || {};
      const title = meta.title || "Unknown";
      bookCountThisMonth[title] = (bookCountThisMonth[title] || 0) + 1;

      const borrower = borrowers[h.borrower_id] || {};
      const borrowerName = getBorrowerName(borrower);

      borrowerCountThisMonth[borrowerName] =
        (borrowerCountThisMonth[borrowerName] || 0) + 1;
    }
  });

  }

  // -------------------- Misplaced Books Check --------------------
  for (const bookUID in bookUnits) {
    const bookUnit = bookUnits[bookUID];
    const meta = books[bookUnit.metadata_id] || {};
    const preferredLoc = meta?.preferred_location || "N/A";
    const currentLoc = bookUnit.location || "N/A";
    const last_seen = bookUnit.last_seen || "N/A";

    // Only check available books with a preferred location
    if (bookUnit.status !== "Available" || preferredLoc === "N/A") continue;

    // Compare locations to find misplaced
    if (currentLoc !== preferredLoc || currentLoc === "Not Found") {
      misplacedBooks.push({
        id: bookUID,
        title: meta.title || "Unknown",
        location: currentLoc,
        preferredLoc: preferredLoc,
        last_seen: last_seen
      });
    }
  }



  // -------------------- Update Dashboard DOM --------------------
  dashBooksBorrowed.textContent = borrowedCount;
  dashBooksOverdue.textContent = overdueCount;
  dashTotalBorrowers.textContent = Object.keys(borrowers).length;
  dashOfflineReaders.textContent = offlineReadersCount;
  dashLastUpdated.textContent = new Date().toLocaleString();

  // 📘 Misplaced Books Table
misplacedBooksTableBody.innerHTML = misplacedBooks.length
  ? misplacedBooks.map(b =>
      `<tr>
         <td>${b.id}</td>
         <td>${b.title}</td>
         <td>${b.location}</td>
         <td>${b.preferredLoc}</td>
         <td>${b.last_seen}</td>
       </tr>`
    ).join("")
  : `<tr><td colspan="5">No misplaced books</td></tr>`;

  // 📅 Borrowings Today Table
borrowingsToday.sort((a, b) => b.borrowDt - a.borrowDt);

borrowingsTodayTableBody.innerHTML = borrowingsToday.length
  ? borrowingsToday.map(b =>
      `<tr>
         <td>${b.borrower}</td>
         <td>${b.book}</td>
         <td>${b.borrowDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
       </tr>`
    ).join("")
  : `<tr><td colspan="3">No borrowings today</td></tr>`;


  // 🏆 Top 10 Books
  topBooksContainer.innerHTML = Object.entries(bookCountThisMonth)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(b => `<li>${b[0]} (${b[1]})</li>`)
    .join("") || `<li>N/A</li>`;

  // 🧑‍🎓 Top 10 Borrowers
  topBorrowersContainer.innerHTML = Object.entries(borrowerCountThisMonth)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(b => `<li>${b[0]} (${b[1]})</li>`)
    .join("") || `<li>N/A</li>`;
}

get(ref(db, "readers")).then(snapshot => {
  cache.readers = snapshot.val() || {};
  loadDashboardData();
});

// real time listeners, auto update or changes

function initDashboardListeners() {
  onValue(ref(db, "book_unit"), snap => { cache.book_units = snap.val() || {}; loadDashboardData(); });
  onValue(ref(db, "borrow_history"), snap => { cache.borrow_history = snap.val() || {}; loadDashboardData(); });
  onValue(ref(db, "book_metadata"), snap => { cache.books = snap.val() || {}; loadDashboardData(); });
  onValue(ref(db, "borrower"), snap => { cache.borrowers = snap.val() || {}; loadDashboardData(); });
  onValue(ref(db, "readers"), snap => { cache.readers = snap.val() || {}; loadDashboardData(); });
}

// 🚀 Start Dashboard Sync
initDashboardListeners();
