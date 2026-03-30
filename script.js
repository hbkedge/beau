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
  userId: 'MOCK_USER_ID', // Replaced by LIFF data
  userName: 'MOCK_USER_NAME'
};

/**
 * LIFF Initialization
 */
async function initLiff() {
  try {
    await liff.init({ liffId: 'https://liff.line.me/2009603120-0Fkrf3bm' });
    if (!liff.isLoggedIn()) {
      liff.login();
    } else {
      const profile = await liff.getProfile();
      selectedData.userId = profile.userId;
      selectedData.userName = profile.displayName;
      loadDesigners();
    }
  } catch (err) {
    console.error('LIFF Init Error:', err);
    // For local dev, load mock data
    loadDesigners();
  }
}

/**
 * Data Fetching
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

/**
 * Step 1: Designer Selection
 */
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

/**
 * Step 2: Service Selection
 */
async function loadServices() {
  const container = document.getElementById('service-list');
  try {
    const services = await apiGet('getServices');
    container.innerHTML = services.map(s => `
      <div class="card" onclick="selectService('${s.Name}', ${s.Price}, ${s.DurationMin})" id="s-${s.Name}">
        <div style="font-weight: 600;">${s.Name}</div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-top: 8px;">
          <span>${s.DurationMin} 分鐘</span>
          <span style="color: var(--primary);">NT$ ${s.Price}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '無法加載數據';
  }
}

function selectService(name, price, duration) {
  selectedData.serviceName = name;
  selectedData.amount = price;
  selectedData.duration = duration;
  document.querySelectorAll('.item-list .card').forEach(c => c.classList.remove('selected'));
  document.getElementById(`s-${name}`).classList.add('selected');
  document.getElementById('nextBtn').disabled = false;
}

/**
 * Step 3: Slot Selection
 */
async function loadSlots() {
  const container = document.getElementById('slot-list');
  const dateStr = document.getElementById('dateInput').value;
  if (!dateStr) return;
  
  selectedData.date = dateStr;
  try {
    const slots = await apiGet('getAvailableSlots', { designerId: selectedData.designerId, date: dateStr });
    container.innerHTML = slots.map(s => `
      <div class="slot" onclick="selectSlot('${s}')" id="t-${s.replace(':','')}">${s}</div>
    `).join('');
  } catch (err) {
    container.innerHTML = '無法加載數據';
  }
}

function selectSlot(time) {
  selectedData.time = time;
  document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
  document.getElementById(`t-${time.replace(':','')}`).classList.add('selected');
  document.getElementById('nextBtn').disabled = false;
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
    showSummary();
    transitionStep(3, 4);
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
    btn.innerText = '正在預約中...';
    
    const payload = {
      ...selectedData,
      dateTime: `${selectedData.date} ${selectedData.time}`,
      name: selectedData.userName
    };
    
    await apiPost('createBooking', payload);
    
    // Success State
    document.getElementById('app').innerHTML = `
      <div class="card" style="text-align: center; margin-top: 50px;">
        <div style="font-size: 60px; color: var(--primary); margin-bottom: 20px;">✓</div>
        <h2>預約成功！</h2>
        <p style="color: grey; margin: 15px 0;">我們已收到您的資訊，並發送通知到您的 LINE。</p>
        <button class="btn-primary" onclick="liff.closeWindow()">返回 LINE</button>
      </div>
    `;
  } catch (err) {
    alert('預約失敗：' + err.message);
    document.getElementById('nextBtn').disabled = false;
  }
}

// Event Listeners
document.getElementById('dateInput').addEventListener('change', loadSlots);

// Initial Load
initLiff();
