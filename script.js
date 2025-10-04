// ================== Config ==================
const allowedLat = 26.488872120852985;
const allowedLng = 74.63289537916941;
const radius = 0.2; // km
const URL = "https://script.google.com/macros/s/AKfycbzhR-60-AUw2gL6_8ro7Dm3arl0exFNJ0a3n0MYPE-r-s4YwLrJDkJsT31mYk9LqqG92g/exec";
const historyUrl = "https://script.google.com/macros/s/AKfycbwYMb6IVNNSVO6E70ujDfO3x1x7G2sZX44X37MpTFiuBGysDNScXmsbZxuZUv-qJfXA/exec";

const studentMap = {
  "101": "Sunil Dhawan","102": "Arjun Ram","103": "Suheel","104": "Rajesh",
  "105": "Jagdish kasaniyan","106": "Mahender pg","107": "Rajveer","108": "Abhi",
  "109": "Manish","110": "Manu","469": "Mahendra Gahlot","420": "Rahul Rawat",
  "506": "kana ram","423": "Ramniwash","Ajmer": "Yash"
};

const statusMsg = document.getElementById("statusMsg");
let historyData = [];
const todayISO = new Date().toISOString().split('T')[0];

// Reset daily
if (localStorage.getItem("lastActionDate") !== todayISO) {
  localStorage.removeItem("attendanceStatus");
  localStorage.removeItem("firstInTime");
  localStorage.setItem("lastActionDate", todayISO);
}

// ================== Page Load ==================
window.onload = () => {
  const savedId = localStorage.getItem("regId");
  if (savedId && studentMap[savedId]) {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("attendanceSection").style.display = "block";
    checkLocation(savedId);
  }
};

// ================== Login ==================
function saveAndProceed() {
  const id = document.getElementById("regInput").value.trim();
  if (!id || !studentMap[id]) return alert("❌ Invalid ID!");
  localStorage.setItem("regId", id);
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("attendanceSection").style.display = "block";
  checkLocation(id);
}

// ================== Haversine ==================
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ================== Attendance ==================
function checkLocation(id) {
  const name = studentMap[id];
  const status = localStorage.getItem("attendanceStatus");

  if (status === "OUT") {
    statusMsg.innerHTML = `❌ <b style="color:#ff009d">${name}</b>, आप पहले ही 🟢'IN' और 🔴'OUT' हो चुके हैं!`;
    showHistory();
    return;
  }

  if (status === "IN") {
    const time = localStorage.getItem("firstInTime");
    statusMsg.innerHTML = `✅ Hello <b style="color:#ff009d">${name}</b>, आप पहले ही "🟢IN" हो चुके हैं<br>⏰ समय: ${time}`;
    return;
  }

  statusMsg.innerHTML = "📡 Location check हो रही है...";
  if (!navigator.geolocation) { statusMsg.innerHTML = "❌ Location supported नहीं है।"; return; }

  navigator.geolocation.getCurrentPosition(pos => {
    const dist = getDistance(pos.coords.latitude, pos.coords.longitude, allowedLat, allowedLng);
    if (dist <= radius) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString();
      localStorage.setItem("attendanceStatus", "IN");
      localStorage.setItem("firstInTime", timeStr);
      localStorage.setItem("lastActionDate", todayISO);
      statusMsg.innerHTML = `✅ Hello <b style="color:#ff009d">${name}</b>, आप Library क्षेत्र के अंदर हैं!<br>🟢 "IN" दर्ज - ⏰${timeStr}`;
      markAttendanceSilent("IN");
      setTimeout(showHistory, 2000);
    } else {
      statusMsg.innerHTML = `❌ आप Library क्षेत्र से बाहर हैं (📏 ${dist.toFixed(2)} km)।`;
    }
  }, err => { statusMsg.innerHTML = `❌ Location error: ${err.message}`; }, { enableHighAccuracy:true, timeout:10000 });
}

function markAttendanceSilent(status) {
  const id = localStorage.getItem("regId");
  if (!id) return;
  const formData = new URLSearchParams({ ID: id, Status: status, Location: "auto" });
  fetch(URL, { method: "POST", body: formData })
    .then(res => console.log("✔ Attendance submitted"))
    .catch(err => console.error("❌ fetch error:", err));
}

function manualOut() {
  const id = localStorage.getItem("regId");
  if (!id) return;

  const name = studentMap[id];
  const attendanceStatus = localStorage.getItem("attendanceStatus");

  if (attendanceStatus !== "IN") {
    statusMsg.innerHTML = `⚠️ <b>${name}</b>, पहले "IN" करें फिर "OUT"।`;
    return;
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString();
  localStorage.setItem("attendanceStatus", "OUT");
  statusMsg.innerHTML = `🔴 आप Manual "OUT" हो गए! ⏰${timeStr}`;
  markAttendanceSilent("OUT");
  setTimeout(showHistory, 1500);
}

// ================== History ==================
function showHistory() {
  const id = localStorage.getItem("regId");
  if (!id) return;

  const hb = document.getElementById("historyTableBody");
  const loaderDiv = document.getElementById("loaderMsg");
  loaderDiv.innerHTML = `<span class="spinner"></span> प्रतीक्षा करें...`;
  hb.innerHTML = `<tr><td colspan="4"><span class="spinner"></span></td></tr>`;
  document.getElementById("historyModal").style.display = "flex";

  fetch(`${historyUrl}?type=history&id=${id}`)
    .then(res => res.json())
    .then(data => { historyData = data; loaderDiv.innerHTML = ""; renderHistoryTable(historyData); })
    .catch(()=>{ loaderDiv.innerHTML="❌ History लोड विफल"; hb.innerHTML="<tr><td colspan='4'>❌</td></tr>"; });
}

function convertToInputFormat(dateStr) {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return "";
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
}

function renderHistoryTable(data) {
  const hb = document.getElementById("historyTableBody");
  const selectedDate = document.getElementById("filterDate")?.value;
  hb.innerHTML = "";

  const sorted = [...data].reverse();
  const filtered = selectedDate ? sorted.filter(e => convertToInputFormat(e.date) === selectedDate) : sorted;

  if (filtered.length === 0) {
    hb.innerHTML = "<tr><td colspan='4'>कोई डेटा नहीं मिला।</td></tr>";
    return;
  }

  filtered.forEach((e, index) => {
    const icon = e.status === "IN" ? "🟢" : "🔴";
    const maskedPhone = e.phone?.replace(/^(\d{2})\d{4}(\d{4})$/, "$1****$2") || '';
    hb.innerHTML += `
      <tr style="background:${index===0?'rgba(117,197,235,0.72)':'white'};">
        <td><b style="color:rgb(77,6,243)">${e.name}</b><br>${maskedPhone}</td>
        <td>${e.date}</td>
        <td>${e.time}</td>
        <td>${icon} ${e.status}</td>
      </tr>
    `;
  });
}
