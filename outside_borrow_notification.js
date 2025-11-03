import { db } from "./firebase.js";
import { ref, update, onValue } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// -------------------- Load External CSS --------------------
function loadNotificationCSS() {
  if (!document.getElementById("notification_css")) {
    const link = document.createElement("link");
    link.id = "notification_css";
    link.rel = "stylesheet";
    link.href = "style.css"; 
    document.head.appendChild(link);
  }
}

// -------------------- Track modal state to prevent spam --------------------
let modalOpen = false; // UPDATED: modal open tracking

// -------------------- Show Notification Modal --------------------
function createNotificationModal(message, readerPath = "readers/r3") { // UPDATED: readerPath param
  if (modalOpen) return; // Prevent multiple modals
  modalOpen = true;

  loadNotificationCSS();

  const existing = document.getElementById("notification_modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "notification_modal";
  modal.innerHTML = `
    <div class="notification_overlay"></div>
    <div class="notification_box">
      <h2>Notification</h2>
      <p>${message}</p>
      <div class="notification_actions" style="justify-content: center;">
        <button id="notification_ok">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const okButton = document.getElementById("notification_ok");
  okButton.addEventListener("click", async () => {
    try {
      // UPDATED: Reset security_check using correct readerPath
      const readerRef = ref(db, readerPath);
      await update(readerRef, { security_check: "" });
    } catch (error) {
      console.error("Error updating security_check:", error);
    } finally {
      modal.remove();
      modalOpen = false; // UPDATED: reset modalOpen
    }
  });

  document.addEventListener("keydown", function escHandler(e) {
    if (e.key === "Escape") {
      modal.remove();
      modalOpen = false; // UPDATED: reset modalOpen
      document.removeEventListener("keydown", escHandler);
    }
  });
}

// -------------------- Watch security_check value --------------------
function checkSecurityAndNotify() {
  const readerRef = ref(db, "readers/r3");

  onValue(readerRef, (snapshot) => {
    if (snapshot.exists()) {
      const val = snapshot.val().security_check;
      if (!val || val.trim() === "") return;

    let message;

    if (val === "Yes") {
      message = "Book Unit successfully borrowed for outside use.";
    } else if (val === "No") {
      message = "Book Unit not available for outside use.";
    } else if (val === "Wrong") {
      message = "Not a Book Tag, Scan a Book Tag";
    } else {
      message = "Unknown security status.";
    }


      createNotificationModal(message, "readers/r3"); // UPDATED: pass reader path
    } else {
      console.error("No data found for reader r3.");
    }
  });
}

// -------------------- Start Listening --------------------
checkSecurityAndNotify();
