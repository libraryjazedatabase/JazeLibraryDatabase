  import { auth, db } from './firebase.js';
  import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset } 
    from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
  import { ref, get, update } 
    from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

  const title = document.getElementById("title");
  const message = document.getElementById("message");
  const form = document.getElementById("passwordForm");

  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode");
  const oobCode = urlParams.get("oobCode");

  if (!oobCode || !mode) {
    message.textContent = "❌ Invalid or missing action code.";
    message.className = "error";
    form.style.display = "none";   // hide form
  } else if (mode === "verifyEmail") {
    // ---- EMAIL VERIFICATION ----
    title.textContent = "Email Verification";
    (async () => {
      try {
        await applyActionCode(auth, oobCode);
        message.textContent = "✅ Your email has been verified successfully!";
        message.className = "success";
        form.style.display = "none";   // hide form
      } catch (error) {
        console.error(error);
        message.textContent = "❌ Verification failed: " + error.message;
        message.className = "error";
        form.style.display = "none";   // hide form
      }
    })();
  } else if (mode === "resetPassword") {
    // ---- PASSWORD RESET ----
    title.textContent = "Set New Password";
    message.textContent = "";
    form.style.display = "block";

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      message.textContent = "";
      message.className = "";

      const newPass = document.getElementById("newPass").value;
      const confirmPass = document.getElementById("confirmPass").value;

      if (newPass !== confirmPass) {
        message.textContent = "❌ Passwords do not match!";
        message.className = "error";
        return;
      }

      try {
        const email = await verifyPasswordResetCode(auth, oobCode);
        await confirmPasswordReset(auth, oobCode, newPass);

        // update password change timestamp
        const accountsSnap = await get(ref(db, "accounts"));
        const accounts = accountsSnap.val();
        let authUID = null;

        for (const uid in accounts) {
          if (accounts[uid].email && accounts[uid].email.toLowerCase() === email.toLowerCase()) {
            authUID = uid;
            break;
          }
        }

//        if (authUID) {
//          await update(ref(db, `accounts/${authUID}`), {
//            lastPasswordUpdate: new Date().toISOString()
//          });
//        }

        message.textContent = "✅ Password successfully changed!";
        message.className = "success";
        form.style.display = "none";   // hide form on success
//        setTimeout(() => window.location.href = "login.html", 1500);

      } catch (error) {
        console.error(error);
        message.textContent = "❌ Error updating password: " + error.message;
        message.className = "error";
        form.style.display = "none";   // hide form on error
      }
    });
  } else {
    message.textContent = "❌ Unsupported action type.";
    message.className = "error";
    form.style.display = "none";   // hide form
  }