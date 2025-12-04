
//api dan konfigurasi
const API_URL = 'http://localhost:4000/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'freelancer') window.location.href = 'index.html';

document.getElementById('user-name').textContent = `Halo, ${user.name}`;

document.getElementById('btn-logout').addEventListener('click', () => {
    if (confirm('Yakin ingin logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
});

document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        const sectionId = link.getAttribute('data-section');
        document.querySelectorAll('.content-section').forEach(section => section.style.display = 'none');
        document.getElementById(sectionId).style.display = 'block';
        if (sectionId === 'browse-gigs') loadAvailableGigs();
        else if (sectionId === 'my-proposals') loadMyProposals();
        else if (sectionId === 'my-projects') loadMyProjects();
        else if (sectionId === 'profile') loadProfile();
    });
});

async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${API_URL}/${endpoint}`, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    toast.style.zIndex = '9999';    
    toast.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function formatNumber(num) {
    if (!num && num !== 0) return '0';
    return new Intl.NumberFormat('id-ID').format(num);
}

function getProposalStatusText(status) {
    const map = { 'pending': 'Menunggu ', 'accepted': 'Diterima ', 'rejected': 'Ditolak ' };
    return map[status] || status;
}

function getProposalStatusColor(status) {
    const map = { 'pending': 'warning', 'accepted': 'success', 'rejected': 'danger' };
    return map[status] || 'secondary';
}

function getTransactionStatusText(status) {
    const map = {
        'pending': 'Menunggu Pembayaran',
        'paid': 'Sudah Dibayar - Kerjakan!',
        'completed': 'Selesai ',
        'cancelled': 'Dibatalkan'
    };
    return map[status] || status;
}

function getTransactionStatusColor(status) {
    const map = { 'pending': 'warning', 'paid': 'info', 'completed': 'success', 'cancelled': 'danger' };
    return map[status] || 'secondary';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

async function loadAvailableGigs(category = '') {
    try {
        let url = 'gigs?status=open';
        if (category) url += `&category=${encodeURIComponent(category)}`;
        const result = await apiRequest(url);
        const gigs = result.data;
        const container = document.getElementById('available-gigs');
        if (gigs.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="bi bi-search" style="font-size: 4rem; color: #ccc;"></i>
                        <h4 class="mt-3">Tidak ada gig tersedia</h4>
                        <p class="text-muted">Coba kategori lain atau cek kembali nanti</p>
                    </div>
                </div>`;
            return;
        }
        container.innerHTML = gigs.map(gig => `
            <div class="col-md-6 col-lg-4">
                <div class="card gig-card h-100">
                    <div class="card-body">
                        <span class="badge badge-category mb-2">${gig.category || 'Umum'}</span>
                        <h5 class="card-title">${gig.title}</h5>
                        <p class="card-text">${gig.description.substring(0, 120)}${gig.description.length > 120 ? '...' : ''}</p>
                        <h4 class="text-success">Rp ${formatNumber(gig.budget)}</h4>
                        <p class="mb-1"><small><i class="bi bi-person me-1"></i>${gig.client_name}</small></p>
                        ${gig.deadline ? `<p class="mb-0"><small><i class="bi bi-calendar me-1"></i>Deadline: ${new Date(gig.deadline).toLocaleDateString('id-ID')}</small></p>` : ''}
                    </div>
                    <div class="card-footer bg-transparent">
                        <button class="btn btn-primary btn-sm w-100" onclick="showApplyModal(${gig.id}, '${escapeHtml(gig.title)}', ${gig.budget})">
                            <i class="bi bi-send me-2"></i>Kirim Proposal
                        </button>
                    </div>
                </div>
            </div>`).join('');
    } catch (error) {
        showToast('Gagal memuat gigs: ' + error.message, 'danger');
    }
}

window.filterGigs = () => loadAvailableGigs(document.getElementById('filter-category').value);

