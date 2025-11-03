import { db } from './firebase.js';
import { ref, get, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// -------------------- DOM Elements --------------------
const tableBody = document.getElementById("activeBorrowersTableBody");
const searchInput = document.getElementById("searchActiveBorrowers");
const levelFilter = document.getElementById("levelFilterActive");
const courseFilter = document.getElementById("courseFilterActive");
const yearFilter = document.getElementById("yearFilterActive");
const statusFilter = document.getElementById("statusFilterActive");
const locationFilter = document.getElementById("locationFilterActive");
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

// -------------------- Store Current Filters --------------------
let currentFilters = {
  search: "",
  level: "All",
  course: "All",
  year: "All",
  status: "All",
  location: "All",
  start: "",
  end: ""
};

//-------- Date Format-------------

function formatDate(timestamp) {
  if (!timestamp || timestamp.trim() === "") return "Not Returned";
  const date = new Date(timestamp);
  if (isNaN(date)) return timestamp;
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: 'numeric', 
    hour12: true 
  };
  return date.toLocaleString(undefined, options);
}

// -------------------- Update Borrow Status Logic --------------------
async function autoUpdateStatuses() {
  const historySnap = await get(ref(db, "borrow_history"));
  if (!historySnap.exists()) return;

  const updates = {};
  const now = new Date();

  // library closing time 6PM
  const closingHour = 18;
  // set outside borrowing days to 7
  const outsideLimitDays = 7;

  // Loop through each book_uid
  historySnap.forEach(bookSnap => {
  const bookUID = bookSnap.key;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

    // Loop through each history_no
    bookSnap.forEach(recordSnap => {
      const historyNo = recordSnap.key;
      const data = recordSnap.val();

      const borrowDate = data.borrow_date ? new Date(data.borrow_date) : null;

      const returnDate =
        data.return_date && data.return_date.trim() !== ""
          ? new Date(data.return_date)
          : null

      const location = data.location ? data.location.toLowerCase() : "outside";

      if (!borrowDate) return;

    // -------------------- Determine due date based on location --------------------      

      const dueDate = new Date(borrowDate);

      // Determine due date based on location
      if (location.toLowerCase() === "inside") {
        // book must be returned before 6 PM on the same day
        dueDate.setHours(closingHour, 0, 0, 0);
      } else {
        // book must be returned within 7 days, before 6 PM
        dueDate.setDate(dueDate.getDate() + outsideLimitDays);
        dueDate.setHours(closingHour, 0, 0, 0)
      }

    // Skip updates for Returned/Late in last 30 days unless return_date is empty
      if (returnDate) {
        if (data.status === "Returned" || data.status === "Late") {
          const within30Days = returnDate >= thirtyDaysAgo;
          if (within30Days) return;
        }
      }

    // Determine current status
      let newStatus = data.status || "Borrowed";

      if (!returnDate) {
        newStatus = now > dueDate ? "Overdue" : "Borrowed";
      } else {
        newStatus = returnDate <= dueDate ? "Returned" : "Late";
      }

      // Add to update list only if status changed
      if (newStatus !== data.status) {
        updates[`borrow_history/${bookUID}/${historyNo}/status`] = newStatus;
      }
    });
  });

  // Apply all updates
  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }
}



