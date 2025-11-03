import { db, auth } from './firebase.js';
import { startLocationTracking } from './book_tracking.js';
import { ref, onValue, off, get, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// -------------------- DOM Elements --------------------
import {
  display, searchInput, popup, popupTitle, popupContent, closePopup, overlay,
  addBookBtn, addBookPopup, addBookForm, keywordList, addKeywordBtn,
  cancelAddBook, bookCoverFile, coverPreview, submitBookBtn, formTitle,
  unitMetadataId, addUnitPopup, addUnitForm, cancelAddUnit,
  unitBookUid, unitStatus, unitLocation, unitTagUid
} from './book_dom.js';

// -------------------- Add / Update Book Logic --------------------
import { openBookFormForUpdate } from './book_add_update.js';
import './book_add_unit.js';

// -------------------- Delete Logic --------------------
import { deleteUnit } from './book_delete_unit.js';

// -------------------- References --------------------
const unitRef = ref(db, 'book_unit');
const metaRef = ref(db, 'book_metadata');
const readersRef = ref(db, "readers"); // NEW: For populating Preferred Location
const historyRef = ref(db, 'borrow_history'); // reference to borrow history

let units = {};
let metas = {};
let borrowHistory = {}; // store active borrow info (book_uid -> borrow record)
let popupListener = null;
let userRole = 'user'; // default role

// -------------------- Fetch User Role --------------------
async function fetchUserRole() {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        console.warn('[fetchUserRole] No user logged in. Defaulting to "user".');
        resolve('user');
        unsubscribe();
        return;
      }

      try {
        const snap = await get(ref(db, `accounts/${user.uid}/role`));
        const role = snap.exists() ? snap.val() : 'user';
        console.log(`[fetchUserRole] Role for user ${user.uid}:`, role);
        resolve(role);
      } catch (err) {
        console.error('[fetchUserRole] Error fetching role:', err);
        resolve('user');
      } finally {
        unsubscribe(); // Stop listening after resolving
      }
    });
  });
}
// -------------------- Initialize --------------------
auth.onAuthStateChanged(async (user) => {
  // Fetch role from DB, default to 'user'
  userRole = await fetchUserRole() || 'user';

  // Show/hide Add Book button based on role
  addBookBtn.style.display = (userRole === 'admin') ? "inline-block" : "none";

  // Hide gear buttons for librarians
  if (userRole === 'librarian') {
    document.querySelectorAll('.gear-btn').forEach(btn => btn.style.display = 'none');
  }

  // Render all books
  renderAllBooks(searchInput.value.trim());
});

// -------------------- Utility Functions --------------------
function keywordsToString(kw) {
  if (!kw) return 'N/A';
  if (Array.isArray(kw)) return kw.filter(k => k).join(', ');
  if (typeof kw === 'object') return Object.values(kw).filter(k => k).join(', ');
  return String(kw);
}

// -------------------- Modals Handling --------------------
function showSuccessModal(message) {
  const modal = document.getElementById('successModal');
  const msgEl = document.getElementById('successMessage');
  msgEl.textContent = message || 'Operation completed successfully!';
  modal.classList.add('open');
}

//updated closeModal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.remove('open');

  // Check if main popups or any modal are still open
  const mainPopupOpen = popup.style.display === 'flex' || addBookPopup.style.display === 'flex' || addUnitPopup.style.display === 'flex';
  const anyOtherModalOpen = document.querySelectorAll('.modal.open').length > 0;

  if (!mainPopupOpen && !anyOtherModalOpen) {
    overlay.style.display = 'none';
    document.body.classList.remove('popup-active');
  }
}

