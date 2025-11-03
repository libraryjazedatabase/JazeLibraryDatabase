import { auth, db } from "./firebase.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// Check the logged-in user's role
auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  try {
    const snapshot = await get(ref(db, `accounts/${user.uid}`));
    const account = snapshot.val();

// if user has an admin role, add 2 new links to the sidebar    
    if (account && account.role === "admin") {
      const adminLinkContainer = document.getElementById("adminLinkContainer");
      if (adminLinkContainer) {
        
        const link = document.createElement("a");
        link.href = "accounts.html";
        link.textContent = "👥 Accounts";
        adminLinkContainer.appendChild(link);

        const accessLogLink = document.createElement("a");
        accessLogLink.href = "access_log.html";
        accessLogLink.textContent = "📜 Access Log";
        adminLinkContainer.appendChild(accessLogLink);
      }
    }
  } catch (error) {
    console.error("Error fetching user role:", error);
  }
});
