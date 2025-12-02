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
// ESCAPE HTML (Cegah XSS)
// ========================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


// ========================================
// VALIDASI FORM CREATE GIG
// ========================================
function validateGigForm() {
    const title = document.getElementById('gig-title').value.trim();
    const description = document.getElementById('gig-description').value.trim();
    const category = document.getElementById('gig-category').value;
    const budget = document.getElementById('gig-budget').value;
    const deadline = document.getElementById('gig-deadline').value;
    
    if (!title) {
        showMessage('Title tidak boleh kosong!', 'danger');
        return false;
    }
    
    if (title.length < 5) {
        showMessage('Title minimal 5 karakter!', 'danger');
        return false;
    }
    
    if (!description) {
        showMessage('Deskripsi tidak boleh kosong!', 'danger');
        return false;
    }
    
    if (description.length < 10) {
        showMessage('Deskripsi minimal 10 karakter!', 'danger');
        return false;
    }
    
    if (!category) {
        showMessage('Silahkan pilih kategori!', 'danger');
        return false;
    }
    
    if (!budget || budget <= 0) {
        showMessage('Budget harus lebih dari 0!', 'danger');
        return false;
    }
    
    if (deadline) {
        const today = new Date();
        const deadlineDate = new Date(deadline);
        if (deadlineDate < today) {
            showMessage('Deadline tidak boleh di masa lalu!', 'danger');
            return false;
        }
    }
    
    return true;
}


// ========================================
// BUAT GIG BARU
// ========================================
document.getElementById('form-create-gig').onsubmit = function(e) {
    e.preventDefault();
    
    // Validasi form
    if (!validateGigForm()) {
        return;
    }
    
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
    
    // Disable button saat loading
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
    
    callAPI('gigs', 'POST', gigData)
        .then(function(result) {
            showMessage('Gig berhasil dibuat!', 'success');
            document.getElementById('form-create-gig').reset();
            
            // Pindah ke menu My Gigs
            setTimeout(function() {
                document.querySelector('[data-section="my-gigs"]').click();
            }, 1000);
        })
        .catch(function(error) {
            console.error(error);
        })
        .finally(function() {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Buat Gig';
        });
};