// confirmation modal
function showConfirmModal(message) {
  return new Promise(resolve => {
    const modal = document.getElementById('confirmModal');
    const msgEl = document.getElementById('confirmMessage');
    const yesBtn = document.getElementById('confirmYesBtn');

    msgEl.textContent = message || 'Are you sure?';
    modal.classList.add('open');

    const closeHandler = () => { 
      modal.classList.remove('open'); // close only the confirm modal
      yesBtn.removeEventListener('click', yesHandler);
      modal.querySelectorAll('[data-close-modal]').forEach(btn => btn.removeEventListener('click', closeHandler));

      // Keep overlay only if another popup is still open
      const anyOpen = document.querySelectorAll('.popup-active, .modal.open').length > 0;
      if (!anyOpen) {
        overlay.style.display = 'none';
        document.body.classList.remove('popup-active');
      }

      resolve(false); 
    };

    const yesHandler = () => { 
      modal.classList.remove('open'); // close only the confirm modal
      yesBtn.removeEventListener('click', yesHandler);
      modal.querySelectorAll('[data-close-modal]').forEach(btn => btn.removeEventListener('click', closeHandler));

      // Keep overlay only if another popup is still open
      const anyOpen = document.querySelectorAll('.popup-active, .modal.open').length > 0;
      if (!anyOpen) {
        overlay.style.display = 'none';
        document.body.classList.remove('popup-active');
      }

      resolve(true); 
    };

    yesBtn.addEventListener('click', yesHandler);
    modal.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', closeHandler));
  });
}

// hide gear for librarians

function hideGearForLibrarians() {
  if (userRole === 'librarian') {
    document.querySelectorAll('.gear-btn').forEach(btn => btn.style.display = 'none');
  }
}

// -------------------- Book Cards --------------------
import { createMetaCard as createMetaCardFromModule } from './book_card.js';

function createMetaCard(metaId, meta) {
  return createMetaCardFromModule(
    metaId,
    meta,
    units,
    metas,
    userRole,
    showPopup,
    showSuccessModal,
    showConfirmModal
  );
}

