/**
 * LINE Beauty Reservation System - Frontend Logic
 */

const GAS_APP_URL = 'https://script.google.com/macros/s/AKfycbztR_WF-aBLW24jBZFfiUQRdy3QlXlrioAktTvgerIERlHPgQqPUCvDyf-24CdtYXcviA/exec';

let currentStep = 1;
let selectedData = {
  designerId: null,
  serviceName: null,
  date: null,
  time: null,
  amount: 0,
  duration: 60,
  userId: 'MOCK_USER_ID',
  userName: 'MOCK_USER_NAME'
};

/**
 * LIFF Initialization
 */
async function initLiff() {
  try {
    await liff.init({ liffId: '2009603120-0Fkrf3bm' });
    if (!liff.isLoggedIn()) {
      liff.login();
    } else {
      const profile = await liff.getProfile();
      selectedData.userId = profile.userId;
      selectedData.userName = profile.displayName;

      // Update User Profile in GAS (Module 3 CRM)
      await apiPost('updateUser', { userId: profile.userId, displayName: profile.displayName });

      loadDesigners();
    }
  } catch (err) {
    console.error('LIFF Init Error:', err);
    loadDesigners(); // For dev
  }
}

/**
 * Tab/View Controller
 */
function switchView(view) {
  const bookingEls = ['step1', 'step2', 'step3', 'step4', 'nextBtn', 's1', 's2', 's3', 's4'];
  const historySection = document.getElementById('history-view');
  const indicators = document.querySelector('.step-indicator');

  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

  if (view === 'booking') {
    document.getElementById('nav-booking').classList.add('active');
    historySection.classList.add('hidden');
    indicators.classList.remove('hidden');
    document.getElementById(`step${currentStep}`).classList.remove('hidden');
    document.getElementById('nextBtn').classList.remove('hidden');
  } else {
    document.getElementById('nav-history').classList.add('active');
    historySection.classList.remove('hidden');
    indicators.classList.add('hidden');
    // Hide all steps
    [1, 2, 3, 4].forEach(i => document.getElementById(`step${i}`).classList.add('hidden'));
    document.getElementById('nextBtn').classList.add('hidden');
    loadHistory();
  }
}

/**
 * Step 1-3 Data Fetchers (Omit for clarity if no changes, but I'll keep them)
 */
async function apiGet(action, params = {}) {
  const query = new URLSearchParams({ action, ...params }).toString();
  const response = await fetch(`${GAS_APP_URL}?${query}`);
  const result = await response.json();
  if (result.success) return result.data;
  throw new Error(result.error);
}

async function apiPost(action, data) {
  const response = await fetch(`${GAS_APP_URL}?action=${action}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  const result = await response.json();
  if (result.success) return result.data;
  throw new Error(result.error);
}

async function loadDesigners() {
  const container = document.getElementById('designer-list');
  try {
    const designers = await apiGet('getDesigners');
    container.innerHTML = designers.map(d => `
      <div class="card designer-card" onclick="selectDesigner('${d.ID}', '${d.Name}')" id="d-${d.ID}">
        <img src="${d.Photo}" alt="${d.Name}">
        <div style="font-weight: 600;">${d.Name}</div>
        <div style="font-size: 12px; color: grey;">${d.Specialty}</div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '無法加載數據';
  }
}

