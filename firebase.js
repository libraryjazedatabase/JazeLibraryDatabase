import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

// Database information
const firebaseConfig = {
  apiKey: "AIzaSyDacOKmCmFhfz0g228EhL0KHFaVEccjJPk",
  authDomain: "library-database-7cd98.firebaseapp.com",
  databaseURL: "https://library-database-7cd98-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "library-database-7cd98",
  storageBucket: "library-database-7cd98.appspot.com",
  messagingSenderId: "405553550537",
  appId: "1:405553550537:web:2c78a16d05911a3690a918"
};

// Initialization
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app); 

// login logic for website
async function loginUser(username, password) {
  try {
    const snapshot = await get(ref(db, "accounts"));
    if (snapshot.exists()) {
      const accounts = snapshot.val();

      // Loop through accounts to check username + password
      for (const accountNo in accounts) {
        const account = accounts[accountNo];

        if (account.username === username && account.password === password) {
          return {
            success: true,
            user: {
              accountNo,
              username: account.username,
              role: account.role,
              profile: account.profile || "",
              recovery_question: account.recovery_question || "",
              recovery_answer: account.recovery_answer || ""
            }
          };
        }
      }
    }
    return { success: false, message: "Invalid username or password" };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: "Error connecting to database" };
  }
}

export {auth, db };

// d atta ginagamit yung loginuser na fnction