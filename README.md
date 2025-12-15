Code Snippet Vault – MERN Code Snippet Manager

Feel free to clone and learn, the code is commented well for learning purposes. No Login Screen, it's a simple Code Snippet App.
A powerful, secure, and modern Code Snippet Manager built with the MERN stack. Store, organize, edit, and delete your code snippets with user authentication.
Live Demo: https://snippet-vault.onrender.com (after deployment)
Backend API: https://snippet-vault-md6g.onrender.com/api/health

🚀 Features
>> User registration & login with JWT authentication (Main tutorial on Canvas LMS)
>> Protected routes (dashboard only accessible when logged in)
>> Full CRUD operations for code snippets (Create, Read, Update, Delete)
>> Responsive design with Bootstrap
>> Secure token handling with localStorage & expiry checks
>> Environment-based configuration (no hard-coded secrets)

Your Dashboard Screenshots (Paste Here):
Dashboard
Main Dashboard with Snippets
Create/Edit Snippet
Add or Edit Snippet Form

🏗️ Project Structure
medium.comyoutube.com

textsnippet-vault/
├── server/                  # Backend
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── index.js
│   └── package.json
├── client/                  # Frontend (Vite + React)
│   ├── src/
│   │   ├── lib/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── .gitignore
└── README.md


Your Folder Structure Screenshot (Paste Here):
Folder Structure

🛠️ Tech Stack
MongoDB – NoSQL database
Express.js – Backend framework
React (Vite) – Frontend UI
Node.js – Runtime
JWT – Authentication
Axios – API calls
Bootstrap – Styling
Render.com – Deployment

🚀 Deployment
Backend: Render 
Frontend: Render

Your Deployment Screenshots (Paste Here):
![alt text](image.png)

Live App
📖 Step-by-Step Setup Guide
(See full tutorial on Canvas: build from scratch, no cloning!)

Create folders: server & client
Setup backend (Express + Mongoose + JWT)
Setup frontend (Vite + React + Axios + Router)
Add environment variables
Implement auth & CRUD
Push to GitHub safely (with .gitignore)
Deploy on Render.com

🔒 Security Notes
.env files never committed (protected by .gitignore)
JWT stored securely with expiry checks
Protected routes on both frontend & backend

🤝 Contributing
Contributions welcome! Fork, create a branch, and submit a PR.
📄 License
MIT License – feel free to use and modify.

Built with ❤️ by Paresh Rathod

Star this repo if you found it helpful! ⭐