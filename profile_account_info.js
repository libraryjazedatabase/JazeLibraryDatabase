import { db } from './firebase.js';
import { ref, get, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

/* ----- Elements ----- */
const editBtn = document.getElementById('editAccountBtn');
const usernameDisplay = document.getElementById('usernameDisplay');
const fullNameDisplay = document.getElementById('fullNameDisplay');
const sidebarUsername = document.getElementById('sidebarUsername');

const modalUsername = document.getElementById('modalUsername');
const modalFname = document.getElementById('modalFname');
const modalMname = document.getElementById('modalMname');
const modalLname = document.getElementById('modalLname');
const modalAbbrname = document.getElementById('modalAbbrname');

const openConfirmSave = document.getElementById('openConfirmSave');
const confirmModal = document.getElementById('confirmModal');
const confirmYesBtn = document.getElementById('confirmYesBtn'); // FIXED
const successModal = document.getElementById('successModal');
const successModalBody = successModal?.querySelector('.modal-body');



/* ----- User ID ----- */
const userData = JSON.parse(localStorage.getItem("user"));
if (!userData || !userData.uid) window.location.href = "login.html";
const userIdLocal = userData.uid;

/* ----- Modal Helpers ----- */
window.openModal = function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
};
window.closeModal = function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
};

/* ----- Prefill Modal ----- */
editBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    const snap = await get(ref(db, 'accounts/' + userIdLocal));
    if (!snap.exists()) return console.error('User record not found.');
    const data = snap.val();

    modalUsername.value = (data.username || '').trim();
    modalFname.value    = (data.fname    || '').trim();
    modalMname.value    = (data.mname    || '').trim();
    modalLname.value    = (data.lname    || '').trim();
    modalAbbrname.value = (data.abbrname || '').trim();

    window.openModal('editAccountModal');
  } catch (err) {
    console.error('Failed to load user data for edit modal:', err);
  }
});

// Hide error while typing ---
modalUsername.addEventListener('input', () => {
  if (profileError.style.display === 'block') {
    profileError.style.display = 'none';
    profileError.textContent = '';
  }
});

openConfirmSave.addEventListener('click', async() => {
  if (!modalUsername.value.trim()) {
    modalUsername.focus();
    modalUsername.style.borderColor = '#e74c3c';
    setTimeout(() => (modalUsername.style.borderColor = ''), 900);
    return;
  }

const newUsername = modalUsername.value.trim();

// Check if username already exists 
try {
  const snap = await get(ref(db, 'accounts'));
  if (snap.exists()) {
    const accounts = snap.val();
    // Check if the username belongs to another account
    const usernameTaken = Object.entries(accounts).some(([key, acc]) =>
      acc.username === newUsername && key !== userIdLocal
    );

    if (usernameTaken) {
      profileError.textContent = "This username is already taken.";
      profileError.style.display = 'block';
      modalUsername.focus();
      return;
    }
  }
} catch (err) {
  console.error('Error checking username availability:', err);
  profileError.textContent = "Error checking username. Try again.";
  profileError.style.display = 'block';
  return;
}


  // Set pending confirm action
  window.pendingConfirmAction = async () => {
    try {
      const newUsername = modalUsername.value.trim();
      const fname = modalFname.value.trim();
      const mname = modalMname.value.trim();
      const lname = modalLname.value.trim();
      const abbrname = modalAbbrname.value.trim();

      await update(ref(db, 'accounts/' + userIdLocal), {
        username: newUsername,
        fname,
        mname,
        lname,
        abbrname
      });

      usernameDisplay.textContent = newUsername;
      sidebarUsername.textContent = newUsername;
      const nameParts = [fname, mname, lname, abbrname].filter(Boolean);
      fullNameDisplay.textContent = nameParts.length ? nameParts.join(' ') : 'No name set';

      window.closeModal('editAccountModal');
      window.closeModal('confirmModal');

      // Show success modal
      if (successModal) {
        successModalBody.textContent = "Account info updated successfully!";
        window.openModal('successModal');
      }

      userData.username = newUsername;
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (err) {
      console.error('Failed to save profile changes:', err);
      window.closeModal('editAccountModal');
      window.closeModal('confirmModal');
    } finally {
      window.pendingConfirmAction = null;
    }
  };

  window.openModal('confirmModal');
});

/* ----- Confirm Yes Handler ----- */
confirmYesBtn.addEventListener('click', async () => {
  if (typeof window.pendingConfirmAction === 'function') {
    await window.pendingConfirmAction();
  }
});

/* ----- Close modals ----- */
document.querySelectorAll('.modal').forEach(modal => {
  const content = modal.querySelector('.modal-content');

  if (content) {
    content.addEventListener('click', e => e.stopPropagation());
  }

  // Close only when pressing X or Cancel buttons
  modal.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => modal.classList.remove('open'));
  });
});

/* ----- Escape key closes modals ----- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
  }
});

/* ----- Prevent closing when clicking outside any modal ----- */
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', e => {
    // Stop ALL outside click close actions globally
    e.stopPropagation();
  });
});
