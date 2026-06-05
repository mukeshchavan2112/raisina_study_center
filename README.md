# Study Center ERP

A full-stack **Study Center ERP System** built using the **MERN stack** to manage study centers, student admissions, scholarship exam registrations, merit lists, hostel, mess, library/study space, accounts, receipts, and analytics dashboards.

This project is designed for organizations that run multiple study centers and need a centralized system for student management, facility allocation, fee tracking, and reporting.

---

## Features

### Public Exam Registration

* Public landing page for scholarship exam registration
* Students can register without login
* Preferred exam center and admission center selection
* Auto-generated exam registration number
* Admin login access from public page

### Role-Based Authentication

The system supports two main roles:

#### Super Admin

* Manage study centers
* Create and manage center admins
* View overall dashboard analytics
* Manage public exam registrations
* Upload center-wise merit lists
* View global student, admission, and financial reports
* Download reports

#### Center Admin

* Manage students of assigned center only
* Admit scholarship and non-scholarship students
* Allocate hostel, mess, and study space facilities
* Manage library books and book issues
* Manage donations, expenses, fee logbook, and receipts
* View center-specific dashboard and reports

---

## Core Modules

### 1. Center Management

* Add and manage study centers
* Auto-generated center codes
* Center-wise data separation

### 2. Exam Registration

* Public student registration
* Registration status tracking:

  * Registered
  * Merit Listed
  * Admitted
  * Cancelled

### 3. Merit List Management

* Super Admin can upload merit list center-wise
* CSV and Excel upload support
* Merit entries linked with public exam registrations
* Scholarship admission flow based on merit list

### 4. Student Admission

* Scholarship student admission from merit list
* Non-scholarship direct admission
* Auto-generated RSC number
* Auto-generated PRN number
* Facility selection during admission
* Student type management:

  * Scholarship
  * Non-Scholarship

### 5. Hostel Module

* Add and manage hostels
* Track capacity and occupancy
* Allocate and deallocate students
* View assigned students only

### 6. Mess Module

* Add and manage mess records
* Enroll and unenroll students
* Track mess capacity
* View enrolled students only

### 7. Library / Study Center Module

* Manage library books
* Issue and return books
* Track available book copies
* Assign study space facility to students

### 8. Accounts Module

* Add donations
* Add expenses
* Generate monthly fee logbook
* Mark student fees as paid
* Generate receipts
* Download / print receipts
* Track ledger entries

### 9. Dashboard and Reports

#### Super Admin Dashboard

* Total centers
* Total students
* Scholarship and non-scholarship students
* Total fee collection
* Donations
* Expenses
* Net balance
* Center-wise reports
* Admission conversion analytics

#### Center Admin Dashboard

* Total students
* Scholarship students
* Non-scholarship students
* Hostel occupancy
* Mess enrollments
* Study space assignments
* Monthly financial summary
* Download reports

---

## Tech Stack

### Frontend

* React
* Vite
* React Router
* Axios
* Context API
* CSS

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication
* Bcrypt
* Multer for file upload
* CSV / Excel processing

### Database

* MongoDB Atlas or local MongoDB

---

## Project Structure

```bash
Study_Center_ERP/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── utils/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── README.md
└── .gitignore
```

---

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/study-center-erp.git
cd study-center-erp
```

---

## Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder.

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:5173

AADHAAR_ENCRYPTION_KEY=your_32_character_or_longer_secret_key
AADHAAR_HASH_PEPPER=your_long_secret_pepper_value
```

Start the backend server:

```bash
npm run dev
```

Backend will run on:

```bash
http://localhost:5000
```

---

## Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file inside the `frontend` folder if required.

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Frontend will run on:

```bash
http://localhost:5173
```

---

## Default Routes

### Public Routes

```bash
/
```

Public exam registration page.

```bash
/login
```

Admin login page.

### Super Admin Routes

```bash
/super-admin/dashboard
/super-admin/centers
/super-admin/users
/super-admin/exam-registrations
/super-admin/merit-list
```

### Center Admin Routes

```bash
/center-admin/dashboard
/center-admin/students
/center-admin/admissions
/center-admin/hostel
/center-admin/mess
/center-admin/library
/center-admin/accounts
```

---

## Important API Modules

```bash
/api/auth
/api/public
/api/center
/api/students
/api/admission
/api/hostel
/api/mess
/api/library
/api/accounts
/api/logbook
/api/dashboard
/api/receipts
```

---

## Sample Workflow

### Scholarship Student Flow

1. Student registers through the public exam registration page.
2. Super Admin uploads the merit list for a center.
3. Eligible student appears in the merit list.
4. Center Admin admits the student from the merit list.
5. System generates RSC number and PRN number.
6. Student is added to the center database.
7. Scholarship facilities can be assigned as required.

### Non-Scholarship Student Flow

1. Center Admin opens admission page.
2. Selects student type as Non-Scholarship.
3. Fills student and facility details.
4. System generates RSC number and PRN number.
5. Monthly fees are handled through the Accounts module.

---

## Deployment

The project has been successfully deployed using Vercel for the frontend and Render for the backend.

Frontend Deployment

The React frontend is deployed on Vercel.

Frontend URL: https://raisina-study-center.vercel.app

Backend Deployment

The Node.js and Express backend is deployed on Render.

Backend URL: https://raisina-study-center-backend.onrender.com

Database

The project uses MongoDB Atlas as the cloud database.

---

## Security Features

* JWT-based authentication
* Role-based access control
* Password hashing using bcrypt
* Protected API routes
* Center-wise access restriction for Center Admin
* Sensitive Aadhaar handling using encryption and hashing
* Environment variables for secrets
* Helmet middleware for basic security headers

---

## Future Enhancements

* OTP verification for public registration
* Online payment gateway integration
* Email and SMS notifications
* Backup and restore system

---

## Project Status

The Study Center ERP project is deployed and working successfully. Core modules such as public exam registration, role-based authentication, admissions, merit list upload, student management, hostel, mess, library, accounts, receipts, and dashboards are implemented.

The project is currently ready for final testing, demo presentation, and future production-level improvements.

---

## Author

**Mukesh Chavan**

GitHub: https://github.com/mukeshchavan2112

LinkedIn: https://www.linkedin.com/in/mukesh-chavan-9729912a1/

---
