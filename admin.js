/**
 * BEAUTIFY Admin Management Logic
 */

const GAS_APP_URL = 'https://script.google.com/macros/s/AKfycbztR_WF-aBLW24jBZFfiUQRdy3QlXlrioAktTvgerIERlHPgQqPUCvDyf-24CdtYXcviA/exec';

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

async function loadData() {
    const loading = document.getElementById('loading');
    loading.classList.remove('fade-out');
    loading.classList.remove('hidden');

    try {
        const stats = await apiGet('getIncomeStats');
        const bookings = await apiGet('getAllBookings');
        const designers = await apiGet('getDesigners');

        renderStats(stats);
        renderBookings(bookings);
        renderDesignerAdmin(designers);

        loading.classList.add('fade-out');
        setTimeout(() => loading.classList.add('hidden'), 500);
    } catch (err) {
        alert('載入數據失敗：' + err.message);
        loading.classList.add('hidden');
    }
}

function switchAdminTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');

    document.getElementById('view-bookings').classList.add('hidden');
    document.getElementById('view-designers').classList.add('hidden');
    document.getElementById(`view-${tab}`).classList.remove('hidden');
}

function renderDesignerAdmin(designers) {
    const container = document.getElementById('designer-list-admin');
    container.innerHTML = designers.map(d => `
        <tr>
            <td><small>${d.ID}</small></td>
            <td><img src="${d.Photo}" style="width: 40px; height: 40px; border-radius: 50%; object-fit:cover;"></td>
            <td><input type="text" value="${d.Name}" onblur="updateDesigner('${d.ID}', 'name', this.value)" style="background:none; color:white; border:none; width:80px;"></td>
            <td><input type="text" value="${d.Specialty}" onblur="updateDesigner('${d.ID}', 'specialty', this.value)" style="background:none; color:white; border:none; width:120px;"></td>
            <td>
                <select onchange="updateDesigner('${d.ID}', 'status', this.value)">
                    <option value="Active" ${d.Status === 'Active' ? 'selected' : ''}>🟢 在職</option>
                    <option value="Inactive" ${d.Status === 'Inactive' ? 'selected' : ''}>🔴 離職</option>
                </select>
            </td>
            <td><small style="color:grey;">自動儲存</small></td>
        </tr>
    `).join('');
}

async function updateDesigner(id, field, value) {
    try {
        await apiPost('updateDesigner', { id, [field]: value });
        console.log(`Updated designer ${id} field ${field} to ${value}`);
    } catch (err) {
        alert('更新失敗：' + err.message);
    }
}

async function addDesigner() {
    const name = prompt('請輸入設計師姓名：');
    if (!name) return;
    const specialty = prompt('請輸入專業領域（如：美甲師）：');
    try {
        await apiPost('updateDesigner', { name, specialty });
        loadData();
    } catch (err) {
        alert('新增失敗：' + err.message);
    }
}

function renderStats(stats) {
    document.getElementById('totalIncome').innerText = `NT$ ${stats.totalIncome || 0}`;
    document.getElementById('totalCount').innerText = stats.count || 0;

    let designerHtml = '';
    for (const [id, rev] of Object.entries(stats.designerPerformance || {})) {
        designerHtml += `<div style="display: flex; justify-content: space-between;"><span>${id}</span><span>NT$ ${rev}</span></div>`;
    }
    document.getElementById('designer-stats').innerHTML = designerHtml || '尚無數據';
}

function renderBookings(bookings) {
    const container = document.getElementById('booking-list');
    if (bookings.length === 0) {
        container.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: grey;">尚無預約訂單</td></tr>';
        return;
    }

    container.innerHTML = bookings.sort((a, b) => new Date(b.DateTime) - new Date(a.DateTime)).map(b => `
    <tr>
      <td><small>${b.ID}</small></td>
      <td><b>${b.Name}</b><br><small style="color: grey;">${b.UserID.substring(0, 8)}...</small></td>
      <td>${b.DesignerID}</td>
      <td>${b.ServiceName}</td>
      <td>${b.DateTime}</td>
      <td>NT$ ${b.Amount}</td>
      <td>
        <select onchange="updateStatus('${b.ID}', this.value)" class="status-select">
          <option value="Pending" ${b.Status === 'Pending' ? 'selected' : ''}>⏳ 待處理</option>
          <option value="Confirmed" ${b.Status === 'Confirmed' ? 'selected' : ''}>✅ 已確認</option>
          <option value="Completed" ${b.Status === 'Completed' ? 'selected' : ''}>⭐ 已完成</option>
          <option value="Cancelled" ${b.Status === 'Cancelled' ? 'selected' : ''}>🚫 已取消</option>
        </select>
      </td>
    </tr>
  `).join('');
}

async function updateStatus(bookingId, status) {
    try {
        const ok = await apiPost('updateBookingStatus', { bookingId, status });
        if (ok) {
            console.log(`Updated ${bookingId} to ${status}`);
            loadData(); // Reload to refresh income stats
        }
    } catch (err) {
        alert('更新失敗：' + err.message);
    }
}

// Initial Load
window.onload = loadData;