// ========================================
// LOAD GIGS SAYA
// ========================================
function loadMyGigs() {
    const container = document.getElementById('gigs-list');
    
    // Tampilkan loading indicator
    container.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    
    callAPI('gigs', 'GET')
        .then(function(result) {
            // Filter gigs hanya milik current user
            const myGigs = result.data.filter(function(gig) {
                return gig.client_id == user.id;
            });
            
            // Jika belum ada gig
            if (myGigs.length === 0) {
                container.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-info text-center py-5">
                            <h4>Belum Ada Gig</h4>
                            <p>Mulai posting gig pertama Anda!</p>
                            <button class="btn btn-primary" onclick="document.querySelector('[data-section=\"create-gig\"]').click()">
                                <i class="bi bi-plus-circle me-2"></i>Buat Gig
                            </button>
                        </div>
                    </div>
                `;
                return;
            }
            
            // Render semua gigs
            container.innerHTML = myGigs.map(function(gig) {
                return `
                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100 shadow-sm">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h5 class="card-title" style="flex: 1; margin-right: 10px;">${escapeHtml(gig.title)}</h5>
                                    <span class="badge bg-${gig.status === 'open' ? 'success' : gig.status === 'in_progress' ? 'warning' : 'secondary'}" style="white-space: nowrap;">
                                        ${escapeHtml(gig.status)}
                                    </span>
                                </div>
                                
                                <p class="card-text text-muted">${escapeHtml(gig.description.substring(0, 100))}...</p>
                                
                                <p class="mb-1"><strong>Kategori:</strong> ${escapeHtml(gig.category || 'Umum')}</p>
                                <p class="mb-1"><strong>Budget:</strong> <span class="text-success">Rp ${formatRupiah(gig.budget)}</span></p>
                                <p class="mb-2"><strong>Deadline:</strong> ${gig.deadline ? new Date(gig.deadline).toLocaleDateString('id-ID') : 'Tidak ada'}</p>
                                
                                <div class="d-grid gap-2">
                                    <button class="btn btn-sm btn-primary" onclick="viewGigDetail(${gig.id})">
                                        <i class="bi bi-eye me-1"></i>Lihat Detail
                                    </button>
                                    <button class="btn btn-sm btn-warning" onclick="editGig(${gig.id})">
                                        <i class="bi bi-pencil me-1"></i>Edit
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteGig(${gig.id})">
                                        <i class="bi bi-trash me-1"></i>Hapus
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        })
        .catch(function(error) {
            console.error('Error loading gigs:', error);
            container.innerHTML = '<div class="col-12"><div class="alert alert-danger">Gagal memuat gigs: ' + error.message + '</div></div>';
        });
}


// ========================================
// VIEW GIG DETAIL (FIXED - BARU!)
// ========================================

function viewGigDetail(gigId) {
    console.log('Loading detail for gig:', gigId);
    
    // Ambil detail gig
    callAPI('gigs/' + gigId, 'GET')
        .then(function(result) {
            const gig = result.data;
            
            console.log('Gig detail:', gig);
            
            // Update gig details di modal
            document.getElementById('modal-gig-id').value = gig.id;
            document.getElementById('modal-gig-title').textContent = escapeHtml(gig.title);
            document.getElementById('modal-gig-description').textContent = escapeHtml(gig.description);
            document.getElementById('modal-gig-category').textContent = escapeHtml(gig.category || 'Umum');
            document.getElementById('modal-gig-budget').textContent = 'Rp ' + formatRupiah(gig.budget);
            document.getElementById('modal-gig-status').textContent = escapeHtml(gig.status);
            
            if (gig.deadline) {
                document.getElementById('modal-gig-deadline').textContent = new Date(gig.deadline).toLocaleDateString('id-ID');
            } else {
                document.getElementById('modal-gig-deadline').textContent = 'Tidak ada';
            }
            
            // ✅ AMBIL PROPOSALS (PENTING!)
            return callAPI('proposals?gig_id=' + gigId, 'GET');
        })
        .then(function(result) {
            const proposals = result.data;
            
            console.log('Proposals received:', proposals);
            
            let html = '';
            
            if (proposals.length === 0) {
                html = '<p class="text-muted">Belum ada proposal untuk gig ini</p>';
            } else {
                proposals.forEach(function(proposal) {
                    const statusBadge = proposal.status === 'pending' 
                        ? 'bg-warning' 
                        : proposal.status === 'accepted' 
                        ? 'bg-success' 
                        : 'bg-danger';
                    
                    html += `
                        <div class="card mb-3">
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-8">
                                        <h6 class="card-title">${escapeHtml(proposal.freelancer_name)}</h6>
                                        <p class="mb-1">
                                            <small class="text-muted">
                                                <i class="bi bi-envelope"></i> ${escapeHtml(proposal.freelancer_email)}
                                            </small>
                                        </p>
                                        
                                        <div class="mt-2">
                                            <p class="mb-1"><strong>Tawaran:</strong> Rp ${formatRupiah(proposal.bid_amount)}</p>
                                            <p class="mb-1"><strong>Estimasi:</strong> ${proposal.delivery_days} hari</p>
                                            <p class="mb-1">
                                                <strong>Status:</strong> 
                                                <span class="badge ${statusBadge}">${escapeHtml(proposal.status)}</span>
                                            </p>
                                        </div>
                                        
                                        <details class="mt-2">
                                            <summary style="cursor: pointer;">Lihat Cover Letter</summary>
                                            <div class="mt-2 p-2 bg-light rounded">
                                                <p>${escapeHtml(proposal.cover_letter)}</p>
                                            </div>
                                        </details>
                                    </div>
                                    
                                    <div class="col-md-4 d-flex flex-column justify-content-center">
                                        ${proposal.status === 'pending' ? `
                                            <button class="btn btn-success btn-sm mb-2" onclick="acceptProposal(${proposal.id})">
                                                <i class="bi bi-check"></i> Terima
                                            </button>
                                            <button class="btn btn-danger btn-sm" onclick="rejectProposal(${proposal.id})">
                                                <i class="bi bi-x"></i> Tolak
                                            </button>
                                        ` : proposal.status === 'accepted' ? `
                                            <span class="badge bg-success">Sudah Diterima</span>
                                        ` : `
                                            <span class="badge bg-danger">Ditolak</span>
                                        `}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
            
            document.getElementById('modal-proposals').innerHTML = html;
            
            // Tampilkan modal
            const modal = new bootstrap.Modal(document.getElementById('gigModal'));
            // Store gig ID di modal untuk digunakan saat accept/reject
            document.getElementById('gigModal').dataset.gigId = gigId;
            modal.show();
        })
        .catch(function(error) {
            console.error('Error loading gig detail:', error);
        });
}



// ========================================
// EDIT GIG (NEW FUNCTION)
// ========================================
function editGig(gigId) {
    callAPI('gigs/' + gigId, 'GET')
        .then(function(result) {
            const gig = result.data;
            
            // Populate form dengan data gig
            document.getElementById('edit-gig-id').value = gig.id;
            document.getElementById('edit-gig-title').value = gig.title;
            document.getElementById('edit-gig-description').value = gig.description;
            document.getElementById('edit-gig-category').value = gig.category;
            document.getElementById('edit-gig-budget').value = gig.budget;
            document.getElementById('edit-gig-deadline').value = gig.deadline ? gig.deadline.split('T') : '';
            
            // Tampilkan modal edit
            const modal = new bootstrap.Modal(document.getElementById('editGigModal'));
            modal.show();
        })
        .catch(function(error) {
            console.error(error);
            showMessage('Gagal memuat gig untuk diedit: ' + error.message, 'danger');
        });
}


// ========================================
// SUBMIT EDIT GIG
// ========================================
if (document.getElementById('form-edit-gig')) {
    document.getElementById('form-edit-gig').onsubmit = function(e) {
        e.preventDefault();
        
        const gigId = document.getElementById('edit-gig-id').value;
        const title = document.getElementById('edit-gig-title').value;
        const description = document.getElementById('edit-gig-description').value;
        const category = document.getElementById('edit-gig-category').value;
        const budget = document.getElementById('edit-gig-budget').value;
        const deadline = document.getElementById('edit-gig-deadline').value;
        
        const gigData = {
            title: title,
            description: description,
            category: category,
            budget: parseFloat(budget),
            deadline: deadline || null
        };
        
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
        
        callAPI('gigs/' + gigId, 'PUT', gigData)
            .then(function(result) {
                showMessage('Gig berhasil diupdate!', 'success');
                
                // Tutup modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editGigModal'));
                modal.hide();
                
                // Reload data
                loadMyGigs();
            })
            .catch(function(error) {
                console.error(error);
            })
            .finally(function() {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-save me-2"></i>Simpan Perubahan';
            });
    };
}


// ========================================
// DELETE GIG (NEW FUNCTION)
// ========================================
function deleteGig(gigId) {
    if (!confirm('Yakin ingin menghapus gig ini? Tindakan ini tidak bisa dibatalkan!')) {
        return;
    }
    
    callAPI('gigs/' + gigId, 'DELETE')
        .then(function(result) {
            showMessage('Gig berhasil dihapus!', 'success');
            loadMyGigs(); // Reload data
        })
        .catch(function(error) {
            console.error(error);
            showMessage('Gagal menghapus gig: ' + error.message, 'danger');
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
            
            /// Reload detail gig dengan correct gig ID
            setTimeout(function() {
                const gigId = document.getElementById('gigModal').dataset.gigId;
                if (gigId) {
                    viewGigDetail(gigId);
                }
            }, 500);
        })
        .catch(function(error) {
            console.error(error);
            showMessage('Gagal menerima proposal: ' + error.message, 'danger');
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
            
            /// Reload detail gig dengan correct gig ID
            setTimeout(function() {
                const gigId = document.getElementById('gigModal').dataset.gigId;
                if (gigId) {
                    viewGigDetail(gigId);
                }
            }, 500);
        })
        .catch(function(error) {
            console.error(error);
            showMessage('Gagal menolak proposal: ' + error.message, 'danger');
        });
}


// ========================================
// LOAD TRANSAKSI
// ========================================
function loadTransactions() {
    const container = document.getElementById('transactions-list');
    
    // Tampilkan loading indicator
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    
    callAPI('transactions', 'GET')
        .then(function(result) {
            const transactions = result.data;
            
            if (transactions.length === 0) {
                container.innerHTML = '<p class="text-center py-5">Belum ada transaksi</p>';
                return;
            }
            
            let html = '<div class="table-responsive"><table class="table table-hover"><thead class="table-light"><tr><th>Gig</th><th>Freelancer</th><th>Amount</th><th>Status</th><th>Tanggal</th></tr></thead><tbody>';
            
            transactions.forEach(function(trans) {
                html += `
                    <tr>
                        <td>${escapeHtml(trans.gig_title)}</td>
                        <td>${escapeHtml(trans.freelancer_name)}</td>
                        <td class="text-success fw-bold">Rp ${formatRupiah(trans.amount)}</td>
                        <td><span class="badge bg-${trans.status === 'pending' ? 'warning' : trans.status === 'paid' ? 'success' : 'info'}">${escapeHtml(trans.status)}</span></td>
                        <td>${new Date(trans.created_at).toLocaleDateString('id-ID')}</td>
                    </tr>
                `;
            });
            
            html += '</tbody></table></div>';
            container.innerHTML = html;
        })
        .catch(function(error) {
            console.error(error);
            container.innerHTML = '<div class="alert alert-danger">Gagal memuat transaksi: ' + error.message + '</div>';
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
            showMessage('Gagal memuat profil: ' + error.message, 'danger');
        });
}


// ========================================
// UPDATE PROFILE
// ========================================
document.getElementById('form-profile').onsubmit = function(e) {
    e.preventDefault();
    
    const name = document.getElementById('profile-name').value.trim();
    const phone = document.getElementById('profile-phone').value.trim();
    const bio = document.getElementById('profile-bio').value.trim();
    
    // Validasi
    if (!name) {
        showMessage('Nama tidak boleh kosong!', 'danger');
        return;
    }
    
    const profileData = {
        name: name,
        phone: phone,
        bio: bio
    };
    
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
    
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
        })
        .finally(function() {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-save me-2"></i>Simpan Profil';
        });
};


// ========================================
// LOAD DATA PERTAMA KALI
// ========================================
loadMyGigs();
