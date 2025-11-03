import { db } from "./firebase.js";
import { ref, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

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

// -------------------- Track modal state --------------------
let modalOpen = false;

// -------------------- Create Reader Function Modal --------------------
function createReaderFunctionModal(message) {
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
  okButton.addEventListener("click", () => {
    modal.remove();
    modalOpen = false;
  });

  document.addEventListener("keydown", function escHandler(e) {
    if (e.key === "Escape") {
      modal.remove();
      modalOpen = false;
      document.removeEventListener("keydown", escHandler);
    }
  });
}

// -------------------- Update reader function in Firebase --------------------
async function updateReaderFunction(funcValue) {
  try {
    const readerRef = ref(db, "readers/r3");
    await update(readerRef, { function: funcValue });
    createReaderFunctionModal(`Reader function updated to "${funcValue}"`);
  } catch (error) {
    console.error("Error updating reader function:", error);
  }
}

// -------------------- Attach to Sidebar Links by ID --------------------
export function initReaderFunctionButtons() {
  const securityCheckerLink = document.getElementById("securityCheckerBtn");
  const addSecurityTagLink = document.getElementById("addSecurityTagBtn");

  if (securityCheckerLink) {
    securityCheckerLink.addEventListener("click", (e) => {
      e.preventDefault();
      updateReaderFunction("security");
    });
  }
}
