import { db } from './firebase.js';
import { ref, set, update, get, onValue} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { 
  addBookBtn, addBookPopup, addBookForm, keywordList, addKeywordBtn, cancelAddBook,
  bookCoverFile, coverPreview, submitBookBtn, formTitle, overlay
} from './book_dom.js';

let isEditing = false;
let editingMetaId = null;

// -------------------- Success Modal --------------------
function showSuccessModal(message) {
    const modal = document.getElementById('successModal');
    const msgEl = document.getElementById('successMessage');
    msgEl.textContent = message || 'Operation completed successfully!';
    modal.classList.add('open');
    overlay.style.display = 'block';
    document.body.classList.add('popup-active');
    modal.querySelectorAll('[data-close-modal]').forEach(btn => btn.replaceWith(btn.cloneNode(true)));
    modal.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => closeModal('successModal')));
}

// -------------------- Centralized Close Modal --------------------
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('open');
    const anyOpen = document.querySelectorAll('.modal.open, .form-popup[style*="display: flex"]').length > 0;
    if (!anyOpen) {
        overlay.style.display = 'none';
        document.body.classList.remove('popup-active');
    }
}

// -------------------- Populate Preferred Locations --------------------
async function populatePreferredLocations() {
    const readersRef = ref(db, "readers");
    const readersSnap = await get(readersRef);
    const readers = readersSnap.val() || {};
    const locationSet = new Set();
    Object.values(readers).forEach(reader => {
        if (reader?.location) locationSet.add(reader.location);
    });
    const locationDropdown = document.getElementById('bookPreferredLocation');
    if (!locationDropdown) return;
    locationDropdown.innerHTML = '<option value="">Select Location</option>' +
        Array.from(locationSet).map(loc => `<option value="${loc}">${loc}</option>`).join('');
}

// -------------------- Reset Form --------------------
function resetBookForm() {
    addBookForm.reset();
    keywordList.innerHTML = `<input type="text" class="keywordInput" placeholder="Keyword">`;
    coverPreview.src = '';
    coverPreview.style.display = 'none';
    const locationDropdown = document.getElementById('bookPreferredLocation');
    if (locationDropdown) locationDropdown.value = '';
}

// -------------------- Open Add Book Form --------------------
addBookBtn.addEventListener('click', async () => {
    isEditing = false;
    editingMetaId = null;
    formTitle.textContent = "Add New Book";
    submitBookBtn.textContent = "Save";
    resetBookForm();
    await populatePreferredLocations();
    addBookPopup.style.display = "flex";
    overlay.style.display = 'block';
    document.body.classList.add('popup-active');
});

// -------------------- Cancel --------------------
cancelAddBook.addEventListener('click', () => {
    addBookPopup.style.display = 'none';
    closeOverlayIfNone();
    resetBookForm();
    isEditing = false;
    editingMetaId = null;
});

// -------------------- Add Keyword --------------------
addKeywordBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'keywordInput';
    input.placeholder = 'Keyword';
    keywordList.appendChild(input);
});

