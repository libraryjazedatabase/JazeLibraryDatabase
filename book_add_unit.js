import { db } from './firebase.js';
import { ref, onValue, set , get, update} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

//  Modal helpers for opening and closing modals
window.openModal = function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
};
window.closeModal = function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
};
document.querySelectorAll('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-close-modal');
    window.closeModal(id);
  });
});

// set card_type to book_card in r3
async function setReaderModeToBook() {
  const r3Ref = ref(db, 'readers/r3');
  await update(r3Ref, {
    card_type: "book_card",
    function:"write"
  });
}

// Real-time update for R3 tag reader
const tagInput = document.getElementById('unitTagUid');
const locationInput = document.getElementById('unitLocation');
const r3Ref = ref(db, 'readers/r3');

onValue(r3Ref, (snapshot) => {
  const r3Data = snapshot.val() || {};
  tagInput.value = r3Data.tag_uid || '';
  locationInput.value = r3Data.location || 'Unknown';
});

// Open Add Unit Popup
export async function openAddUnitPopup(metadataId) {
  await setReaderModeToBook();

  document.getElementById('unitMetadataId').value = metadataId;
  document.getElementById('unitBookUid').value = '';
  document.getElementById('addUnitPopup').style.display = 'flex';
  document.getElementById('overlay').style.display = 'block';
}

// Gear button integration
document.addEventListener('click', (e) => {
  if (e.target && e.target.classList.contains('gear-btn')) {
    const metadataId = e.target.dataset.metadataId;
    openAddUnitPopup(metadataId);
  }
});

// Add Unit form submission
const addUnitForm = document.getElementById('addUnitForm');

addUnitForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorBox = document.getElementById('formError');
  errorBox.textContent = "";

  const bookUid = document.getElementById('unitBookUid').value.trim();
  const metadataId = document.getElementById('unitMetadataId').value.trim();
  const tagUid = document.getElementById('unitTagUid').value.trim();

const metadataSnap = await get(ref(db, `book_metadata/${metadataId}`));
const metadata = metadataSnap.val() || {};
const security_pass = metadata.security_pass || 'Yes'; // fallback if missing


  const location = document.getElementById('unitLocation').value.trim() || 'Unknown';
  const status = "Available";
  const last_seen = "Adding Station";

  if (!bookUid || !metadataId || !tagUid) {
    errorBox.textContent = 'Book UID, Metadata ID, and Tag UID are required.';
    return;
  }

  const unitData = { metadata_id: metadataId, tag_uid: tagUid, status, location , last_seen, security_pass}; // added security pass to be inserted in the database

  try {
    const allUnitsRef = ref(db, 'book_unit');
    onValue(allUnitsRef, async (snapshot) => {
      const units = snapshot.val() || {};

      let bookUidExists = false;
      let tagUidExists = false;

      Object.entries(units).forEach(([uid, data]) => {
        if (uid === bookUid) bookUidExists = true;
        if (data.tag_uid === tagUid) tagUidExists = true;
      });

      if (bookUidExists && tagUidExists) {
        errorBox.textContent = 'Both Book UID and Tag UID already exist!';
        return;
      }
      if (bookUidExists) {
        errorBox.textContent = 'Book UID already exists!';
        return;
      }
      if (tagUidExists) {
        errorBox.textContent = 'Tag UID already exists!';
        return;
      }

      await set(ref(db, `book_unit/${bookUid}`), unitData);

// add tag_uid and book_uid inside tag_index
      await set(ref(db, `tag_index/${tagUid}`), bookUid);

// add the book UID to "borrow_history"
      await set(ref(db, `borrow_history/${bookUid}/`), {
  latest_history: ""
});
// clear the card_type of r3
      await set(ref(db, 'readers/r3/card_type'), "");
// Clear the tag_uid of reader r3
      await set(ref(db, 'readers/r3/tag_uid'), "");

      document.getElementById('successMessage').textContent = 'Book Unit added successfully!';
      openModal('successModal');

      addUnitForm.reset();
      errorBox.textContent = "";
      document.getElementById('addUnitPopup').style.display = 'none';
      document.getElementById('overlay').style.display = 'none';
    }, { onlyOnce: true });
  } catch (err) {
    errorBox.textContent = 'Error adding book unit: ' + err.message;
  }
});

// Cancel button
document.getElementById('cancelAddUnit').addEventListener('click', async() => {
  document.getElementById('addUnitPopup').style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
  addUnitForm.reset();
  document.getElementById('formError').textContent = "";

    await update(ref(db, 'readers/r3'), {
    card_type: "",
    tag_uid: ""
  });
});
