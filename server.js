console.log("🔧 Starting Web Design Assistance Tool server...")

// Load environment variables first
try {
  require("dotenv").config()
  console.log("✅ Environment variables loaded")
} catch (error) {
  console.log("⚠️ dotenv not found, using system environment variables")
}

const express = require("express")
const multer = require("multer")
const cors = require("cors")
const fs = require("fs")
const path = require("path")

console.log("📦 Required modules loaded successfully")

const app = express()
const PORT = process.env.PORT || 3001

// Debug environment
console.log("🔍 Environment Check:")
console.log("- Current directory:", process.cwd())
console.log("- Node version:", process.version)
console.log("- PORT:", PORT)
console.log("- OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "✅ Set" : "❌ Not set")
console.log("- FIGMA_ACCESS_TOKEN:", process.env.FIGMA_ACCESS_TOKEN ? "✅ Set" : "❌ Not set")

// Middleware
app.use(cors())
app.use(express.json({ limit: "10mb" }))
app.use(express.static(__dirname))

console.log("✅ Middleware configured")

// Basic route for testing
app.get("/", (req, res) => {
  console.log("📥 GET / request received")

  const indexPath = path.join(__dirname, "index.html")

  if (fs.existsSync(indexPath)) {
    console.log("📄 Serving index.html")
    res.sendFile(indexPath)
  } else {
    console.log("❌ index.html not found")
    res.send(`
      <h1>Web Design Assistance Tool</h1>
      <p>Server is running, but index.html not found.</p>
      <p>Current directory: ${__dirname}</p>
      <p>Looking for: ${indexPath}</p>
    `)
  }
})

// Test route
app.get("/test", (req, res) => {
  console.log("📥 GET /test request received")
  res.json({
    message: "Server is working!",
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      port: PORT,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasFigma: !!process.env.FIGMA_ACCESS_TOKEN,
    },
  })
})

// Test Figma URL parsing endpoint
app.post("/api/test-figma-url", async (req, res) => {
  console.log("🧪 Figma URL test request received")

  try {
    const { figmaUrl } = req.body

    if (!figmaUrl) {
      return res.status(400).json({ error: "figmaUrl is required" })
    }

    console.log(`🔗 Testing URL: ${figmaUrl}`)

    // Test URL parsing
    const fileInfo = await extractFigmaFileInfo(figmaUrl)

    // Test token
    const hasToken = !!process.env.FIGMA_ACCESS_TOKEN
    const tokenFormat = process.env.FIGMA_ACCESS_TOKEN
      ? process.env.FIGMA_ACCESS_TOKEN.startsWith("figd_")
        ? "Valid format"
        : "Invalid format - should start with figd_"
      : "Not set"

    res.json({
      success: true,
      urlParsing: {
        originalUrl: figmaUrl,
        extractedFileId: fileInfo.fileId,
        extractedNodeId: fileInfo.nodeId,
      },
      tokenStatus: {
        hasToken,
        tokenFormat,
        tokenLength: process.env.FIGMA_ACCESS_TOKEN ? process.env.FIGMA_ACCESS_TOKEN.length : 0,
      },
      nextStep: hasToken
        ? "URL parsing successful. Try the full analysis now."
        : "Add FIGMA_ACCESS_TOKEN to your .env file",
    })
  } catch (error) {
    console.error("❌ Error testing Figma URL:", error)
    res.status(400).json({
      success: false,
      error: error.message,
      troubleshooting: {
        commonIssues: ["URL format not recognized", "File ID extraction failed", "Invalid Figma URL structure"],
        supportedFormats: [
          "https://www.figma.com/file/FILE_ID/Design-Name",
          "https://www.figma.com/proto/FILE_ID/Design-Name",
          "https://www.figma.com/design/FILE_ID/Design-Name",
        ],
      },
    })
  }
})

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads"
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir)
      console.log("📁 Created uploads directory")
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname)
  },
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"))
    }
  },
})

console.log("✅ File upload configured")

