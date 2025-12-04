# FreelanceHub

Platform web marketplace freelance yang menghubungkan **Client** dengan **Freelancer**. Client dapat memposting pekerjaan (gigs) dan freelancer dapat mengirim proposal untuk mengerjakan pekerjaan tersebut.

## 📋 Fitur Utama

### Autentikasi
- **Register** - Daftar akun sebagai Client atau Freelancer
- **Login** - Masuk dengan email dan password (JWT Authentication) 
- **Profil** - Lihat dan update profil pengguna

### Fitur Client
- **Buat Gig** - Posting pekerjaan dengan judul, deskripsi, kategori, budget, dan deadline 
- **Kelola Gig** - Update dan hapus gig yang sudah dibuat 
- **Lihat Proposal** - Review proposal dari freelancer 
- **Terima/Tolak Proposal** - Pilih freelancer yang sesuai 
- **Kelola Transaksi** - Bayar freelancer setelah menerima proposal 

### Fitur Freelancer
- **Browse Gigs** - Jelajahi gig yang tersedia dengan filter kategori
- **Kirim Proposal** - Ajukan tawaran harga dan estimasi pengerjaan 
- **Kelola Proposal** - Lihat status dan batalkan proposal 
- **Project Saya** - Kelola project yang sedang dikerjakan 
- **Tandai Selesai** - Update status project menjadi completed 

### Transaksi
- Status transaksi: `pending` → `paid` → `completed` 
- Tracking tanggal pembayaran dan penyelesaian 

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Backend | Node.js, Express.js |
| Database | MySQL |
| Authentication | JWT (jsonwebtoken), bcryptjs |
| Frontend | HTML, CSS, JavaScript, Bootstrap |

## 📁 Struktur Project

FreelanceHub/
├── backend/
│ ├── config/
│ │ └── database.js # Konfigurasi koneksi MySQL
│ ├── middleware/
│ │ └── auth.js # JWT verification middleware
│ ├── routes/
│ │ ├── auth.js # Endpoint register, login, profile
│ │ ├── gigs.js # CRUD gigs
│ │ ├── proposals.js # CRUD proposals
│ │ └── transactions.js # Kelola transaksi
│ ├── .env # Environment variables
│ ├── package.json
│ └── server.js # Entry point
├── frontend/
│ ├── js/
│ │ ├── auth.js # Login/register logic
│ │ ├── client.js # Client dashboard logic
│ │ └── freelancer.js # Freelancer dashboard logic
│ ├── index.html # Homepage & auth
│ ├── client-dashboard.html
│ └── freelancer-dashboard.html
└── README.md


## ⚙️ Instalasi & Menjalankan Project

### 1. Clone Repository
git clone <repository-url>
cd FreelanceHub


### 2. Setup Database
Buat database MySQL dengan nama `freelancer_db` dan jalankan SQL berikut:

CREATE DATABASE freelancer_db;
USE freelancer_db;

CREATE TABLE users (
id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(100) NOT NULL,
email VARCHAR(100) UNIQUE NOT NULL,
password VARCHAR(255) NOT NULL,
role ENUM('client', 'freelancer') NOT NULL,
phone VARCHAR(20),
bio TEXT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gigs (
id INT AUTO_INCREMENT PRIMARY KEY,
client_id INT NOT NULL,
title VARCHAR(200) NOT NULL,
description TEXT,
category VARCHAR(50),
budget DECIMAL(12,2),
deadline DATE,
status ENUM('open', 'in_progress', 'completed', 'cancelled') DEFAULT 'open',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (client_id) REFERENCES users(id)
);

CREATE TABLE proposals (
id INT AUTO_INCREMENT PRIMARY KEY,
gig_id INT NOT NULL,
freelancer_id INT NOT NULL,
bid_amount DECIMAL(12,2),
delivery_days INT,
cover_letter TEXT,
status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (gig_id) REFERENCES gigs(id),
FOREIGN KEY (freelancer_id) REFERENCES users(id)
);

CREATE TABLE transactions (
id INT AUTO_INCREMENT PRIMARY KEY,
gig_id INT NOT NULL,
proposal_id INT NOT NULL,
client_id INT NOT NULL,
freelancer_id INT NOT NULL,
amount DECIMAL(12,2),
status ENUM('pending', 'paid', 'completed', 'cancelled') DEFAULT 'pending',
payment_date DATETIME,
completion_date DATETIME,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (gig_id) REFERENCES gigs(id),
FOREIGN KEY (proposal_id) REFERENCES proposals(id),
FOREIGN KEY (client_id) REFERENCES users(id),
FOREIGN KEY (freelancer_id) REFERENCES users(id)
);


### 3. Konfigurasi Environment
Buat file `.env` di folder `backend/`: 

PORT=4000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=freelancer_db
JWT_SECRET=your-secret-key-change-this-in-production-12345
NODE_ENV=development


### 4. Install Dependencies
cd backend
npm install

### 5. Jalankan Server
npm run dev
npm start

### 6. Akses Aplikasi
Buka browser dan akses: 
- **Website:** http://localhost:4000
- **API Base:** http://localhost:4000/api


