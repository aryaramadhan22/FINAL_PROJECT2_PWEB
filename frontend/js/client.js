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
  return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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
  submitBtn.innerHTML = 'Loading...';

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
      submitBtn.innerHTML = 'Buat Gig';
    });
};

// ========================================
// LOAD GIGS SAYA + PROPOSALS
// ========================================
function loadMyGigs() {
  const container = document.getElementById('gigs-list');
  container.innerHTML = '<p class="text-center">Loading...</p>';

  callAPI('gigs?status=open', 'GET')
    .then(function(result) {
      const gigs = result.data;

      if (gigs.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Mulai posting gig pertama Anda!</p>';
        return;
      }

      let html = '';

      // ✅ PERBAIKAN: Fetch proposals untuk SETIAP gig (PARALLEL)
      const gigPromises = gigs.map(function(gig) {
        return callAPI(`proposals?gig_id=${gig.id}`, 'GET')
          .then(function(proposalResult) {
            const proposals = proposalResult.data || [];

            const statusBadge = gig.status === 'open' ? 'bg-success' : 'bg-secondary';

            let gigHtml = `
              <div class="card mb-3">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 class="card-title mb-1">${escapeHtml(gig.title)}</h5>
                      <p class="card-text text-muted">${escapeHtml(gig.description.substring(0, 100))}...</p>
                    </div>
                    <span class="badge ${statusBadge}">${gig.status}</span>
                  </div>

                  <div class="row mb-3">
                    <div class="col-md-6">
                      <small><strong>Kategori:</strong> ${escapeHtml(gig.category || 'Umum')}</small>
                    </div>
                    <div class="col-md-6">
                      <small><strong>Budget:</strong> Rp ${formatRupiah(gig.budget)}</small>
                    </div>
                  </div>

                  <div class="row mb-3">
                    <div class="col-md-6">
                      <small><strong>Deadline:</strong> ${gig.deadline ? new Date(gig.deadline).toLocaleDateString('id-ID') : 'Tidak ada'}</small>
                    </div>
                  </div>

                  <!-- ✅ PROPOSALS SECTION -->
                  <div class="mt-3 border-top pt-3">
                    ${proposals.length === 0 ? `
                      <p class="text-muted mb-0"><small>Belum ada proposal untuk gig ini</small></p>
                    ` : `
                      <button class="btn btn-sm btn-info mb-2" onclick="toggleProposals(${gig.id})">
                        <i class="bi bi-eye me-1"></i>Lihat Detail (${proposals.length} proposal)
                      </button>
                      <div id="proposals-${gig.id}" class="mt-2" style="display: none;">
                        ${renderProposals(proposals)}
                      </div>
                    `}
                  </div>

                  <!-- ✅ EDIT/DELETE BUTTONS -->
                  <div class="mt-3 d-flex gap-2">
                    <button class="btn btn-sm btn-warning" onclick="editGig(${gig.id}, '${escapeHtml(gig.title)}', '${escapeHtml(gig.description)}', '${gig.category}', ${gig.budget}, '${gig.deadline || ''}')">
                      <i class="bi bi-pencil me-1"></i>Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteGig(${gig.id})">
                      <i class="bi bi-trash me-1"></i>Delete
                    </button>
                  </div>
                </div>
              </div>
            `;

            return gigHtml;
          })
          .catch(function(error) {
            console.error('Error loading proposals for gig ' + gig.id, error);
            // ✅ Graceful fallback
            const statusBadge = gig.status === 'open' ? 'bg-success' : 'bg-secondary';
            return `
              <div class="card mb-3">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 class="card-title mb-1">${escapeHtml(gig.title)}</h5>
                      <p class="card-text text-muted">${escapeHtml(gig.description.substring(0, 100))}...</p>
                    </div>
                    <span class="badge ${statusBadge}">${gig.status}</span>
                  </div>

                  <div class="row mb-3">
                    <div class="col-md-6">
                      <small><strong>Kategori:</strong> ${escapeHtml(gig.category || 'Umum')}</small>
                    </div>
                    <div class="col-md-6">
                      <small><strong>Budget:</strong> Rp ${formatRupiah(gig.budget)}</small>
                    </div>
                  </div>

                  <div class="row mb-3">
                    <div class="col-md-6">
                      <small><strong>Deadline:</strong> ${gig.deadline ? new Date(gig.deadline).toLocaleDateString('id-ID') : 'Tidak ada'}</small>
                    </div>
                  </div>

                  <div class="mt-3 border-top pt-3">
                    <p class="text-muted mb-0"><small>Belum ada proposal untuk gig ini</small></p>
                  </div>

                  <div class="mt-3 d-flex gap-2">
                    <button class="btn btn-sm btn-warning" onclick="editGig(${gig.id}, '${escapeHtml(gig.title)}', '${escapeHtml(gig.description)}', '${gig.category}', ${gig.budget}, '${gig.deadline || ''}')">
                      <i class="bi bi-pencil me-1"></i>Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteGig(${gig.id})">
                      <i class="bi bi-trash me-1"></i>Delete
                    </button>
                  </div>
                </div>
              </div>
            `;
          });
      });

      // ✅ Wait for all proposals to be fetched
      Promise.all(gigPromises)
        .then(function(htmlArray) {
          container.innerHTML = htmlArray.join('');
        })
        .catch(function(error) {
          console.error('Error rendering gigs:', error);
          showMessage('Gagal memuat gigs', 'danger');
        });
    })
    .catch(function(error) {
      console.error(error);
    });
}

