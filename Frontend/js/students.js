let allStudents = [];
let selectedClass = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Page loaded');
    await loadStudents();
    setupFilters();
});

async function loadStudents() {
    const container = document.getElementById('studentList');
    container.innerHTML = '<tr><td colspan="6" class="loading-cell">Loading students...</td></tr>';
    
    console.log('Fetching students...');
    
    try {
        const response = await apiRequest('/students');
        
        if (!response.ok) {
            throw new Error('HTTP Error: ' + response.status);
        }
        
        const data = await response.json();
        console.log('Students loaded:', data.length);
        
        if (!Array.isArray(data)) {
            throw new Error('Expected array, got: ' + typeof data);
        }
        
        allStudents = data;
        populateClassDropdown();
        renderStudents();
        
    } catch (e) {
        console.error('Error:', e);
        container.innerHTML = '<tr><td colspan="6" class="error-cell">Error: ' + e.message + '</td></tr>';
    }
}

function populateClassDropdown() {
    const dropdown = document.getElementById('classFilter');
    if (!dropdown) {
        console.log('Dropdown not found!');
        return;
    }

    const classes = [...new Set(allStudents.map(s => s.class))].filter(Boolean).sort();
    console.log('Classes found:', classes);
    
    dropdown.innerHTML = '<option value="all">All Classes</option>';
    classes.forEach(cls => {
        dropdown.innerHTML += `<option value="${cls}">${cls}</option>`;
    });
    
    dropdown.addEventListener('change', (e) => {
        selectedClass = e.target.value;
        console.log('Selected class:', selectedClass);
        renderStudents();
    });
}

function checkActive(student) {
    const val = student.is_active;
    return val === true || val === 'true' || val === 1 || val === '1' || val === null;
}

function renderStudents() {
    const container = document.getElementById('studentList');
    const searchText = document.getElementById('searchInput')?.value?.toLowerCase() || '';
    
    let filtered = allStudents;

    if (selectedClass !== 'all') {
        filtered = filtered.filter(s => s.class === selectedClass);
        console.log('Filtered by class:', filtered.length);
    }

    if (searchText) {
        filtered = filtered.filter(s => 
            (s.first_name || '').toLowerCase().includes(searchText) ||
            (s.last_name || '').toLowerCase().includes(searchText) ||
            (s.student_id || '').toLowerCase().includes(searchText)
        );
    }
    
    console.log('Final filtered:', filtered.length);
    
    if (filtered.length === 0) {
        container.innerHTML = '<tr><td colspan="6" class="empty-cell">No students found</td></tr>';
        document.getElementById('showingCount').textContent = 'Showing 0 students';
        return;
    }
    
    container.innerHTML = filtered.map((s, index) => {
        const isActive = checkActive(s);
        const statusClass = isActive ? 'active' : 'inactive';
        const statusText = isActive ? 'ACTIVE' : 'INACTIVE';
        const studentClass = s.class || 'N/A';
        
        return `
            <tr class="student-row">
                <td class="row-number">${index + 1}</td>
                <td class="student-id">${s.student_id}</td>
                <td class="student-name">${s.first_name} ${s.last_name}</td>
                <td><span class="class-badge">${studentClass}</span></td>
                <td>
                    <span class="status-badge ${statusClass}" onclick="toggleStatus(${s.id})" style="cursor:pointer;">
                        ${statusText}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-view" onclick="viewStudent(${s.id})" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-edit" onclick="editStudent(${s.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('showingCount').textContent = `Showing ${filtered.length} students`;
}

function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', renderStudents);
    }
    
    const editForm = document.getElementById('editStudentForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveStudent();
        });
    }
}

function viewStudent(id) {
    const student = allStudents.find(s => s.id === id);
    if (!student) return;
    
    const isActive = checkActive(student);
    
    document.getElementById('viewModalBody').innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <label>Student ID</label>
                <span>${student.student_id}</span>
            </div>
            <div class="detail-item">
                <label>Full Name</label>
                <span>${student.first_name} ${student.last_name}</span>
            </div>
            <div class="detail-item">
                <label>Class</label>
                <span>${student.class || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <label>Email</label>
                <span>${student.email || '-'}</span>
            </div>
            <div class="detail-item">
                <label>Parent Email</label>
                <span>${student.parent_email || '-'}</span>
            </div>
            <div class="detail-item">
                <label>Status</label>
                <span class="status-badge ${isActive ? 'active' : 'inactive'}">${isActive ? 'ACTIVE' : 'INACTIVE'}</span>
            </div>
        </div>
    `;
    
    document.getElementById('viewModal').style.display = 'flex';
}

function closeViewModal() {
    document.getElementById('viewModal').style.display = 'none';
}

function editStudent(id) {
    const student = allStudents.find(s => s.id === id);
    if (!student) return;
    
    const isActive = checkActive(student);
    
    document.getElementById('editStudentId').value = student.id;
    document.getElementById('editStudentIdDisplay').value = student.student_id;
    document.getElementById('editFirstName').value = student.first_name || '';
    document.getElementById('editLastName').value = student.last_name || '';
    document.getElementById('editClass').value = student.class || 'Class 10A';
    document.getElementById('editEmail').value = student.email || '';
    document.getElementById('editParentEmail').value = student.parent_email || '';
    document.getElementById('editStatus').value = isActive ? 'active' : 'inactive';
    
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function saveStudent() {
    const studentId = document.getElementById('editStudentId').value;
    const firstName = document.getElementById('editFirstName').value;
    const lastName = document.getElementById('editLastName').value;
    const className = document.getElementById('editClass').value;
    const email = document.getElementById('editEmail').value;
    const parentEmail = document.getElementById('editParentEmail').value;
    const status = document.getElementById('editStatus').value;
    
    const btn = document.querySelector('#editStudentForm .btn-save');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    
    try {
        console.log('Saving student:', studentId);
        
        const response = await apiRequest(`/students/${studentId}`, {
            method: 'PUT',
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                class_: className,
                email: email,
                parent_email: parentEmail,
                is_active: status === 'active'
            })
        });
        
        const data = await response.json();
        console.log('Response:', data);
        
        if (response.ok) {
            alert('Student updated successfully!');
            closeEditModal();
            await loadStudents();
        } else {
            alert('Error: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
}

async function toggleStatus(studentId) {
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;
    
    const isActive = checkActive(student);
    const newStatus = isActive ? 'inactive' : 'active';
    
    if (!confirm(`Change status to ${newStatus.toUpperCase()}?`)) return;
    
    console.log('Toggling status:', studentId, newStatus);
    
    try {
        const response = await apiRequest(`/students/${studentId}`, {
            method: 'PUT',
            body: JSON.stringify({
                is_active: newStatus === 'active'
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`Status changed to ${newStatus.toUpperCase()}!`);
            await loadStudents();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}