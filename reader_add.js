import { db } from './firebase.js';
import { ref, set } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { readersData, loadReaders } from './reader.js';

document.addEventListener("DOMContentLoaded", () => {
    // -------------------- DOM Elements --------------------
    const createReaderModal = document.getElementById("createReaderModal");
    const closeCreateReaderModal = document.getElementById("closeCreateReaderModal");
    const cancelCreateReader = document.getElementById("cancelCreateReader");
    const submitCreateReader = document.getElementById("submitCreateReader");

    const newLocation = document.getElementById("newLocation");
    const Status = "Offline"
    const newScanMethod = document.getElementById("newScanMethod");

    const confirmModal = document.getElementById("confirmModal");
    const confirmYes = document.getElementById("confirmYes");
    const confirmCloseBtns = document.querySelectorAll('[data-close-modal="confirmModal"]');
    const confirmMessage = document.getElementById("confirmModalMessage");

    const successModal = document.getElementById("successModal");
    const successMessage = document.getElementById("successModalMessage");
    const successCloseBtns = document.querySelectorAll('[data-close-modal="successModal"]');

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

    // Close confirm modal when X or No is clicked
    confirmCloseBtns.forEach(btn => btn.addEventListener("click", () => closeModal(confirmModal)));

    function showSuccess(msg) {
        successMessage.textContent = msg;
        openModal(successModal);
    }

    // Close success modal when X or OK is clicked
    successCloseBtns.forEach(btn => btn.addEventListener("click", () => closeModal(successModal)));

    // -------------------- Open Create Modal --------------------
    document.getElementById("createReaderBtn").addEventListener("click", () => {
        newLocation.value = "";
        Status;
        newScanMethod.value = "Single";
        openModal(createReaderModal);
    });

    // Close/Cancel Create Modal
    closeCreateReaderModal.addEventListener("click", () => closeModal(createReaderModal));
    cancelCreateReader.addEventListener("click", () => closeModal(createReaderModal));

    // -------------------- Submit Add Reader --------------------
    submitCreateReader.addEventListener("click", () => {
        if (!newLocation.value.trim()) {
            newLocation.focus();
            newLocation.setCustomValidity("Please fill out this field.");
            newLocation.reportValidity();
            return;
        }

        // Auto-generate Reader No
        const readerNos = Object.keys(readersData);
        let nextNumber = 1;
        while (readerNos.includes(`r${nextNumber}`)) nextNumber++;
        const readerNo = `r${nextNumber}`;

        showConfirm("Are you sure you want to add this reader?", async () => {
            const data = {
                location: newLocation.value.trim(),
                status: Status,
            };
            if (newScanMethod.value === "Single") data.tag_uid = "";
            else data.tag_uids = { "1": "" };

            try {
                await set(ref(db, `readers/${readerNo}`), data);
                closeModal(createReaderModal);
                showSuccess("Reader added successfully!");
                loadReaders();
            } catch (err) {
                closeModal(createReaderModal);
                showSuccess("Error adding reader: " + err.message);
            }
        });
    });
});