// -------------------- Popup & Filters --------------------
function showPopup(metaId) {
  // Remove previous popup listener if exists
  if (popupListener) {
    off(unitRef, 'value', popupListener);
    popupListener = null;
  }

  // Exit if metadata does not exist
  if (!metas[metaId]) return;

  // Fetch borrow history
  get(historyRef).then(snapshot => {
    const historyData = snapshot.val() || {};
    borrowHistory = {}; // reset active borrow records

    // Build borrowHistory: only include latest active borrow
    for (const [bookUID, bookRecords] of Object.entries(historyData)) {
      if (!bookRecords) continue;

      // Get latest record numerically by history key
      const latestRecord = Object.entries(bookRecords)
        .sort((a, b) => Number(b[0].split('_')[1]) - Number(a[0].split('_')[1]))
        .map(([_, record]) => record)
        .find(r => r); // just take the latest

      if (latestRecord) {
        borrowHistory[bookUID] = latestRecord;
      }
    }

    // Fetch all units for this metadata
    const metaUnitsRef = ref(db, 'book_unit');
    popupListener = onValue(metaUnitsRef, snap => {
      const allUnits = snap.val() || {};
      const relatedUnits = Object.keys(allUnits)
        .filter(uid => String(allUnits[uid].metadata_id) === String(metaId))
        .map(uid => ({ ...allUnits[uid], book_uid: uid }));

      const meta = metas[metaId];
      popupTitle.textContent = meta.title || 'N/A';

      // Map units with display info
      const unitsWithDisplay = relatedUnits.map(u => {
        const borrowInfo = borrowHistory[u.book_uid];

        let isBorrowed = false;
        let displayStatus = u.status || 'N/A';
        let displayLocation = u.location || 'Inside';

        if (borrowInfo) {
          const statusLower = (borrowInfo.status || '').toLowerCase();
          if (statusLower !== 'returned' && statusLower !== 'late') {
            isBorrowed = true;
            displayStatus = borrowInfo.status || 'Borrowed';
            displayLocation = borrowInfo.location || 'Inside';
          }
        }

        return { ...u, displayStatus, displayLocation, isBorrowed };
      });

      const allLocations = Array.from(new Set(unitsWithDisplay.map(u => u.displayLocation || 'N/A')));
      const allStatuses = Array.from(new Set(unitsWithDisplay.map(u => u.displayStatus || 'N/A')));

      if (!popupContent.querySelector('#bookTableContainer')) {
        popupContent.innerHTML = `
          <div class="filter-controls">
            <input type="text" id="bookUidSearch" placeholder="Search Book UID..." 
              style="margin-bottom:10px;width:98%;padding:6px;border:1px solid #ccc;border-radius:5px;" />
            <select id="locationFilter" style= "display:none;">
              <option value="All">All Locations</option>
            </select>
            <select id="statusFilter">
              <option value="All">All Statuses</option>
            </select>
            <button id="clearFilters">Clear Filters</button>
          </div>
          <div id="bookTableContainer"></div>
        `;
      }

      // Updated filter options 
      const locationFilter = document.getElementById('locationFilter');
      const statusFilter = document.getElementById('statusFilter');
      locationFilter.innerHTML = `<option value="All">All Locations</option>` + allLocations.map(l => `<option value="${l}">${l}</option>`).join('');
      statusFilter.innerHTML = `<option value="All">All Statuses</option>` + allStatuses.map(s => `<option value="${s}">${s}</option>`).join('');

      // filter state
      let selectedLocation = 'All';
      let selectedStatus = 'All';
      let searchBookUid = '';

      // renderTable: ONLY updates the table container
      function renderTable() {
        const tableContainer = document.getElementById('bookTableContainer');
        // If search input exists, keep searchBookUid in sync
        const existingSearch = document.getElementById('bookUidSearch');
        if (existingSearch) searchBookUid = existingSearch.value.trim();

        // Filter units by search, status, and location
        const filteredUnits = unitsWithDisplay.filter(u => {
          const matchesSearch = !searchBookUid || String(u.book_uid).toLowerCase().includes(searchBookUid.toLowerCase());

          // Status filter 
          let unitStatus = (u.displayStatus || '').toLowerCase();
          if (!u.isBorrowed) unitStatus = 'available';

          const matchesStatus = selectedStatus.toLowerCase() === 'all' || unitStatus === selectedStatus.toLowerCase();

          // Location filter
          const unitLocation = (u.displayLocation || 'N/A').toLowerCase();
          const matchesLocation = selectedLocation.toLowerCase() === 'all' || unitLocation === selectedLocation.toLowerCase();

          return matchesSearch && matchesStatus && matchesLocation;
        });

        // Misplaced books logic & grouping
        const grouped = {};
        const misplacedBooks = [];

        filteredUnits.forEach(u => {
          const preferredLoc = metas[u.metadata_id]?.preferred_location || 'N/A';
          const currentLoc = u.displayLocation || 'N/A';
          if (!u.isBorrowed && currentLoc !== 'Not Found' && preferredLoc !== 'N/A' && currentLoc !== preferredLoc) {
            misplacedBooks.push(u);
          }
        });

        if (misplacedBooks.length > 0) grouped['📕 Misplaced Books'] = misplacedBooks;

        filteredUnits.forEach(u => {
          if (misplacedBooks.includes(u)) return;

          const currentLoc = u.displayLocation || 'N/A';
          if (u.isBorrowed) {
            if (!grouped['📘 Borrowed Books']) grouped['📘 Borrowed Books'] = [];
            grouped['📘 Borrowed Books'].push(u);
          } else if (currentLoc === 'Not Found') {
            if (!grouped['❌ Not Found']) grouped['❌ Not Found'] = [];
            grouped['❌ Not Found'].push(u);
          } else if (currentLoc === metas[u.metadata_id]?.preferred_location) {
            if (!grouped[currentLoc]) grouped[currentLoc] = [];
            grouped[currentLoc].push(u);
          }
        });

// Build table HTML
let tableHTML = '';
if (filteredUnits.length === 0) {
  tableHTML = `<p>No matching books found for the selected filters.</p>`;
} else {
  Object.keys(grouped).forEach(locationKey => {
    // Dynamically set the header for this group
    const isNotFoundGroup = locationKey === '❌ Not Found';
    const locationHeader = isNotFoundGroup ? 'Last Seen' : 'Location';

    tableHTML += `<h3>${locationKey}</h3><table>
      <tr>
        <th style="width:20%; text-align:center;">Book UID</th>
        <th style="width:20%; text-align:center;">Tag UID</th>
        <th style="width:20%; text-align:center;">Status</th>
        <th style="width:20%; text-align:center;">${locationHeader}</th>
        ${(userRole === 'admin') ? '<th style="width:15%; text-align:center;">Action</th>' : ''}
      </tr>`;

    grouped[locationKey].forEach(u => {
      let tagDisplay = u.tag_uid;
      if (tagDisplay && typeof tagDisplay === 'object') tagDisplay = Object.values(tagDisplay).join(',');

      const isDeletable = (u.status || '').toLowerCase() === 'available';

      // Display either last_seen or displayLocation depending on group
      const displayLoc = isNotFoundGroup ? (u.last_seen || 'N/A') : u.displayLocation;

      tableHTML += `<tr>
        <td style="text-align:center;">${u.book_uid || 'N/A'}</td>
        <td style="text-align:center;">${tagDisplay || 'N/A'}</td>
        <td style="text-align:center;">${u.displayStatus}</td>
        <td style="text-align:center;">${displayLoc}</td>
        ${(userRole === 'admin') ? `<td style="text-align:center;">
          <button class="delete-unit-btn" data-bookuid="${u.book_uid}" data-status="${u.status}" 
            style="background:${isDeletable ? '#e74c3c' : '#ccc'}; cursor:${isDeletable ? 'pointer' : 'not-allowed'};" 
            ${isDeletable ? '' : 'disabled'}> Delete</button>
        </td>` : ''}
      </tr>`;
    });

    tableHTML += `</table>`;
  });
}



        tableContainer.innerHTML = tableHTML;
      } // end renderTable

      // Attach controls listeners ONCE
      if (!popupContent.dataset.listenersAttached) {
        // Search input
        const searchInputPopup = document.getElementById('bookUidSearch');
        searchInputPopup.dataset.listenerAttached = "true";
        searchInputPopup.addEventListener('input', () => {
          // do not trim inside input so user can see spaces if needed, trim in filter comparison
          renderTable();
        });

        // Filters
        locationFilter.addEventListener('change', e => {
          selectedLocation = e.target.value;
          renderTable();
        });

        statusFilter.addEventListener('change', e => {
          selectedStatus = e.target.value;
          renderTable();
        });

        // Clear button
        const clearBtn = document.getElementById('clearFilters');
        clearBtn.addEventListener('click', () => {
          selectedLocation = 'All';
          selectedStatus = 'All';
          const si = document.getElementById('bookUidSearch');
          if (si) si.value = '';
          // reset selects
          locationFilter.value = 'All';
          statusFilter.value = 'All';
          renderTable();
        });

        // Delete button handling (event delegation)
        popupContent.addEventListener('click', async e => {
          if (e.target.classList.contains('delete-unit-btn')) {
            const bookUid = e.target.dataset.bookuid;
            const status = e.target.dataset.status;
            await deleteUnit(bookUid, status, showConfirmModal, showSuccessModal);
          }
        });

        popupContent.dataset.listenersAttached = "true";
      }

      // Make sure search/filter variables are reset for this metadata view
      const si = document.getElementById('bookUidSearch');
      if (si) si.value = '';
      selectedLocation = 'All';
      selectedStatus = 'All';

      // Initial render
      renderTable();
    }); // end onValue for metaUnitsRef
  }).catch(err => {
    console.error('Error fetching borrow history:', err);
  });

  overlay.style.display = 'block';
  popup.style.display = 'flex';
  document.body.classList.add('popup-active');
}


