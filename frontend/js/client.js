const API_URL = 'http://localhost/freelance-platform/backend/api';

let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || '{}');

// Check authentication
if (!token || user.role !== 'client') {
    window.location.href = 'index.html';
}

// Display user name
document.getElementById('user-name').textContent = `Halo, ${user.name}`;

// Logout
document.getElementById('btn-logout').addEventListener('click', () => {
    if (confirm('Yakin ingin logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
});

// Navigation
document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Update active link
        document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // Show section
        const sectionId = link.getAttribute('data-section');
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById(sectionId).style.display = 'block';
        
        // Load data
        if (sectionId === 'my-gigs') {
            loadMyGigs();
        } else if (sectionId === 'transactions') {
            loadTransactions();
        } else if (sectionId === 'profile') {
            loadProfile();
        }
    });
});

// API Helper
async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}/${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Request failed');
    }

    return data;
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    toast.style.zIndex = '9999';
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Create Gig
document.getElementById('form-create-gig').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';

    const gigData = {
        title: document.getElementById('gig-title').value,
        description: document.getElementById('gig-description').value,
        category: document.getElementById('gig-category').value,
        budget: parseFloat(document.getElementById('gig-budget').value),
        deadline: document.getElementById('gig-deadline').value || null
    };

    try {
        await apiRequest('gigs.php', 'POST', gigData);
        showToast('Gig berhasil dibuat!', 'success');
        e.target.reset();
        
        // Switch to my gigs
        document.querySelector('[data-section="my-gigs"]').click();
    } catch (error) {
        showToast('Gagal membuat gig: ' + error.message, 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Posting Gig';
    }
});

