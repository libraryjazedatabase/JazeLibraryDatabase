import { db } from './firebase.js';
import { ref, get, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// -------------------- DOM Elements --------------------
const tableBody = document.getElementById("activeBorrowersTableBody");
const searchInput = document.getElementById("searchActiveBorrowers");
const levelFilter = document.getElementById("levelFilterActive");
const courseFilter = document.getElementById("courseFilterActive");
const yearFilter = document.getElementById("yearFilterActive");
const statusFilter = document.getElementById("statusFilterActive");
const startDateFilter = document.getElementById("startDateFilter");
const endDateFilter = document.getElementById("endDateFilter");
const clearFiltersBtn = document.getElementById("clearFiltersActive");
const exportBtn = document.getElementById("exportActiveBorrowers");

// -------------------- Level-Course-Year Mapping --------------------
const levelOptions = {
  "Elementary": { course: ["----"], year: ["1","2","3","4","5","6"] },
  "High School": { course: ["----"], year: ["7","8","9","10"] },
  "Senior High School": { course: ["STEM","ABM","ICT-TVL","HUMMS"], year: ["11","12"] },
  "Undergraduate": { course: ["SBAA","SIT","SIHTM"], year: ["1","2","3","4"] },
  "Post-Graduate": { course: ["MIT"], year: ["1","2"] },
  "Visitor": { course: ["----"], year: ["----"] }
};

// -------------------- Store Data --------------------
let allHistory = [];

// -------------------- Update Borrow Status Logic --------------------
async function autoUpdateStatuses() {
  const historyRef = ref(db, "borrow_history");
  const historySnap = await get(historyRef);
  if (!historySnap.exists()) return;

  const updates = {};
  const now = new Date();

  historySnap.forEach(child => {
    const data = child.val();
    const borrowDate = data.borrow_date ? new Date(data.borrow_date) : null;
    const returnDate = data.return_date ? new Date(data.return_date) : null;
    const durationDays = parseInt(data.duration) || 0;

    if (!borrowDate) return; // Skip invalid entries
    const dueDate = new Date(borrowDate);
    dueDate.setDate(dueDate.getDate() + durationDays);

    let newStatus = data.status;

    // ---- CASE 1: Returned ----
    if (data.return_date) {
      // Returned before or on due date
      if (returnDate <= dueDate) newStatus = "Returned";
      // Returned after due date
      else if (returnDate > dueDate) newStatus = "Late";
    }
    // ---- CASE 2: Not yet returned ----
    else {
      if (now > dueDate) {
        if (data.status.includes("Inside")) newStatus = "Inside-Overdue";
        else if (data.status.includes("Outside")) newStatus = "Outside-Overdue";
      } else {
        if (data.status.includes("Inside")) newStatus = "Inside";
        else if (data.status.includes("Outside")) newStatus = "Outside";
      }
    }

    if (newStatus !== data.status) {
      updates[child.key] = { ...data, status: newStatus };
    }
  });

  // Apply all updates at once
  for (const key in updates) {
    await update(ref(db, `borrow_history/${key}`), { status: updates[key].status });
  }
}

// -------------------- Load Active Borrowers --------------------
export async function loadActiveBorrowers() {
  await autoUpdateStatuses(); // ✅ Auto update statuses before displaying

  tableBody.innerHTML = "";
  allHistory = [];

  const historySnap = await get(ref(db, "borrow_history"));
  if (!historySnap.exists()) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No active borrowers.</td></tr>`;
    return;
  }

  const borrowerSnap = await get(ref(db, "borrower"));
  const borrowers = borrowerSnap.val() || {};

  const bookUnitSnap = await get(ref(db, "book_unit"));
  const bookUnits = bookUnitSnap.val() || {};

  const bookMetaSnap = await get(ref(db, "book_metadata"));
  const bookMetadata = bookMetaSnap.val() || {};

  historySnap.forEach(child => {
    const h = child.val();
// Include all records (Returned, Late, etc.)
if (!h.status) return;

    const borrower = borrowers[h.borrower_id] || {};
    const bookUnit = bookUnits[h.book_uid] || {};
    const bookMeta = bookMetadata[bookUnit.metadata_id] || {};

    const fullName = `${borrower.fname || ""} ${borrower.mname || ""} ${borrower.lname || ""} ${borrower.abbrname || ""}`.trim();

    // Determine Level/Course display
    let levelCourse = "";
    if (borrower.level === "Visitor") levelCourse = "Visitor";
    else if (["Elementary","High School"].includes(borrower.level)) levelCourse = borrower.level;
    else levelCourse = borrower.course || "";

    allHistory.push({
      borrow_id: child.key,
      fullName,
      email: borrower.email || "N/A",
      levelCourse,
      year: borrower.year || "",
      bookTitle: bookMeta.title || "Unknown",
      bookID: h.book_uid || "Unknown",
      borrowDate: h.borrow_date || "",
      returnDate: h.return_date || "",
      duration: h.duration || "",
      status: h.status || ""
    });
  });

  populateFilterOptions();
  renderTable(allHistory);
}

// -------------------- Render Table --------------------
function renderTable(list) {
  tableBody.innerHTML = "";

  if (list.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No records found.</td></tr>`;
    return;
  }

  list.forEach(h => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${h.fullName}</td>
      <td>${h.email}</td>
      <td>${h.levelCourse}</td>
      <td>${h.bookTitle}</td>
      <td>${h.bookID}</td>
      <td>${h.borrowDate ? new Date(h.borrowDate).toLocaleString() : ""}</td>
      <td>${h.returnDate ? new Date(h.returnDate).toLocaleString() : "----"}</td>
      <td>${h.status}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// -------------------- Populate Filters --------------------
function populateFilterOptions() {
  levelFilter.innerHTML = '<option value="All">Level</option>';
  courseFilter.innerHTML = '<option value="All">Course</option>';
  yearFilter.innerHTML = '<option value="All">Year</option>';

  Object.keys(levelOptions).forEach(lvl => {
    const opt = document.createElement("option");
    opt.value = lvl;
    opt.textContent = lvl;
    levelFilter.appendChild(opt);
  });

  statusFilter.innerHTML = '<option value="All">Status</option>';
  ["Inside", "Outside", "Inside-Overdue", "Outside-Overdue", "Returned", "Late"].forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    statusFilter.appendChild(opt);
  });
}

