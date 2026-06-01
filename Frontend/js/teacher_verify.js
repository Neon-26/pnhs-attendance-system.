let selectedAttendanceId = null;
let selectedStudentName = null;

function getLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');

    if (!token || userRole === 'student') {
        window.location.href = 'login.html';
        return;
    }

    const today = getLocalDate();
    document.getElementById('selectedDate').value = today;

    loadPendingReports();
});

document.getElementById('refreshBtn')?.addEventListener('click', loadPendingReports);
document.getElementById('selectedDate')?.addEventListener('change', loadPendingReports);

async function loadPendingReports() {
    const token = localStorage.getItem('authToken');
    const date = getLocalDate();
    const tbody = document.getElementById('pendingList');
    const countEl = document.getElementById('reportCount');
    
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Loading...</td></tr>';
    
    if (countEl) countEl.textContent = 'Showing 0 reports';

    try {
        const response = await fetch('http://localhost:5000/api/teacher-verify/pending?date=' + date, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const data = await response.json();

        if (countEl) {
            const count = data?.length || 0;
            countEl.textContent = 'Showing ' + count + ' report' + (count !== 1 ? 's' : '');
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No pending reports</td></tr>';
            return;
        }

        tbody.innerHTML = data.map((item, i) => {
            let reported = 'present';
            if (item.excuse && item.excuse.includes('Reported as ')) {
                const match = item.excuse.match(/Reported as (\w+)/);
                if (match) reported = match[1];
            }
            
            const statusClass = reported === 'present' ? 'status-present' : 'status-absent';
            const studentName = (item.first_name || '') + ' ' + (item.last_name || '');
            
            let timeStr = '-';
            if (item.created_at) {
                const time = new Date(item.created_at);
                timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            
            const studentNum = item.student_number || item.student_id || '-';
            
            return '<tr><td>' + (i + 1) + '</td><td><strong>' + studentName + '</strong><span class="student-number" style="display:block;font-size:11px;color:#666;">' + studentNum + '</span></td><td><span class="class-badge">' + (item.class_ || 'N/A') + '</span></td><td><span class="' + statusClass + '">' + reported.toUpperCase() + '</span></td><td>' + (item.excuse ? item.excuse.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '<span class="no-excuse">No excuse</span>') + '</td><td>' + timeStr + '</td><td><button class="btn-approve" onclick="approveReport(' + item.attendance_id + ', \'' + studentName.replace(/'/g, "\\'") + '\')"><i class="fas fa-check"></i> Approve</button> <button class="btn-reject" onclick="openRejectModal(' + item.attendance_id + ', \'' + studentName.replace(/'/g, "\\'") + '\')"><i class="fas fa-times"></i> Reject</button></td></tr>';
        }).join('');

    } catch (e) {
        console.error('Error:', e);
        tbody.innerHTML = '<tr><td colspan="7" class="error-cell">Error: ' + e.message + '</td></tr>';
    }
}

async function approveReport(attendanceId, studentName) {
    if (!confirm('Approve ' + studentName + '?')) return;
    
    const token = localStorage.getItem('authToken');
    
    try {
        const response = await fetch('http://localhost:5000/api/teacher-verify/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ attendance_id: attendanceId, action: 'approve' })
        });

        if (response.ok) {
            alert('Approved!');
            loadPendingReports();
        } else {
            const data = await response.json();
            alert('Error: ' + (data.message || 'Unknown'));
        }
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

function openRejectModal(attendanceId, studentName) {
    selectedAttendanceId = attendanceId;
    selectedStudentName = studentName;
    const nameEl = document.getElementById('rejectStudentName');
    if (nameEl) nameEl.textContent = studentName;
    const notesEl = document.getElementById('rejectNotes');
    if (notesEl) notesEl.value = '';
    const modal = document.getElementById('rejectModal');
    if (modal) modal.style.display = 'flex';
}

function closeRejectModal() {
    const modal = document.getElementById('rejectModal');
    if (modal) modal.style.display = 'none';
    selectedAttendanceId = null;
    selectedStudentName = null;
}

async function submitReject() {
    if (!selectedAttendanceId) return;

    const token = localStorage.getItem('authToken');
    const newStatusEl = document.querySelector('input[name="newStatus"]:checked');
    const newStatus = newStatusEl?.value;
    const notes = document.getElementById('rejectNotes')?.value || '';

    if (!newStatus) {
        alert('Please select a new status');
        return;
    }

    if (!confirm('Change status to ' + newStatus.toUpperCase() + '?')) return;

    try {
        const response = await fetch('http://localhost:5000/api/teacher-verify/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ attendance_id: selectedAttendanceId, action: 'reject', new_status: newStatus, notes: notes })
        });

        if (response.ok) {
            alert('Updated!');
            closeRejectModal();
            loadPendingReports();
        } else {
            const data = await response.json();
            alert('Error: ' + (data.message || 'Unknown'));
        }
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
});