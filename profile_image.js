import { db, auth } from './firebase.js';
import { ref, update, get } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

const uploadProfileBtn = document.getElementById('uploadProfileBtn');
const fileInput = document.getElementById('fileInput');
const profileImage = document.getElementById('profileImage');
const cancelUploadBtn = document.getElementById('cancelUploadBtn');
const saveUploadBtn = document.getElementById('saveUploadBtn');
const uploadActionBtns = document.getElementById('uploadActionBtns');

// Confirm modal elements
const confirmModal = document.getElementById('confirmModal');
const confirmYesBtn = document.getElementById('confirmYesBtn');
const confirmModalBody = confirmModal.querySelector('.modal-body');

// Success modal elements
const successModal = document.getElementById('successModal');
const successModalBody = successModal.querySelector('.modal-body');

let currentUserUID = null;
let tempBase64Image = null;
let originalProfileImage = 'images/default-profile.jpg'; // fallback
let pendingAction = null;

// Load Firebase Auth user
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserUID = user.uid;
    try {
      const snapshot = await get(ref(db, 'accounts/' + currentUserUID));
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.profile_image) {
          profileImage.src = data.profile_image;
          originalProfileImage = data.profile_image;
        }
      }
    } catch (err) {
      console.error("Error fetching profile image:", err);
    }
  } else {
    console.warn("No user signed in.");
  }
});

// Trigger file selection
uploadProfileBtn.addEventListener('click', (e) => {
  e.preventDefault();
  fileInput.click();
});

// Preview selected image
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onloadend = () => {
    tempBase64Image = reader.result;
    profileImage.src = tempBase64Image;

    uploadProfileBtn.style.display = 'none';
    uploadActionBtns.style.display = 'flex';
  };
  reader.readAsDataURL(file);
});

// Cancel selection
cancelUploadBtn.addEventListener('click', () => {
  fileInput.value = '';
  tempBase64Image = null;
  profileImage.src = originalProfileImage;

  uploadActionBtns.style.display = 'none';
  uploadProfileBtn.style.display = 'inline-block';
  pendingAction = null;
});

// Save button click: show confirm modal
saveUploadBtn.addEventListener('click', () => {
  if (!tempBase64Image) return;
  if (!currentUserUID) return alert("No authenticated user found. Please log in.");

  pendingAction = 'profileImage';
  confirmModalBody.textContent = "Are you sure you want to save this profile image?";
  confirmModal.classList.add('open');
});

// Confirm Yes Inside modal
confirmYesBtn.addEventListener('click', async () => {
  if (!pendingAction) return;

  if (pendingAction === 'profileImage') {
    if (!currentUserUID || !tempBase64Image) return;

    try {
      await update(ref(db, 'accounts/' + currentUserUID), { profile_image: tempBase64Image });

      originalProfileImage = tempBase64Image;
      tempBase64Image = null;
      profileImage.src = originalProfileImage;

      uploadActionBtns.style.display = 'none';
      uploadProfileBtn.style.display = 'inline-block';

      // Show success modal
      successModalBody.textContent = "Profile image updated successfully!";
      successModal.classList.add('open');
    } catch (error) {
      console.error("Error updating profile image:", error);
    } finally {
      pendingAction = null;
      confirmModal.classList.remove('open');
    }
  }
});

// Close confirm modal on "No" or "×"
document.querySelectorAll('[data-close-modal="confirmModal"]').forEach(btn => {
  btn.addEventListener('click', () => {
    pendingAction = null;
    confirmModal.classList.remove('open');
  });
});

// Close success modal on OK or ×
document.querySelectorAll('[data-close-modal="successModal"]').forEach(btn => {
  btn.addEventListener('click', () => {
    successModal.classList.remove('open');
  });
});

// Close modal by clicking outside
window.addEventListener('click', (e) => {
  if (e.target === confirmModal) {
    pendingAction = null;
    confirmModal.classList.remove('open');
  } else if (e.target === successModal) {
    successModal.classList.remove('open');
  }
});