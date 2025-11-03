import { openBookFormForUpdate } from './book_add_update.js';
import './book_add_unit.js';
import { deleteBook } from './book_delete_book.js';

// Utility
function keywordsToString(kw) {
  if (!kw) return 'N/A';
  if (Array.isArray(kw)) return kw.filter(k => k).join(', ');
  if (typeof kw === 'object') return Object.values(kw).filter(k => k).join(', ');
  return String(kw);
}

// Exports , for creating the dynamic book displays
export function createMetaCard(metaId, meta, units, metas, userRole, showPopup, showSuccessModal, showConfirmModal) {
  const relatedUnits = Object.values(units).filter(u => String(u.metadata_id) === String(metaId));
  const title = meta.title || 'N/A';
  const author = meta.author || 'N/A';
  const keywordsStr = keywordsToString(meta.keywords);
  const location = meta.preferred_location || 'N/A'; // <-- new line for preferred location
  const cover = meta.cover || 'placeholder.jpg';
  const allAvailable = relatedUnits.length === 0 || relatedUnits.every(u => u.status?.toLowerCase() === 'available');
  const statusText = relatedUnits.length === 0
    ? 'Not Available'
    : relatedUnits.some(u => u.status?.toLowerCase() === 'available') ? 'Available' : 'Not Available';

  const showAdminActions = userRole === 'admin' || userRole === 'librarian';

  const card = document.createElement('div');
  card.className = 'book-card';
  card.innerHTML = `
    <div class="book-image" style="background-image: url('${cover}')"></div>
    <div class="book-details">
      <div class="field"><span class="label">Title:</span> ${title}</div>
      <div class="field"><span class="label">Author:</span> ${author}</div>
      <div class="field"><span class="label">Keywords:</span> ${keywordsStr}</div>
         <div class="field"><span class="label">Location:</span> ${location}</div> <!-- <-- new line -->
      <div class="field"><span class="label">Status:</span> ${statusText}</div>
      <button class="more-info-btn">More Info</button>
    </div>
    ${showAdminActions ? `
    <div class="gear-container">
      <button class="gear-btn" title="Settings" data-metadata-id="${metaId}">⚙️</button>
      <div class="gear-dropdown">
        <button class="add-unit-btn">Add Book Unit</button>
        <button class="update-book-btn">Update Book</button>
        <button class="delete-book-btn" ${allAvailable ? '' : 'disabled'}>Delete Book</button>
      </div>
    </div>` : '' }
  `;

  card.querySelector('.more-info-btn').addEventListener('click', () => showPopup(metaId));

  if (showAdminActions) {
    const gearBtn = card.querySelector('.gear-btn');
    const gearDropdown = card.querySelector('.gear-dropdown');

    gearBtn.addEventListener('click', e => {
      e.stopPropagation();
      const isVisible = gearDropdown.style.display === 'block';
      document.querySelectorAll('.gear-dropdown').forEach(d => d.style.display = 'none');
      gearDropdown.style.display = isVisible ? 'none' : 'block';
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.gear-container')) gearDropdown.style.display = 'none';
    });

    card.querySelector('.add-unit-btn').addEventListener('click', () => {
      import('./book_add_unit.js').then(module => module.openAddUnitPopup(metaId));
      gearDropdown.style.display = 'none';
    });

    card.querySelector('.update-book-btn').addEventListener('click', () => {
      gearDropdown.style.display = 'none';
      openBookFormForUpdate(metaId, metas);
    });

    card.querySelector('.delete-book-btn').addEventListener('click', async () => {
      gearDropdown.style.display = 'none';
      await deleteBook(metaId, units, allAvailable, showConfirmModal, showSuccessModal);
    });
  }

  return card;
}
