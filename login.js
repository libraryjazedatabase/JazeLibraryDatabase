import { auth, db } from './firebase.js';
import { ref, get , push , set} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js';
import { signInWithEmailAndPassword, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const forgotLink = document.getElementById("forgotLink");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
        //  Fetch all accounts
        const snapshot = await get(ref(db, "accounts"));
        const accounts = snapshot.val();
        let authUID = null;
        let email = null;
        let role = null; // ✅ Declare role for access_log

        //  Find account by username
        for (const key in accounts) {
            if (accounts[key].username === username) {
                authUID = key;          // database key = authUID
                email = accounts[key].email; // stored email from registration
                role = accounts[key].role || "User";
                break;
            }
        }

        if (!authUID || !email) {
            loginError.textContent = "Username or password is incorrect.";
            return;
        }

        //  Authenticate with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        //  Check if email is verified
        if (!user.emailVerified) {
            await sendEmailVerification(user);
            loginError.textContent = "Your email is not verified. A verification link has been sent to your email.";
            return;
        }

        //  Save logged-in user info locally
        localStorage.setItem("user", JSON.stringify({
            uid: authUID,
            email: email
        }));

        // This creates a new access_log entry and saves its key for logout tracking
        const logRef = push(ref(db, "access_log"));
        await set(logRef, {
            user_id: authUID,
            role: role,
            login_time: new Date().toISOString(),
            logout_time: null
        });

        // Store log key in localStorage to use later on logout
        localStorage.setItem("logKey", logRef.key);

        //  Redirect to profile page
        window.location.href = "index.html";

    } catch (error) {
        console.error(error);
        loginError.textContent = "Username or password is incorrect.";
    }
});

forgotLink.addEventListener("click", () => {
    window.location.href = "recover.html";
});