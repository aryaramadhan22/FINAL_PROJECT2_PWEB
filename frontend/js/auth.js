// API URL - sesuaikan dengan URL backend Express Anda
const API_URL = 'http://localhost:3000/api';

// Show Alert
function showAlert(message, type = 'danger') {
    const alertContainer = document.getElementById('alert-container');
    const alert = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    alertContainer.innerHTML = alert;
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        const alertElement = alertContainer.querySelector('.alert');
        if (alertElement) {
            const bsAlert = new bootstrap.Alert(alertElement);
            bsAlert.close();
        }
    }, 5000);
}

// Handle Login
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
    submitBtn.disabled = true;

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            
            showAlert('Login berhasil! Mengalihkan...', 'success');
            
            setTimeout(() => {
                if (data.data.user.role === 'client') {
                    window.location.href = 'client-dashboard.html';
                } else {
                    window.location.href = 'freelancer-dashboard.html';
                }
            }, 1000);
        } else {
            showAlert(data.message || 'Login gagal', 'danger');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        showAlert('Terjadi kesalahan koneksi. Pastikan backend sudah berjalan di port 3000!', 'danger');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        console.error('Error:', error);
    }
});

// Handle Register
document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
    submitBtn.disabled = true;

    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, role })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Registrasi berhasil! Silakan login.', 'success');
            
            // Switch to login tab
            setTimeout(() => {
                const loginTab = new bootstrap.Tab(document.getElementById('login-tab'));
                loginTab.show();
                document.getElementById('login-email').value = email;
                e.target.reset();
            }, 1500);
        } else {
            showAlert(data.message || 'Registrasi gagal', 'danger');
        }
        
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    } catch (error) {
        showAlert('Terjadi kesalahan koneksi. Pastikan backend sudah berjalan di port 3000!', 'danger');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        console.error('Error:', error);
    }
});

// Check if already logged in
window.addEventListener('load', () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        const userData = JSON.parse(user);
        if (userData.role === 'client') {
            window.location.href = 'client-dashboard.html';
        } else {
            window.location.href = 'freelancer-dashboard.html';
        }
    }
});