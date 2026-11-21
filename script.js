const STORAGE_KEY = "barangayHealthAppointments";
const form = document.getElementById("appointmentForm");
const message = document.getElementById("formMessage");
const recordsList = document.getElementById("recordsList");
const dateInput = document.getElementById("date");
const editIdInput = document.getElementById("editId");

function getRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}
function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
function makeId() {
  return "BHC-" + Date.now().toString().slice(-8);
}
function todayString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}
dateInput.min = todayString();

function showMessage(text, type) {
  message.textContent = text;
  message.className = "message " + type;
}
function clearForm() {
  form.reset();
  editIdInput.value = "";
  document.getElementById("submitBtn").textContent = "Submit Appointment";
  document.getElementById("resetEdit").classList.add("hidden");
  dateInput.min = todayString();
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  })[character]);
}

form.addEventListener("submit", function(event) {
  event.preventDefault();
  const id = editIdInput.value;
  const fullName = document.getElementById("fullName").value.trim();
  const age = Number(document.getElementById("age").value);
  const contact = document.getElementById("contact").value.trim();
  const service = document.getElementById("service").value;
  const date = dateInput.value;
  const time = document.getElementById("time").value;
  const notes = document.getElementById("notes").value.trim();

  if (!fullName || !age || !contact || !service || !date || !time) {
    showMessage("Please complete all required fields.", "error"); return;
  }
  if (age < 1 || age > 120) {
    showMessage("Please enter a valid age (1 to 120).", "error"); return;
  }
  if (!/^09\d{9}$/.test(contact)) {
    showMessage("Contact number must be 11 digits and start with 09.", "error"); return;
  }
  if (date < todayString()) {
    showMessage("Please choose today or a future date.", "error"); return;
  }

  const records = getRecords();
  const conflict = records.find(item =>
    item.date === date && item.time === time &&
    item.status !== "Cancelled" && item.id !== id
  );
  if (conflict) {
    showMessage("This time slot is already taken. Please choose another time.", "error"); return;
  }

  if (id) {
    const index = records.findIndex(item => item.id === id);
    if (index === -1) {
      showMessage("Appointment record was not found.", "error"); return;
    }
    records[index] = { ...records[index], fullName, age, contact, service, date, time, notes };
    saveRecords(records);
    showMessage("Appointment details updated successfully.", "success");
  } else {
    records.push({ id: makeId(), fullName, age, contact, service, date, time, notes, status:"Pending", createdAt:new Date().toISOString() });
    saveRecords(records);
    showMessage("Appointment submitted! Your status is Pending.", "success");
  }
  clearForm();
  renderRecords();
});

document.getElementById("resetEdit").addEventListener("click", function() {
  clearForm(); showMessage("Edit cancelled.", "success");
});

function renderRecords() {
  const search = document.getElementById("searchInput").value.toLowerCase().trim();
  const filter = document.getElementById("statusFilter").value;
  const records = getRecords().filter(item => {
    const matchesSearch = item.fullName.toLowerCase().includes(search) || item.contact.includes(search);
    const matchesStatus = filter === "All" || item.status === filter;
    return matchesSearch && matchesStatus;
  }).sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));

  if (!records.length) {
    recordsList.innerHTML = '<div class="empty">No appointment records found.</div>'; return;
  }
  recordsList.innerHTML = records.map(item => `
    <article class="record">
      <div>
        <h3>${escapeHTML(item.fullName)} <span class="status ${escapeHTML(item.status)}">${escapeHTML(item.status)}</span></h3>
        <p><strong>Reference:</strong> ${escapeHTML(item.id)} | <strong>Service:</strong> ${escapeHTML(item.service)}</p>
        <p><strong>Date:</strong> ${escapeHTML(item.date)} at ${escapeHTML(item.time)} | <strong>Contact:</strong> ${escapeHTML(item.contact)}</p>
        <p><strong>Age:</strong> ${escapeHTML(item.age)}${item.notes ? " | <strong>Notes:</strong> " + escapeHTML(item.notes) : ""}</p>
      </div>
      <div class="record-actions">
        ${item.status !== "Cancelled" ? `<button class="action-btn" onclick="editRecord('${item.id}')">Edit</button>
        <button class="action-btn" onclick="changeStatus('${item.id}','Confirmed')">Confirm</button>
        <button class="action-btn" onclick="changeStatus('${item.id}','Cancelled')">Cancel</button>` : ""}
        <button class="action-btn delete" onclick="deleteRecord('${item.id}')">Delete</button>
      </div>
    </article>`).join("");
}
function editRecord(id) {
  const item = getRecords().find(record => record.id === id);
  if (!item) return;
  document.getElementById("fullName").value = item.fullName;
  document.getElementById("age").value = item.age;
  document.getElementById("contact").value = item.contact;
  document.getElementById("service").value = item.service;
  document.getElementById("date").value = item.date;
  document.getElementById("time").value = item.time;
  document.getElementById("notes").value = item.notes || "";
  editIdInput.value = item.id;
  document.getElementById("submitBtn").textContent = "Save Changes";
  document.getElementById("resetEdit").classList.remove("hidden");
  showMessage("You are editing " + item.id + ".", "success");
  location.hash = "#book";
}
function changeStatus(id, status) {
  const records = getRecords();
  const item = records.find(record => record.id === id);
  if (!item) return;
  if (status === "Cancelled" && !confirm("Are you sure you want to cancel this appointment?")) return;
  item.status = status;
  saveRecords(records);
  renderRecords();
}
function deleteRecord(id) {
  if (!confirm("Delete this appointment record permanently?")) return;
  saveRecords(getRecords().filter(item => item.id !== id));
  renderRecords();
}
document.getElementById("searchInput").addEventListener("input", renderRecords);
document.getElementById("statusFilter").addEventListener("change", renderRecords);
renderRecords();
