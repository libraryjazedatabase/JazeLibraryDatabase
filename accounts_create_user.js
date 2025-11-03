import { loadUsers, showConfirmModal, showSuccessModal } from "./accounts_users.js";
import { auth, db } from "./firebase.js";
import { ref, set, get, child } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

loadUsers();

document.addEventListener("DOMContentLoaded", () => {
  // ---- Create Account Modal ----
  const createAccountBtn = document.getElementById("createAccountBtn");
  const createAccountModal = document.getElementById("createAccountModal");
  const closeCreateAccountModal = document.getElementById("closeCreateAccountModal");
  const cancelCreateAccount = document.getElementById("cancelCreateAccount");
  const submitCreateAccount = document.getElementById("submitCreateAccount");
  const addAccountForm = document.getElementById("addAccountForm");
  const accountError = document.getElementById("accountError"); //---for the error message

  

  // Helper functions for open/close
  const openModal = (modal) => {
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");

  // Clear previous error when modal opens 
  accountError.style.display = "none";
  accountError.textContent = "";

  };
  const closeModal = (modal) => {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    clearForm(); // Clear inputs whenever modal is closed

  // Clear error when modal closes ----
  accountError.style.display = "none";
  accountError.textContent = "";
  };

  // Clear all form fields
  const clearForm = () => {
    addAccountForm.reset(); // resets values to defaults (librarian for role)
  };

  // Open Create Account form
  createAccountBtn.addEventListener("click", () => openModal(createAccountModal));

  // Close Create Account form
  closeCreateAccountModal.addEventListener("click", () => closeModal(createAccountModal));
  cancelCreateAccount.addEventListener("click", () => closeModal(createAccountModal));

  // Handle Create Account Submit
  submitCreateAccount.addEventListener("click", async () => {
    // Validate form
    if (!addAccountForm.checkValidity()) {
      addAccountForm.reportValidity(); // shows built-in browser errors
      return;
    }

    const username = document.getElementById("newUsername").value.trim();
    const email = document.getElementById("newEmail").value.trim();
    const password = document.getElementById("newPassword").value.trim();
    const role = document.getElementById("newRole").value;

  // Hide error on typing 
const newUsername = document.getElementById("newUsername");
const newEmail = document.getElementById("newEmail");

[newUsername, newEmail].forEach(input => {
  input.addEventListener("input", () => {
    if (accountError.style.display === "block") {
      accountError.style.display = "none";
      accountError.textContent = "";
    }
  });
});


//Check if username or email exists 
try {
  const dbRef = ref(db);
  const snapshot = await get(child(dbRef, "accounts"));
  if (snapshot.exists()) {
    const accounts = snapshot.val();

// Check if username is taken
    const usernameExists = Object.values(accounts).some(acc => acc.username === username);
    if (usernameExists) {
      accountError.textContent = "This username is already taken.";
      accountError.style.display = "block";
      return;
    }

// Check if email is taken
    const emailExists = Object.values(accounts).some(acc => acc.email === email);
    if (emailExists) {
      accountError.textContent = "This email is already registered.";
      accountError.style.display = "block";
      return;
    }
  }
} catch (err) {
  accountError.textContent = "Error checking username/email. Try again.";
  accountError.style.display = "block";
  return;
}


// If validation passes, show confirm modal
    showConfirmModal(
      "Confirm Account Creation",
      "Are you sure you want to create this account?",
      async () => {
        try {
// Create user in Firebase Auth
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const uid = userCredential.user.uid;

          const profileBase64 = await getDefaultProfileBase64();
// Save details in Realtime Database
          await set(ref(db, "accounts/" + uid), {
            username,
            email,
            role,
            abbrname: "",
            fname: "",
            lname: "",
            mname: "",
            profile_image: profileBase64,
            recovery_question: "",
            recovery_answer: ""
          });

// Show success modal (reused)
          showSuccessModal("Account Created", "Account created successfully!");

// Close Create Account form
          closeModal(createAccountModal);

        } catch (error) {
          showSuccessModal("Error", "Error creating account: " + error.message);
        }
      }
    );
  });
});

// setting default profile pictures
async function getDefaultProfileBase64() {
  const response = await fetch("images/default-profile.jpg");
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}