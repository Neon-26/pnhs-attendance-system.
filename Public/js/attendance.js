let allStudents = [];
let selectedStudentId = null;
let selectedClass = 'all';

document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;
    
    document.getElementById('selectedDate').value = todayString;
    
    loadAttendance();
    setupActions();
});

async function loadAttendance() {
    const container = document.getElementById('attendanceList');
    container.innerHTML = '<tr><td colspan="5" class="loading-cell">Loading...</td></tr>';
    
    const dateInput = document.getElementById('selectedDate').value;
    const response = await apiRequest(`/students?date=${dateInput}`);
    allStudents = await response.json();
    
    populateClassDropdown();
    renderAttendance();
}

function populateClassDropdown() {
    const dropdown = document.getElementById('classFilter');
    const classes = [...new Set(allStudents.map(s => s.class))].filter(Boolean).sort();
    
    dropdown.innerHTML = '<option value="all">All Classes</option>';
    classes.forEach(cls => {
        dropdown.innerHTML += `<option value="${cls}">${cls}</option>`;
    });
    
    dropdown.addEventListener('change', (e) => {
        selectedClass = e.target.value;
        renderAttendance();
    });
}

function isToday(dateString) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;
    
    return dateString === todayString;
}

function renderAttendance() {
    const container = document.getElementById('attendanceList');
    const dateInput = document.getElementById('selectedDate').value;
    
    let filtered = allStudents;
    if (selectedClass !== 'all') {
        filtered = filtered.filter(s => s.class === selectedClass);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="empty-cell">No students found</td></tr>';
        document.getElementById('attendanceCount').textContent = 'Showing 0 students';
        return;
    }
    
    container.innerHTML = filtered.map((s, index) => {
        const status = s.today_status;

        if (status && status !== 'not-marked') {
            const statusClass = status;
            const statusText = status.toUpperCase();
            
            return `
                <tr class="student-row">
                    <td>${index + 1}</td>
                    <td>${s.student_id}</td>
                    <td>${s.first_name} ${s.last_name}</td>
                    <td><span class="class-badge">${s.class}</span></td>
                    <td><span class="status-text ${statusClass}">${statusText}</span></td>
                </tr>
            `;
        } 
        else {
            return `
                <tr class="student-row">
                    <td>${index + 1}</td>
                    <td>${s.student_id}</td>
                    <td>${s.first_name} ${s.last_name}</td>
                    <td><span class="class-badge">${s.class}</span></td>
                    <td>
                        <button class="btn-mark" onclick="openStatusModal(${s.id}, '${s.first_name} ${s.last_name}')">
                            Mark
                        </button>
                    </td>
                </tr>
            `;
        }
    }).join('');
    
    document.getElementById('attendanceCount').textContent = `Showing ${filtered.length} students`;
}

function setupActions() {
    document.getElementById('classFilter').addEventListener('change', (e) => {
        selectedClass = e.target.value;
        renderAttendance();
    });
    
    document.getElementById('selectedDate').addEventListener('change', loadAttendance);

document.getElementById('markAllPresent')?.addEventListener('click', async () => {
    const unmarkedStudents = allStudents.filter(s => !s.today_status || s.today_status === 'not-marked');
    
    if (unmarkedStudents.length === 0) {
        alert('All students are already marked!');
        return;
    }
    
    if (!confirm(`Mark ${unmarkedStudents.length} students as PRESENT?`)) return;
    
    const dateInput = document.getElementById('selectedDate').value;
    const btn = document.getElementById('markAllPresent');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Marking...';
    
    try {
        for (const s of unmarkedStudents) {
            await apiRequest('/attendance/mark', {
                method: 'POST',
                body: JSON.stringify({ 
                    student_id: s.id, 
                    status: 'present',
                    date: dateInput
                })
            });
        }
        
        alert(`${unmarkedStudents.length} students marked as PRESENT!`);
        loadAttendance();
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-double"></i> Mark All Present';
    }
});
}

function openStatusModal(studentId, name) {
    selectedStudentId = studentId;
    document.getElementById('studentName').textContent = name;
    document.getElementById('statusModal').style.display = 'flex';
}

function closeStatusModal() {
    document.getElementById('statusModal').style.display = 'none';
    selectedStudentId = null;
}

async function markAttendance(status) {
    if (!selectedStudentId) return;
    
    const dateInput = document.getElementById('selectedDate').value;
    
    await apiRequest('/attendance/mark', {
      method: 'POST',
      body: JSON.stringify({ 
        student_id: selectedStudentId, 
        status: status,
        date: dateInput
      })
    });
    
    closeStatusModal();
    loadAttendance();
}