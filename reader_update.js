import { db } from './firebase.js';
import { ref, set, get } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { readersData, loadReaders } from './reader.js';

// -------------------- DOM Elements --------------------, removed the dropbox for status, set offline as default
const updateReaderModal = document.getElementById("updateReaderModal");
const closeUpdateReaderModal = document.getElementById("closeUpdateReaderModal");
const cancelUpdateReader = document.getElementById("cancelUpdateReader");
const submitUpdateReader = document.getElementById("submitUpdateReader");

const updateReaderNo = document.getElementById("updateReaderNo");
const updateLocation = document.getElementById("updateLocation");
// const updateStatus = document.getElementById("updateStatus");
const updateScanMethod = document.getElementById("updateScanMethod");

const confirmModal = document.getElementById("confirmModal");
const confirmYes = document.getElementById("confirmYes");
const confirmMessage = document.getElementById("confirmModalMessage");

const successModal = document.getElementById("successModal");
const successMessage = document.getElementById("successModalMessage");

// -------------------- Error Message --------------------
let readerNoError = document.createElement("p");
readerNoError.style.color = "red";
readerNoError.style.fontSize = "0.85rem";
readerNoError.style.margin = "2px 0 5px 0";
updateReaderNo.parentNode.insertBefore(readerNoError, updateReaderNo);

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

// -------------------- Open Update Modal --------------------
document.addEventListener("openUpdateReaderModal", (e) => {
    const readerId = e.detail.readerId;
    const data = readersData[readerId];
    if (!data) return;

    updateReaderNo.value = readerId;
    updateLocation.value = data.location || "";
//    updateStatus.value = data.status || "Offline";
    updateScanMethod.value = data.tag_uids ? "Multiple" : "Single";

    readerNoError.textContent = "";
    openModal(updateReaderModal);
});

// -------------------- Close / Cancel --------------------
closeUpdateReaderModal.addEventListener("click", () => closeModal(updateReaderModal));
cancelUpdateReader.addEventListener("click", () => closeModal(updateReaderModal));

// -------------------- Submit Update --------------------
submitUpdateReader.addEventListener("click", () => {
    if (!updateLocation.value.trim()) {
        updateLocation.focus();
        return;
    }

    const readerId = updateReaderNo.value;
    const originalData = readersData[readerId];
    if (!originalData) {
        readerNoError.textContent = "Invalid Reader No.";
        return;
    }

    const newLocationValue = updateLocation.value.trim();
//    const newStatusValue = updateStatus.value;
    const newScanMethodValue = updateScanMethod.value;

    const originalScanMethod = originalData.tag_uids ? "Multiple" : "Single";

    // Prepare updated data without losing existing tag info
    const updatedData = {
        location: newLocationValue,
//        status: newStatusValue,
    };

    if (originalScanMethod === "Single" && newScanMethodValue === "Multiple") {
        updatedData.tag_uids = originalData.tag_uid !== undefined ? { "1": originalData.tag_uid } : { "1": "" };
    } else if (originalScanMethod === "Multiple" && newScanMethodValue === "Single") {
        const firstKey = originalData.tag_uids ? Object.keys(originalData.tag_uids)[0] : null;
        updatedData.tag_uid = firstKey ? originalData.tag_uids[firstKey] : "";
    } else {
        if (originalData.tag_uid) updatedData.tag_uid = originalData.tag_uid;
        if (originalData.tag_uids) updatedData.tag_uids = originalData.tag_uids;
    }

    // -------------------- Confirm Modal --------------------
    const updateAction = async () => {
        try {
            await set(ref(db, `readers/${readerId}`), updatedData);
            closeModal(updateReaderModal);
            showSuccess("Reader updated successfully!");
            loadReaders();
        } catch (err) {
            closeModal(updateReaderModal);
            showSuccess("Error updating reader: " + err.message);
        }
    };

    // Special warning for Multiple -> Single scan method
    if (originalScanMethod === "Multiple" && newScanMethodValue === "Single") {
        showConfirm(
            "Are you sure to change the scan method from Multiple to Single? Multiple tags may be lost.",
            updateAction
        );
    } else {
        showConfirm("Are you sure you want to update this reader?", updateAction);
    }
});
