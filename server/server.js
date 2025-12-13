// Import dotenv to read environment variables from .env (like PORT and MONGO_URI)
import dotenv from "dotenv";

// Import Express (framework to create an API server)
import express from "express";

// Import CORS (lets your frontend call the backend from another domain/port)
import cors from "cors";

// Import MongoDB client so we can connect to MongoDB Atlas
import { MongoClient, ObjectId } from "mongodb";

// Load environment variables from the .env file into process.env
dotenv.config();

// Create an Express app instance (the main server object)
const app = express();

// Read PORT from environment variables; fallback to 5000 if not set
const PORT = process.env.PORT || 5000;

// Read MONGO_URI from environment variables (this must exist for Atlas connection)
const MONGO_URI = process.env.MONGO_URI;

// Read DB_NAME from environment variables; fallback to "codesnippetdb"
const DB_NAME = process.env.DB_NAME || "codesnippetdb";

// If MONGO_URI is missing, stop immediately (otherwise the server will fail later)
if (!MONGO_URI) {
  throw new Error("Missing MONGO_URI in .env");
}

// Enable JSON body parsing so req.body works for POST/PUT requests
app.use(express.json());

// Enable CORS so React dev server (localhost:5173) can call your API (localhost:5000)
app.use(cors());

// Create a MongoClient instance using the Atlas connection string
const client = new MongoClient(MONGO_URI);

// We keep a variable to store our database reference after connection
let db;

// A small helper function to connect to MongoDB once when the server starts
async function connectToMongo() {
  // Connect to MongoDB Atlas
  await client.connect();

  // Choose the database by name (Atlas creates it when you first write data)
  db = client.db(DB_NAME);

  // Log success message so you know DB is connected
  console.log(`MongoDB connected to database: ${DB_NAME}`);
}

// ------------------------
// ROUTES (API endpoints)
// ------------------------

// Health check route: confirms server is running
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Server is healthy" });
});

// GET /snippets: return all snippets (basic version; no auth yet)
app.get("/snippets", async (req, res) => {
  // Get the "snippets" collection from the database (collection is like a table)
  const collection = db.collection("snippets");

  // Find all documents and convert cursor to an array
  const snippets = await collection.find({}).toArray();

  // Return the array as JSON
  res.json(snippets);
});

// POST /snippets: create a new snippet (basic version)
app.post("/snippets", async (req, res) => {
  // Read fields from request body (sent by frontend)
  const { title, language, code } = req.body;

  // Basic validation (beginner-friendly)
  if (!title || !language || !code) {
    return res.status(400).json({ message: "title, language, and code are required" });
  }

  // Get the snippets collection
  const collection = db.collection("snippets");

  // Insert a new document into MongoDB
  const result = await collection.insertOne({
    title, // snippet title
    language, // programming language
    code, // code content
    createdAt: new Date(), // track creation time
  });

  // Return the created document id
  res.status(201).json({ insertedId: result.insertedId });
});

// DELETE /snippets/:id: delete a snippet by id
app.delete("/snippets/:id", async (req, res) => {
  // Read id from URL params
  const { id } = req.params;

  // Convert string id into MongoDB ObjectId type
  const _id = new ObjectId(id);

  // Get the collection
  const collection = db.collection("snippets");

  // Delete one document matching _id
  const result = await collection.deleteOne({ _id });

  // If nothing deleted, snippet not found
  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "Snippet not found" });
  }

  // Return success
  res.json({ ok: true, message: "Snippet deleted" });
});

// ------------------------
// START SERVER (after DB connects)
// ------------------------

// Connect to MongoDB, then start Express server
connectToMongo()
  .then(() => {
    // Start listening for requests on PORT
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    // If DB connection fails, log the error and exit
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