// -------------------- Load Active Borrowers --------------------
export async function loadActiveBorrowers() {
  await autoUpdateStatuses();

  tableBody.innerHTML = "";
  allHistory = [];

  const historySnap = await get(ref(db, "borrow_history"));
  if (!historySnap.exists()) {
    tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">No active borrowers.</td></tr>`;
    return;
  }

  const borrowerSnap = await get(ref(db, "borrower"));
  const borrowers = borrowerSnap.val() || {};

  const bookUnitSnap = await get(ref(db, "book_unit"));
  const bookUnits = bookUnitSnap.val() || {};

  const bookMetaSnap = await get(ref(db, "book_metadata"));
  const bookMetadata = bookMetaSnap.val() || {};

 // Loop through all book_uids
  historySnap.forEach(bookNode => {
    const book_uid = bookNode.key;
    const bookData = bookNode.val();

  if (!bookData || Object.keys(bookData).length === 0) {
      console.log(`Skipping ${book_uid} — no history records`);
      return;
    }

    // Loop through each history_no inside the book_uid
    Object.entries(bookData).forEach(([history_no, h]) => {

  // ✅ Skip invalid or empty history nodes (sometimes an empty object may exist)
      if (!h || typeof h !== "object" || Object.keys(h).length === 0) return;

      const borrower = borrowers[h.borrower_id] || {};
      const bookUnit = bookUnits[book_uid] || {};
      const bookMeta = bookMetadata[bookUnit.metadata_id] || {};

      const fullName = `${borrower.fname || ""} ${borrower.mname || ""} ${borrower.lname || ""} ${borrower.abbrname || ""}`.trim();

      let levelCourseDisplay = "";
      if (borrower.level === "Visitor") levelCourseDisplay = "Visitor";
      else if (["Elementary","High School"].includes(borrower.level)) levelCourseDisplay = borrower.level;
      else levelCourseDisplay = borrower.course || "";

      allHistory.push({
        book_uid,
        history_no,
        fullName,
        email: borrower.email || "N/A",
        level: borrower.level || "Visitor",
        course: borrower.course || "----",
        levelCourse: levelCourseDisplay,
        year: borrower.year || "----",
        bookTitle: bookMeta.title || "Unknown",
        bookID: book_uid || "Unknown",
        borrowDate: h.borrow_date || "",
        returnDate: h.return_date || "",
        location: h.location || "Inside",
        status: h.status || "Borrowed"
      });
    });
  });

    // Only render if there's valid data
  if (allHistory.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">No active borrowers found.</td></tr>`;
    return;
  }

  allHistory.sort((a, b) => {
  const dateA = a.borrowDate ? new Date(a.borrowDate) : new Date(0);
  const dateB = b.borrowDate ? new Date(b.borrowDate) : new Date(0);
  return dateB - dateA;
});

  populateFilterOptions();
  applySavedFilters();
  filterAndSearch();
}

// -------------------- Render Table --------------------
function renderTable(list) {
  tableBody.innerHTML = "";

  if (list.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">No records found.</td></tr>`;
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
<td>${formatDate(h.borrowDate)}</td>
<td>${formatDate(h.returnDate)}</td>

      <td>${h.location}</td>
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
  ["Borrowed","Overdue","Late","Returned"].forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    statusFilter.appendChild(opt);
  });

  locationFilter.innerHTML = '<option value="All">Location</option>';
  ["Inside","Outside"].forEach(loc => {
    const opt = document.createElement("option");
    opt.value = loc;
    opt.textContent = loc;
    locationFilter.appendChild(opt);
  });
}

// -------------------- Apply Saved Filters --------------------
function applySavedFilters() {
  searchInput.value = currentFilters.search;
  levelFilter.value = currentFilters.level;

  if (currentFilters.level !== "All" && levelOptions[currentFilters.level]) {
    courseFilter.innerHTML = '<option value="All">Course</option>';
    levelOptions[currentFilters.level].course.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      courseFilter.appendChild(opt);
    });

    yearFilter.innerHTML = '<option value="All">Year</option>';
    levelOptions[currentFilters.level].year.forEach(y => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearFilter.appendChild(opt);
    });
  }

  courseFilter.value = currentFilters.course;
  yearFilter.value = currentFilters.year;
  statusFilter.value = currentFilters.status;
  locationFilter.value = currentFilters.location;
  startDateFilter.value = currentFilters.start;
  endDateFilter.value = currentFilters.end;
}

