import { db } from './firebase.js';
import { ref, get, onValue } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// -------------------- DOM Elements --------------------
const borrowerTableBody = document.getElementById("borrowerTableBody");
const borrowerSection = document.getElementById("borrowerSection");

const searchInput = document.getElementById("searchInput");
const levelFilter = document.getElementById("LevelFilter");
const courseFilter = document.getElementById("courseFilter");
const yearFilter = document.getElementById("yearFilter");
const clearFiltersBtn = document.getElementById("clearFilters");

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
let allBorrowers = [];
let allHistory = {}; // Store borrow_history in memory
let borrowerActiveMap = {}; // precomputed active status map

// -------------------- Load Borrow History --------------------
// Listen for changes in borrow_history
const historyRef = ref(db, "borrow_history");
onValue(historyRef, (snapshot) => {
    allHistory = snapshot.val() || {};
    computeBorrowerActiveMap();
    // Re-render borrowers to update delete buttons
    filterAndSearch();
});

// Update isBorrowerActive to use live cached allHistory, checking if the user hasn't returned a borrowed book yet
// Precompute borrowerActiveMap for synchronous lookups
function computeBorrowerActiveMap() {
    borrowerActiveMap = {}; // reset
    Object.values(allHistory).forEach(bookRecords => {
        Object.values(bookRecords).forEach(record => {
            if (!record || !record.borrower_id) return;
            // If return_date is empty or whitespace, borrower is active
            const isActive = !record.return_date || record.return_date.trim() === "";
            if (isActive) borrowerActiveMap[record.borrower_id] = true;
        });
    });
}

// -------------------- Load Borrowers --------------------
export function loadBorrowers() {
    const borrowerRef = ref(db, "borrower");

    onValue(borrowerRef, (snapshot) => {
        borrowerTableBody.innerHTML = "";
        allBorrowers = [];

        if (!snapshot.exists()) {
            borrowerTableBody.innerHTML = `
                <tr><td colspan="5" style="text-align:center; padding: 20px; color: #666;">No borrowers found.</td></tr>
            `;
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const borrowerId = childSnapshot.key;
            const data = childSnapshot.val();

            const fullName = `${data.fname || ""} ${data.mname || ""} ${data.lname || ""} ${data.abbrname || ""}`.trim();
            const email = data.email || "N/A";

            const course =
                data.course && data.course !== "----"
                ? data.course
                : ["Visitor", "Elementary", "High School"].includes(data.level)
                ? data.level
                : "N/A";

            const year = data.year || "N/A";

            allBorrowers.push({
                borrowerId,
                fullName,
                email,
                level: data.level || "",
                course,
                year
            });
        });
        // sort borrower profiles alphabetically
        allBorrowers.sort((a, b) => a.fullName.localeCompare(b.fullName));

        filterAndSearch();
        populateFilterOptions();
    });
}


// -------------------- Render Borrowers --------------------
// Updated renderBorrowers function
function renderBorrowers(list) {
    borrowerTableBody.innerHTML = "";

    if (list.length === 0) {
        borrowerTableBody.innerHTML = `
            <tr><td colspan="5" style="text-align:center; padding: 20px; color: #666;">No borrowers found.</td></tr>
        `;
        return;
    }

    list.forEach( b => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${b.fullName}</td>
            <td>${b.email}</td>
            <td>${b.course}</td>
            <td>${b.year}</td>
            <td class="actions-cell">
                <div class="action-buttons">
                    <button class="update-btn action-btn" data-id="${b.borrowerId}">Update</button>
                    <button class="view-btn action-btn" data-id="${b.borrowerId}">View History</button>
                    <button class="delete-btn action-btn" data-id="${b.borrowerId}">Delete</button>
                </div>
            </td>
        `;
        borrowerTableBody.appendChild(tr);

        const deleteBtn = tr.querySelector(".delete-btn");

        if (borrowerActiveMap[b.borrowerId]) {
    deleteBtn.disabled = true;                  //Disables the button
    deleteBtn.style.opacity = "0.5";           // Greyed out
    deleteBtn.style.cursor = "not-allowed";    // Cursor shows "disabled" symbol
    deleteBtn.title = "Cannot delete: borrower has books not returned";
}

    });
}


// -------------------- Populate Filter Options --------------------
function populateFilterOptions() {
    levelFilter.innerHTML = '<option value="All">Level</option>';
    Object.keys(levelOptions).forEach(lvl => {
        const opt = document.createElement("option");
        opt.value = lvl;
        opt.textContent = lvl;
        levelFilter.appendChild(opt);
    });

    courseFilter.innerHTML = '<option value="All">Course</option>';
    yearFilter.innerHTML = '<option value="All">Year</option>';
}

// -------------------- Filter & Search --------------------
function filterAndSearch() {
    const search = searchInput.value.toLowerCase();
    const level = levelFilter.value;
    const course = courseFilter.value;
    const year = yearFilter.value;

    const filtered = allBorrowers.filter(b => {
        const matchesSearch =
            b.fullName.toLowerCase().includes(search) ||
            b.email.toLowerCase().includes(search) ||
            b.borrowerId.toLowerCase().includes(search);

        const matchesLevel = level === "All" || b.level === level;
        const matchesCourse = course === "All" || b.course === course || course === "----";
        const matchesYear = year === "All" || b.year === year || year === "----";

        return matchesSearch && matchesLevel && matchesCourse && matchesYear;
    });

    // to make sure data is ordered after filter
    filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));
    renderBorrowers(filtered);
}

// -------------------- Dynamic Course & Year for Filters --------------------
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

courseFilter.addEventListener("change", filterAndSearch);
yearFilter.addEventListener("change", filterAndSearch);

// -------------------- Search Bar --------------------
searchInput.addEventListener("input", filterAndSearch);

// -------------------- Clear Filters --------------------
clearFiltersBtn.addEventListener("click", () => {
    // Reset filters only
    levelFilter.value = "All";
    courseFilter.innerHTML = '<option value="All">Course</option>';
    yearFilter.innerHTML = '<option value="All">Year</option>';

    // Reapply search filter using existing allBorrowers.fullName/email
    filterAndSearch();
});


// -------------------- Event Handlers --------------------
export function attachBorrowerHandlers() {
    document.addEventListener("click", (e) => {
        const borrowerId = e.target.dataset.id;

        if (e.target.classList.contains("update-btn")) {
            document.dispatchEvent(new CustomEvent("openUpdateBorrowerModal", { detail: { borrowerId } }));
        }

        if (e.target.classList.contains("delete-btn")) {
            document.dispatchEvent(new CustomEvent("openDeleteBorrowerModal", { detail: { borrowerId } }));
        }

        if (e.target.classList.contains("view-btn")) {
            document.dispatchEvent(new CustomEvent("openBorrowHistoryModal", { detail: { borrowerId } }));
        }
    });
}

// -------------------- Init --------------------
loadBorrowers();
attachBorrowerHandlers();