// ========================================
// RENDER PROPOSALS HELPER
// ========================================
function renderProposals(proposals) {
  let html = '<div class="border-top pt-2">';

  proposals.forEach(function(proposal) {
    const statusBadge = proposal.status === 'pending' ? 'bg-warning' : 
                       proposal.status === 'accepted' ? 'bg-success' : 'bg-danger';

    html += `
      <div class="mb-3 pb-2 border-bottom">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div>
            <h6 class="mb-1">${escapeHtml(proposal.freelancer_email)}</h6>
            <span class="badge ${statusBadge}">${proposal.status}</span>
          </div>
        </div>

        <div class="row mb-2">
          <div class="col-md-4">
            <small><strong>Tawaran:</strong> Rp ${formatRupiah(proposal.bid_amount)}</small>
          </div>
          <div class="col-md-4">
            <small><strong>Estimasi:</strong> ${proposal.delivery_days} hari</small>
          </div>
          <div class="col-md-4">
            <small><strong>Tanggal:</strong> ${new Date(proposal.created_at).toLocaleDateString('id-ID')}</small>
          </div>
        </div>

        <div class="mb-2">
          <p class="mb-1"><small><strong>Surat Lamaran:</strong></small></p>
          <p class="text-muted mb-0"><small>${escapeHtml(proposal.cover_letter)}</small></p>
        </div>

        <!-- ✅ ACCEPT/REJECT BUTTONS -->
        ${proposal.status === 'pending' ? `
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-success" onclick="acceptProposal(${proposal.id})">
              <i class="bi bi-check-circle me-1"></i>Terima
            </button>
            <button class="btn btn-sm btn-danger" onclick="rejectProposal(${proposal.id})">
              <i class="bi bi-x-circle me-1"></i>Tolak
            </button>
          </div>
        ` : ''}
      </div>
    `;
  });

  html += '</div>';
  return html;
}

// ========================================
// TOGGLE PROPOSALS VISIBILITY
// ========================================
function toggleProposals(gigId) {
  const element = document.getElementById('proposals-' + gigId);
  if (element.style.display === 'none') {
    element.style.display = 'block';
  } else {
    element.style.display = 'none';
  }
}

// ========================================
// ACCEPT PROPOSAL
// ========================================
function acceptProposal(proposalId) {
  if (!confirm('Yakin ingin menerima proposal ini?')) {
    return;
  }

  callAPI(`proposals/${proposalId}`, 'PUT', { status: 'accepted' })
    .then(function(result) {
      showMessage('Proposal diterima!', 'success');
      loadMyGigs();
    })
    .catch(function(error) {
      console.error(error);
    });
}

// ========================================
// REJECT PROPOSAL
// ========================================
function rejectProposal(proposalId) {
  if (!confirm('Yakin ingin menolak proposal ini?')) {
    return;
  }

  callAPI(`proposals/${proposalId}`, 'PUT', { status: 'rejected' })
    .then(function(result) {
      showMessage('Proposal ditolak!', 'success');
      loadMyGigs();
    })
    .catch(function(error) {
      console.error(error);
    });
}

// ========================================
// EDIT GIG
// ========================================
function editGig(gigId, title, description, category, budget, deadline) {
  document.getElementById('edit-gig-id').value = gigId;
  document.getElementById('edit-gig-title').value = title;
  document.getElementById('edit-gig-description').value = description;
  document.getElementById('edit-gig-category').value = category;
  document.getElementById('edit-gig-budget').value = budget;
  document.getElementById('edit-gig-deadline').value = deadline;

  const modal = new bootstrap.Modal(document.getElementById('editGigModal'));
  modal.show();
}

// ========================================
// UPDATE GIG
// ========================================
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
  submitBtn.innerHTML = 'Loading...';

  callAPI(`gigs/${gigId}`, 'PUT', gigData)
    .then(function(result) {
      showMessage('Gig berhasil diupdate!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('editGigModal')).hide();
      loadMyGigs();
    })
    .catch(function(error) {
      console.error(error);
    })
    .finally(function() {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Update Gig';
    });
};

// ========================================
// DELETE GIG (FIXED - Tidak perlu status check)
// ========================================
function deleteGig(gigId) {
  if (!confirm('Yakin ingin menghapus gig ini?')) {
    return;
  }

  callAPI(`gigs/${gigId}`, 'DELETE')
    .then(function(result) {
      showMessage('Gig berhasil dihapus!', 'success');
      loadMyGigs();
    })
    .catch(function(error) {
      console.error(error);
    });
}

// ========================================
// LOAD TRANSACTIONS
// ========================================
function loadTransactions() {
  const container = document.getElementById('transactions-list');
  container.innerHTML = '<p class="text-center">Loading...</p>';

  callAPI('transactions', 'GET')
    .then(function(result) {
      const transactions = result.data;

      if (transactions.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Belum ada transaksi</p>';
        return;
      }

      let html = `
        <div class="table-responsive">
          <table class="table table-striped table-hover">
            <thead>
              <tr>
                <th>Gig</th>
                <th>Freelancer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
      `;

      transactions.forEach(function(trans) {
        html += `
          <tr>
            <td>${escapeHtml(trans.gig_title)}</td>
            <td>${escapeHtml(trans.freelancer_name)}</td>
            <td class="text-success fw-bold">Rp ${formatRupiah(trans.amount)}</td>
            <td><span class="badge bg-info">${escapeHtml(trans.status)}</span></td>
            <td>${new Date(trans.created_at).toLocaleDateString('id-ID')}</td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;

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
  const container = document.getElementById('profile-content');

  container.innerHTML = `
    <div class="card">
      <div class="card-body">
        <h5 class="card-title">Profil Client</h5>
        <p><strong>Nama:</strong> ${escapeHtml(user.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
        <p><strong>Role:</strong> ${user.role}</p>
      </div>
    </div>
  `;
}

// ========================================
// LOAD DATA PERTAMA KALI
// ========================================
console.log('Client.js loaded! User:', user.name);
loadMyGigs();