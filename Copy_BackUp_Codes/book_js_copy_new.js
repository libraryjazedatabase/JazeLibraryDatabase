import { db, auth, startLocationTracking } from './firebase.js';
import { ref, onValue, off, get } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

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

let units = {};
let metas = {};
let popupListener = null;
let userRole = 'user'; // default role

// -------------------- Fetch User Role --------------------
async function fetchUserRole() {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const snap = await get(ref(db, `accounts/${user.uid}/role`));
    return snap.exists() ? snap.val() : 'user';
  } catch (err) {
    console.error('Error fetching role:', err);
    return 'user';
  }
}

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

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}

function showConfirmModal(message) {
  return new Promise(resolve => {
    const modal = document.getElementById('confirmModal');
    const msgEl = document.getElementById('confirmMessage');
    const yesBtn = document.getElementById('confirmYesBtn');

    msgEl.textContent = message || 'Are you sure?';
    modal.classList.add('open');

    const closeHandler = () => { 
      closeModal('confirmModal'); 
      yesBtn.removeEventListener('click', yesHandler);
      modal.querySelectorAll('[data-close-modal]').forEach(btn => btn.removeEventListener('click', closeHandler));
      resolve(false); 
    };
    const yesHandler = () => { 
      closeModal('confirmModal'); 
      yesBtn.removeEventListener('click', yesHandler);
      modal.querySelectorAll('[data-close-modal]').forEach(btn => btn.removeEventListener('click', closeHandler));
      resolve(true); 
    };

    yesBtn.addEventListener('click', yesHandler);
    modal.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', closeHandler));
  });
}

// -------------------- Book Cards --------------------
import { createMetaCard as createMetaCardFromModule } from './book_card.js';

// wrap with our context (units, metas, etc.)
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
  if (popupListener) { off(unitRef, 'value', popupListener); popupListener = null; }
  if (!metas[metaId]) return;

  const metaUnitsRef = ref(db, 'book_unit');
  popupListener = onValue(metaUnitsRef, snap => {
    const allUnits = snap.val() || {};
    const relatedUnits = Object.keys(allUnits)
      .filter(uid => String(allUnits[uid].metadata_id) === String(metaId))
      .map(uid => ({ ...allUnits[uid], book_uid: uid }));

    const meta = metas[metaId];
    popupTitle.textContent = meta.title || 'N/A';
    const allLocations = [...new Set(relatedUnits.map(u => u.location || 'Not Found'))];
    const allStatuses = [...new Set(relatedUnits.map(u => u.status || 'N/A'))];
    let selectedLocation = 'All', selectedStatus = 'All';
    let searchBookUid = '';

    function renderTable() {
      const existingSearch = document.getElementById('bookUidSearch');
      if (existingSearch) searchBookUid = existingSearch.value.trim();

      const filteredUnits = relatedUnits.filter(u =>
        (selectedLocation === 'All' || u.location === selectedLocation) &&
        (selectedStatus === 'All' || u.status === selectedStatus) &&
        (searchBookUid === '' || String(u.book_uid).toLowerCase().includes(searchBookUid.toLowerCase()))
      );

      const grouped = {};
      filteredUnits.forEach(u => {
        const loc = u.location || 'Not Found';
        if (!grouped[loc]) grouped[loc] = [];
        grouped[loc].push(u);
      });

      let html = `<div class="filter-controls">
          <input type="text" id="bookUidSearch" placeholder="Search Book UID..." 
              style="margin-bottom:10px;width:98%;padding:6px;border:1px solid #ccc;border-radius:5px;" />
          <select id="locationFilter">
              <option value="All">All Locations</option>
              ${allLocations.map(loc => `<option value="${loc}">${loc}</option>`).join('')}
          </select>
          <select id="statusFilter">
              <option value="All">All Statuses</option>
              ${allStatuses.map(st => `<option value="${st}">${st}</option>`).join('')}
          </select>
          <button id="clearFilters">Clear Filters</button>
      </div>`;

      if (filteredUnits.length === 0) html += `<p>No matching books found for the selected filters.</p>`;
      else Object.keys(grouped).forEach(location => {
        html += `<h3>${location}</h3>
        <table>
            <tr>
                <th style="width:20%; text-align:center;">Book UID</th>
                <th style="width:20%; text-align:center;">Tag UID</th>
                <th style="width:20%; text-align:center;">Status</th>
                <th style="width:20%; text-align:center;">Location</th>
                ${(userRole === 'admin' || userRole === 'librarian') ? '<th style="width:15%; text-align:center;">Action</th>' : ''}
            </tr>`;
        grouped[location].forEach(u => {
          let tagDisplay = u.tag_uid;
          if (tagDisplay && typeof tagDisplay === 'object') tagDisplay = Object.values(tagDisplay).join(',');

          const isDeletable = (u.status || '').toLowerCase() === 'available';
          html += `<tr>
              <td style="text-align:center;">${u.book_uid || 'N/A'}</td>
              <td style="text-align:center;">${tagDisplay || 'N/A'}</td>
              <td style="text-align:center;">${u.status || 'N/A'}</td>
              <td style="text-align:center;">${u.location || 'N/A'}</td>
              ${(userRole === 'admin' || userRole === 'librarian') ? `<td style="text-align:center;">
                  <button class="delete-unit-btn" 
                          data-bookuid="${u.book_uid}" 
                          data-status="${u.status}" 
                          style="background:${isDeletable ? '#e74c3c' : '#ccc'}; 
                                 cursor:${isDeletable ? 'pointer' : 'not-allowed'};" 
                          ${isDeletable ? '' : 'disabled'}>
                    🗑 Delete
                  </button>
              </td>` : ''}
          </tr>`;
        });
        html += `</table>`;
      });
      popupContent.innerHTML = html;

      document.getElementById('locationFilter').value = selectedLocation;
      document.getElementById('statusFilter').value = selectedStatus;
      document.getElementById('bookUidSearch').value = searchBookUid;

      const searchInputEl = document.getElementById('bookUidSearch');
      searchInputEl.focus();
      searchInputEl.setSelectionRange(searchInputEl.value.length, searchInputEl.value.length);

      document.getElementById('locationFilter').addEventListener('change', e => { selectedLocation = e.target.value; renderTable(); });
      document.getElementById('statusFilter').addEventListener('change', e => { selectedStatus = e.target.value; renderTable(); });
      document.getElementById('clearFilters').addEventListener('click', () => { selectedLocation = 'All'; selectedStatus = 'All'; searchBookUid = ''; renderTable(); });
      searchInputEl.addEventListener('input', e => { searchBookUid = e.target.value.trim(); renderTable(); });

      if (userRole === 'admin' || userRole === 'librarian') {
        document.querySelectorAll('.delete-unit-btn').forEach(btn => {
          btn.addEventListener('click', async e => {
            const bookUid = e.target.getAttribute('data-bookuid');
            const status = e.target.getAttribute('data-status');
            await deleteUnit(bookUid, status, showConfirmModal, showSuccessModal);
          });
        });
      }
    }
    renderTable();
  });
  overlay.style.display = 'block';
  popup.style.display = 'flex';

  // ADD GRAY OVERLAY