function selectDesigner(id, name) {
  selectedData.designerId = id;
  document.querySelectorAll('.designer-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(`d-${id}`).classList.add('selected');
  document.getElementById('nextBtn').disabled = false;
}

async function loadServices() {
  const container = document.getElementById('service-list');
  try {
    const services = await apiGet('getServices');
    container.innerHTML = services.map(s => {
      const sanitizedId = s.Name.replace(/\s+/g, '');
      return `
      <div class="card" onclick="selectService('${s.Name}', ${s.Price}, ${s.DurationMin})" id="s-${sanitizedId}">
        <div style="font-weight: 600;">${s.Name}</div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-top: 8px;">
          <span>${s.DurationMin} 分鐘</span>
          <span style="color: var(--primary);">NT$ ${s.Price}</span>
        </div>
      </div>
    `;
    }).join('');
  } catch (err) { container.innerHTML = '無法加載數據'; }
}

function selectService(name, price, duration) {
  selectedData.serviceName = name;
  selectedData.amount = price;
  selectedData.duration = duration;
  document.querySelectorAll('.item-list .card').forEach(c => c.classList.remove('selected'));
  document.getElementById(`s-${name.replace(/\s+/g, '')}`).classList.add('selected');
  document.getElementById('nextBtn').disabled = false;
}

async function loadSlots() {
  const container = document.getElementById('slot-list');
  const dateStr = document.getElementById('dateInput').value;
  if (!dateStr) return;
  selectedData.date = dateStr;
  try {
    const slots = await apiGet('getAvailableSlots', { designerId: selectedData.designerId, date: dateStr });
    container.innerHTML = slots.map(s => `
      <div class="slot" onclick="selectSlot('${s}')" id="t-${s.replace(':', '')}">${s}</div>
    `).join('');
  } catch (err) { container.innerHTML = '無法加載數據'; }
}

function selectSlot(time) {
  selectedData.time = time;
  document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
  document.getElementById(`t-${time.replace(':', '')}`).classList.add('selected');
  document.getElementById('nextBtn').disabled = false;
}

/**
 * Booking History Logic (Module 3)
 */
async function loadHistory() {
  const container = document.getElementById('booking-history');
  container.innerHTML = '<div style="text-align:center; padding: 20px;">載入中...</div>';
  try {
    const bookings = await apiGet('getBookings', { userId: selectedData.userId });
    if (bookings.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding: 20px; color: grey;">尚無預約紀錄</div>';
      return;
    }
    container.innerHTML = bookings.map(b => {
      const bDate = new Date(b.DateTime);
      const isCancelable = (bDate - new Date()) > 24 * 60 * 60 * 1000;
      return `
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div>
              <div style="font-weight:600; color: var(--primary);">${b.ServiceName}</div>
              <small style="color: grey;">${b.DesignerID} | ${b.DateTime}</small>
            </div>
            <span class="status-badge ${b.Status.toLowerCase().replace(/ /g, '-')}">${b.Status}</span>
          </div>
          ${(b.Status === 'Pending' || b.Status === 'Confirmed') && isCancelable ?
          `<button class="btn-cancel" onclick="cancelBooking('${b.ID}')">取消預約</button>` : ''}
        </div>
      `;
    }).join('');
  } catch (err) { container.innerHTML = '無法載入紀錄'; }
}

async function cancelBooking(bookingId) {
  if (!confirm('確定要取消這項預約嗎？\n(提前 24 小時前取消不扣款)')) return;
  try {
    await apiPost('cancelBooking', { bookingId, userId: selectedData.userId });
    loadHistory();
  } catch (err) { alert('取消失敗：' + err.message); }
}

/**
 * Navigation Logic
 */
document.getElementById('nextBtn').onclick = () => {
  if (currentStep === 4) {
    finalizeBooking();
    return;
  }
  if (currentStep === 1 && selectedData.designerId) {
    loadServices();
    transitionStep(1, 2);
  } else if (currentStep === 2 && selectedData.serviceName) {
    transitionStep(2, 3);
  } else if (currentStep === 3 && selectedData.time) {
    transitionStep(3, 4);
    showSummary();
  }
};

function transitionStep(from, to) {
  document.getElementById(`step${from}`).classList.add('hidden');
  document.getElementById(`step${to}`).classList.remove('hidden');
  document.getElementById(`s${to}`).classList.add('active');
  document.getElementById('nextBtn').disabled = true;
  if (to === 4) document.getElementById('nextBtn').innerText = '立即支付 訂金 NT$ 500';
  else if (to < 4) document.getElementById('nextBtn').innerText = '下一步';
  currentStep = to;
}

function showSummary() {
  const container = document.getElementById('summary');
  container.innerHTML = `
    <div class="card" style="border: none; background: rgba(255,255,255,0.02); padding: 5px 0;">
      <small style="color: grey;">設計師</small>
      <div style="font-weight: 600;">${selectedData.designerId}</div>
    </div>
    <div class="card" style="border: none; background: rgba(255,255,255,0.02); padding: 5px 0;">
      <small style="color: grey;">服務項目</small>
      <div style="font-weight: 600;">${selectedData.serviceName}</div>
    </div>
    <div class="card" style="border: none; background: rgba(255,255,255,0.02); padding: 5px 0;">
      <small style="color: grey;">日期時段</small>
      <div style="font-weight: 600;">${selectedData.date} ${selectedData.time}</div>
    </div>
  `;
  document.getElementById('nextBtn').disabled = false;
}

async function finalizeBooking() {
  try {
    const btn = document.getElementById('nextBtn');
    btn.disabled = true;
    btn.innerText = '正在處理支付...';

    // Auto-calculate end time
    const start = new Date(`${selectedData.date} ${selectedData.time}`);
    const end = new Date(start.getTime() + selectedData.duration * 60 * 1000);

    const payload = {
      ...selectedData,
      dateTime: `${selectedData.date} ${selectedData.time}`,
      name: selectedData.userName,
      endTime: end.toISOString()
    };

    await apiPost('createBooking', payload);

    document.getElementById('app').innerHTML = `
      <div class="card" style="text-align: center; margin-top: 50px;">
        <div style="font-size: 60px; color: var(--primary); margin-bottom: 20px;">✓</div>
        <h2>預約與支付成功！</h2>
        <p style="color: grey; margin: 15px 0;">感謝您的預約，系統已自動為您排班。</p>
        <button class="btn-primary" onclick="liff.closeWindow()">關閉並返回 LINE</button>
      </div>
    `;
  } catch (err) {
    alert('操作失敗：' + err.message);
    document.getElementById('nextBtn').disabled = false;
  }
}

// Listeners
document.getElementById('dateInput').addEventListener('change', loadSlots);
window.switchView = switchView;
window.cancelBooking = cancelBooking;

// Load
initLiff();
