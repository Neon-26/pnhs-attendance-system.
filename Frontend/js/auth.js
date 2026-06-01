const API_BASE = 'http://localhost:5000/api';
let currentUser = null;
let authToken = null;
let userRole = null;

document.addEventListener('DOMContentLoaded', function() {
  authToken = localStorage.getItem('authToken');
  currentUser = JSON.parse(localStorage.getItem('currentUser'));
  userRole = localStorage.getItem('userRole');

  const path = window.location.pathname.split('/').pop();
  const currentPage = path || 'login.html';

  const protectedPages = ['dashboard.html', 'students.html', 'attendance.html', 'teacher_verify.html', 'reports.html', 'enroll.html'];

  if (protectedPages.includes(currentPage) && !authToken) {
    window.location.href = 'login.html';
    return;
  }

  if (currentPage === 'login.html' && authToken) {
    window.location.href = 'dashboard.html';
    return;
  }
  
  initPage();
  
  setupNavByRole();
});

function setupNavByRole() {
  const enrollNav = document.querySelector('a[href="enroll.html"]');
  if (enrollNav) {
    enrollNav.style.display = userRole === 'admin' ? 'flex' : 'none';
  }
}

function initPage() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      login(username, password);
    });
  }

  document.querySelectorAll('#logoutBtn, .logout-btn').forEach(btn => {
    btn.addEventListener('click', logout);
  });
  
  updateUserInfo();
}

function updateUserInfo() {
  if (currentUser) {
    document.querySelectorAll('#userInfo').forEach(el => {
      el.textContent = `Welcome, ${currentUser.username}`;
    });
  }
}

function togglePass() {
  const passInput = document.getElementById('password');
  const toggleIcon = document.querySelector('.toggle-password');
  if (passInput.type === 'password') {
    passInput.type = 'text';
    toggleIcon.classList.replace('fa-eye-slash', 'fa-eye');
  } else {
    passInput.type = 'password';
    toggleIcon.classList.replace('fa-eye', 'fa-eye-slash');
  }
}

async function login(username, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {

            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            localStorage.setItem('userRole', data.user.role);
            
            console.log("Full user data stored:", data.user);
            
            if (data.user.role === 'student') {
                window.location.href = 'student_portal.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert('Server not running! Start: cd backend && npm run dev');
    }
}

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('userRole');
  currentUser = null;
  userRole = null;
  window.location.href = 'login.html';
}

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('authToken');
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    ...options
  };
  
  const response = await fetch(`${API_BASE}${endpoint}`, config);
  return response;
}