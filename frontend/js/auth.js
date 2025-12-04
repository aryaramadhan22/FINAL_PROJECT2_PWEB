const API_URL = 'http://localhost:4000/api';

function showAlert(message, type = 'danger') {
    const alertContainer = document.getElementById('alert-container');
    alertContainer.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
    setTimeout(() => {
        const alertElement = alertContainer.querySelector('.alert');
        if (alertElement) new bootstrap.Alert(alertElement).close();
    }, 5000);
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
    submitBtn.disabled = true;

    const data = {
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
    };

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.success) {
            localStorage.setItem('token', result.data.token);
            localStorage.setItem('user', JSON.stringify(result.data.user));
            showAlert('Login berhasil! Mengalihkan...', 'success');
            setTimeout(() => {
                const redirect = result.data.user.role === 'client' ? 
                    'client-dashboard.html' : 'freelancer-dashboard.html';
                window.location.href = redirect;
            }, 1000);
        } else {
            showAlert(result.message || 'Login gagal', 'danger');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        showAlert('Terjadi kesalahan koneksi. Pastikan backend sudah berjalan!', 'danger');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
    submitBtn.disabled = true;

    const data = {
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        role: document.getElementById('reg-role').value
    };

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.success) {
            showAlert('Registrasi berhasil! Silakan login.', 'success');
            setTimeout(() => {
                new bootstrap.Tab(document.getElementById('login-tab')).show();
                document.getElementById('login-email').value = data.email;
                e.target.reset();
            }, 1500);
        } else {
            showAlert(result.message || 'Registrasi gagal', 'danger');
        }
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    } catch (error) {
        showAlert('Terjadi kesalahan koneksi. Pastikan backend sudah berjalan!', 'danger');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

window.addEventListener('load', () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
        const userData = JSON.parse(user);
        const redirect = userData.role === 'client' ? 
            'client-dashboard.html' : 'freelancer-dashboard.html';
        window.location.href = redirect;
    }
});