// Load My Gigs
async function loadMyGigs() {
    try {
        const result = await apiRequest('gigs.php');
        const myGigs = result.data.filter(gig => gig.client_id == user.id);

        const container = document.getElementById('gigs-list');
        
        if (myGigs.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="bi bi-inbox" style="font-size: 4rem; color: #ccc;"></i>
                        <h4 class="mt-3">Belum ada gig</h4>
                        <p class="text-muted">Mulai posting gig pertama Anda!</p>
                        <button class="btn btn-primary" onclick="document.querySelector('[data-section=create-gig]').click()">
                            <i class="bi bi-plus-circle me-2"></i>Buat Gig
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = myGigs.map(gig => `
            <div class="col-md-6 col-lg-4">
                <div class="card gig-card h-100">
                    <div class="card-body">
                        <span class="badge badge-category mb-2">${gig.category || 'Umum'}</span>
                        <h5 class="card-title">${gig.title}</h5>
                        <p class="card-text">${gig.description.substring(0, 100)}${gig.description.length > 100 ? '...' : ''}</p>
                        <h4 class="text-success">Rp ${formatNumber(gig.budget)}</h4>
                        <span class="badge bg-${getStatusColor(gig.status)}">${getStatusText(gig.status)}</span>
                    </div>
                    <div class="card-footer bg-transparent">
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-sm btn-primary" onclick="viewGigDetails(${gig.id})">
                                <i class="bi bi-eye"></i> Detail
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteGig(${gig.id})">
                                <i class="bi bi-trash"></i> Hapus
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showToast('Gagal memuat gigs: ' + error.message, 'danger');
    }
}

// View Gig Details
async function viewGigDetails(gigId) {
    try {
        const gigResult = await apiRequest(`gigs.php?id=${gigId}`);
        const gig = gigResult.data;

        const proposalsResult = await apiRequest(`proposals.php?gig_id=${gigId}`);
        const proposals = proposalsResult.data;

        document.getElementById('modal-gig-title').textContent = gig.title;
        
        document.getElementById('modal-gig-details').innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Kategori:</strong> ${gig.category}</p>
                    <p><strong>Budget:</strong> <span class="text-success fw-bold">Rp ${formatNumber(gig.budget)}</span></p>
                    <p><strong>Status:</strong> <span class="badge bg-${getStatusColor(gig.status)}">${getStatusText(gig.status)}</span></p>
                </div>
                <div class="col-md-6">
                    <p><strong>Deadline:</strong> ${gig.deadline ? new Date(gig.deadline).toLocaleDateString('id-ID') : 'Tidak ada'}</p>
                    <p><strong>Jumlah Proposal:</strong> ${gig.proposal_count}</p>
                    <p><strong>Dibuat:</strong> ${new Date(gig.created_at).toLocaleDateString('id-ID')}</p>
                </div>
            </div>
            <div class="mt-3">
                <strong>Deskripsi:</strong>
                <p class="mt-2">${gig.description}</p>
            </div>
        `;

        document.getElementById('modal-proposals').innerHTML = `
            <h5><i class="bi bi-file-earmark-text me-2"></i>Proposals (${proposals.length})</h5>
            ${proposals.length === 0 ? '<p class="text-muted">Belum ada proposal</p>' : 
                proposals.map(proposal => `
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="mb-1">${proposal.freelancer_name}</h6>
                                    <small class="text-muted">${proposal.freelancer_email}</small>
                                </div>
                                <h5 class="text-success mb-0">Rp ${formatNumber(proposal.bid_amount)}</h5>
                            </div>
                            <hr>
                            <p><strong>Delivery:</strong> ${proposal.delivery_days} hari</p>
                            <p><strong>Status:</strong> <span class="badge bg-${getProposalStatusColor(proposal.status)}">${proposal.status}</span></p>
                            <details>
                                <summary class="text-primary" style="cursor: pointer;">Lihat Cover Letter</summary>
                                <p class="mt-2">${proposal.cover_letter}</p>
                            </details>
                            ${proposal.status === 'pending' ? `
                                <div class="mt-3">
                                    <button class="btn btn-success btn-sm me-2" onclick="acceptProposal(${proposal.id})">
                                        <i class="bi bi-check-circle me-1"></i>Terima
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="rejectProposal(${proposal.id})">
                                        <i class="bi bi-x-circle me-1"></i>Tolak
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')
            }
        `;

        const modal = new bootstrap.Modal(document.getElementById('gigModal'));
        modal.show();
    } catch (error) {
        showToast('Gagal memuat detail: ' + error.message, 'danger');
    }
}

// Accept Proposal
async function acceptProposal(proposalId) {
    if (!confirm('Yakin ingin menerima proposal ini?')) return;

    try {
        await apiRequest(`proposals.php?id=${proposalId}`, 'PUT', { status: 'accepted' });
        showToast('Proposal berhasil diterima!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('gigModal')).hide();
        loadMyGigs();
    } catch (error) {
        showToast('Gagal menerima proposal: ' + error.message, 'danger');
    }
}

// Reject Proposal
async function rejectProposal(proposalId) {
    if (!confirm('Yakin ingin menolak proposal ini?')) return;

    try {
        await apiRequest(`proposals.php?id=${proposalId}`, 'PUT', { status: 'rejected' });
        showToast('Proposal berhasil ditolak!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('gigModal')).hide();
        loadMyGigs();
    } catch (error) {
        showToast('Gagal menolak proposal: ' + error.message, 'danger');
    }
}

// Delete Gig
async function deleteGig(gigId) {
    if (!confirm('Yakin ingin menghapus gig ini?')) return;

    try {
        await apiRequest(`gigs.php?id=${gigId}`, 'DELETE');
        showToast('Gig berhasil dihapus!', 'success');
        loadMyGigs();
    } catch (error) {
        showToast('Gagal menghapus gig: ' + error.message, 'danger');
    }
}

// Load Transactions
async function loadTransactions() {
    try {
        const result = await apiRequest('transactions.php');
        const transactions = result.data;

        const container = document.getElementById('transactions-list');
        
        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-cash-stack" style="font-size: 4rem; color: #ccc;"></i>
                    <h4 class="mt-3">Belum ada transaksi</h4>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Gig</th>
                            <th>Freelancer</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Tanggal</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map(trans => `
                            <tr>
                                <td>${trans.gig_title}</td>
                                <td>${trans.freelancer_name}</td>
                                <td class="text-success fw-bold">Rp ${formatNumber(trans.amount)}</td>
                                <td><span class="badge bg-${getTransactionStatusColor(trans.status)}">${trans.status}</span></td>
                                <td>${new Date(trans.created_at).toLocaleDateString('id-ID')}</td>
                                <td>
                                    ${trans.status === 'pending' ? `
                                        <button class="btn btn-sm btn-success" onclick="markAsPaid(${trans.id})">
                                            <i class="bi bi-check-circle me-1"></i>Bayar
                                        </button>
                                    ` : '-'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        showToast('Gagal memuat transaksi: ' + error.message, 'danger');
    }
}

// Mark as Paid
async function markAsPaid(transactionId) {
    if (!confirm('Konfirmasi bahwa pembayaran sudah dilakukan?')) return;

    try {
        await apiRequest(`transactions.php?id=${transactionId}`, 'PUT', { status: 'paid' });
        showToast('Transaksi berhasil ditandai sebagai dibayar!', 'success');
        loadTransactions();
    } catch (error) {
        showToast('Gagal update transaksi: ' + error.message, 'danger');
    }
}

// Load Profile
async function loadProfile() {
    try {
        const result = await apiRequest('auth.php?action=profile');
        const profile = result.data;

        document.getElementById('profile-name').value = profile.name || '';
        document.getElementById('profile-email').value = profile.email || '';
        document.getElementById('profile-phone').value = profile.phone || '';
        document.getElementById('profile-bio').value = profile.bio || '';
    } catch (error) {
        showToast('Gagal memuat profil: ' + error.message, 'danger');
    }
}

// Update Profile
document.getElementById('form-profile').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const profileData = {
        name: document.getElementById('profile-name').value,
        phone: document.getElementById('profile-phone').value,
        bio: document.getElementById('profile-bio').value
    };

    try {
        await apiRequest('auth.php?action=profile', 'PUT', profileData);
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

// Utility Functions
function formatNumber(num) {
    return new Intl.NumberFormat('id-ID').format(num);
}

function getStatusText(status) {
    const map = {
        'open': 'Terbuka',
        'in_progress': 'Sedang Berjalan',
        'completed': 'Selesai',
        'cancelled': 'Dibatalkan'
    };
    return map[status] || status;
}

function getStatusColor(status) {
    const map = {
        'open': 'success',
        'in_progress': 'warning',
        'completed': 'info',
        'cancelled': 'danger'
    };
    return map[status] || 'secondary';
}

function getProposalStatusColor(status) {
    const map = {
        'pending': 'warning',
        'accepted': 'success',
        'rejected': 'danger'
    };
    return map[status] || 'secondary';
}

function getTransactionStatusColor(status) {
    const map = {
        'pending': 'warning',
        'paid': 'info',
        'completed': 'success',
        'cancelled': 'danger'
    };
    return map[status] || 'secondary';
}

// Initial load
loadMyGigs();