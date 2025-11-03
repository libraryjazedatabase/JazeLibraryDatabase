    import { db } from "./firebase.js";
    import { ref, get } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

    const recoverError = document.getElementById("recoverError");
    const usernameInput = document.getElementById("username");
    const nextBtn = document.getElementById("nextBtn");
    const stepUsername = document.getElementById("step-username");
    const stepQuestion = document.getElementById("step-question");
    const recoveryQuestion = document.getElementById("recoveryQuestion");
    const recoveryAnswerInput = document.getElementById("recoveryAnswer");
    const submitAnswer = document.getElementById("submitAnswer");
    const cancelBtn = document.getElementById("cancelBtn");

    let currentAuthUID = null;
    let currentUsername = null;

    // Step 1: Check username
    nextBtn.addEventListener("click", async () => {
      recoverError.textContent = "";
      const username = usernameInput.value.trim();
      if (!username) return;

      const accountsRef = ref(db, "accounts");
      const snapshot = await get(accountsRef);

      if (snapshot.exists()) {
        let found = false;
        const accounts = snapshot.val();
        for (const authUID in accounts) {
          const acc = accounts[authUID];
          if (acc.username === username) {
            found = true;
            currentAuthUID = authUID;
            currentUsername = username;

            if (!acc.recovery_question || !acc.recovery_answer) {
              recoverError.textContent = "Can't recover account, contact admin for password reset.";
              return;
            }

            recoveryQuestion.textContent = acc.recovery_question;
            stepUsername.classList.add("hidden");
            stepQuestion.classList.remove("hidden");
            break;
          }
        }
        if (!found) recoverError.textContent = "Username not found.";
      } else {
        recoverError.textContent = "No accounts found in database.";
      }
    });

    // Step 2: Submit answer
    submitAnswer.addEventListener("click", async () => {
      recoverError.textContent = "";
      const answer = recoveryAnswerInput.value.trim();
      if (!answer || !currentAuthUID) return;

      const accRef = ref(db, `accounts/${currentAuthUID}`);
      const snapshot = await get(accRef);

      if (snapshot.exists()) {
        const acc = snapshot.val();
        if (acc.recovery_answer === answer) {
          // Pass authUID and username to reset_password.html
          window.location.href = `reset_password.html?authUID=${currentAuthUID}&user=${encodeURIComponent(currentUsername)}`;
        } else {
          recoverError.textContent = "Incorrect recovery answer.";
        }
      }
    });

    // Cancel button → back to login
    cancelBtn.addEventListener("click", () => {
      window.location.href = "login.html";
    });