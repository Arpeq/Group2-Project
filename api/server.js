// Vercel serverless function version
const express = require("express")
const multer = require("multer")
const cors = require("cors")
const path = require("path")
const { analyzeDesignWithGPT4, analyzeFigmaDesign } = require("./analysisFunctions") // Import the functions

const app = express()

// Environment variables (automatically handled by Vercel)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN

// Middleware
app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? ["https://your-domain.vercel.app"] : ["http://localhost:3001"],
    credentials: true,
  }),
)
app.use(express.json({ limit: "10mb" }))

// Configure multer for serverless (use memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"))
    }
  },
})

// Copy all your existing functions here (extractFigmaFileInfo, getFigmaFileData, etc.)
// ... (all the functions from your server.js)

// API Routes
app.post("/api/analyze-screenshot", upload.single("screenshot"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }

    // Use buffer instead of file path for serverless
    const imageBase64 = req.file.buffer.toString("base64")
    const analysis = await analyzeDesignWithGPT4(imageBase64, "screenshot")

    res.json({
      success: true,
      analysis: analysis,
    })
  } catch (error) {
    console.error("Error analyzing screenshot:", error)
    res.status(500).json({
      success: false,
      error: "Failed to analyze design",
      message: error.message,
    })
  }
})

app.post("/api/analyze-figma", async (req, res) => {
  try {
    const { figmaUrl } = req.body

    if (!figmaUrl) {
      return res.status(400).json({ error: "Figma URL is required" })
    }

    if (!FIGMA_ACCESS_TOKEN) {
      return res.status(400).json({
        success: false,
        error: "Figma integration not configured",
        message: "Please configure FIGMA_ACCESS_TOKEN environment variable",
      })
    }

    const analysis = await analyzeFigmaDesign(figmaUrl)

    res.json({
      success: true,
      analysis: analysis,
    })
  } catch (error) {
    console.error("Error analyzing Figma design:", error)
    res.status(500).json({
      success: false,
      error: "Failed to analyze Figma design",
      message: error.message,
    })
  }
})

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: {
      hasOpenAI: !!OPENAI_API_KEY,
      hasFigma: !!FIGMA_ACCESS_TOKEN,
    },
  })
})

module.exports = app