window.showApplyModal = function(gigId, gigTitle, budget) {
    document.getElementById('modal-gig-title').textContent = gigTitle;
    document.getElementById('modal-gig-info').innerHTML = `
        <div class="alert alert-info">
            <strong>Budget Client:</strong> Rp ${formatNumber(budget)}<br>
            <small>Masukkan tawaran harga dan estimasi pengerjaan Anda</small>
        </div>`;
    document.getElementById('apply-gig-id').value = gigId;
    document.getElementById('bid-amount').value = '';
    document.getElementById('delivery-days').value = '';
    document.getElementById('cover-letter').value = '';
    new bootstrap.Modal(document.getElementById('applyModal')).show();
};

document.getElementById('form-apply').addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
    const proposalData = {
        gig_id: parseInt(document.getElementById('apply-gig-id').value),
        bid_amount: parseFloat(document.getElementById('bid-amount').value),
        delivery_days: parseInt(document.getElementById('delivery-days').value),
        cover_letter: document.getElementById('cover-letter').value
    };
    try {
        await apiRequest('proposals', 'POST', proposalData);
        showToast('Proposal berhasil dikirim!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('applyModal')).hide();
        e.target.reset();
    } catch (error) {
        showToast('Gagal mengirim proposal: ' + error.message, 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-send me-2"></i>Kirim Proposal';
    }
});

