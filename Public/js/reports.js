let allReports = [];
let allStudents = [];
let selectedClass = 'all';

document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;
    
    document.getElementById('dateFilter').value = todayString;
    
    await loadStudentsForDropdown();
    await loadReports();
    setupFilters();
}

async function loadStudentsForDropdown() {
    try {
        const response = await apiRequest('/students');
        allStudents = await response.json();
        
        const dropdown = document.getElementById('classFilter');
        const classes = [...new Set(allStudents.map(s => s.class))].filter(Boolean).sort();
        
        dropdown.innerHTML = '<option value="all">All Classes</option>';
        classes.forEach(cls => {
            dropdown.innerHTML += `<option value="${cls}">${cls}</option>`;
        });
        
        dropdown.addEventListener('change', (e) => {
            selectedClass = e.target.value;
            document.getElementById('selectedClassLabel').textContent = 
                selectedClass === 'all' ? 'All Classes' : selectedClass;
            filterReports();
        });
    } catch (e) {
        console.error('Error loading students:', e);
    }
}

async function loadReports() {
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Loading reports...</td></tr>';
    
    try {
        const date = document.getElementById('dateFilter').value;
        const response = await apiRequest(`/reports?date=${date}`);
        allReports = await response.json();
        
        filterReports();
    } catch (e) {
        console.error('Error:', e);
        tbody.innerHTML = '<tr><td colspan="7" class="error-cell">Error loading reports</td></tr>';
    }
}

function filterReports() {
    const tbody = document.getElementById('reportTableBody');
    const studentFilter = document.getElementById('studentFilter').value.toLowerCase();
    
    let filtered = allReports || [];
    
    if (selectedClass !== 'all') {
        filtered = filtered.filter(r => (r.class || r.class_) === selectedClass);
    }
    
    if (studentFilter) {
        filtered = filtered.filter(r => 
            r.student_id.toLowerCase().includes(studentFilter)
        );
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No reports found</td></tr>';
        document.getElementById('reportCount').textContent = 'Showing 0 records';
        return;
    }
    
    tbody.innerHTML = filtered.map((r, index) => {
        const statusClass = r.status === 'present' ? 'present' : 
                           r.status === 'late' ? 'late' : 'absent';
        const statusText = r.status ? r.status.toUpperCase() : '-';
        const time = r.time || '-';
        const className = r.class || r.class_ || '-';
        
        return `
            <tr class="report-row">
                <td class="row-number">${index + 1}</td>
                <td>${r.date || '-'}</td>
                <td class="time-cell">${time}</td>
                <td class="student-id">${r.student_id || '-'}</td>
                <td class="student-name">${r.first_name || ''} ${r.last_name || ''}</td>
                <td><span class="class-badge">${className}</span></td>
                <td><span class="status-text ${statusClass}">${statusText}</span></td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('reportCount').textContent = `Showing ${filtered.length} records`;
}

function setupFilters() {
    document.getElementById('generateReport').addEventListener('click', loadReports);
    document.getElementById('dateFilter').addEventListener('change', loadReports);
    document.getElementById('studentFilter').addEventListener('input', filterReports);
    document.getElementById('exportExcel').addEventListener('click', exportToExcel);
}

function exportToExcel() {
    const studentFilter = document.getElementById('studentFilter').value.toLowerCase();
    const classFilter = document.getElementById('classFilter').value;

    let dataToExport = allReports || [];

    if (classFilter !== 'all') {
        dataToExport = dataToExport.filter(r => (r.class || r.class_) === classFilter);
    }

    if (studentFilter) {
        dataToExport = dataToExport.filter(r => 
            r.student_id && r.student_id.toLowerCase().includes(studentFilter)
        );
    }
    
    if (dataToExport.length === 0) {
        alert('No data to export!');
        return;
    }
    
    let csvContent = '\uFEFF';
    csvContent += 'No.,Date,Time,Student ID,Student Name,Class,Status\n';
    
    dataToExport.forEach((r, index) => {
        const name = `${r.first_name || ''} ${r.last_name || ''}`;
        const className = r.class || r.class_ || '';
        csvContent += `${index + 1},${r.date || ''},${r.time || ''},${r.student_id || ''},${name},${className},${r.status || ''}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const date = document.getElementById('dateFilter').value;
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}