// -------------------- Populate Preferred Location Dropdown --------------------
async function populatePreferredLocations() {
  const readersSnap = await get(readersRef);
  const readers = readersSnap.val() || {};
  const locationSet = new Set();

  // sort readers numerically
  const sortedReaderKeys = Object.keys(readers).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.replace(/\D/g, "")) || 0;
    return numA - numB;
  });

  // Use the sorted order to add locations
  sortedReaderKeys.forEach(readerKey => {
    const reader = readers[readerKey];
    if (reader?.location) locationSet.add(reader.location);
  });

  const locationDropdown = document.getElementById('bookPreferredLocation');
  if (!locationDropdown) return;

  locationDropdown.innerHTML =
    '<option value="">Select Location</option>' +
    Array.from(locationSet)
      .map(loc => `<option value="${loc}">${loc}</option>`)
      .join('');
}


// Call this when opening the add book popup
addBookBtn.addEventListener('click', () => {
  populatePreferredLocations(); // Populate dynamically
  addBookPopup.style.display = 'flex';
  overlay.style.display = 'block';
  document.body.classList.add('popup-active');
});



// -------------------- Close Popup --------------------
function closePopupFunc() {
  popup.style.display = 'none';
  addBookPopup.style.display = 'none';
  addUnitPopup.style.display = 'none';
  overlay.style.display = 'none';
  if (popupListener) { off(unitRef, 'value', popupListener); popupListener = null; }
  document.body.classList.remove('popup-active');
}