// -------------------- Filter & Search --------------------
function filterAndSearch() {
  const search = searchInput.value.toLowerCase();
  const level = levelFilter.value;
  const course = courseFilter.value;
  const year = yearFilter.value;
  const status = statusFilter.value;
  const start = startDateFilter.value ? new Date(startDateFilter.value) : null;
  const end = endDateFilter.value ? new Date(endDateFilter.value) : null;

  const filtered = allHistory.filter(h => {
    const borrowDate = h.borrowDate ? new Date(h.borrowDate) : null;
    const matchesSearch =
      h.fullName.toLowerCase().includes(search) ||
      h.email.toLowerCase().includes(search) ||
      h.bookTitle.toLowerCase().includes(search);

    const matchesLevel = level === "All" || h.levelCourse === level;
    const matchesCourse = course === "All" || h.levelCourse === course;
    const matchesYear = year === "All" || h.year === year;
    const matchesStatus = status === "All" || h.status === status;
    const matchesStart = !start || (borrowDate && borrowDate >= start);
    const matchesEnd = !end || (borrowDate && borrowDate <= end);

    return matchesSearch && matchesLevel && matchesCourse && matchesYear && matchesStatus && matchesStart && matchesEnd;
  });

  renderTable(filtered);
}

// -------------------- Dynamic Course/Year Based on Level --------------------
levelFilter.addEventListener("change", () => {
  const level = levelFilter.value;

  courseFilter.innerHTML = '<option value="All">Course</option>';
  yearFilter.innerHTML = '<option value="All">Year</option>';

  if (level !== "All" && levelOptions[level]) {
    levelOptions[level].course.forEach(c => {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = c;
      courseFilter.appendChild(o);
    });

    levelOptions[level].year.forEach(y => {
      const o = document.createElement("option");
      o.value = y;
      o.textContent = y;
      yearFilter.appendChild(o);
    });
  }

  filterAndSearch();
});

[courseFilter, yearFilter, statusFilter, startDateFilter, endDateFilter].forEach(el => el.addEventListener("change", filterAndSearch));
searchInput.addEventListener("input", filterAndSearch);

// -------------------- Clear Filters --------------------
clearFiltersBtn.addEventListener("click", () => {
  levelFilter.value = "All";
  courseFilter.innerHTML = '<option value="All">Course</option>';
  yearFilter.innerHTML = '<option value="All">Year</option>';
  statusFilter.value = "All";
  startDateFilter.value = "";
  endDateFilter.value = "";
  filterAndSearch();
});

// -------------------- Export CSV --------------------
exportBtn.addEventListener("click", () => {
  if (!allHistory.length) return;
  const headers = ["Name","Email","Level/Course","Book Title","Book ID","Borrow Date","Return Date","Status"];
  const rows = allHistory.map(h => [
    h.fullName, h.email, h.levelCourse, h.bookTitle, h.bookID,
    h.borrowDate, h.returnDate, h.status
  ]);

  let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";
  rows.forEach(r => {
    csvContent += r.map(field => `"${field}"`).join(",") + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "active_borrowers.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// -------------------- Auto Refresh Every 30s (Silent) --------------------
setInterval(loadActiveBorrowers, 3000);

// -------------------- Init --------------------
loadActiveBorrowers();
