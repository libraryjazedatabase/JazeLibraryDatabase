    import { auth, db } from './firebase.js';
    import { ref, get } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js';
    import { sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

    const message = document.getElementById("message");
    const sendBtn = document.getElementById("sendResetLink");
    const userEmailInput = document.getElementById("userEmail");

    // Get authUID and username from URL
    const params = new URLSearchParams(window.location.search);
    const authUID = params.get("authUID");

    sendBtn.addEventListener("click", async () => {
      message.textContent = "";
      message.className = "";

      const typedEmail = userEmailInput.value.trim();
      if (!typedEmail) return;

      if (!authUID) {
        message.textContent = "❌ Invalid request.";
        message.className = "reset_error";
        return;
      }

      try {
        // Fetch email from database using authUID
        const accRef = ref(db, `accounts/${authUID}`);
        const snapshot = await get(accRef);

        if (!snapshot.exists()) {
          message.textContent = "❌ Account not found.";
          message.className = "reset_error";
          return;
        }

        const acc = snapshot.val();
        const registeredEmail = acc.email;

        // Check if typed email matches registered email
        if (typedEmail.toLowerCase() !== registeredEmail.toLowerCase()) {
          message.textContent = "❌ Email does not match our records.";
          message.className = "reset_error";
          return;
        }

        // Send reset email
        await sendPasswordResetEmail(auth, registeredEmail);
        message.textContent = `✅ Password reset email sent! Check your inbox.`;
        message.className = "reset_success";

      } catch (error) {
        console.error(error);
        message.textContent = "❌ Error: " + error.message;
        message.className = "reset_error";
      }
    });