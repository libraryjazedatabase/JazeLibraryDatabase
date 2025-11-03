import { db } from './firebase.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// -------------------- DOM Elements --------------------
const adminTableBody = document.getElementById("adminTableBody");
const librarianTableBody = document.getElementById("librarianTableBody");
const librarianSection = document.getElementById("librarianSection");
const profilePopup = document.getElementById("profilePopup");
const profilePopupImg = document.getElementById("profilePopupImg");
const closeProfilePopup = document.getElementById("closeProfilePopup");

// Update Modal Elements
const updateModal = document.getElementById("updateAccountModal");

// Reusable modal references
const confirmModal = document.getElementById("confirmModal");
const confirmModalTitle = document.getElementById("confirmModalTitle");
const confirmModalMessage = document.getElementById("confirmModalMessage");
const confirmYesBtn = document.getElementById("confirmYes");

const successModal = document.getElementById("successModal");
const successModalTitle = document.getElementById("successModalTitle");
const successModalMessage = document.getElementById("successModalMessage");

//confirmation modal
export function showConfirmModal(title, message, onConfirm) {
    confirmModalTitle.textContent = title;
    confirmModalMessage.textContent = message;
    confirmModal.style.display = "flex";

 // Overwrite old click handler
    confirmYesBtn.onclick = () => {
        confirmModal.style.display = "none";
        if (typeof onConfirm === "function") onConfirm();
    };
}

// success modal

export function showSuccessModal(title, message) {
    successModalTitle.textContent = title;
    successModalMessage.textContent = message;
    successModal.style.display = "flex";
}

// close button function
document.querySelectorAll(".modal-close, [data-close-modal]").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const modalId = e.target.dataset.closeModal || e.target.closest(".modal").id;
        document.getElementById(modalId).style.display = "none";
    });
});

// -------------------- Load Users --------------------
export function loadUsers() {
    const usersRef = ref(db, "accounts");
    onValue(usersRef, (snapshot) => {
        // Clear tables first
        adminTableBody.innerHTML = "";
        librarianTableBody.innerHTML = "";
        let librarianCount = 0;

        snapshot.forEach((childSnapshot) => {
            const userId = childSnapshot.key;
            const userData = childSnapshot.val();

            // Build full name (fname mname lname abbrname)
            const fullName = `${userData.fname || ""} ${userData.mname || ""} ${userData.lname || ""} ${userData.abbrname || ""}`.trim();
            const username = userData.username || "N/A";
            const email = userData.email || "N/A";
            const role = userData.role || "unknown";

            // Profile image
            const profilePic = userData.profile_image 
                ? userData.profile_image 
                : "images/default-profile.jpg";

            // Build row
            const tr = document.createElement("tr");
            
            if (role.toLowerCase() === "admin") {
                // Admin row WITHOUT actions column
                tr.innerHTML = `
                    <td>
                        <img src="${profilePic}" 
                             alt="Profile" 
                             class="profile-pic" 
                             data-img="${profilePic}"/>
                    </td>
                    <td>${fullName || "—"}</td>
                    <td>${email}</td>
                    <td>${username}</td>
                `;
                adminTableBody.appendChild(tr);
            } else if (role.toLowerCase() === "librarian") {
                // Librarian row WITH actions column
                tr.innerHTML = `
                    <td>
                        <img src="${profilePic}" 
                             alt="Profile" 
                             class="profile-pic" 
                             data-img="${profilePic}"/>
                    </td>
                    <td>${fullName || "—"}</td>
                    <td>${email}</td>
                    <td>${username}</td>
                    <td class="actions-cell">
                        <div class="actions-wrapper">
                            <button class="action-btn update-btn" data-id="${userId}">Update</button>
                            <button class="action-btn delete-btn" data-id="${userId}">Delete</button>
                        </div>
                        </td>
                `;
                librarianTableBody.appendChild(tr);
                librarianCount++;
            }
        });

        // Show/Hide librarian section
        librarianSection.style.display = librarianCount > 0 ? "block" : "none";

        // Attach event listener for profile pictures
        document.querySelectorAll(".profile-pic").forEach(img => {
            img.addEventListener("click", (e) => {
                const src = e.target.dataset.img;
                profilePopupImg.src = src;
                profilePopup.style.display = "flex";
            });
        });
    });
}

// -------------------- Update Account Button Logic --------------------
export function attachUpdateHandlers() {
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("update-btn")) {
            const userId = e.target.dataset.id;
            document.dispatchEvent(new CustomEvent("openUpdateUserModal", { detail: { userId } }));
        }
    });
}

// -------------------- Delete Account Button Logic --------------------
export function attachDeleteHandlers() {
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-btn")) {
            const userId = e.target.dataset.id;
            document.dispatchEvent(new CustomEvent("openDeleteUserModal", { detail: { userId } }));
        }
    });
}

// -------------------- Popup Behavior --------------------
// Close when clicking the X
// update button hidden for cleaner setup
closeProfilePopup.addEventListener("click", () => {
    profilePopup.style.display = "none";
});

// Close Delete Modal (Cancel button + X)
document.getElementById("cancelDeleteAccount").addEventListener("click", () => {
  document.getElementById("deleteAccountModal").style.display = "none";
});

document.getElementById("closeDeleteAccountModal").addEventListener("click", () => {
  document.getElementById("deleteAccountModal").style.display = "none";
});


// Close when clicking outside the popup content
profilePopup.addEventListener("click", (e) => {
    if (e.target === profilePopup) {
        profilePopup.style.display = "none";
    }
});

// Close when pressing ESC
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && profilePopup.style.display === "flex") {
        profilePopup.style.display = "none";
    }
});

// -------------------- Init --------------------
loadUsers();
attachUpdateHandlers();
attachDeleteHandlers();