closePopup.addEventListener('click', closePopupFunc);

//--------only close when X or Cancel buttons are pressed
cancelAddBook.addEventListener('click', closePopupFunc);
cancelAddUnit.addEventListener('click', closePopupFunc);


// -------------------- Render Books --------------------
function renderAllBooks(filterText = '') {
  display.innerHTML = '';
  let matchCount = 0;
  const searchLower = filterText.toLowerCase();

  const sortedMetaKeys = Object.keys(metas).sort((a, b) => {
  const titleA = (metas[a]?.title || '').toLowerCase();
  const titleB = (metas[b]?.title || '').toLowerCase();
  return titleA.localeCompare(titleB);
});


sortedMetaKeys.forEach(metaId => {
    const meta = metas[metaId];
    if (!meta) return;

    const card = createMetaCard(metaId, meta);
    if (!card) return;

    const keywordsStr = keywordsToString(meta.keywords);
    const matchesMeta = meta.title.toLowerCase().includes(searchLower)
      || meta.author.toLowerCase().includes(searchLower)
      || keywordsStr.toLowerCase().includes(searchLower);

    const matchesUnit = Object.keys(units).some(uidKey => {
      const u = units[uidKey];
      if (!u) return false;
      if (String(u.metadata_id) !== String(metaId)) return false;
      return uidKey.toLowerCase().includes(searchLower)
        || (u.status || '').toLowerCase().includes(searchLower)
        || (u.location || '').toLowerCase().includes(searchLower)
        || (u.tag_uid || '').toLowerCase().includes(searchLower);
    });

    if (filterText === '' || matchesMeta || matchesUnit) { 
      matchCount++; 
      display.appendChild(card); 
    }
  });

  if (matchCount === 0) display.innerHTML = '📭 No book with that info.';
  if (userRole === 'librarian') {
    document.querySelectorAll('.gear-btn').forEach(btn => btn.style.display = 'none');
  }
}

// Update search input listener
searchInput.addEventListener('input', () => {
  closePopupFunc();
  renderAllBooks(searchInput.value.trim());
});


// -------------------- Firebase Listeners --------------------
onValue(unitRef, snap => { units = snap.val() || {}; renderAllBooks(searchInput.value.trim()); });
onValue(metaRef, snap => { metas = snap.val() || {}; renderAllBooks(searchInput.value.trim()); });

// -------------------- Update Returned Books Status --------------------
// ✅ Updated for new borrow_history structure (uses book_uid directly, no longer relies on reader tag_uid)
onValue(historyRef, async (historySnap) => {
  if (!historySnap.exists()) return;

  const allHistoryData = historySnap.val();

  // Loop through each book in the borrow history
  Object.entries(allHistoryData).forEach(([bookUID, bookHistory]) => {
    if (!bookHistory) return;

    Object.values(bookHistory).forEach(h => {
      if (!h || !h.book_uid || !h.status) return;

      const status = h.status.toLowerCase();

      // ✅ Only update book_unit status if the book has been returned or marked late
      if (status === "returned" || status === "late") {
        const bookRef = ref(db, `book_unit/${h.book_uid}`);

        // ✅ Directly update the book status to "Available" without checking reader tags
        update(bookRef, { status: "Available" }).catch(err => {
          console.error(`Failed to update status for book ${h.book_uid}:`, err);
        });
      }
    });
  });
});


// -------------------- Book Image Preview --------------------
const bookPopup = document.getElementById("bookPopup");
const bookPopupImg = document.getElementById("bookPopupImg");
const closeBookPopup = document.getElementById("closeBookPopup");

// When any book image is clicked
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("book-image")) {
    // Get the background-image URL from inline style
    const bgImage = e.target.style.backgroundImage;
    const src = bgImage.slice(5, -2); // removes url(" and ")

    // Show the popup with the full image
    bookPopupImg.src = src;
    bookPopup.style.display = "flex";
  }
});

// Close when X button is pressed
closeBookPopup.addEventListener("click", () => {
  bookPopup.style.display = "none";
});

// -------------------- Start Location Tracking --------------------
startLocationTracking();