// Figma API integration with better error handling
async function extractFigmaFileInfo(figmaUrl) {
  console.log(`🔗 Parsing Figma URL: ${figmaUrl}`)

  // Clean the URL first
  const cleanUrl = figmaUrl.trim()

  // More comprehensive URL pattern matching with better debugging
  const patterns = [
    // Standard file URLs
    /figma\.com\/file\/([a-zA-Z0-9-_]+)/,
    // Proto URLs
    /figma\.com\/proto\/([a-zA-Z0-9-_]+)/,
    // Design URLs (newer format)
    /figma\.com\/design\/([a-zA-Z0-9-_]+)/,
    // Community URLs
    /figma\.com\/community\/file\/([a-zA-Z0-9-_]+)/,
  ]

  let match = null
  let matchedPattern = null

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i]
    match = cleanUrl.match(pattern)
    if (match) {
      matchedPattern = i + 1
      console.log(`✅ URL matched pattern ${matchedPattern}: ${pattern}`)
      break
    } else {
      console.log(`❌ Pattern ${i + 1} failed: ${pattern}`)
    }
  }

  if (!match) {
    console.log("❌ No patterns matched. URL structure:")
    console.log(`- Full URL: ${cleanUrl}`)
    console.log(`- URL parts:`, cleanUrl.split("/"))

    throw new Error(`Invalid Figma URL format. 
Expected formats:
- https://www.figma.com/file/FILE_ID/Design-Name
- https://www.figma.com/proto/FILE_ID/Design-Name  
- https://www.figma.com/design/FILE_ID/Design-Name

Your URL: ${cleanUrl}`)
  }

  // Extract node ID from query parameters if present
  let nodeId = null
  try {
    const url = new URL(cleanUrl)
    const nodeParam = url.searchParams.get("node-id")
    if (nodeParam) {
      nodeId = decodeURIComponent(nodeParam)
    }
  } catch (urlError) {
    console.log("⚠️ Could not parse URL for node-id:", urlError.message)
  }

  const result = {
    fileId: match[1],
    nodeId: nodeId,
  }

  console.log("✅ Extracted file info:", result)

  // Validate file ID format
  if (!result.fileId || result.fileId.length < 10) {
    throw new Error(`Invalid file ID extracted: ${result.fileId}. File ID should be a long alphanumeric string.`)
  }

  return result
}

