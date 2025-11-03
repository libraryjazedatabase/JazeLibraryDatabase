import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

// -------------------- Show Logout Modal --------------------
function createLogoutModal() {
  // Remove any existing modal first
  const existing = document.getElementById("logoutModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "logoutModal";
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-box">
      <h2>Confirm Logout</h2>
      <p>Are you sure you want to logout?</p>
      <div class="modal-actions">
        <button id="confirmLogout">Logout</button>
        <button id="cancelLogout">Cancel</button>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #logoutModal {
      position: fixed;
      top: 0; left: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }

    .modal-overlay {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 1;
    }

    .modal-box {
      position: relative;
      background: #fff;
      padding: 20px;
      border-radius: 12px;
      width: 320px;
      max-width: 90%;
      text-align: center;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      z-index: 2;
      animation: fadeIn 0.2s ease-in-out;
    }

    .modal-actions {
      margin-top: 20px;
      display: flex;
      justify-content: space-around;
    }

    .modal-actions button {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      z-index: 2;
    }

    #confirmLogout { background: #e74c3c; color: #fff; }
    #cancelLogout { background: #bdc3c7; }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(modal);

  // -------------------- Event Listeners --------------------
  document.getElementById("confirmLogout").addEventListener("click", () => {
    signOut(auth)
      .then(() => {
        // Prevent back button & history access
        window.history.pushState(null, "", window.location.href);
        window.onpopstate = () => window.history.go(1);

        // Redirect to login
        window.location.replace("login.html");
      })
      .catch((error) => console.error("Logout error:", error));
  });

  document.getElementById("cancelLogout").addEventListener("click", () => {
    modal.remove(); // Close modal and resume current page
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