// -------------------- Filter & Search --------------------
function filterAndSearch() {
  currentFilters = {
    search: searchInput.value,
    level: levelFilter.value,
    course: courseFilter.value,
    year: yearFilter.value,
    status: statusFilter.value,
    location: locationFilter.value,
    start: startDateFilter.value,
    end: endDateFilter.value
  };

  const search = currentFilters.search.toLowerCase();
  const start = currentFilters.start ? new Date(currentFilters.start) : null;
const end = currentFilters.end 
  ? new Date(new Date(currentFilters.end).setHours(23, 59, 59, 999)) 
  : null;


  const filtered = allHistory.filter(h => {
    const borrowDate = h.borrowDate ? new Date(h.borrowDate) : null;
    const matchesSearch =
      h.fullName.toLowerCase().includes(search) ||
      h.email.toLowerCase().includes(search) ||
      h.bookTitle.toLowerCase().includes(search) ||
      h.bookID.toLowerCase().includes(search); // <-- added

    const matchesLevel = currentFilters.level === "All" || h.level === currentFilters.level;
    const matchesCourse = currentFilters.course === "All" || h.course === currentFilters.course;
    const matchesYear = currentFilters.year === "All" || h.year === currentFilters.year;
    const matchesStatus = currentFilters.status === "All" || h.status === currentFilters.status;
    const matchesLocation = currentFilters.location === "All" || h.location === currentFilters.location;
    const matchesStart = !start || (borrowDate && borrowDate >= start);
    const matchesEnd = !end || (borrowDate && borrowDate <= end);

    return matchesSearch && matchesLevel && matchesCourse && matchesYear && matchesStatus && matchesLocation && matchesStart && matchesEnd;
  });

  //  Sort filtered list by borrowDate descending (most recent first)
  filtered.sort((a, b) => {
    const dateA = a.borrowDate ? new Date(a.borrowDate) : new Date(0);
    const dateB = b.borrowDate ? new Date(b.borrowDate) : new Date(0);
    return dateB - dateA;
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

[courseFilter, yearFilter, statusFilter, locationFilter, startDateFilter, endDateFilter].forEach(el => el.addEventListener("change", filterAndSearch));
searchInput.addEventListener("input", filterAndSearch);

// -------------------- Clear Filters --------------------
clearFiltersBtn.addEventListener("click", () => {
  currentFilters = {
    search: "",
    level: "All",
    course: "All",
    year: "All",
    status: "All",
    location: "All",
    start: "",
    end: ""
  };
  applySavedFilters();
  filterAndSearch();
});

// -------------------- Export CSV --------------------
//  Exports the current table data (borrowers + books) into a downloadable CSV file
exportBtn.addEventListener("click", () => {
  // Stop if no borrower data is loaded
  if (!allHistory.length) return;

  // CSV column headers
  const headers = ["Name", "Email", "Level/Course", "Book Title", "Book ID", "Borrow Date", "Return Date", "Location", "Status"];
  
  // Convert each borrower record into a row for CSV
  // The fields are taken from the processed 'allHistory' array created in loadActiveBorrowers()
  const rows = allHistory.map(h => {
    const fullName = h.fullName && h.fullName.trim() !== "" ? h.fullName : "N/A";
    const email = h.email && h.email.trim() !== "" ? h.email : "N/A";
    const levelCourse = h.levelCourse && h.levelCourse.trim() !== "" ? h.levelCourse : "N/A";
    const bookTitle = h.bookTitle || "Unknown";
    const bookID = h.bookID || "Unknown";
    const borrowDate = formatDate(h.borrowDate);
    const returnDate = h.returnDate && h.returnDate.trim() !== "" 
  ? formatDate(h.returnDate)
  : "Not Returned"; // ✅ Added

    const location = h.location || "Unknown";
    const status = h.status || "Unknown";

    return [
      fullName,
      email,
      levelCourse,
      bookTitle,
      bookID,
      borrowDate,
      returnDate,
      location,
      status
    ];
  });

  //  Create CSV text content with headers first
  let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";

  //  Append each row to CSV
  rows.forEach(row => {
    csvContent += row.map(field => `"${field}"`).join(",") + "\n";
  });

  //  Convert to downloadable link and trigger the download
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "active_borrowers.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// -------------------- Auto Refresh Every 60s --------------------
setInterval(loadActiveBorrowers, 60000);

// -------------------- Init --------------------
loadActiveBorrowers();
