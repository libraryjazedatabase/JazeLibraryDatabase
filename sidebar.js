// -------------------- Sidebar --------------------
const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');
const sidebarUsername = document.getElementById('sidebarUsername'); // Sidebar username element

// Firebase and Auth initialization
import { db, auth } from './firebase.js';
import { get, ref } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js';

// Hamburger menu functionality
hamburger.addEventListener('click', () => {
  if (window.innerWidth > 768) {
    sidebar.classList.toggle('hidden');
  } else {
    sidebar.classList.toggle('active');
  }
});

// Adjust the sidebar visibility on window resize
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    sidebar.classList.remove('hidden', 'active');
  } else {
    sidebar.classList.add('hidden');
  }
});

// Hide the sidebar for smaller screens
if (window.innerWidth <= 768) sidebar.classList.add('hidden');

// Fetch user data and update the sidebar username
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html"; // redirect if not logged in
    return;
  }

  const userUID = user.uid;

  // Fetch user data from Firebase Realtime Database
  get(ref(db, 'accounts/' + userUID))
    .then(snapshot => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        // Set the sidebar username dynamically
        sidebarUsername.textContent = userData.username || "Username";
      } else {
        console.error("User data not found in 'accounts/'.");
      }
    })
    .catch(error => {
      console.error("Error fetching user data:", error);
    });
});