async function loadMyProposals() {
    try {
        const result = await apiRequest('proposals');
        const proposals = result.data;
        const container = document.getElementById('proposals-list');
        if (proposals.length === 0) return;
        container.innerHTML = proposals.map(proposal => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 class="card-title mb-1">${proposal.gig_title}</h5>
                            <p class="text-muted mb-0"><small>${proposal.client_name}</small></p>
                        </div>
                        <h4 class="text-success mb-0">Rp ${formatNumber(proposal.bid_amount)}</h4>
                    </div>
                    <div class="row mb-2">
                        <div class="col-md-6"><small><i class="bi bi-calendar me-1"></i>Delivery: ${proposal.delivery_days} hari</small></div>
                        <div class="col-md-6"><small><i class="bi bi-clock me-1"></i>${new Date(proposal.created_at).toLocaleDateString('id-ID')}</small></div>
                    </div>
                    <div class="mb-2"><span class="badge bg-${getProposalStatusColor(proposal.status)}">${getProposalStatusText(proposal.status)}</span></div>
                    <div class="accordion" id="accordion${proposal.id}">
                        <div class="accordion-item">
                            <h2 class="accordion-header">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${proposal.id}">
                                    <i class="bi bi-envelope me-2"></i>Lihat Cover Letter
                                </button>
                            </h2>
                            <div id="collapse${proposal.id}" class="accordion-collapse collapse" data-bs-parent="#accordion${proposal.id}">
                                <div class="accordion-body">${proposal.cover_letter}</div>
                            </div>
                        </div>
                    </div>
                    ${proposal.status === 'pending' ? `
                        <button class="btn btn-danger btn-sm mt-3" onclick="deleteProposal(${proposal.id})">
                            <i class="bi bi-trash me-1"></i>Batalkan Proposal
                        </button>` : proposal.status === 'accepted' ? `
                        <div class="alert alert-success mt-3 mb-0">
                            <i class="bi bi-check-circle me-2"></i>
                            <strong>Proposal diterima!</strong> Cek menu <strong>Project Saya</strong> untuk mulai mengerjakan.
                        </div>` : ''}
                </div>
            </div>`).join('');
    } catch (error) {
        showToast('Gagal memuat proposals: ' + error.message, 'danger');
    }
}

window.deleteProposal = async function(proposalId) {
    if (!confirm('Yakin ingin membatalkan proposal ini?')) return;
    try {
        await apiRequest(`proposals/${proposalId}`, 'DELETE');
        showToast('Proposal berhasil dibatalkan!', 'success');
        loadMyProposals();
    } catch (error) {
        showToast('Gagal membatalkan proposal: ' + error.message, 'danger');
    }
};

async function loadMyProjects() {
    try {
        const result = await apiRequest('transactions');
        const projects = result.data;
        const container = document.getElementById('projects-list');
        if (projects.length === 0) return;
        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Project</th>
                            <th>Client</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Tanggal</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${projects.map(project => {
                            const completionDate = project.completion_date ? `<br><small class="text-success">Selesai: ${new Date(project.completion_date).toLocaleDateString('id-ID')}</small>` : '';
                            const paymentDate = project.payment_date ? `<br><small class="text-info">Dibayar: ${new Date(project.payment_date).toLocaleDateString('id-ID')}</small>` : '';
                            return `
                                <tr>
                                    <td><strong>${project.gig_title}</strong></td>
                                    <td>${project.client_name || '-'}</td>
                                    <td class="text-success fw-bold">Rp ${formatNumber(project.amount)}</td>
                                    <td><span class="badge bg-${getTransactionStatusColor(project.status)}">${getTransactionStatusText(project.status)}</span></td>
                                    <td><small>${new Date(project.created_at).toLocaleDateString('id-ID')}</small>${paymentDate}${completionDate}</td>
                                    <td>
                                        ${project.status === 'paid' ? `
                                            <button class="btn btn-success btn-sm" onclick="showCompleteModal(${project.id}, '${escapeHtml(project.gig_title)}')">
                                                <i class="bi bi-check-circle me-1"></i>Selesai & Upload
                                            </button>` : project.status === 'pending' ? `
                                            <span class="text-warning">
                                                <i class="bi bi-hourglass-split me-1"></i>Menunggu pembayaran
                                            </span>` : project.status === 'completed' ? `
                                            <span class="text-success">
                                                <i class="bi bi-check-circle me-1"></i>Selesai
                                            </span>` : '-'}
                                    </td>
                                </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="alert alert-info mt-3">
                <h6><i class="bi bi-info-circle me-2"></i>Status Project:</h6>
                <ul class="mb-0">
                    <li><strong>Menunggu Pembayaran:</strong> Client belum membayar</li>
                    <li><strong>Sudah Dibayar:</strong> Mulai kerjakan project! Klik "Selesai & Upload" setelah selesai</li>
                    <li><strong>Selesai:</strong> Project sudah diselesaikan</li>
                </ul>
            </div>`;
    } catch (error) {
        showToast('Gagal memuat projects: ' + error.message, 'danger');
    }
}

window.showCompleteModal = function(transactionId, gigTitle) {
    document.getElementById('complete-transaction-id').value = transactionId;
    document.getElementById('complete-gig-title').textContent = gigTitle;
    document.getElementById('delivery-note').value = '';
    document.getElementById('delivery-file-info').value = '';
    new bootstrap.Modal(document.getElementById('completeModal')).show();
};

if (document.getElementById('form-complete')) { 
    document.getElementById('form-complete').addEventListener('submit', async e => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
        const transactionId = document.getElementById('complete-transaction-id').value;
        const completionData = {
            status: 'completed',
            delivery_note: document.getElementById('delivery-note').value,
            delivery_file: document.getElementById('delivery-file-info').value || null
        };
        try {
            await apiRequest(`transactions/${transactionId}`, 'PUT', completionData);
            showToast('Project berhasil ditandai selesai!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('completeModal')).hide();
            loadMyProjects();
        } catch (error) {
            showToast('Gagal menandai selesai: ' + error.message, 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Submit & Tandai Selesai';
        }
    });
}

async function loadProfile() {
    try {
        const result = await apiRequest('auth/profile');
        const profile = result.data;
        document.getElementById('profile-name').value = profile.name || '';
        document.getElementById('profile-email').value = profile.email || '';
        document.getElementById('profile-phone').value = profile.phone || '';
        document.getElementById('profile-bio').value = profile.bio || '';
    } catch (error) {
        showToast('Gagal memuat profil: ' + error.message, 'danger');
    }
}

document.getElementById('form-profile').addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const profileData = {
        name: document.getElementById('profile-name').value,
        phone: document.getElementById('profile-phone').value,
        bio: document.getElementById('profile-bio').value
    };
    try {
        await apiRequest('auth/profile', 'PUT', profileData);
        showToast('Profil berhasil diupdate!', 'success');
        user.name = profileData.name;
        localStorage.setItem('user', JSON.stringify(user));
        document.getElementById('user-name').textContent = `Halo, ${user.name}`;
    } catch (error) {
        showToast('Gagal update profil: ' + error.message, 'danger');
    } finally {
        submitBtn.disabled = false;
    }
});

loadAvailableGigs();