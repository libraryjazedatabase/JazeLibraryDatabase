import { db } from './firebase.js';
import { ref, get, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { loadBorrowers } from './borrower_users.js';

document.addEventListener("DOMContentLoaded", () => {

  // -------------------- DOM Elements --------------------
  const updateModal = document.getElementById("updateBorrowerModal");
  const closeUpdateModal = document.getElementById("closeUpdateBorrowerModal");
  const cancelUpdate = document.getElementById("cancelUpdateBorrower");
  const submitUpdate = document.getElementById("submitUpdateBorrower");

  const fnameInput = document.getElementById("updateBorrowerFname");
  const mnameInput = document.getElementById("updateBorrowerMname");
  const lnameInput = document.getElementById("updateBorrowerLname");
  const abbrInput = document.getElementById("updateBorrowerAbbrname");
  const emailInput = document.getElementById("updateBorrowerEmail");
  const levelSelect = document.getElementById("updateBorrowerLevel");
  const courseSelect = document.getElementById("updateBorrowerCourse");
  const yearSelect = document.getElementById("updateBorrowerYear");

  // ---- Update-specific Confirm & Success Modals ----
  const confirmModal = document.getElementById("updateConfirmModal");
  const confirmYesBtn = document.getElementById("updateConfirmYes");
  const confirmNoBtns = document.querySelectorAll('[data-close-modal="updateConfirmModal"]');
  const confirmMessage = document.getElementById("updateConfirmModalMessage");

  const successModal = document.getElementById("updateSuccessModal");
  const successMessage = document.getElementById("updateSuccessModalMessage");
  const successCloseBtns = document.querySelectorAll('[data-close-modal="updateSuccessModal"]');

  let currentBorrowerId = null;

  // -------------------- Modal Controls --------------------
  const openModal = () => (updateModal.style.display = "flex");
const closeModal = () => {
  updateModal.style.display = "none";
  currentBorrowerId = null; // clear the current borrower ID
};

  const showConfirm = (msg, onConfirm) => {
    confirmMessage.textContent = msg;
    confirmModal.style.display = "flex";
    confirmYesBtn.onclick = () => {
      confirmModal.style.display = "none";
      setTimeout(() => onConfirm(), 0);
    };
  };
  const hideConfirm = () => (confirmModal.style.display = "none");
  const showSuccess = (msg) => {
    successMessage.textContent = msg;
    successModal.style.display = "flex";
  };
  const hideSuccess = () => (successModal.style.display = "none");

// -------------------- Level-Course-Year Mapping --------------------
const levelOptions = {
    "Elementary": { course: ["----"], year: ["1","2","3","4","5","6"] },
    "High School": { course: ["----"], year: ["7","8","9","10"] },
    "Senior High School": { course: ["STEM","ABM","ICT-TVL","HUMMS"], year: ["11","12"] },
    "Undergraduate": { course: ["SBAA","SIT","SIHTM"], year: ["1","2","3","4"] },
    "Post-Graduate": { course: ["MIT"], year: ["1","2"] },
    "Visitor": { course: ["----"], year: ["----"] }
};

const populateCourseYear = () => {
    const level = levelSelect.value;
    const courses = levelOptions[level]?.course || [];
    const years = levelOptions[level]?.year || [];

    // Populate course
    courseSelect.innerHTML = "";
    courses.forEach(c => {
        const o = document.createElement("option");
        o.value = c;
        o.textContent = c;
        courseSelect.appendChild(o);
    });

    // Populate year
    yearSelect.innerHTML = "";
    years.forEach(y => {
        const o = document.createElement("option");
        o.value = y;
        o.textContent = y;
        yearSelect.appendChild(o);
    });
};

levelSelect.addEventListener("change", populateCourseYear);

// -------------------- Open Update Modal --------------------
document.addEventListener("openUpdateBorrowerModal", async (e) => {
    const borrowerId = e.detail.borrowerId;
    if (!borrowerId) return;

    currentBorrowerId = borrowerId;

    // Show loading indicator
    updateModal.style.display = "flex";
    updateModal.querySelector(".modal-body").style.opacity = 0.5;

    const borrowerRef = ref(db, "borrower/" + borrowerId);
    try {
        const snapshot = await get(borrowerRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            fnameInput.value = data.fname || "";
            mnameInput.value = data.mname || "";
            lnameInput.value = data.lname || "";
            abbrInput.value = data.abbrname || "";
            emailInput.value = data.email || "";
            levelSelect.value = data.level || "";
            populateCourseYear();
            courseSelect.value = data.course || (levelOptions[data.level]?.course[0] || "");
            yearSelect.value = data.year || (levelOptions[data.level]?.year[0] || "");
        }
    } catch (err) {
        console.error("Error fetching borrower data:", err);
        showSuccess("Error loading borrower data. Please try again.");
        closeModal();
        return;
    }

    // Remove loading indicator
    updateModal.querySelector(".modal-body").style.opacity = 1;
});

  // -------------------- Close Modal --------------------
  closeUpdateModal.addEventListener("click", closeModal);
  cancelUpdate.addEventListener("click", closeModal);
  confirmNoBtns.forEach(btn => btn.onclick = hideConfirm);
  successCloseBtns.forEach(btn => btn.onclick = hideSuccess);

  // -------------------- Submit Update --------------------
  submitUpdate.addEventListener("click", async () => {
    if (!currentBorrowerId) return;

    // Basic validation
    if (!fnameInput.value.trim() || !lnameInput.value.trim() || !emailInput.value.trim() || !levelSelect.value) {
      showSuccess("Please fill all required fields!");
      return;
    }

    showConfirm("Are you sure you want to update this borrower?", async () => {
      const updatedData = {
        fname: fnameInput.value.trim(),
        mname: mnameInput.value.trim(),
        lname: lnameInput.value.trim(),
        abbrname: abbrInput.value.trim(),
        email: emailInput.value.trim().toLowerCase(),
        level: levelSelect.value,
        course: courseSelect.value,
        year: yearSelect.value
      };

      try {
        await update(ref(db, "borrower/" + currentBorrowerId), updatedData);
        loadBorrowers();
        closeModal();
        showSuccess("Borrower updated successfully!");
      } catch (err) {
        console.error("Error updating borrower:", err);
        showSuccess("Error updating borrower: " + err.message);
      }
    });
  });
});
