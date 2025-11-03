import { db } from './firebase.js';
import { ref, get, remove } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { loadUsers, showConfirmModal, showSuccessModal } from './accounts_users.js';

// -------------------- DOM Elements --------------------
const deleteModal = document.getElementById("deleteAccountModal");
const closeDeleteModal = document.getElementById("closeDeleteAccountModal");
const cancelDelete = document.getElementById("cancelDeleteAccount");
const confirmDeleteBtn = document.getElementById("confirmDeleteAccount");

// Preview fields in modal
const deleteProfilePic = document.getElementById("deleteProfilePic");
const deleteFullName = document.getElementById("deleteFullName");
const deleteEmail = document.getElementById("deleteEmail");
const deleteUsername = document.getElementById("deleteUsername");
const deleteRole = document.getElementById("deleteRole");

// -------------------- Helper functions --------------------
const openModal = (modal) => {
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
};
const closeModal = (modal) => {
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
};

// -------------------- Listen for custom event --------------------
document.addEventListener("openDeleteUserModal", async (e) => {
  const { userId } = e.detail;

  const userRef = ref(db, "accounts/" + userId);
  const snapshot = await get(userRef);
  if (!snapshot.exists()) return;

  const userData = snapshot.val();

  // Store userId on modal for later use
  deleteModal.dataset.userid = userId;

  // Populate modal preview fields
  deleteProfilePic.src = userData.profile_image || "images/default-profile.jpg";
  const fullName = `${userData.fname || ""} ${userData.mname || ""} ${userData.lname || ""} ${userData.abbrname || ""}`.trim();
  deleteFullName.textContent = fullName || "—";
  deleteEmail.textContent = userData.email || "—";
  deleteUsername.textContent = userData.username || "Unknown";
  deleteRole.textContent = userData.role || "Unknown";

  openModal(deleteModal);
});

// -------------------- Close modal --------------------
closeDeleteModal.addEventListener("click", () => closeModal(deleteModal));
cancelDelete.addEventListener("click", () => closeModal(deleteModal));

// -------------------- Confirm delete --------------------
confirmDeleteBtn.addEventListener("click", () => {
  const userId = deleteModal.dataset.userid;
  if (!userId) return;

  showConfirmModal("Confirm Deletion", "Are you sure you want to delete this account?", async () => {
    try {
      // Delete user from Firebase Database
      await remove(ref(db, "accounts/" + userId));

      // Refresh users table
      loadUsers();

      showSuccessModal("Account Deleted", "The account has been successfully deleted!");
      closeModal(deleteModal);
    } catch (error) {
      showSuccessModal("Error", "Error deleting account: " + error.message);
    }
  });
});