document.body.classList.add('popup-active');
}

// -------------------- Close Popup --------------------
function closePopupFunc() {
  popup.style.display = 'none';
  addBookPopup.style.display = 'none';
  addUnitPopup.style.display = 'none';
  overlay.style.display = 'none';
  if (popupListener) { off(unitRef, 'value', popupListener); popupListener = null; }

    // REMOVE GRAY OVERLAY
  document.body.classList.remove('popup-active');
}

closePopup.addEventListener('click', closePopupFunc);
overlay.addEventListener('click', closePopupFunc);

// -------------------- Render Books --------------------
searchInput.addEventListener('input', () => {
  closePopupFunc();
  renderAllBooks(searchInput.value.trim());
});

function renderAllBooks(filterText = '') {
  display.innerHTML = '';
  let matchCount = 0;
  const searchLower = filterText.toLowerCase();

  Object.keys(metas).forEach(metaId => {
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

    if (filterText === '' || matchesMeta || matchesUnit) { matchCount++; display.appendChild(card); }
  });

  if (matchCount === 0) display.innerHTML = '📭 No book with that info.';
}

// -------------------- Firebase Listeners --------------------
onValue(unitRef, snap => { units = snap.val() || {}; renderAllBooks(searchInput.value.trim()); });
onValue(metaRef, snap => { metas = snap.val() || {}; renderAllBooks(searchInput.value.trim()); });

// -------------------- Initialize --------------------
auth.onAuthStateChanged(() => {
  fetchUserRole().then(role => {
    userRole = role || 'user';
    addBookBtn.style.display = (userRole === 'admin' || userRole === 'librarian') ? "inline-block" : "none";
    renderAllBooks(searchInput.value.trim());
  });
});

// -------------------- Start Location Tracking --------------------
startLocationTracking();
