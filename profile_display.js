import { db } from './firebase.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// Get logged-in user from localStorage (as saved by login)
const userData = JSON.parse(localStorage.getItem("user"));
if (!userData || !userData.uid) {
  window.location.href = "login.html"; // redirect if not logged in
}
const userId = userData.uid;

let currentData = null;

const userRef = ref(db, 'accounts/' + userId);
get(userRef)
  .then(snapshot => {
    if (snapshot.exists()) {
      currentData = snapshot.val();

      // Username
      document.getElementById('usernameDisplay').textContent = currentData.username || "";

      // Build full name safely
      const fname = (currentData.fname || "").trim();
      const mname = (currentData.mname || "").trim();
      const lname = (currentData.lname || "").trim();
      const abbr  = (currentData.abbrname || "").trim();

      // Join only non-empty parts
      const nameParts = [];
      if (fname) nameParts.push(fname);
      if (mname) nameParts.push(mname);
      if (lname) nameParts.push(lname);
      if (abbr)  nameParts.push(abbr);

      let fullName = nameParts.join(" ");

      // Fallback if no name parts exist
      if (!fullName) fullName = "No name set";

      document.getElementById('fullNameDisplay').textContent = fullName;

      // Security info
      document.getElementById('emailDisplay').textContent = currentData.email || "";
      document.getElementById('passwordDisplay').textContent = "********";

      const recoveryQuestion = (currentData.recovery_question || "").trim();
      const recoveryAnswer   = (currentData.recovery_answer || "").trim();

      // Recovery info
      document.getElementById('recoveryQuestionDisplay').textContent = currentData.recovery_question || "Not Set";
      document.getElementById('recoveryAnswerDisplay').textContent   = recoveryAnswer ? "********" : "Not set";

      // Role
      document.getElementById('roleDisplay').textContent = currentData.role || 'Not Assigned';

      // Profile image
      if (currentData.profileImageUrl) {
        document.getElementById('profileImage').src = currentData.profileImageUrl;
      }
    } else {
      console.error("No user data found");
    }
  })
  .catch(error => console.error(error));
