import { db } from './firebase.js';
import { ref, remove, get, onValue } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { loadBorrowers } from './borrower_users.js';

document.addEventListener("DOMContentLoaded", () => {

    // -------------------- DOM Elements --------------------
    const deleteModal = document.getElementById("deleteBorrowerModal");
    const deleteMessage = document.getElementById("deleteBorrowerModalMessage");
    const deleteConfirmBtn = document.getElementById("deleteConfirmYes");
    const deleteCloseBtns = document.querySelectorAll('[data-close-modal="deleteBorrowerModal"]');

    const successModal = document.getElementById("successModal");
    const successMessage = document.getElementById("successModalMessage");
    const successCloseBtns = document.querySelectorAll('[data-close-modal="successModal"]');

    let selectedBorrowerId = null;

    // -------------------- Helpers --------------------
    const openModal = () => deleteModal.style.display = "flex";
    const closeModal = () => deleteModal.style.display = "none";
    const showSuccess = (msg) => { successMessage.textContent = msg; successModal.style.display = "flex"; };

    deleteCloseBtns.forEach(btn => btn.onclick = closeModal);
    successCloseBtns.forEach(btn => btn.onclick = () => successModal.style.display = "none");

    // -------------------- Updated: Load Borrow History --------------------
    let allHistory = {}; // store history for synchronous check
    const historyRef = ref(db, "borrow_history");
    onValue(historyRef, (snapshot) => {
        allHistory = snapshot.val() || {};
    });

    // -------------------- Updated: Check if borrower has active borrows --------------------
    function hasActiveBorrower(borrowerId) {
        return Object.values(allHistory).some(bookRecords =>
            Object.values(bookRecords).some(record =>
                record.borrower_id === borrowerId && (!record.return_date || record.return_date.trim() === "")
            )
        );
    }

    // -------------------- Listen for Delete Button --------------------
    document.addEventListener("openDeleteBorrowerModal", (e) => {
        selectedBorrowerId = e.detail.borrowerId;
        if (!selectedBorrowerId) return;

        if (hasActiveBorrower(selectedBorrowerId)) {
            deleteMessage.textContent = "Cannot delete borrower: currently has borrowed books.";
            deleteConfirmBtn.disabled = true;
            deleteConfirmBtn.style.background = "gray";
            deleteConfirmBtn.style.cursor = "not-allowed";
        } else {
            deleteMessage.textContent = "Are you sure you want to delete this borrower? This action cannot be undone.";
            deleteConfirmBtn.disabled = false;
            deleteConfirmBtn.style.background = ""; // reset
            deleteConfirmBtn.style.cursor = "pointer";
        }

        openModal();
    });

    // -------------------- Confirm Delete --------------------
    deleteConfirmBtn.addEventListener("click", async () => {
        if (!selectedBorrowerId) return;

        try {
            await remove(ref(db, "borrower/" + selectedBorrowerId));
            closeModal();
            loadBorrowers(); // refresh table
            showSuccess("Borrower deleted successfully!");
            selectedBorrowerId = null;
        } catch (err) {
            console.error(err);
            closeModal();
            showSuccess("Error deleting borrower: " + err.message);
        }
    });

});
