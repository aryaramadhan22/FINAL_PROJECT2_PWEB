// ========================================
// KONFIGURASI
// ========================================
const API_URL = 'http://localhost:3000/api';

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
            return response.json();
        })
        .then(function(json) {
            if (!json.success) {
                throw new Error(json.message || 'Terjadi kesalahan');
            }
            return json;
        })
        .catch(function(error) {
            console.error('Error:', error);
            showMessage(error.message, 'danger');
            throw error;
        });
}

// ========================================
// TAMPILKAN PESAN
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
// FORMAT ANGKA (Rp 1.000.000)
// ========================================
function formatRupiah(angka) {
    return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// ========================================
// BUAT GIG BARU
// ========================================
document.getElementById('form-create-gig').onsubmit = function(e) {
    e.preventDefault();
    
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
            showMessage('Gig berhasil dibuat!', 'success');
            document.getElementById('form-create-gig').reset();
            
            // Pindah ke menu My Gigs
            document.querySelector('[data-section="my-gigs"]').click();
        })
        .catch(function(error) {
            console.error(error);
        });
};

// ========================================
// LOAD GIGS SAYA
// ========================================
function loadMyGigs() {
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
                        </div>
                    </div>
                `;
                return;
            }
            
            let html = '';
            myGigs.forEach(function(gig) {
                html += `
                    <div class="col-md-6 col-lg-4">
                        <div class="card gig-card h-100">
                            <div class="card-body">
                                <span class="badge badge-category mb-2">${gig.category || 'Umum'}</span>
                                <h5 class="card-title">${gig.title}</h5>
                                <p class="card-text">${gig.description.substring(0, 100)}...</p>
                                <h4 class="text-success">Rp ${formatRupiah(gig.budget)}</h4>
                                <span class="badge bg-success">${gig.status}</span>
                            </div>
                            <div class="card-footer bg-transparent">
                                <button class="btn btn-sm btn-primary w-100" onclick="viewGig(${gig.id})">
                                    <i class="bi bi-eye"></i> Lihat Detail
                                </button>
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
// LIHAT DETAIL GIG
// ========================================
function viewGig(gigId) {
    callAPI('gigs/' + gigId, 'GET')
        .then(function(result) {
            const gig = result.data;
            
            document.getElementById('modal-gig-title').textContent = gig.title;
            
            document.getElementById('modal-gig-details').innerHTML = `
                <p><strong>Kategori:</strong> ${gig.category}</p>
                <p><strong>Budget:</strong> Rp ${formatRupiah(gig.budget)}</p>
                <p><strong>Status:</strong> ${gig.status}</p>
                <p><strong>Deskripsi:</strong></p>
                <p>${gig.description}</p>
            `;
            
            // Load proposals untuk gig ini
            return callAPI('proposals?gig_id=' + gigId, 'GET');
        })
        .then(function(result) {
            const proposals = result.data;
            
            let html = '<h5>Proposals (' + proposals.length + ')</h5>';
            
            if (proposals.length === 0) {
                html += '<p class="text-muted">Belum ada proposal</p>';
            } else {
                proposals.forEach(function(proposal) {
                    html += `
                        <div class="card mb-3">
                            <div class="card-body">
                                <h6>${proposal.freelancer_name}</h6>
                                <p>Tawaran: Rp ${formatRupiah(proposal.bid_amount)}</p>
                                <p>Estimasi: ${proposal.delivery_days} hari</p>
                                <p>Status: ${proposal.status}</p>
                                <details>
                                    <summary>Lihat Cover Letter</summary>
                                    <p class="mt-2">${proposal.cover_letter}</p>
                                </details>
                                ${proposal.status === 'pending' ? `
                                    <button class="btn btn-success btn-sm mt-2" onclick="acceptProposal(${proposal.id})">Terima</button>
                                    <button class="btn btn-danger btn-sm mt-2" onclick="rejectProposal(${proposal.id})">Tolak</button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });
            }
            
            document.getElementById('modal-proposals').innerHTML = html;
            
            // Tampilkan modal
            const modal = new bootstrap.Modal(document.getElementById('gigModal'));
            modal.show();
        })
        .catch(function(error) {
            console.error(error);
        });
}

// ========================================
// TERIMA PROPOSAL
// ========================================
function acceptProposal(proposalId) {
    if (!confirm('Yakin ingin menerima proposal ini?')) {
        return;
    }
    
    callAPI('proposals/' + proposalId, 'PUT', { status: 'accepted' })
        .then(function(result) {
            showMessage('Proposal berhasil diterima!', 'success');
            
            // Tutup modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('gigModal'));
            modal.hide();
            
            // Reload gigs
            loadMyGigs();
        })
        .catch(function(error) {
            console.error(error);
        });
}

// ========================================
// TOLAK PROPOSAL
// ========================================
function rejectProposal(proposalId) {
    if (!confirm('Yakin ingin menolak proposal ini?')) {
        return;
    }
    
    callAPI('proposals/' + proposalId, 'PUT', { status: 'rejected' })
        .then(function(result) {
            showMessage('Proposal berhasil ditolak!', 'success');
            
            // Tutup modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('gigModal'));
            modal.hide();
            
            // Reload gigs
            loadMyGigs();
        })
        .catch(function(error) {
            console.error(error);
        });
}

// ========================================
// LOAD TRANSAKSI
// ========================================
function loadTransactions() {
    callAPI('transactions', 'GET')
        .then(function(result) {
            const transactions = result.data;
            const container = document.getElementById('transactions-list');
            
            if (transactions.length === 0) {
                container.innerHTML = '<p class="text-center py-5">Belum ada transaksi</p>';
                return;
            }
            
            let html = '<table class="table"><thead><tr><th>Gig</th><th>Freelancer</th><th>Amount</th><th>Status</th></tr></thead><tbody>';
            
            transactions.forEach(function(trans) {
                html += `
                    <tr>
                        <td>${trans.gig_title}</td>
                        <td>${trans.freelancer_name}</td>
                        <td>Rp ${formatRupiah(trans.amount)}</td>
                        <td>${trans.status}</td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            container.innerHTML = html;
        })
        .catch(function(error) {
            console.error(error);
        });
}

// ========================================
// LOAD PROFILE
// ========================================
function loadProfile() {
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
            showMessage('Profil berhasil diupdate!', 'success');
            
            // Update nama di navbar
            user.name = name;
            localStorage.setItem('user', JSON.stringify(user));
            document.getElementById('user-name').textContent = 'Halo, ' + name;
        })
        .catch(function(error) {
            console.error(error);
        });
};

// ========================================
// LOAD DATA PERTAMA KALI
// ========================================
loadMyGigs();