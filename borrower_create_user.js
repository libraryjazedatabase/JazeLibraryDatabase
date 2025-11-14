import { db } from './firebase.js';
import { ref, onValue, set, get , update} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { loadBorrowers } from './borrower_users.js';

document.addEventListener("DOMContentLoaded", () => {

    // -------------------- DOM Elements --------------------
    const createModal = document.getElementById("createBorrowerModal");
    const closeCreateModal = document.getElementById("closeCreateBorrowerModal");
    const cancelCreate = document.getElementById("cancelCreateBorrower");
    const submitCreate = document.getElementById("submitCreateBorrower");
    const createBtn = document.getElementById("createBorrowerBtn");

    const idCardInput = document.getElementById("newBorrowerIDCard");
    const fnameInput = document.getElementById("newBorrowerFname");
    const mnameInput = document.getElementById("newBorrowerMname");
    const lnameInput = document.getElementById("newBorrowerLname");
    const abbrInput = document.getElementById("newBorrowerAbbrname");
    const emailInput = document.getElementById("newBorrowerEmail");
    const levelSelect = document.getElementById("newBorrowerLevel");
    const courseSelect = document.getElementById("newBorrowerCourse");
    const yearSelect = document.getElementById("newBorrowerYear");

    const idCardError = document.getElementById("idCardError");

    const confirmModal = document.getElementById("confirmModal");
    const confirmYesBtn = document.getElementById("confirmYes");
    const confirmNoBtns = document.querySelectorAll('[data-close-modal="confirmModal"]');
    const confirmMessage = document.getElementById("confirmModalMessage");

    const successModal = document.getElementById("successModal");
    const successMessage = document.getElementById("successModalMessage");
    const successCloseBtns = document.querySelectorAll('[data-close-modal="successModal"]');

    // -------------------- Helpers --------------------
    const openModal = () => createModal.style.display = "flex";
    const closeModal = () => createModal.style.display = "none";
    const showConfirm = (msg) => { confirmMessage.textContent = msg; confirmModal.style.display = "flex"; };
    const hideConfirm = () => confirmModal.style.display = "none";
    const showSuccess = (msg) => { successMessage.textContent = msg; successModal.style.display = "flex"; };
    const hideSuccess = () => successModal.style.display = "none";

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

    // -------------------- Reset Form --------------------
    function resetForm() {
        idCardInput.value = ""; // clear ID input
        fnameInput.value = ""; mnameInput.value = ""; lnameInput.value = ""; abbrInput.value = ""; 
        emailInput.value = ""; levelSelect.value = ""; 
        courseSelect.innerHTML = `<option value="">Select course</option>`;
        yearSelect.innerHTML = `<option value="">Select year</option>`;
        idCardError.textContent = "";
    }

    // -------------------- Validate Fields --------------------
    function validateFields() {
        const required = [idCardInput, fnameInput, lnameInput, emailInput, levelSelect];

        if(levelSelect.value !== "Visitor") required.push(yearSelect);

        for(const input of required) {
            const wasDisabled = input.disabled;
            if(wasDisabled) input.disabled = false;

            input.setCustomValidity("");
            if(!input.value.trim()){
                input.setCustomValidity("Please fill out this field.");
                input.reportValidity();
                input.focus();
                if(wasDisabled) input.disabled = true;
                return false;
            }

            if(wasDisabled) input.disabled = true;
        }
        return true;
    }

    // -------------------- Real-time R3 Reader --------------------
//    const r3Ref = ref(db, "readers/r3/tag_uid");
//    onValue(r3Ref, snapshot => {
//        const tagVal = snapshot.val() || "";
//        idCardInput.value = tagVal;
//   });

    // -------------------- Open Modal --------------------
    createBtn.addEventListener("click", async() => {
        resetForm();
        openModal();

        await update(ref(db, 'readers/r3'), { card_type: "borrowers_card" , function: "write"});
    });

    // -------------------- Close Modal --------------------
    closeCreateModal.addEventListener("click", closeModal);
    cancelCreate.addEventListener("click", async() => { 
        closeModal(); 
        resetForm(); 
    
        await update(ref(db, 'readers/r3'), { card_type: "", tag_uid: "" })
    });

    // -------------------- Submit Borrower --------------------
    submitCreate.addEventListener("click", async () => {
        if (!validateFields()) return;

        const tag_uid = idCardInput.value.trim();
        const emailVal = emailInput.value.trim().toLowerCase();

    if (!tag_uid) {
        idCardError.textContent = "Please enter the Borrower ID (Tag UID).";
        return;
    }

        const snapshot = await get(ref(db, "borrower"));
        const borrowers = snapshot.val() || {};

        let dupTag = false, dupEmail = false;
        Object.values(borrowers).forEach(b => {
           if(b.tag_uid === tag_uid) dupTag = true;
            if(b.email && b.email.toLowerCase() === emailVal) dupEmail = true;
        });

        if(dupTag && dupEmail){
            idCardError.textContent = "This Borrower ID and email are already in the database.";
        } else if(dupTag){
            idCardError.textContent = "This Borrower ID is already in the database.";
        } else if(dupEmail){
            idCardError.textContent = "This email is already in the database.";
        } else {
            idCardError.textContent = "";
        }

        if(dupTag || dupEmail) return;

        showConfirm("Are you sure you want to create this borrower?");
    });

    // -------------------- Confirm Modal Yes --------------------
    confirmYesBtn.addEventListener("click", async () => {
        hideConfirm();

        const tag_uid = idCardInput.value.trim();
        const borrowerData = {
//          tag_uid,
            fname: fnameInput.value.trim(),
            mname: mnameInput.value.trim(),
            lname: lnameInput.value.trim(),
            abbrname: abbrInput.value.trim(),
            email: emailInput.value.trim().toLowerCase(),
            level: levelSelect.value
        };

        // Only include course/year if they are not "----"
        if(courseSelect.value !== "----") borrowerData.course = courseSelect.value;
        if(yearSelect.value !== "----") borrowerData.year = yearSelect.value;

        try {
            await set(ref(db, "borrower/" + tag_uid), borrowerData);
            await set(ref(db, "readers/r3/tag_uid"), tag_uid);
            loadBorrowers();
            closeModal();
            resetForm();
            showSuccess("Borrower created successfully! Put Card on R3 to update card info");
        } catch(err) {
            console.error(err);
            showSuccess("Error creating borrower: " + err.message);
        }
    });

    confirmNoBtns.forEach(btn => btn.onclick = hideConfirm);
    successCloseBtns.forEach(btn => btn.onclick = hideSuccess);

});
