import { db } from './firebase.js';
import { ref, remove } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { readersData, loadReaders } from './reader.js';

// -------------------- DOM Elements --------------------
const deleteReaderModal = document.getElementById("deleteReaderModal");
const deleteReaderNo = document.getElementById("deleteReaderNo");
const deleteLocation = document.getElementById("deleteLocation");
const deleteStatus = document.getElementById("deleteStatus");
const deleteTagUid = document.getElementById("deleteTagUid");
const cancelDeleteReader = document.getElementById("cancelDeleteReader");
const confirmDeleteReader = document.getElementById("confirmDeleteReader");

const confirmModal = document.getElementById("confirmModal");
const confirmYes = document.getElementById("confirmYes");
const confirmMessage = document.getElementById("confirmModalMessage");

const successModal = document.getElementById("successModal");
const successMessage = document.getElementById("successModalMessage");

// -------------------- Helper Functions --------------------
function openModal(modal) { modal.style.display = "flex"; }
function closeModal(modal) { modal.style.display = "none"; }

let confirmCallback = null;
function showConfirm(msg, callback) {
    confirmMessage.textContent = msg;
    confirmCallback = callback;
    openModal(confirmModal);
}
confirmYes.addEventListener("click", async () => {
    if (confirmCallback) {
        const cb = confirmCallback;
        confirmCallback = null;
        closeModal(confirmModal);
        await cb();
    }
});

function showSuccess(msg) {
    successMessage.textContent = msg;
    openModal(successModal);
}

// -------------------- Open Delete Reader Modal --------------------
document.addEventListener("click", (e) => {
    const readerId = e.target.dataset.id;
    if (e.target.classList.contains("delete-btn") && !e.target.disabled) {
        const data = readersData[readerId];
        if (!data) return;

        // Populate delete modal with reader details
        deleteReaderNo.textContent = readerId;
        deleteLocation.textContent = data.location || "N/A";
        deleteStatus.textContent = data.status || "Offline";
        if (data.tag_uid) {
    // Single tag mode
    deleteTagUid.textContent = data.tag_uid || "None";
} else if (data.tag_uids) {
    // Multiple tag mode
    const tags = Object.entries(data.tag_uids).map(([key, value]) => {
        return `${key}: ${value.trim() || "None"}`;
    });
    deleteTagUid.textContent = tags.join("\n");
} else {
    deleteTagUid.textContent = "None";
}


        openModal(deleteReaderModal);

        // Attach confirm handler
        const deleteHandler = () => {
            showConfirm(`Are you sure you want to delete reader ${readerId}? Deleting this reader may make associated tags unscannable.`, async () => {
                try {
                    await remove(ref(db, `readers/${readerId}`));
                    closeModal(deleteReaderModal);
                    showSuccess("Reader deleted successfully!");
                    loadReaders();
                } catch (err) {
                    closeModal(deleteReaderModal);
                    showSuccess("Error deleting reader: " + err.message);
                }
            });
        };

        // Remove previous event listeners to prevent duplicates
        const newConfirmHandler = () => deleteHandler();
        confirmDeleteReader.replaceWith(confirmDeleteReader.cloneNode(true));
        document.getElementById("confirmDeleteReader").addEventListener("click", newConfirmHandler);
    }
});

// -------------------- Cancel Delete --------------------
cancelDeleteReader.addEventListener("click", () => closeModal(deleteReaderModal));

// Close Delete Reader Modal when X is clicked
const closeDeleteReaderModal = document.querySelector("#deleteReaderModal .modal-close");
closeDeleteReaderModal.addEventListener("click", () => closeModal(deleteReaderModal));

