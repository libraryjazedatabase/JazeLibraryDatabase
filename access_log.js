import { db } from './firebase.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// DOM Elements
const accessLogTableBody = document.getElementById('accessLogTableBody');
const searchInput = document.getElementById('searchInput');
const roleFilter = document.getElementById('roleFilter');
const sessionFilter = document.getElementById('sessionFilter');
const clearFiltersBtn = document.getElementById('clearFilters');

let accessLogs = []; // Store all logs for filtering
let allRoles = new Set();

// Function to format timestamp
function formatTime(timestamp) {
  if (!timestamp) return "No logout yet";
  const date = new Date(timestamp);
  if (isNaN(date)) return timestamp;
  const options = {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: 'numeric', hour12: true
  };
  return date.toLocaleString(undefined, options);
}

// Fetch access logs and all accounts once
async function loadAccessLogs() {
  try {
    const [logSnap, accountsSnap] = await Promise.all([
      get(ref(db, 'access_log')),
      get(ref(db, 'accounts'))
    ]);

    if (!logSnap.exists()) return;

    const logs = logSnap.val();
    const accounts = accountsSnap.exists() ? accountsSnap.val() : {};

    accessLogs = [];
    allRoles.clear();

    for (const [accessNo, logData] of Object.entries(logs)) {
      const user = accounts[logData.user_id];
      const userName = user ? `${user.fname || ''} ${user.mname || ''} ${user.lname || ''}`.trim() : 'Unknown';

      if (logData.role) allRoles.add(logData.role);

      accessLogs.push({
        name: userName,
        role: logData.role || '',
        login_time: formatTime(logData.login_time),
        logout_time: logData.logout_time ? formatTime(logData.logout_time) : "No logout yet",
        complete: !!logData.logout_time
      });
    }

    // Populate role filter
    roleFilter.innerHTML = '<option value="All">All Roles</option>';
    Array.from(allRoles).sort().forEach(r => {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r;
      roleFilter.appendChild(opt);
    });

    // Sort logs by login_time descending
    accessLogs.sort((a, b) => new Date(b.login_time) - new Date(a.login_time));

    renderTable(accessLogs);
  } catch (err) {
    console.error('Failed to load access logs:', err);
  }
}

// Render table rows with optional filtering
function renderTable(data) {
  accessLogTableBody.innerHTML = '';
  data.forEach(log => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${log.name}</td>
      <td>${log.role}</td>
      <td>${log.login_time}</td>
      <td>${log.logout_time}</td>
    `;
    accessLogTableBody.appendChild(row);
  });
}

// Apply filters and search
function applyFilters() {
  const roleVal = roleFilter.value;
  const sessionVal = sessionFilter.value;
  const query = searchInput.value.toLowerCase();

  const filtered = accessLogs.filter(log => {
    const matchesName = log.name.toLowerCase().includes(query);
    const matchesRole = roleVal === 'All' || log.role === roleVal;
    const matchesSession =
      sessionVal === 'All' ||
      (sessionVal === 'Complete' && log.complete) ||
      (sessionVal === 'Incomplete' && !log.complete);
    return matchesName && matchesRole && matchesSession;
  });

  renderTable(filtered);
}

// Event listeners
searchInput.addEventListener('input', applyFilters);
roleFilter.addEventListener('change', applyFilters);
sessionFilter.addEventListener('change', applyFilters);
clearFiltersBtn.addEventListener('click', () => {
  searchInput.value = '';
  roleFilter.value = 'All';
  sessionFilter.value = 'All';
  renderTable(accessLogs);
});

// Initial load
loadAccessLogs();
