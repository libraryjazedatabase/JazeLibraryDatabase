import { auth, db } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { ref, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// -------------------- Load External CSS --------------------
function loadLogoutCSS() {
  if (!document.getElementById("logout_css")) {
    const link = document.createElement("link");
    link.id = "logout_css";
    link.rel = "stylesheet";
    link.href = "style.css"; 
    document.head.appendChild(link);
  }
}

// -------------------- Show Logout Modal --------------------
function createLogoutModal() {
  loadLogoutCSS(); // Ensure CSS is loaded before showing modal

  // Remove any existing modal first
  const existing = document.getElementById("logout_modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "logout_modal";
  modal.innerHTML = `
    <div class="logout_overlay"></div>
    <div class="logout_box">
      <h2>Confirm Logout</h2>
      <p>Are you sure you want to logout?</p>
      <div class="logout_actions">
        <button id="logout_confirm">Logout</button>
        <button id="logout_cancel">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // -------------------- Event Listeners --------------------
  document.getElementById("logout_confirm").addEventListener("click", async () => {
    try {
      // ✅ Update logout_time in access_log
      const logKey = localStorage.getItem("logKey");
      if (logKey) {
        const logRef = ref(db, `access_log/${logKey}`);
        await update(logRef, {
          logout_time: new Date().toISOString()
        });
        console.log("Logout time updated successfully:", logKey);
      }

      // Proceed with logout
      await signOut(auth);

      // Clear stored data
      localStorage.removeItem("user");
      localStorage.removeItem("logKey");

      // Prevent back button & history access
      window.history.pushState(null, "", window.location.href);
      window.onpopstate = () => window.history.go(1);

      // Redirect to login
      window.location.replace("login.html");

    } catch (error) {
      console.error("Error during logout:", error);
    }
  });

  document.getElementById("logout_cancel").addEventListener("click", () => {
    modal.remove(); // Close modal and resume current page
  });

  // Escape key closes modal
  document.addEventListener("keydown", function escHandler(e) {
    if (e.key === "Escape") {
      modal.remove();
      document.removeEventListener("keydown", escHandler);
    }
  });
}

// -------------------- Trigger Logout from Sidebar --------------------
export function logoutUser() {
  createLogoutModal();
}

// -------------------- Extra Safety: Redirect if Already Logged Out --------------------
auth.onAuthStateChanged(user => {
  if (!user) window.location.href = "login.html";
});

// -------------------- Attach to Sidebar Logout Button --------------------
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    logoutUser();
  });
});