// -------------------- Cover Preview --------------------
bookCoverFile.addEventListener('change', () => {
    const file = bookCoverFile.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            coverPreview.src = e.target.result;
            coverPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// -------------------- Fill Preview Modal --------------------
function fillPreviewModal(title, author, preferredLocation, securityPass, keywords, cover) {
    const modal = document.getElementById('bookPreviewModal');
    if (!modal) return;

    const titleEl = modal.querySelector('#previewBookTitle');
    const authorEl = modal.querySelector('#previewBookAuthor');
    const locationEl = modal.querySelector('#previewBookPreferredLocation');
    const securityEl = modal.querySelector('#previewSecurityPass');
    const keywordsEl = modal.querySelector('#previewBookKeywords');
    const coverEl = modal.querySelector('#previewBookCover');

    if (titleEl) titleEl.textContent = title || 'Untitled';
    if (authorEl) authorEl.textContent = author || 'Unknown Author';
    if (locationEl) locationEl.textContent = preferredLocation || 'No location selected';
   if (securityEl) securityEl.textContent = securityPass || 'N/A';
    if (keywordsEl) keywordsEl.textContent = keywords.length ? keywords.join(', ') : 'No keywords';

    if (coverEl) {
        if (cover) {
            coverEl.src = cover;
            coverEl.style.display = 'block';
        } else {
            coverEl.style.display = 'none';
        }
    }
}


// -------------------- Submit Form: Show Preview --------------------
addBookForm.addEventListener('submit', e => {
    e.preventDefault();
    const title = document.getElementById('bookTitle').value.trim();
    const author = document.getElementById('bookAuthor').value.trim();
    const preferredLocation = document.getElementById('bookPreferredLocation').value;
let securityPass = document.getElementById('unitSecurity').value;
securityPass = securityPass === "Yes" ? "Allowed Outside" : "Inside Use Only";
    const keywords = Array.from(document.querySelectorAll('.keywordInput')).map(i => i.value.trim()).filter(v => v);
    const cover = coverPreview.src && coverPreview.style.display === 'block' ? coverPreview.src : '';
    fillPreviewModal(title, author, preferredLocation, securityPass,keywords, cover);
    document.getElementById('bookPreviewModal').classList.add('open');
});

// -------------------- Confirm Add / Update --------------------
document.getElementById('confirmAddBookBtn').addEventListener('click', async () => {
    const confirmBtn = document.getElementById('confirmAddBookBtn');
    confirmBtn.disabled = true;
    const title = document.getElementById('bookTitle').value.trim();
    const author = document.getElementById('bookAuthor').value.trim();
    const preferredLocation = document.getElementById('bookPreferredLocation').value;
    const security_pass = document.getElementById('unitSecurity').value.trim();
    const keywords = Array.from(document.querySelectorAll('.keywordInput')).map(i => i.value.trim()).filter(v => v);
    const cover = coverPreview.src && coverPreview.style.display === 'block' ? coverPreview.src : '';
    document.getElementById('bookPreviewModal').classList.remove('open');

    try {
        if (!isEditing) {
            const newMetaId = `BOOK-${Date.now()}`;
            await set(ref(db, `book_metadata/${newMetaId}`), { title, author, preferred_location: preferredLocation, cover, keywords ,security_pass});
            showSuccessModal('✅ Book added successfully!');
        } else if (editingMetaId) {
        // Update metadata
        await update(ref(db, `book_metadata/${editingMetaId}`), { 
            title, author, preferred_location: preferredLocation, cover, keywords, security_pass 
        });

        // Update security_pass for all book units using this metadata
        const unitsRef = ref(db, 'book_unit');
        onValue(unitsRef, async (snapshot) => {
            const units = snapshot.val() || {};
            for (const [uid, data] of Object.entries(units)) {
                if (data.metadata_id === editingMetaId) {
                    await update(ref(db, `book_unit/${uid}`), { security_pass });
                }
            }
        }, { onlyOnce: true });

        showSuccessModal('✅ Book updated successfully!');
        isEditing = false;
        editingMetaId = null;
        formTitle.textContent = 'Add New Book';
        submitBookBtn.textContent = 'Save';
    }
    } catch (err) {
        showSuccessModal('❌ Error saving book: ' + err.message);
    } finally {
        addBookPopup.style.display = 'none';
        resetBookForm();
        confirmBtn.disabled = false;
    }
});

// -------------------- Overlay Utility --------------------
function closeOverlayIfNone() {
    const anyOpen = document.querySelectorAll('.modal.open, .form-popup[style*="display: flex"]').length > 0;
    if (!anyOpen) {
        overlay.style.display = 'none';
        document.body.classList.remove('popup-active');
    }
}

// -------------------- Export for Update Mode --------------------
export function setEditing(metaId) {
    isEditing = true;
    editingMetaId = metaId;
}

// -------------------- Populate Form for Update --------------------
export async function openBookFormForUpdate(metaId, metas) {
    const meta = metas[metaId];
    if (!meta) return;

    setEditing(metaId);
    formTitle.textContent = 'Update Book';
    submitBookBtn.textContent = 'Update';
    resetBookForm();

    document.getElementById('bookTitle').value = meta.title || '';
    document.getElementById('bookAuthor').value = meta.author || '';

    // Wait for preferred locations to load before setting value
    await populatePreferredLocations();
    document.getElementById('bookPreferredLocation').value = meta.preferred_location || '';
    document.getElementById('unitSecurity').value = meta.security_pass || 'Yes';


    // Populate keywords
    keywordList.innerHTML = '';
    if (meta.keywords) {
        const kws = Array.isArray(meta.keywords) ? meta.keywords
                  : typeof meta.keywords === 'object' ? Object.values(meta.keywords)
                  : [meta.keywords];
        kws.forEach(kw => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'keywordInput';
            input.placeholder = 'Keyword';
            input.value = kw;
            keywordList.appendChild(input);
        });
    } else {
        keywordList.innerHTML = `<input type="text" class="keywordInput" placeholder="Keyword">`;
    }

    if (meta.cover) {
        coverPreview.src = meta.cover;
        coverPreview.style.display = 'block';
    } else {
        coverPreview.src = '';
        coverPreview.style.display = 'none';
    }

    addBookPopup.style.display = 'flex';
    overlay.style.display = 'block';
    document.body.classList.add('popup-active');
}