async function getFigmaFileData(fileId) {
  const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN

  if (!FIGMA_ACCESS_TOKEN) {
    throw new Error("Figma access token not configured")
  }

  if (!FIGMA_ACCESS_TOKEN.startsWith("figd_")) {
    throw new Error("Invalid Figma access token format. Token should start with 'figd_'")
  }

  console.log(`📡 Fetching Figma file data for: ${fileId}`)
  console.log(`🔑 Using token: ${FIGMA_ACCESS_TOKEN.substring(0, 10)}...`)

  try {
    const response = await fetch(`https://api.figma.com/v1/files/${fileId}`, {
      headers: {
        "X-Figma-Token": FIGMA_ACCESS_TOKEN,
      },
    })

    console.log(`📊 Figma API response: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      let errorMessage = `Figma API error: ${response.status}`

      try {
        const errorData = await response.json()
        errorMessage += ` - ${errorData.message || errorData.error || "Unknown error"}`
        console.log("📋 Full error response:", errorData)
      } catch (parseError) {
        const errorText = await response.text()
        console.log("📋 Raw error response:", errorText)
        errorMessage += ` - ${errorText || "Unknown error"}`
      }

      // Provide specific troubleshooting based on status code
      if (response.status === 404) {
        errorMessage += "\n\nTroubleshooting 404 error:"
        errorMessage += "\n- Check if the file ID is correct"
        errorMessage += "\n- Ensure the file is not private or you have access"
        errorMessage += "\n- Try with a public Figma file first"
      } else if (response.status === 403) {
        errorMessage += "\n\nTroubleshooting 403 error:"
        errorMessage += "\n- Your token may not have permission to access this file"
        errorMessage += "\n- The file might be in a team you don't belong to"
        errorMessage += "\n- Try regenerating your Figma access token"
      } else if (response.status === 401) {
        errorMessage += "\n\nTroubleshooting 401 error:"
        errorMessage += "\n- Your Figma access token may be invalid or expired"
        errorMessage += "\n- Regenerate your token at https://www.figma.com/developers/api#access-tokens"
      }

      throw new Error(errorMessage)
    }

    const data = await response.json()
    console.log(`✅ Successfully fetched file: ${data.name}`)
    return data
  } catch (error) {
    if (error.message.includes("fetch")) {
      throw new Error(`Network error connecting to Figma API: ${error.message}`)
    }
    throw error
  }
}

async function getFigmaImageUrls(fileId, nodeIds = []) {
  const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN

  if (!FIGMA_ACCESS_TOKEN) {
    throw new Error("Figma access token not configured")
  }

  // If no specific nodes, get the first page
  const imageParams = `ids=${nodeIds.length > 0 ? nodeIds.join(",") : ""}&format=png&scale=2`

  console.log(`📡 Fetching Figma images for: ${fileId}`)

  const response = await fetch(`https://api.figma.com/v1/images/${fileId}?${imageParams}`, {
    headers: {
      "X-Figma-Token": FIGMA_ACCESS_TOKEN,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Figma Images API error: ${response.status} - ${errorData.message || "Unknown error"}`)
  }

  return await response.json()
}

async function downloadImageAsBase64(imageUrl) {
  console.log(`📥 Downloading image from: ${imageUrl.substring(0, 50)}...`)

  const response = await fetch(imageUrl)

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return buffer.toString("base64")
}

async function analyzeFigmaDesign(figmaUrl) {
  try {
    console.log(`🎨 Starting Figma analysis for URL: ${figmaUrl}`)

    // Extract file and node info from URL
    const fileInfo = await extractFigmaFileInfo(figmaUrl)
    const { fileId, nodeId } = fileInfo

    // Validate extracted data
    if (!fileId) {
      throw new Error(`Failed to extract file ID from URL: ${figmaUrl}`)
    }

    console.log(`🎨 Analyzing Figma file: ${fileId}, node: ${nodeId || "all"}`)

    // Get file data to understand structure
    const fileData = await getFigmaFileData(fileId)
    console.log(`📄 File name: ${fileData.name}`)

    // Rest of the function remains the same...
    // Determine which nodes to capture
    let nodeIds = []
    if (nodeId) {
      nodeIds = [nodeId]
    } else {
      // Get the first page's top-level frames
      const firstPage = fileData.document.children[0]
      if (firstPage && firstPage.children) {
        nodeIds = firstPage.children.slice(0, 3).map((child) => child.id) // Limit to first 3 frames
      }
    }

    if (nodeIds.length === 0) {
      throw new Error("No frames found to analyze")
    }

    // Get image URLs for the nodes
    const imageData = await getFigmaImageUrls(fileId, nodeIds)

    if (!imageData.images || Object.keys(imageData.images).length === 0) {
      throw new Error("No images generated from Figma")
    }

    // Download the first image and convert to base64
    const firstImageUrl = Object.values(imageData.images)[0]
    const imageBase64 = await downloadImageAsBase64(firstImageUrl)

    // Analyze with GPT-4
    const analysis = await analyzeDesignWithGPT4(imageBase64, "Figma design")

    return {
      ...analysis,
      figmaInfo: {
        fileName: fileData.name,
        fileId: fileId,
        nodeId: nodeId,
        analyzedFrames: nodeIds.length,
      },
    }
  } catch (error) {
    console.error("❌ Error analyzing Figma design:", error)
    throw error
  }
}

// OpenAI API integration
async function analyzeDesignWithGPT4(imageBase64, designType = "screenshot") {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY

  console.log("🔑 Checking API key...")

  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured. Please check your .env file.")
  }

  if (!OPENAI_API_KEY.startsWith("sk-")) {
    throw new Error("Invalid OpenAI API key format. API key should start with 'sk-'")
  }

  // Improved prompt that encourages JSON format without requiring it
  const prompt = `You are a UX/UI design expert. Analyze this ${designType} and provide detailed feedback based on Nielsen's usability heuristics.

Please evaluate the design and provide your response in the following JSON format (but if you can't format as JSON, just provide structured text):

{
  "overallScore": [number from 1-10],
  "summary": "[brief overall assessment]",
  "feedback": [
    {
      "heuristic": "[heuristic name]",
      "score": [number from 1-10],
      "assessment": "[your assessment]",
      "issues": ["[issue 1]", "[issue 2]"],
      "suggestions": ["[suggestion 1]", "[suggestion 2]"]
    }
  ]
}

Focus on these key heuristics:
1. Visibility of system status
2. Match between system and real world
3. User control and freedom
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use
8. Aesthetic and minimalist design

Provide specific, actionable feedback for improving the user experience.`

  try {
    console.log("📡 Making OpenAI API call...")

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o", // Changed from "gpt-4" to "gpt-4o"
        messages: [
          {
            role: "system",
            content: "You are a UX/UI expert. Provide detailed, structured feedback on design usability.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    })

    console.log("📡 OpenAI API response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("❌ OpenAI API error:", errorData)
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || "Unknown error"}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    console.log("✅ OpenAI API response received")
    console.log("📝 Response preview:", content.substring(0, 200) + "...")

    // Try to extract JSON from the response
    try {
      let cleanedContent = content.trim()

      // Remove markdown code blocks if present
      cleanedContent = cleanedContent
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim()

      // Try to find JSON object in the response
      const jsonStart = cleanedContent.indexOf("{")
      const jsonEnd = cleanedContent.lastIndexOf("}")

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonString = cleanedContent.substring(jsonStart, jsonEnd + 1)
        console.log("🧹 Extracted JSON string:", jsonString.substring(0, 100) + "...")

        const parsedJson = JSON.parse(jsonString)

        // Validate and fix the structure
        const result = {
          overallScore: parsedJson.overallScore || 7,
          summary: parsedJson.summary || "Analysis completed successfully.",
          feedback: Array.isArray(parsedJson.feedback) ? parsedJson.feedback : [],
        }

        console.log("✅ Successfully parsed JSON response")
        return result
      } else {
        throw new Error("No JSON structure found")
      }
    } catch (parseError) {
      console.log("⚠️ Could not parse as JSON, creating structured response from text")
      console.log("Parse error:", parseError.message)

      // Create a structured response from the text
      const lines = content.split("\n").filter((line) => line.trim())
      const summary = lines.slice(0, 3).join(" ").substring(0, 300)

      return {
        overallScore: 7,
        summary: summary || "Analysis completed successfully.",
        feedback: [
          {
            heuristic: "Design Analysis",
            score: 7,
            assessment: "Comprehensive analysis provided",
            issues: ["Response was not in JSON format"],
            suggestions: extractSuggestions(content),
          },
        ],
      }
    }
  } catch (error) {
    console.error("❌ Error in analyzeDesignWithGPT4:", error)
    throw error
  }
}

// Helper function to extract suggestions from text
function extractSuggestions(text) {
  const suggestions = []
  const lines = text.split("\n")

  for (const line of lines) {
    const trimmed = line.trim()
    if (
      trimmed.length > 10 &&
      (trimmed.includes("suggest") ||
        trimmed.includes("recommend") ||
        trimmed.includes("improve") ||
        trimmed.includes("consider") ||
        trimmed.includes("add") ||
        trimmed.includes("should"))
    ) {
      suggestions.push(trimmed.substring(0, 150))
      if (suggestions.length >= 3) break
    }
  }

  return suggestions.length > 0 ? suggestions : ["See full analysis for detailed recommendations"]
}

// API Routes
app.post("/api/analyze-screenshot", upload.single("screenshot"), async (req, res) => {
  console.log("📸 Screenshot analysis request received")

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }

    console.log(`📁 Processing file: ${req.file.originalname}`)

    const imagePath = req.file.path
    const imageBuffer = fs.readFileSync(imagePath)
    const imageBase64 = imageBuffer.toString("base64")

    console.log(`📊 Image converted to base64, size: ${imageBase64.length} characters`)

    const analysis = await analyzeDesignWithGPT4(imageBase64, "screenshot")

    // Clean up uploaded file
    fs.unlinkSync(imagePath)

    console.log("✅ Analysis completed successfully")

    res.json({
      success: true,
      analysis: analysis,
    })
  } catch (error) {
    console.error("❌ Error analyzing screenshot:", error)
    res.status(500).json({
      success: false,
      error: "Failed to analyze design",
      message: error.message,
    })
  }
})

app.post("/api/analyze-figma", async (req, res) => {
  console.log("🎨 Figma analysis request received")

  try {
    const { figmaUrl } = req.body

    if (!figmaUrl) {
      return res.status(400).json({ error: "Figma URL is required" })
    }

    console.log(`🎨 Processing Figma URL: ${figmaUrl}`)

    // Add debugging: Test URL parsing first
    console.log("🧪 Testing URL parsing...")
    try {
      const testParsing = await extractFigmaFileInfo(figmaUrl)
      console.log("✅ URL parsing test result:", testParsing)
    } catch (parseError) {
      console.error("❌ URL parsing failed:", parseError.message)
      return res.status(400).json({
        success: false,
        error: "Invalid Figma URL format",
        message: parseError.message,
      })
    }

    // Check if Figma token is configured
    if (!process.env.FIGMA_ACCESS_TOKEN) {
      return res.status(400).json({
        success: false,
        error: "Figma integration not configured",
        message: "Please add FIGMA_ACCESS_TOKEN to your .env file",
        instructions: {
          step1: "Go to https://www.figma.com/developers/api#access-tokens",
          step2: "Generate a personal access token",
          step3: "Add FIGMA_ACCESS_TOKEN=your-token-here to your .env file",
          step4: "Restart the server",
        },
      })
    }

    // Analyze the Figma design
    const analysis = await analyzeFigmaDesign(figmaUrl)

    console.log("✅ Figma analysis completed successfully")

    res.json({
      success: true,
      analysis: analysis,
    })
  } catch (error) {
    console.error("❌ Error analyzing Figma design:", error)
    res.status(500).json({
      success: false,
      error: "Failed to analyze Figma design",
      message: error.message,
    })
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("💥 Server error:", err.message)
  res.status(500).json({
    success: false,
    error: "Server error",
    message: err.message,
  })
})

// Start server
console.log("🚀 Starting server...")

app.listen(PORT, (err) => {
  if (err) {
    console.error("❌ Failed to start server:", err)
    process.exit(1)
  }

  console.log(`\n🎉 Server successfully started!`)
  console.log(`📱 Visit: http://localhost:${PORT}`)
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`)

  // Check required files
  const requiredFiles = ["index.html", "styles.css", "script.js"]
  console.log("\n📄 File Check:")
  requiredFiles.forEach((file) => {
    const exists = fs.existsSync(path.join(__dirname, file))
    console.log(`- ${file}: ${exists ? "✅ Found" : "❌ Missing"}`)
  })

  console.log("\n🔧 Environment Status:")
  console.log(`- Node.js: ${process.version}`)
  console.log(`- Port: ${PORT}`)
  console.log(`- OpenAI API Key: ${process.env.OPENAI_API_KEY ? "✅ Configured" : "❌ Missing"}`)
  console.log(`- Figma Access Token: ${process.env.FIGMA_ACCESS_TOKEN ? "✅ Configured" : "❌ Missing"}`)
  console.log(`- Working Directory: ${process.cwd()}`)

  if (!process.env.FIGMA_ACCESS_TOKEN) {
    console.log("\n⚠️  Figma Integration Setup Required:")
    console.log("1. Go to https://www.figma.com/developers/api#access-tokens")
    console.log("2. Generate a personal access token")
    console.log("3. Add FIGMA_ACCESS_TOKEN=your-token-here to your .env file")
    console.log("4. Restart the server")
  }

  console.log("\n🎯 Ready to analyze designs!")
})

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down server...")
  process.exit(0)
})

process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error)
  process.exit(1)
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason)
  process.exit(1)
})
