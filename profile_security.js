import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } 
from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

const editPasswordBtn = document.getElementById('editPasswordBtn');
const passwordDisplay = document.getElementById('passwordDisplay');

const modalCurrentPasswordPwd = document.getElementById('modalCurrentPasswordPwd');
const modalNewPassword1Pwd = document.getElementById('modalNewPassword1Pwd');
const modalNewPassword2Pwd = document.getElementById('modalNewPassword2Pwd');
const passwordError = document.getElementById('passwordError');
const savePasswordBtn = document.getElementById('savePasswordBtn');

const confirmModal = document.getElementById('confirmModal');
const confirmYesBtn = confirmModal.querySelector('[data-yes]');
const successModal = document.getElementById('successModal');
const successModalBody = successModal?.querySelector('.modal-body');

/* ----- Modal Helpers ----- */
window.openModal = function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
};
window.closeModal = function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
};

/* ----- Open Password Modal ----- */
editPasswordBtn.addEventListener('click', () => {
  modalCurrentPasswordPwd.value = '';
  modalNewPassword1Pwd.value = '';
  modalNewPassword2Pwd.value = '';
  passwordError.style.display = 'none';
  window.pendingConfirmAction = null;

  window.openModal('editPasswordModal');
});

/* ----- Save Password (set pending confirm action) ----- */
savePasswordBtn.addEventListener('click', () => {
  const currentPwd = modalCurrentPasswordPwd.value.trim();
  const newPwd1 = modalNewPassword1Pwd.value.trim();
  const newPwd2 = modalNewPassword2Pwd.value.trim();

  // Validation
  if (!currentPwd || !newPwd1 || !newPwd2) {
    passwordError.textContent = 'All fields are required.';
    passwordError.style.display = 'block';
    return;
  }
  if (newPwd1 !== newPwd2) {
    passwordError.textContent = 'Passwords do not match.';
    passwordError.style.display = 'block';
    return;
  }

  // Set pending confirm action
  window.pendingConfirmAction = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    try {
      const cred = EmailAuthProvider.credential(user.email, currentPwd);
      await reauthenticateWithCredential(user, cred);

      await updatePassword(user, newPwd1);
      passwordDisplay.textContent = '********';

      window.closeModal('editPasswordModal');
      window.closeModal('confirmModal');

      if (successModal) {
        successModalBody.textContent = "Security info updated successfully!";
        window.openModal('successModal');
      }

} catch (err) {
  console.error('Password update error:', err);
  window.closeModal('confirmModal');

  let message = 'Password update failed. Please try again later.';

  switch (err.code) {
    case 'auth/wrong-password':
      message = 'Incorrect current password.';
      break;
    case 'auth/invalid-credential':
      message = 'Incorrect current password.';
      break;
    case 'auth/weak-password':
      message = 'New password is too weak (minimum 6 characters).';
      break;
    case 'auth/requires-recent-login':
      message = 'Please log in again before updating your password.';
      break;
    case 'auth/network-request-failed':
      message = 'Network error. Please check your internet connection.';
      break;
    default:
      message = 'Password update failed. Please try again later.';
  }

  passwordError.textContent = message;
  passwordError.style.display = 'block';
} finally {
  window.pendingConfirmAction = null;
}


  };

  // Open confirm modal
  // Update confirm modal message before opening
const confirmBody = confirmModal.querySelector('.modal-body');
if (confirmBody) {
  confirmBody.textContent = "Are you sure you want to update your password?";
}

// Open confirm modal
window.openModal('confirmModal');

});

/* ----- Confirm Yes Handler ----- */
confirmYesBtn.addEventListener('click', async () => {
  if (typeof window.pendingConfirmAction === 'function') {
    await window.pendingConfirmAction();
  }
});

/* ----- Close confirm modal on "No" or "×" ----- */
document.querySelectorAll('[data-close-modal="confirmModal"]').forEach(btn => {
  btn.addEventListener('click', () => {
    window.closeModal('confirmModal');
    window.pendingConfirmAction = null;
  });
});

/* ----- Close success modal on OK or × ----- */
document.querySelectorAll('[data-close-modal="successModal"]').forEach(btn => {
  btn.addEventListener('click', () => {
    successModal.classList.remove('open');
  });
});

// Close modals with Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
  }
});
