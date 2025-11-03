import { db } from './firebase.js';
import { ref, get, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { getAuth, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

const editRecoveryBtn = document.getElementById('editRecoveryBtn');
const recoveryQuestionDisplay = document.getElementById('recoveryQuestionDisplay');
const recoveryAnswerDisplay   = document.getElementById('recoveryAnswerDisplay');
const modalRecoveryQuestion   = document.getElementById('modalRecoveryQuestion');
const modalRecoveryAnswer     = document.getElementById('modalRecoveryAnswer');
const modalRecoveryPassword   = document.getElementById('modalRecoveryPassword');
const recoveryPwdError        = document.getElementById('recoveryPwdError');
const openConfirmSaveRecovery = document.getElementById('openConfirmSaveRecovery');

const confirmModal = document.getElementById('confirmModal');
const confirmYesBtn = confirmModal.querySelector('[data-yes]');
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

/* ----- Clear password error on input ----- */
modalRecoveryPassword?.addEventListener('input', () => {
  recoveryPwdError.style.display = 'none';
});

/* ----- Prefill Recovery Modal ----- */
editRecoveryBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    const snap = await get(ref(db, `accounts/${userIdLocal}`));
    if (!snap.exists()) return console.error("User record not found.");

    const data = snap.val();
    modalRecoveryQuestion.value = (data.recovery_question || '').trim();
    modalRecoveryAnswer.value   = (data.recovery_answer || '').trim();
    modalRecoveryPassword.value = '';
    recoveryPwdError.style.display = 'none';

    window.openModal('editRecoveryModal');
  } catch (err) {
    console.error('Failed to load recovery info:', err);
  }
});

/* ----- Save Recovery Changes ----- */
openConfirmSaveRecovery.addEventListener('click', () => {
  const question = modalRecoveryQuestion.value.trim();
  const answer   = modalRecoveryAnswer.value.trim();
  const pwd      = modalRecoveryPassword.value.trim();

  if (!question || !answer) {
    recoveryPwdError.textContent = 'Both recovery fields are required!';
    recoveryPwdError.style.display = 'block';
    return;
  }
  if (!pwd) {
    recoveryPwdError.textContent = 'Please enter your current password to confirm.';
    recoveryPwdError.style.display = 'block';
    return;
  }

  // Set pending confirm action
  window.pendingConfirmAction = async () => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      recoveryPwdError.textContent = 'Session expired. Please log in again.';
      recoveryPwdError.style.display = 'block';
      window.location.href = 'login.html';
      return;
    }

    try {
      const cred = EmailAuthProvider.credential(currentUser.email, pwd);
      await reauthenticateWithCredential(currentUser, cred);

      await update(ref(db, `accounts/${userIdLocal}`), {
        recovery_question: question,
        recovery_answer: answer
      });

      recoveryQuestionDisplay.textContent = question || "Not set";
      recoveryAnswerDisplay.textContent   = answer ? "********" : "Not set";

      window.closeModal('editRecoveryModal');
      window.closeModal('confirmModal');

      if (successModal) {
        successModalBody.textContent = "Recovery info updated successfully!";
        window.openModal('successModal');
      }

    } catch (err) {
      recoveryPwdError.textContent = 'Incorrect password, please try again.';
      recoveryPwdError.style.display = 'block';
      console.error('Failed to save recovery info:', err);
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

/* ----- Close modals on click or overlay ----- */
document.querySelectorAll('.modal').forEach(modal => {
  const content = modal.querySelector('.modal-content');
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
  if (content) content.addEventListener('click', e => e.stopPropagation());
  modal.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => modal.classList.remove('open')));
});

/* ----- Escape key closes modals ----- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
});
