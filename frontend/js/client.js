const API_URL = 'http://localhost:4000/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'client') window.location.href = '/';

document.getElementById('user-name').textContent = `Halo, ${user.name}`;

document.getElementById('btn-logout').addEventListener('click', () => {
    if (confirm('Yakin ingin logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
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
        if (sectionId === 'my-gigs') loadMyGigs();
        else if (sectionId === 'transactions') loadTransactions();
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
    
    if (!response.ok) throw new Error(data.message || 'Terjadi kesalahan');
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

function formatRupiah(angka) {
    if (!angka && angka !== 0) return '0';
    return new Intl.NumberFormat('id-ID').format(angka);
}

function getStatusBadge(status) {
    const statusMap = {
        'open': '<span class="badge bg-success">Terbuka</span>',
        'in_progress': '<span class="badge bg-warning">Sedang Berjalan</span>',
        'completed': '<span class="badge bg-info">Selesai</span>',
        'cancelled': '<span class="badge bg-danger">Dibatalkan</span>',
        'pending': '<span class="badge bg-warning">Belum Dibayar</span>',
        'paid': '<span class="badge bg-info">Sudah Dibayar</span>'
    };
    return statusMap[status] || `<span class="badge bg-secondary">${status}</span>`;
}

document.getElementById('form-create-gig').addEventListener('submit', async e => {
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
        await apiRequest('gigs', 'POST', gigData);
        showToast('Gig berhasil dibuat!', 'success');
        e.target.reset();
        document.querySelector('[data-section="my-gigs"]').click();
    } catch (error) {
        showToast('Gagal membuat gig: ' + error.message, 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Posting Gig';
    }
});

async function loadMyGigs() {
    try {
        const result = await apiRequest('gigs');
        const myGigs = result.data.filter(gig => gig.client_id == user.id);
        const container = document.getElementById('gigs-list');
        
        if (myGigs.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-briefcase" style="font-size: 4rem; color: #ccc;"></i>
                    <h4 class="mt-3">Belum ada gig</h4>
                    <p class="text-muted">Buat gig pertama Anda untuk menarik freelancer</p>
                </div>`;
            return;
        }
        
        container.innerHTML = myGigs.map(gig => {
            const description = gig.description || '';
            const shortDesc = description.substring(0, 100) + (description.length > 100 ? '...' : '');
            
            return `
                <div class="col-md-6 col-lg-4">
                    <div class="card gig-card h-100">
                        <div class="card-body">
                            <span class="badge badge-category mb-2">${gig.category || 'Umum'}</span>
                            <h5 class="card-title">${gig.title}</h5>
                            <p class="card-text">${shortDesc}</p>
                            <h4 class="text-success">Rp ${formatRupiah(gig.budget)}</h4>
                            ${getStatusBadge(gig.status)}
                        </div>
                        <div class="card-footer bg-transparent">
                            <div class="btn-group w-100" role="group">
                                <button class="btn btn-sm btn-primary" onclick="viewGigDetail(${gig.id})">
                                    <i class="bi bi-eye"></i> Detail
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteGig(${gig.id})">
                                    <i class="bi bi-trash"></i> Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch (error) {
        showToast('Gagal memuat gigs: ' + error.message, 'danger');
    }
}

window.viewGigDetail = async function(gigId) {
    try {
        const gigResult = await apiRequest(`gigs/${gigId}`);
        const gig = gigResult.data;
        
        const deadlineText = gig.deadline ? new Date(gig.deadline).toLocaleDateString('id-ID') : 'Tidak ada';
        const createdText = gig.created_at ? new Date(gig.created_at).toLocaleDateString('id-ID') : '-';
        
        document.getElementById('modal-gig-details').innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Kategori:</strong> ${gig.category || 'Umum'}</p>
                    <p><strong>Budget:</strong> <span class="text-success fw-bold">Rp ${formatRupiah(gig.budget)}</span></p>
                    <p><strong>Status:</strong> ${getStatusBadge(gig.status)}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Deadline:</strong> ${deadlineText}</p>
                    <p><strong>Dibuat:</strong> ${createdText}</p>
                </div>
            </div>
            <div class="mt-3">
                <strong>Deskripsi:</strong>
                <p class="mt-2">${gig.description || '-'}</p>
            </div>
        `;
        
        const proposalsResult = await apiRequest(`proposals?gig_id=${gigId}`);
        const proposals = proposalsResult.data;
        
        let html = `<h5><i class="bi bi-file-earmark-text me-2"></i>Proposals (${proposals.length})</h5>`;
        
        if (proposals.length === 0) {
            html += '<p class="text-muted">Belum ada proposal dari freelancer</p>';
        } else {
            proposals.forEach(proposal => {
                const statusClass = proposal.status === 'accepted' ? 'success' : 
                                  proposal.status === 'rejected' ? 'danger' : 'warning';
                const statusText = proposal.status === 'accepted' ? 'Diterima ' : 
                                 proposal.status === 'rejected' ? 'Ditolak ' : 'Menunggu ';
                
                html += `
                    <div class="card mb-3 ${proposal.status === 'accepted' ? 'border-success' : ''}">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h6 class="mb-1">${proposal.freelancer_name || 'Freelancer'}</h6>
                                    <small class="text-muted">${proposal.freelancer_email || '-'}</small>
                                </div>
                                <div class="text-end">
                                    <h5 class="text-success mb-0">Rp ${formatRupiah(proposal.bid_amount)}</h5>
                                    <small class="text-muted">${proposal.delivery_days || 0} hari</small>
                                </div>
                            </div>
                            <hr>
                            <p><strong>Status:</strong> <span class="badge bg-${statusClass}">${statusText}</span></p>
                            <div class="mb-3">
                                <details>
                                    <summary style="cursor:pointer;color:#667eea;font-weight:600;">
                                        <i class="bi bi-envelope me-1"></i>Lihat Cover Letter
                                    </summary>
                                    <div class="mt-2 p-3 bg-light rounded">
                                        ${proposal.cover_letter || 'Tidak ada cover letter'}
                                    </div>
                                </details>
                            </div>
                            ${proposal.status === 'pending' ? `
                                <div class="d-grid gap-2">
                                    <button class="btn btn-success" onclick="acceptProposal(${proposal.id})">
                                        <i class="bi bi-check-circle me-2"></i>Terima Proposal
                                    </button>
                                    <button class="btn btn-outline-danger" onclick="rejectProposal(${proposal.id})">
                                        <i class="bi bi-x-circle me-2"></i>Tolak Proposal
                                    </button>
                                </div>
                            ` : proposal.status === 'accepted' ? `
                                <div class="alert alert-success mb-0">
                                    <i class="bi bi-check-circle me-2"></i>
                                    Proposal telah diterima. Cek menu <strong>Transaksi</strong> untuk pembayaran.
                                </div>
                            ` : `
                                <div class="alert alert-secondary mb-0">
                                    Proposal telah ditolak
                                </div>
                            `}
                        </div>
                    </div>
                `;
            });
        }
        
        document.getElementById('modal-proposals').innerHTML = html;
        new bootstrap.Modal(document.getElementById('gigModal')).show();
    } catch (error) {
        showToast('Gagal memuat detail gig: ' + error.message, 'danger');
    }
};

window.acceptProposal = async function(proposalId) {
    if (!confirm('Yakin ingin menerima proposal ini?\n\n✅ Transaction akan otomatis dibuat\n💰 Anda perlu membayar freelancer')) return;
    
    try {
        await apiRequest(`proposals/${proposalId}`, 'PUT', { status: 'accepted' });
        showToast('Proposal berhasil diterima!\nTransaction telah dibuat. Silakan bayar di menu Transaksi.', 'success');
        bootstrap.Modal.getInstance(document.getElementById('gigModal')).hide();
        loadMyGigs();
    } catch (error) {
        showToast('Gagal menerima proposal: ' + error.message, 'danger');
    }
};

window.rejectProposal = async function(proposalId) {
    if (!confirm('Yakin ingin menolak proposal ini?')) return;
    
    try {
        await apiRequest(`proposals/${proposalId}`, 'PUT', { status: 'rejected' });
        showToast('Proposal berhasil ditolak', 'info');
        bootstrap.Modal.getInstance(document.getElementById('gigModal')).hide();
        loadMyGigs();
    } catch (error) {
        showToast('Gagal menolak proposal: ' + error.message, 'danger');
    }
};

window.deleteGig = async function(gigId) {
    if (!confirm('Yakin ingin menghapus gig ini?\n\nSemua proposal terkait akan ikut terhapus!')) return;
    
    try {
        await apiRequest(`gigs/${gigId}`, 'DELETE');
        showToast('Gig berhasil dihapus!', 'success');
        loadMyGigs();
    } catch (error) {
        showToast('Gagal menghapus gig: ' + error.message, 'danger');
    }
};

async function loadTransactions() {
    try {
        const result = await apiRequest('transactions');
        const transactions = result.data;
        const container = document.getElementById('transactions-list');
        
        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-cash-stack" style="font-size: 4rem; color: #ccc;"></i>
                    <h4 class="mt-3">Belum ada transaksi</h4>
                    <p class="text-muted">Transaksi akan muncul setelah Anda menerima proposal</p>
                </div>`;
            return;
        }
        
        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead class="table-light">
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
                        ${transactions.map(trans => {
                            const paymentDate = trans.payment_date ? 
                                `<br><small class="text-muted">Dibayar: ${new Date(trans.payment_date).toLocaleDateString('id-ID')}</small>` : '';
                            const completionDate = trans.completion_date ? 
                                `<br><small class="text-success">Selesai: ${new Date(trans.completion_date).toLocaleDateString('id-ID')}</small>` : '';
                            
                            return `
                                <tr>
                                    <td><strong>${trans.gig_title}</strong></td>
                                    <td>${trans.freelancer_name}</td>
                                    <td class="text-success fw-bold">Rp ${formatRupiah(trans.amount)}</td>
                                    <td>${getStatusBadge(trans.status)}</td>
                                    <td>
                                        <small>${new Date(trans.created_at).toLocaleDateString('id-ID')}</small>
                                        ${paymentDate}
                                        ${completionDate}
                                    </td>
                                    <td>
                                        ${trans.status === 'pending' ? `
                                            <button class="btn btn-success btn-sm" onclick="markAsPaid(${trans.id})">
                                                <i class="bi bi-cash me-1"></i>Bayar
                                            </button>
                                        ` : trans.status === 'paid' ? `
                                            <span class="text-info">
                                                <i class="bi bi-hourglass-split me-1"></i>Menunggu freelancer selesai
                                            </span>
                                        ` : trans.status === 'completed' ? `
                                            <span class="text-success">
                                                <i class="bi bi-check-circle me-1"></i>Selesai
                                            </span>
                                        ` : '-'}
                                    </td>
                                </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="alert alert-info mt-3">
                <h6><i class="bi bi-info-circle me-2"></i>Panduan Status Transaksi:</h6>
                <ul class="mb-0">
                    <li><strong>Belum Dibayar:</strong> Klik tombol "Bayar" setelah transfer ke freelancer</li>
                    <li><strong>Sudah Dibayar:</strong> Tunggu freelancer menyelesaikan pekerjaan</li>
                    <li><strong>Selesai:</strong> Project telah diselesaikan oleh freelancer</li>
                </ul>
            </div>`;
    } catch (error) {
        showToast('Gagal memuat transaksi: ' + error.message, 'danger');
    }
}

window.markAsPaid = async function(transactionId) {
    if (!confirm('Konfirmasi bahwa Anda sudah melakukan pembayaran ke freelancer?\n\n💰 Freelancer akan mulai mengerjakan project')) return;
    
    try {
        await apiRequest(`transactions/${transactionId}`, 'PUT', { status: 'paid' });
        showToast('✅ Transaksi berhasil ditandai sebagai dibayar!\n⏳ Tunggu freelancer menyelesaikan project', 'success');
        loadTransactions();
    } catch (error) {
        showToast('Gagal menandai transaksi: ' + error.message, 'danger');
    }
};

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
loadMyGigs();