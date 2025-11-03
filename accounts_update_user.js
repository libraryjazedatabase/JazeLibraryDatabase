import { db } from './firebase.js';
import { ref, get, update, child} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { loadUsers, showConfirmModal, showSuccessModal, attachUpdateHandlers } from './accounts_users.js';

// -------------------- DOM Elements --------------------
const updateModal = document.getElementById("updateAccountModal");
const closeUpdateModal = document.getElementById("closeUpdateAccountModal");
const cancelUpdate = document.getElementById("cancelUpdateAccount");
const submitUpdate = document.getElementById("submitUpdateAccount");

// Inputs in the modal
const updateUsername = document.getElementById("updateUsername");
const updateFname = document.getElementById("updateFname");
const updateMname = document.getElementById("updateMname");
const updateLname = document.getElementById("updateLname");
const updateAbbrname = document.getElementById("updateAbbrname");
const updateRole = document.getElementById("updateRole");

// error in the modal

const updateAccountError = document.getElementById("updateAccountError");

// -------------------- Helper functions --------------------
const openModal = (modal) => {
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
  updateAccountError.style.display = "none"; // hide previous error
};
const closeModal = (modal) => {
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");

    // Clear error when modal closes ----
  updateAccountError.style.display = "none";
  updateAccountError.textContent = "";

  modal.dataset.userid = ""; // prevents old userId from being used
};

// -------------------- Validate fields function --------------------
function validateFields() {
    const requiredFields = [updateUsername, updateFname, updateMname ,updateLname, updateRole];

    for (const input of requiredFields) {
        input.setCustomValidity(""); // clear previous message
        if (!input.value.trim()) {
            input.setCustomValidity("Please fill out this field!");
            input.reportValidity();
            return false; // stop at first invalid field
        }
    }
    return true;
}

// Listen for custom event from accounts_users.js
document.addEventListener("openUpdateUserModal", async (e) => {
  const { userId } = e.detail;

  const userRef = ref(db, "accounts/" + userId);
  const snapshot = await get(userRef);
  if (!snapshot.exists()) return;

  const userData = snapshot.val();

  // Store userId on modal for later use
  updateModal.dataset.userid = userId;

  // Populate modal inputs
  updateUsername.value = userData.username || "";
  updateFname.value = userData.fname || "";
  updateMname.value = userData.mname || "";
  updateLname.value = userData.lname || "";
  updateAbbrname.value = userData.abbrname || "";
  updateRole.value = userData.role || "librarian";

  openModal(updateModal);
});

//Hide error on typing ----
updateUsername.addEventListener("input", () => {
  if (updateAccountError.style.display === "block") {
    updateAccountError.style.display = "none";
    updateAccountError.textContent = "";
  }
});

// -------------------- Submit update --------------------
submitUpdate.addEventListener("click", async () => {
  if (!validateFields()) return; // for validation validateFields

  const userId = updateModal.dataset.userid;
  if (!userId) return;

  const username = updateUsername.value.trim();
  const fname = updateFname.value.trim();
  const mname = updateMname.value.trim();
  const lname = updateLname.value.trim();
  const abbrname = updateAbbrname.value.trim();
  const role = updateRole.value;

  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, "accounts"));
    if (snapshot.exists()) {
      const accounts = snapshot.val();

      // Ignore current user when checking
      const otherAccounts = Object.entries(accounts).filter(([id, acc]) => id !== userId);

      // Check username
      const usernameExists = otherAccounts.some(([id, acc]) => acc.username === username);
      if (usernameExists) {
        updateAccountError.textContent = "This username is already taken.";
        updateAccountError.style.display = "block";
        return;
      }
    }
  } catch (err) {
    updateAccountError.textContent = "Error checking username. Try again.";
    updateAccountError.style.display = "block";
    return;
  }

  // Confirm before updating
  showConfirmModal("Confirm Update", "Are you sure you want to update this account?", async () => {
    try {
      await update(ref(db, "accounts/" + userId), {
        username,
        fname,
        mname,
        lname,
        abbrname,
        role
      });

      loadUsers();
      showSuccessModal("Account Updated", "Account updated successfully!");
      closeModal(updateModal);
    } catch (error) {
      showSuccessModal("Error", "Error updating account: " + error.message);
    }
  });
});

// -------------------- Close modal --------------------
closeUpdateModal.addEventListener("click", () => closeModal(updateModal));
cancelUpdate.addEventListener("click", () => closeModal(updateModal));

// -------------------- Init --------------------
loadUsers();
attachUpdateHandlers();
