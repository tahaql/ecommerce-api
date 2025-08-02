# 🛒 Ecommerce API

An extensible, modular backend API for an e-commerce platform, built with **Node.js**, **Express**, **TypeScript**, and **Prisma**.

## 🚀 Features

- 🔐 User authentication (JWT-based)
- 🛍️ Product and category management
- 🧾 Order management
- 🖼️ Image upload (local)
- 🧠 Modular architecture (controllers, services, routes)
- 📦 PostgreSQL with Prisma ORM
- 📁 Organized with TypeScript, including types and middlewares

---

## 🗂️ Project Structure
src/
├── controllers/     # Request handlers
├── services/        # Business logic
├── routes/          # Express routers
├── models/          # DTOs and data models
├── middleware/      # Middlewares (auth, error handling, etc.)
├── types/           # TypeScript types and interfaces
├── utils/           # Utility functions
└── app.ts           # Express app config
server.ts            # App entry point
prisma/              # Prisma schema and migrations
uploads/             # Uploaded files (images)


---

## ⚙️ Tech Stack

- **Node.js** + **Express**
- **TypeScript**
- **PostgreSQL** via **Prisma**
- **JWT** for authentication
- **Multer** for file uploads
- **dotenv**, **cors**, **bcrypt**, and more

---

## 🛠️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ecommerce-api.git
cd ecommerce-api


Install dependencies

npm install

------------------

Set environment variables

Create a .env file in the root with the following:

DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/db_name
JWT_SECRET=your_secret_key
PORT=3000

Run Prisma migrations

npx prisma migrate dev --name init
npx prisma generate

npm run dev

📌 TODOs
	•	Add unit/integration tests
	•	Add API documentation (Swagger or Postman)
	•	Add rate limiting & input validation
	•	Enable cloud file storage (S3, etc.)






