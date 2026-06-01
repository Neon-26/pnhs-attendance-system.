document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await apiRequest('/dashboard/stats');
    const stats = await response.json();
    
    document.getElementById('totalStudents').textContent = stats.totalStudents;
    document.getElementById('presentToday').textContent = stats.presentToday;
    document.getElementById('absentToday').textContent = stats.absentToday;
    document.getElementById('lateToday').textContent = stats.lateToday || 0;

    const studentsResponse = await apiRequest('/students');
    const students = await studentsResponse.json();
    
    document.getElementById('recentList').innerHTML = students.slice(0, 5).map(s => `
      <div class="recent-item">
        <span>${s.first_name} ${s.last_name}</span>
        <span class="status-badge status-${s.today_status}">${s.today_status}</span>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Dashboard error:', error);
    document.getElementById('recentList').innerHTML = 'Loading...';
  }
});