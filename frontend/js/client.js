// ========================================
// KONFIGURASI API
// ========================================
const API_URL = 'http://localhost:4000/api';

// ========================================
// CEK LOGIN
// ========================================
const token = localStorage.getItem('token');
const userString = localStorage.getItem('user');

if (!token || !userString) {
    window.location.href = '/';
}

const user = JSON.parse(userString);

if (user.role !== 'client') {
    window.location.href = '/';
}

// ========================================
// TAMPILKAN NAMA USER
// ========================================
document.getElementById('user-name').textContent = `Halo, ${user.name}`;

// ========================================
// TOMBOL LOGOUT
// ========================================
document.getElementById('btn-logout').onclick = function() {
    if (confirm('Yakin ingin logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
};

// ========================================
// NAVIGASI MENU SIDEBAR
// ========================================
const menuLinks = document.querySelectorAll('.sidebar .nav-link');

menuLinks.forEach(function(link) {
    link.onclick = function(e) {
        e.preventDefault();
        
        // Hapus class active dari semua menu
        menuLinks.forEach(function(l) {
            l.classList.remove('active');
        });
        
        // Tambah class active ke menu yang diklik
        link.classList.add('active');
        
        // Sembunyikan semua section
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(function(section) {
            section.style.display = 'none';
        });
        
        // Tampilkan section yang sesuai
        const sectionId = link.getAttribute('data-section');
        document.getElementById(sectionId).style.display = 'block';
        
        // Load data sesuai menu
        if (sectionId === 'my-gigs') {
            loadMyGigs();
        } else if (sectionId === 'transactions') {
            loadTransactions();
        } else if (sectionId === 'profile') {
            loadProfile();
        }
    };
});

// ========================================
// FUNGSI FETCH KE API
// ========================================
function callAPI(endpoint, method, data) {
    console.log('Calling API:', API_URL + '/' + endpoint);
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        }
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    return fetch(API_URL + '/' + endpoint, options)
        .then(function(response) {
            console.log('Response status:', response.status);
            return response.json();
        })
        .then(function(json) {
            console.log('Response data:', json);
            if (!json.success) {
                throw new Error(json.message || 'Terjadi kesalahan');
            }
            return json;
        })
        .catch(function(error) {
            console.error('API Error:', error);
            showMessage('Error: ' + error.message, 'danger');
            throw error;
        });
}

// ========================================
// TAMPILKAN PESAN NOTIFIKASI
// ========================================
function showMessage(message, type) {
    const toast = document.createElement('div');
    toast.className = 'alert alert-' + type + ' alert-dismissible fade show position-fixed top-0 end-0 m-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = message + '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
    document.body.appendChild(toast);
    
    setTimeout(function() {
        toast.remove();
    }, 3000);
}

// ========================================
// FORMAT ANGKA RUPIAH
// ========================================
function formatRupiah(angka) {
    if (!angka && angka !== 0) return '0';
    return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// ========================================
// HELPER: STATUS BADGE
// ========================================
function getStatusBadge(status) {
    const statusMap = {
        'open': '<span class="badge bg-success">Terbuka</span>',
        'in_progress': '<span class="badge bg-warning">Sedang Berjalan</span>',
        'completed': '<span class="badge bg-info">Selesai</span>',
        'cancelled': '<span class="badge bg-danger">Dibatalkan</span>',
        'pending': '<span class="badge bg-warning">Belum Dibayar</span>',
        'paid': '<span class="badge bg-info">Sudah Dibayar</span>'
    };
    return statusMap[status] || '<span class="badge bg-secondary">' + status + '</span>';
}

// ========================================
// BUAT GIG BARU
// ========================================
document.getElementById('form-create-gig').onsubmit = function(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
    
    const title = document.getElementById('gig-title').value;
    const description = document.getElementById('gig-description').value;
    const category = document.getElementById('gig-category').value;
    const budget = document.getElementById('gig-budget').value;
    const deadline = document.getElementById('gig-deadline').value;
    
    const gigData = {
        title: title,
        description: description,
        category: category,
        budget: parseFloat(budget),
        deadline: deadline || null
    };
    
    callAPI('gigs', 'POST', gigData)
        .then(function(result) {
            showMessage('✅ Gig berhasil dibuat!', 'success');
            document.getElementById('form-create-gig').reset();
            
            // Pindah ke menu My Gigs
            document.querySelector('[data-section="my-gigs"]').click();
        })
        .catch(function(error) {
            console.error(error);
        })
        .finally(function() {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Posting Gig';
        });
};

// ========================================
// LOAD GIGS SAYA
// ========================================
function loadMyGigs() {
    console.log('Loading my gigs...');
    
    callAPI('gigs', 'GET')
        .then(function(result) {
            const myGigs = result.data.filter(function(gig) {
                return gig.client_id == user.id;
            });
            
            const container = document.getElementById('gigs-list');
            
            if (myGigs.length === 0) {
                container.innerHTML = `
                    <div class="col-12">
                        <div class="text-center py-5">
                            <i class="bi bi-inbox" style="font-size: 4rem; color: #ccc;"></i>
                            <h4 class="mt-3">Belum ada gig</h4>
                            <p class="text-muted">Mulai posting gig pertama Anda!</p>
                            <button class="btn btn-primary" onclick="document.querySelector('[data-section=create-gig]').click()">
                                <i class="bi bi-plus-circle me-2"></i>Buat Gig Baru
                            </button>
                        </div>
                    </div>
                `;
                return;
            }
            
            let html = '';
            myGigs.forEach(function(gig) {
                const description = gig.description || '';
                const shortDesc = description.substring(0, 100) + (description.length > 100 ? '...' : '');
                
                html += `
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
                    </div>
                `;
            });
            
            container.innerHTML = html;
        })
        .catch(function(error) {
            console.error(error);
        });
}

// ========================================
// LIHAT DETAIL GIG + PROPOSALS
// ========================================
window.viewGigDetail = function(gigId) {
    console.log('View gig detail:', gigId);
    
    callAPI('gigs/' + gigId, 'GET')
        .then(function(result) {
            const gig = result.data;
            
            console.log('Gig data:', gig); // Debug
            
            document.getElementById('modal-gig-title').textContent = gig.title || 'Detail Gig';
            
            const deadlineText = gig.deadline ? new Date(gig.deadline).toLocaleDateString('id-ID') : 'Tidak ada';
            const createdText = gig.created_at ? new Date(gig.created_at).toLocaleDateString('id-ID') : '-';
            const budget = gig.budget || 0;
            
            document.getElementById('modal-gig-details').innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Kategori:</strong> ${gig.category || 'Umum'}</p>
                        <p><strong>Budget:</strong> <span class="text-success fw-bold">Rp ${formatRupiah(budget)}</span></p>
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
            
            // Load proposals untuk gig ini
            return callAPI('proposals?gig_id=' + gigId, 'GET');
        })
        .then(function(result) {
            const proposals = result.data;
            
            console.log('Proposals:', proposals); // Debug
            
            let html = '<h5><i class="bi bi-file-earmark-text me-2"></i>Proposals (' + proposals.length + ')</h5>';
            
            if (proposals.length === 0) {
                html += '<p class="text-muted">Belum ada proposal dari freelancer</p>';
            } else {
                proposals.forEach(function(proposal) {
                    const statusClass = proposal.status === 'accepted' ? 'success' : proposal.status === 'rejected' ? 'danger' : 'warning';
                    const statusText = proposal.status === 'accepted' ? 'Diterima ✅' : proposal.status === 'rejected' ? 'Ditolak ❌' : 'Menunggu ⏳';
                    const bidAmount = proposal.bid_amount || 0;
                    
                    html += `
                        <div class="card mb-3 ${proposal.status === 'accepted' ? 'border-success' : ''}">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-3">
                                    <div>
                                        <h6 class="mb-1">${proposal.freelancer_name || 'Freelancer'}</h6>
                                        <small class="text-muted">${proposal.freelancer_email || '-'}</small>
                                    </div>
                                    <div class="text-end">
                                        <h5 class="text-success mb-0">Rp ${formatRupiah(bidAmount)}</h5>
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
            
            // Tampilkan modal
            const modalEl = document.getElementById('gigModal');
            if (modalEl) {
                const modal = new bootstrap.Modal(modalEl);
                modal.show();
            } else {
                console.error('Modal element #gigModal tidak ditemukan!');
                showMessage('Error: Modal tidak ditemukan. Pastikan HTML modal sudah ada.', 'danger');
            }
        })
        .catch(function(error) {
            console.error('Error viewGigDetail:', error);
            showMessage('Gagal memuat detail gig: ' + error.message, 'danger');
        });
};

// ========================================
// TERIMA PROPOSAL
// ========================================
window.acceptProposal = function(proposalId) {
    if (!confirm('Yakin ingin menerima proposal ini?\n\n✅ Transaction akan otomatis dibuat\n💰 Anda perlu membayar freelancer')) {
        return;
    }
    
    callAPI('proposals/' + proposalId, 'PUT', { status: 'accepted' })
        .then(function(result) {
            showMessage('✅ Proposal berhasil diterima!\n💰 Transaction telah dibuat. Silakan bayar di menu Transaksi.', 'success');
            
            // Tutup modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('gigModal'));
            if (modal) {
                modal.hide();
            }
            
            // Reload gigs
            loadMyGigs();
        })
        .catch(function(error) {
            console.error(error);
        });
};

// ========================================
// TOLAK PROPOSAL
// ========================================
window.rejectProposal = function(proposalId) {
    if (!confirm('Yakin ingin menolak proposal ini?')) {
        return;
    }
    
    callAPI('proposals/' + proposalId, 'PUT', { status: 'rejected' })
        .then(function(result) {
            showMessage('Proposal berhasil ditolak', 'info');
            
            // Tutup modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('gigModal'));
            if (modal) {
                modal.hide();
            }
            
            // Reload gigs
            loadMyGigs();
        })
        .catch(function(error) {
            console.error(error);
        });
};

// ========================================
// HAPUS GIG
// ========================================
window.deleteGig = function(gigId) {
    if (!confirm('Yakin ingin menghapus gig ini?\n\n⚠️ Semua proposal terkait akan ikut terhapus!')) {
        return;
    }
    
    callAPI('gigs/' + gigId, 'DELETE')
        .then(function(result) {
            showMessage('Gig berhasil dihapus!', 'success');
            loadMyGigs();
        })
        .catch(function(error) {
            console.error(error);
        });
};

// ========================================
// LOAD TRANSAKSI
// ========================================
function loadTransactions() {
    console.log('Loading transactions...');
    
    callAPI('transactions', 'GET')
        .then(function(result) {
            const transactions = result.data;
            const container = document.getElementById('transactions-list');
            
            if (transactions.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-5">
                        <i class="bi bi-cash-stack" style="font-size: 4rem; color: #ccc;"></i>
                        <h4 class="mt-3">Belum ada transaksi</h4>
                        <p class="text-muted">Transaksi akan muncul setelah Anda menerima proposal</p>
                    </div>
                `;
                return;
            }
            
            let html = `
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
            `;
            
            transactions.forEach(function(trans) {
                const paymentDate = trans.payment_date ? '<br><small class="text-muted">Dibayar: ' + new Date(trans.payment_date).toLocaleDateString('id-ID') + '</small>' : '';
                const completionDate = trans.completion_date ? '<br><small class="text-success">Selesai: ' + new Date(trans.completion_date).toLocaleDateString('id-ID') + '</small>' : '';
                
                html += `
                    <tr>
                        <td>
                            <strong>${trans.gig_title}</strong>
                        </td>
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
                    </tr>
                `;
            });
            
            html += `
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
                </div>
            `;
            
            container.innerHTML = html;
        })
        .catch(function(error) {
            console.error(error);
        });
}

// ========================================
// TANDAI SUDAH DIBAYAR
// ========================================
window.markAsPaid = function(transactionId) {
    if (!confirm('Konfirmasi bahwa Anda sudah melakukan pembayaran ke freelancer?\n\n💰 Freelancer akan mulai mengerjakan project')) {
        return;
    }
    
    callAPI('transactions/' + transactionId, 'PUT', { status: 'paid' })
        .then(function(result) {
            showMessage('✅ Transaksi berhasil ditandai sebagai dibayar!\n⏳ Tunggu freelancer menyelesaikan project', 'success');
            loadTransactions();
        })
        .catch(function(error) {
            console.error(error);
        });
};

// ========================================
// LOAD PROFILE
// ========================================
function loadProfile() {
    console.log('Loading profile...');
    
    callAPI('auth/profile', 'GET')
        .then(function(result) {
            const profile = result.data;
            
            document.getElementById('profile-name').value = profile.name || '';
            document.getElementById('profile-email').value = profile.email || '';
            document.getElementById('profile-phone').value = profile.phone || '';
            document.getElementById('profile-bio').value = profile.bio || '';
        })
        .catch(function(error) {
            console.error(error);
        });
}

// ========================================
// UPDATE PROFILE
// ========================================
document.getElementById('form-profile').onsubmit = function(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    
    const name = document.getElementById('profile-name').value;
    const phone = document.getElementById('profile-phone').value;
    const bio = document.getElementById('profile-bio').value;
    
    const profileData = {
        name: name,
        phone: phone,
        bio: bio
    };
    
    callAPI('auth/profile', 'PUT', profileData)
        .then(function(result) {
            showMessage('✅ Profil berhasil diupdate!', 'success');
            
            // Update nama di navbar
            user.name = name;
            localStorage.setItem('user', JSON.stringify(user));
            document.getElementById('user-name').textContent = 'Halo, ' + name;
        })
        .catch(function(error) {
            console.error(error);
        })
        .finally(function() {
            submitBtn.disabled = false;
        });
};

// ========================================
// LOAD DATA PERTAMA KALI
// ========================================
console.log('Client.js loaded! User:', user.name);
loadMyGigs();