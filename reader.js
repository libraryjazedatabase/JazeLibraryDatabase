import { db, auth } from './firebase.js';
import { ref, onValue, get } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// -------------------- DOM Elements --------------------
const readerTableBody = document.getElementById("readerTableBody");
const addReaderBtn = document.getElementById("createReaderBtn");

// Immediately hide Add Reader button for all roles
if (addReaderBtn) addReaderBtn.style.display = 'none';

// -------------------- Fetch User Role --------------------
async function fetchUserRole() {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                resolve('user');
                unsubscribe();
                return;
            }
            try {
                const snap = await get(ref(db, `accounts/${user.uid}/role`));
                resolve(snap.exists() ? snap.val() : 'user');
            } catch {
                resolve('user');
            } finally {
                unsubscribe();
            }
        });
    });
}

// -------------------- Update UI based on role --------------------
let currentUserRole = 'user';
function updateAdminFeatures() {
    // Add Reader button
    if (addReaderBtn) addReaderBtn.style.display = currentUserRole === 'admin' ? 'block' : 'none';

    // Actions column
    const actionsHeader = document.querySelector("#readerTable thead th:last-child");
    if (actionsHeader) actionsHeader.style.display = currentUserRole === 'admin' ? '' : 'none';
}

// -------------------- Load Readers --------------------
let readersData = {};

export function loadReaders() {
    const readersRef = ref(db, "readers");
    readerTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#666;">Loading...</td></tr>`;

    onValue(readersRef, snapshot => {
        readerTableBody.innerHTML = "";
        readersData = snapshot.val() || {};

        if (!snapshot.exists()) {
            readerTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#666;">No readers found.</td></tr>`;
            return;
        }

        Object.keys(readersData)
          .sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')); // remove non-digits
            const numB = parseInt(b.replace(/\D/g, ''));
            return numA - numB;
        })
        .forEach(readerNo => {
            const data = readersData[readerNo];
            const hasTag = (data.tag_uid && data.tag_uid.trim() !== "") || 
                           (data.tag_uids && Object.values(data.tag_uids).some(v => v.trim() !== ""));
            const tr = document.createElement("tr");

            if (currentUserRole === 'admin') {
                tr.innerHTML = `
                    <td>${readerNo}</td>
                    <td>${data.location || "N/A"}</td>
                    <td>${data.status || "Offline"}</td>
                    <td class="actions-cell">
                        <div class="action-buttons">
                            <button class="update-btn action-btn" data-id="${readerNo}">Update</button>
                            <button class="delete-btn action-btn" data-id="${readerNo}" ${hasTag ? "disabled style='opacity:0.5;cursor:not-allowed'" : ""}>Delete</button>
                        </div>
                    </td>
                `;
            } else {
                tr.innerHTML = `
                    <td>${readerNo}</td>
                    <td>${data.location || "N/A"}</td>
                    <td>${data.status || "Offline"}</td>
                `;
            }

            readerTableBody.appendChild(tr);
        });
    });
}

// -------------------- Event Delegation for Update/Delete --------------------
document.addEventListener("click", (e) => {
    const readerId = e.target.dataset.id;
    if (!readerId) return;

    if (e.target.classList.contains("update-btn")) {
        const readerData = readersData[readerId];
        const event = new CustomEvent("openUpdateReaderModal", { detail: { readerId, readerData } });
        document.dispatchEvent(event);
    }

    if (e.target.classList.contains("delete-btn") && !e.target.disabled) {
        const event = new CustomEvent("openDeleteReaderModal", { detail: { readerId } });
        document.dispatchEvent(event);
    }
});

// -------------------- Initialize --------------------
auth.onAuthStateChanged(async () => {
    currentUserRole = await fetchUserRole() || 'user';
    updateAdminFeatures();  // Show/hide immediately based on role
    loadReaders();
});

// Export readersData for other modules
export { readersData };
