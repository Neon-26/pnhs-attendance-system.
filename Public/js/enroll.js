let allStaff = [];
let allStudents = [];

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');
    if (!token || userRole === 'student') {
        window.location.href = 'login.html';
        return;
    }
    
    setupTabs();
    loadStaff();
    loadStudents();
});

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab + '-tab').classList.add('active');
        });
    });

    document.getElementById('staffForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await enrollStaff();
    });

    document.getElementById('studentForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await enrollStudent();
    });
}

async function enrollStaff() {
    const username = document.getElementById('staffUsername').value.trim();
    const role = document.getElementById('staffRole').value;
    const password = document.getElementById('staffPassword').value;
    const email = document.getElementById('staffEmail').value.trim();
    
    if (!username || !password) { alert('Fill required fields'); return; }
    
    const btn = document.querySelector('#staffForm .btn-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }
    
    try {
        const response = await apiRequest('/enroll/user', {
            method: 'POST',
            body: JSON.stringify({ username, password, role, email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Staff enrolled!');
            document.getElementById('staffForm').reset();
            loadStaff();
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Enroll Staff'; }
    }
}

async function loadStaff() {
    const tbody = document.getElementById('staffList');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">Loading...</td></tr>';
    
    try {
        const response = await apiRequest('/enroll/users');
        const allUsers = await response.json();
        
        console.log('All users:', allUsers);

        const staffMembers = allUsers.filter(u => !u.student_id);
        
        if (!staffMembers || staffMembers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No staff found - enroll one!</td></tr>';
            return;
        }
        
        tbody.innerHTML = staffMembers.map((s, index) => {
            const roleClass = s.role === 'admin' ? 'admin' : (s.role === 'teacher' ? 'teacher' : 'user');
            return `
                <tr class="data-row">
                    <td>${index + 1}</td>
                    <td><strong>${s.username}</strong></td>
                    <td><span class="role-badge ${roleClass}">${(s.role || 'user').toUpperCase()}</span></td>
                    <td>${s.email || '-'}</td>
                    <td>
                        <button class="btn-action btn-delete" onclick="deleteUser(${s.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="error-cell">Error: ' + error.message + '</td></tr>';
    }
}

async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    
    try {
        const response = await apiRequest(`/enroll/user/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            alert('Deleted!');
            loadStaff();
        } else {
            alert('Error deleting');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function enrollStudent() {
    const student_id = document.getElementById('studentId').value.trim();
    const class_ = document.getElementById('studentClass').value;
    const first_name = document.getElementById('studentFirstName').value.trim();
    const last_name = document.getElementById('studentLastName').value.trim();
    const email = document.getElementById('studentEmail').value.trim();
    const parent_email = document.getElementById('parentEmail').value.trim();
    
    if (!student_id || !first_name || !last_name || !class_) {
        alert('Fill required fields');
        return;
    }
    
    const btn = document.querySelector('#studentForm .btn-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }
    
    try {
        const response = await apiRequest('/enroll/students', {
            method: 'POST',
            body: JSON.stringify({ student_id, first_name, last_name, email, parent_email, class_ })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (data.credentials) {
                alert('Student enrolled!\n\nUsername: ' + data.credentials.username + '\nPassword: ' + data.credentials.password);
            } else {
                alert('Student enrolled!');
            }
            document.getElementById('studentForm').reset();
            loadStudents();
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Enroll Student'; }
    }
}

async function loadStudents() {
    const tbody = document.getElementById('studentList');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Loading...</td></tr>';
    
    try {
        const response = await apiRequest('/enroll/students');
        allStudents = await response.json();
        
        if (!allStudents || allStudents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No students found</td></tr>';
            return;
        }
        
        tbody.innerHTML = allStudents.map((s, index) => {
            const username = s.account_username || 
                ((s.first_name || '') + '.' + (s.last_name || '')).toLowerCase().replace(/[^a-z0-9]/g, '');
            
            const isActive = s.is_active === true || s.is_active === 'true' || s.is_active === 1;
            const statusClass = isActive ? 'active' : 'inactive';
            const statusText = isActive ? 'ACTIVE' : 'INACTIVE';
            
            return `
                <tr class="data-row">
                    <td>${index + 1}</td>
                    <td><strong>${s.student_id || 'N/A'}</strong></td>
                    <td>${s.first_name || ''} ${s.last_name || ''}</td>
                    <td><span class="class-badge">${s.class_ || 'N/A'}</span></td>
                    <td><span class="account-badge">${username}</span></td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="btn-action btn-delete" onclick="deleteStudent(${s.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" class="error-cell">Error: ' + error.message + '</td></tr>';
    }
}

async function deleteStudent(id) {
    if (!confirm('Delete student and their account?')) return;
    
    try {
        const response = await apiRequest(`/enroll/students/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            alert('Deleted!');
            loadStudents();
        } else {
            const data = await response.json();
            alert('Error: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}