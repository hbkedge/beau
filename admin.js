/**
 * BEAUTIFY Admin Management Logic
 */

const GAS_APP_URL = 'https://script.google.com/macros/s/AKfycbztR_WF-aBLW24jBZFfiUQRdy3QlXlrioAktTvgerIERlHPgQqPUCvDyf-24CdtYXcviA/exec';

// MOVE THIS TO THE TOP to ensure it's defined
window.switchAdminTab = function (tab) {
    console.log('Switching to tab:', tab);
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const targetTab = document.getElementById(`tab-${tab}`);
    if (targetTab) targetTab.classList.add('active');

    const bookingsView = document.getElementById('view-bookings');
    const designersView = document.getElementById('view-designers');

    if (bookingsView) bookingsView.classList.add('hidden');
    if (designersView) designersView.classList.add('hidden');

    const targetView = document.getElementById(`view-${tab}`);
    if (targetView) targetView.classList.remove('hidden');
    else console.error('View not found:', `view-${tab}`);
}

async function apiGet(action, params = {}) {
    const query = new URLSearchParams({ action, ...params }).toString();
    const response = await fetch(`${GAS_APP_URL}?${query}`);
    try {
        const result = await response.json();
        if (result.success) return result.data;
        throw new Error(result.error || 'Backend Error');
    } catch (e) {
        const text = await response.text();
        console.error('API Response Text (Non-JSON):', text);
        throw new Error(`JSON解析失敗: ${e.message} \n(詳見 Console)`);
    }
}

async function apiPost(action, data) {
    const response = await fetch(`${GAS_APP_URL}?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if (result.success) return result.data;
    throw new Error(result.error || 'Unknown Error');
}

async function loadData() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.remove('fade-out');
        loading.classList.remove('hidden');
    }

    try {
        const stats = await apiGet('getIncomeStats');
        const bookings = await apiGet('getAllBookings');
        const designers = await apiGet('getDesigners');

        renderStats(stats);
        renderBookings(bookings);
        renderDesignerAdmin(designers);

        if (loading) {
            loading.classList.add('fade-out');
            setTimeout(() => loading.classList.add('hidden'), 500);
        }
    } catch (err) {
        console.error('Loader Error:', err);
        if (loading) loading.classList.add('hidden');
        alert('載入數據失敗：' + err.message);
    }
}

function renderStats(stats) {
    document.getElementById('totalIncome').innerText = `NT$ ${stats.totalIncome || 0}`;
    document.getElementById('totalCount').innerText = stats.count || 0;

    let designerHtml = '';
    const perf = stats.designerPerformance || {};
    for (const [id, rev] of Object.entries(perf)) {
        designerHtml += `<div style="display: flex; justify-content: space-between;"><span>${id}</span><span>NT$ ${rev}</span></div>`;
    }
    document.getElementById('designer-stats').innerHTML = designerHtml || '尚無數據';
}

function renderBookings(bookings) {
    const container = document.getElementById('booking-list');
    if (!container) return;
    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: grey;">尚無預約訂單</td></tr>';
        return;
    }

    container.innerHTML = [...bookings].sort((a, b) => new Date(b.DateTime) - new Date(a.DateTime)).map(b => `
    <tr>
      <td><small>${b.ID}</small></td>
      <td><b>${b.Name}</b><br><small style="color: grey;">${b.UserID ? b.UserID.substring(0, 8) : 'N/A'}</small></td>
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

function renderDesignerAdmin(designers) {
    const container = document.getElementById('designer-list-admin');
    if (!container) return;
    if (!designers) return;

    container.innerHTML = designers.map(d => `
        <tr>
            <td><small>${d.ID}</small></td>
            <td><img src="${d.Photo}" style="width: 40px; height: 40px; border-radius: 50%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/40'"></td>
            <td>${d.Name}</td>
            <td>${d.Specialty}</td>
            <td><small>${d.WorkingHours || '--'}</small></td>
            <td><small>${d.OffDays || '--'}</small></td>
            <td>
                <select onchange="updateDesignerField('${d.ID}', 'status', this.value)">
                    <option value="Active" ${d.Status === 'Active' ? 'selected' : ''}>🟢 在職</option>
                    <option value="Inactive" ${d.Status === 'Inactive' ? 'selected' : ''}>🔴 離職</option>
                </select>
            </td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <button class="btn-primary" style="padding: 5px 10px; font-size: 12px; margin: 0; width: auto;" onclick="openEditModal(${JSON.stringify(d).replace(/"/g, '&quot;')})">編輯</button>
                    <button class="btn-primary" style="padding: 5px 10px; font-size: 12px; margin: 0; width: auto; background: #c0392b;" onclick="deleteDesigner('${d.ID}')">刪除</button>
                </div>
            </td>
        </tr>
    `).join('');
}

window.openEditModal = function (d) {
    document.getElementById('modalTitle').innerText = '編輯設計師';
    document.getElementById('editDesignerId').value = d.ID;
    document.getElementById('designerName').value = d.Name;
    document.getElementById('designerSpecialty').value = d.Specialty;
    document.getElementById('designerWorkingHours').value = d.WorkingHours || '10:00-20:00';
    document.getElementById('designerOffDays').value = d.OffDays || 'Monday';
    document.getElementById('designerPhoto').value = d.Photo;
    document.getElementById('designerModal').classList.remove('hidden');
}

window.addDesigner = function () {
    document.getElementById('modalTitle').innerText = '新增設計師';
    document.getElementById('editDesignerId').value = '';
    document.getElementById('designerName').value = '';
    document.getElementById('designerSpecialty').value = '';
    document.getElementById('designerWorkingHours').value = '10:00-20:00';
    document.getElementById('designerOffDays').value = 'Monday';
    document.getElementById('designerPhoto').value = '';
    document.getElementById('designerModal').classList.remove('hidden');
}

window.closeModal = function () {
    document.getElementById('designerModal').classList.add('hidden');
}

window.saveDesigner = async function () {
    const id = document.getElementById('editDesignerId').value;
    const name = document.getElementById('designerName').value;
    const specialty = document.getElementById('designerSpecialty').value;
    const workingHours = document.getElementById('designerWorkingHours').value;
    const offDays = document.getElementById('designerOffDays').value;
    const photo = document.getElementById('designerPhoto').value;

    if (!name || !specialty) {
        alert('請填寫姓名與專業領域');
        return;
    }

    try {
        await apiPost('updateDesigner', { id, name, specialty, workingHours, offDays, photo });
        closeModal();
        loadData();
    } catch (err) {
        alert('儲存失敗：' + err.message);
    }
}

window.deleteDesigner = async function (id) {
    if (!confirm('確定要刪除這位設計師嗎？此操作無法還原。')) return;
    try {
        await apiPost('deleteDesigner', { id });
        loadData();
    } catch (err) {
        alert('刪除失敗：' + err.message);
    }
}

window.updateStatus = async function (bookingId, status) {
    try {
        const ok = await apiPost('updateBookingStatus', { bookingId, status });
        console.log(`Updated ${bookingId} to ${status}`);
        loadData();
    } catch (err) {
        alert('更新失敗：' + err.message);
    }
}

window.updateDesignerField = async function (id, field, value) {
    try {
        await apiPost('updateDesigner', { id, [field]: value });
    } catch (err) {
        alert('更新失敗：' + err.message);
    }
}

window.loadData = loadData;

// Initial Load
window.onload = loadData;
