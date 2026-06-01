let studentName = null;
let studentId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const storedUser = localStorage.getItem('currentUser');
    const token = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');
    
    if (!storedUser || !token || userRole !== 'student') {
        window.location.href = 'login.html';
        return;
    }
    
    const user = JSON.parse(storedUser);
    studentName = user.username;

    const today = getLocalDate();
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    console.log('Local Today:', today);
    loadProfile();
});

function getLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function loadProfile() {
    const token = localStorage.getItem('authToken');
    const today = getLocalDate();
    
    try {
        const response = await fetch(`http://localhost:5000/api/student-portal/profile?username=${encodeURIComponent(studentName)}&today=${today}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            return;
        }

        const { student, todayAttendance } = data;
        studentId = student.id;

        document.getElementById('studentName').textContent = student.first_name + ' ' + student.last_name;
        document.getElementById('studentId').textContent = student.student_id;
        document.getElementById('studentClass').textContent = student.class_;

        updateTodayStatus(todayAttendance);
        loadHistory();
        loadStats();
    } catch (error) {
        console.error("Error:", error);
        alert("Error loading profile!");
    }
}

function updateTodayStatus(attendance) {
    const statusTitle = document.getElementById('statusTitle');
    const statusSubtitle = document.getElementById('statusSubtitle');
    const statusIcon = document.getElementById('statusIcon');
    const statusIconWrapper = document.getElementById('statusIconWrapper');
    const actionButtons = document.getElementById('actionButtons');
    const pendingState = document.getElementById('pendingState');
    const approvedState = document.getElementById('approvedState');

    actionButtons.style.display = 'flex';
    pendingState.style.display = 'none';
    approvedState.style.display = 'none';
    statusIconWrapper.style.background = '#f3f4f6';
    statusIcon.style.color = '#6b7280';

    if (!attendance) {
        statusTitle.textContent = 'ATTENDANCE';
        statusSubtitle.textContent = 'Please report your attendance';
        statusIcon.innerHTML = '<i class="fas fa-clock"></i>';
        
    } else if (attendance.status === 'pending') {
        actionButtons.style.display = 'none';
        pendingState.style.display = 'block';
        statusIcon.innerHTML = '<i class="fas fa-hourglass-half"></i>';
        statusIconWrapper.style.background = '#fef3c7';
        statusIcon.style.color = '#fbbf24';
        
    } else if (attendance.status === 'present') {
        actionButtons.style.display = 'none';
        approvedState.style.display = 'block';
        document.getElementById('confirmedStatus').textContent = 'PRESENT';
        document.getElementById('confirmedStatus').className = 'present';
        statusIcon.innerHTML = '<i class="fas fa-check"></i>';
        statusIconWrapper.style.background = '#d1fae5';
        statusIconWrapper.style.border = '2px solid #059669';
        statusIcon.style.color = '#059669';
        
    } else if (attendance.status === 'absent') {
        actionButtons.style.display = 'none';
        approvedState.style.display = 'block';
        document.getElementById('confirmedStatus').textContent = 'ABSENT';
        document.getElementById('confirmedStatus').className = 'absent';
        statusIcon.innerHTML = '<i class="fas fa-times"></i>';
        statusIconWrapper.style.background = '#fee2e2';
        statusIconWrapper.style.border = '2px solid #dc2626';
        statusIcon.style.color = '#dc2626';
    }
}

async function loadHistory() {
    if (!studentId) return;
    
    const token = localStorage.getItem('authToken');
    const list = document.getElementById('historyList');
    list.innerHTML = '<div class="loading-item">Loading...</div>';
    
    try {
        const response = await fetch(`http://localhost:5000/api/student-portal/history?student_id=${studentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const history = await response.json();
        
        if (!history || history.length === 0) {
            list.innerHTML = '<div class="loading-item">No records</div>';
            return;
        }
        
        let html = '';
        history.slice(0, 10).forEach(h => {
            const date = new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            html += `<div class="history-item ${h.status}">
                <div class="history-date"><span class="date">${date}</span></div>
                <span class="history-status ${h.status}">${h.status.toUpperCase()}</span>
            </div>`;
        });
        
        list.innerHTML = html;
        
    } catch (error) {
        list.innerHTML = '<div class="loading-item">Error</div>';
    }
}

async function loadStats() {
    if (!studentId) return;
    
    const token = localStorage.getItem('authToken');
    
    try {
        const response = await fetch(`http://localhost:5000/api/student-portal/history?student_id=${studentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const history = await response.json();
        
        if (!history) return;
        
        const present = history.filter(h => h.status === 'present').length;
        const absent = history.filter(h => h.status === 'absent').length;
        const pending = history.filter(h => h.status === 'pending').length;
        
        document.getElementById('totalPresent').textContent = present;
        document.getElementById('totalAbsent').textContent = absent;
        document.getElementById('totalPending').textContent = pending;
        
    } catch (error) {
        console.error(error);
    }
}

function openReportModal(status) {
    if (status === 'absent') {
        document.getElementById('excuseModal').style.display = 'flex';
    } else {
        submitReport('present', '');
    }
}

function closeModal() {
    document.getElementById('excuseModal').style.display = 'none';
    document.getElementById('excuseText').value = '';
}

function closeSuccessModal() {
    document.getElementById('successModal').style.display = 'none';
}

async function submitExcuse() {
    const excuse = document.getElementById('excuseText').value;
    if (!excuse.trim()) { alert('Enter reason'); return; }
    await submitReport('absent', excuse);
    closeModal();
}

async function submitReport(status, excuse) {
    if (!studentId) return;
    
    const token = localStorage.getItem('authToken');
    const today = getLocalDate();
    
    try {
        const response = await fetch('http://localhost:5000/api/student-portal/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                student_id: studentId,
                status: status,
                excuse: excuse,
                date: today
            })
        });
        
        if (response.ok) {
            document.getElementById('successMessage').textContent = 'Submitted!';
            document.getElementById('successModal').style.display = 'flex';
            loadProfile();
        } else {
            const data = await response.json();
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function openSettingsModal() {
    document.getElementById('settingsModal').style.display = 'flex';
    document.getElementById('verifySection').style.display = 'none';
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
    document.getElementById('settingsEmail').value = '';
    document.getElementById('verificationCode').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
}

async function sendVerificationCode() {
    const email = document.getElementById('settingsEmail').value.trim();
    
    if (!email) {
        alert('Please enter your email');
        return;
    }
    
    if (!email.includes('@')) {
        alert('Invalid email');
        return;
    }
    
    const token = localStorage.getItem('authToken');
    const btn = document.querySelector('.btn-send-code');
    if (btn) btn.disabled = true;
    
    try {
        const response = await fetch('http://localhost:5000/api/student-portal/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ email: email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Code sent!');
            document.getElementById('verifySection').style.display = 'block';
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function changePassword() {
    const code = document.getElementById('verificationCode').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!code || code.length !== 6) {
        alert('Enter 6-digit code');
        return;
    }
    
    if (!newPassword || newPassword.length < 6) {
        alert('Min 6 characters');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('Passwords mismatch');
        return;
    }
    
    const token = localStorage.getItem('authToken');
    const btn = document.querySelector('.btn-change-password');
    if (btn) btn.disabled = true;
    
    try {
        const response = await fetch('http://localhost:5000/api/student-portal/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ code: code, newPassword: newPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Password changed!');
            closeSettingsModal();
            localStorage.clear();
            window.location.href = 'login.html';
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
});