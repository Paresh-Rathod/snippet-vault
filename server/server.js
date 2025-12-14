// Import dotenv to load environment variables from .env into process.env
import dotenv from 'dotenv';

// Import Express framework to create the HTTP API server
import express from 'express';

// Import CORS middleware so your React frontend (different port) can call this backend
import cors from 'cors';

// Import MongoDB driver with aliases to avoid any duplicate identifier issues
import {
  MongoClient as MongoDBClient, // Alias MongoClient to MongoDBClient
  ObjectId as MongoObjectId, // Alias ObjectId to MongoObjectId
} from 'mongodb';

// Load environment variables from the .env file (must be done before using process.env values)
dotenv.config();

// Create the Express app instance
const app = express();

// Read PORT from environment variables; default to 5000 if missing
const PORT = process.env.PORT || 5000;

// Read MongoDB connection string from environment variables
const MONGO_URI = process.env.MONGO_URI;

// Read database name from environment variables; fallback to "codesnippetdb"
const DB_NAME = process.env.DB_NAME || 'codesnippetdb';

// If MONGO_URI is missing, stop immediately with a clear message
if (!MONGO_URI) {
  throw new Error(
    'Missing MONGO_URI in .env (server/.env must contain MONGO_URI=...)',
  );
}

// Enable JSON body parsing (so req.body works for POST/PUT requests)
app.use(express.json());

// Enable CORS (allow requests from frontend)
app.use(cors());

// Create MongoDB client instance using the Atlas connection string
const client = new MongoDBClient(MONGO_URI);

// Keep a reference to the connected database
let db = null;

// Helper function: connect to MongoDB once on startup
async function connectToMongo() {
  // Connect to MongoDB Atlas
  await client.connect();

  // Select the database by name (created automatically when you first insert data)
  db = client.db(DB_NAME);

  // Log success so you know the DB connection is ready
  console.log(`MongoDB connected to database: ${DB_NAME}`);
}

// Middleware: block requests if DB is not connected yet (prevents crashing on db.collection)
function requireDb(req, res, next) {
  if (!db) {
    return res.status(503).json({
      message: 'Database not connected yet. Try again in a moment.',
    });
  }
  next();
}

// ------------------------
// ROUTES (API endpoints)
// ------------------------

// Health check route: confirms server is running
app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'Server is healthy' });
});

// GET /snippets: return all snippets (basic version; no auth yet)
app.get('/snippets', requireDb, async (req, res) => {
  try {
    const collection = db.collection('snippets'); // Get the "snippets" collection
    const snippets = await collection.find({}).toArray(); // Find all docs and return as array
    res.json(snippets); // Respond with snippets
  } catch (err) {
    console.error('GET /snippets error:', err);
    res.status(500).json({ message: 'Failed to fetch snippets' });
  }
});

// Root route: helpful message when visiting http://localhost:5000/
app.get('/', (req, res) => {
  res.json({
    message: 'Snippet Vault API is running',
    endpoints: ['/health', '/snippets'],
  });
});

// POST /snippets: create a new snippet (basic version)
app.post('/snippets', requireDb, async (req, res) => {
  try {
    const { title, language, code } = req.body; // Read incoming fields

    // Basic validation
    if (!title || !language || !code) {
      return res.status(400).json({
        message: 'title, language, and code are required',
      });
    }

    const collection = db.collection('snippets'); // Get collection

    // Insert one snippet document
    const result = await collection.insertOne({
      title,
      language,
      code,
      createdAt: new Date(),
    });

    // Return inserted id
    res.status(201).json({ insertedId: result.insertedId });
  } catch (err) {
    console.error('POST /snippets error:', err);
    res.status(500).json({ message: 'Failed to create snippet' });
  }
});

// DELETE /snippets/:id: delete a snippet by id
app.delete('/snippets/:id', requireDb, async (req, res) => {
  try {
    const { id } = req.params; // Read id from URL

    // Convert string to Mongo ObjectId
    const _id = new MongoObjectId(id);

    const collection = db.collection('snippets'); // Get collection

    const result = await collection.deleteOne({ _id }); // Delete doc by _id

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Snippet not found' });
    }

    res.json({ ok: true, message: 'Snippet deleted' });
  } catch (err) {
    console.error('DELETE /snippets/:id error:', err);

    // If the ObjectId conversion fails, it throws — return a clean 400
    if (
      String(err).includes('BSONError') ||
      String(err).includes('Argument passed in')
    ) {
      return res.status(400).json({ message: 'Invalid snippet id' });
    }

    res.status(500).json({ message: 'Failed to delete snippet' });
  }
});

// ------------------------
// START SERVER (after DB connects)
// ------------------------

connectToMongo()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
