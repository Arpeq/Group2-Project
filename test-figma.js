// Test script for Figma API integration
require("dotenv").config()

console.log("🔍 Figma API Debug Test")
console.log("======================")

// Check environment variables
console.log("\n📋 Environment Check:")
console.log("- FIGMA_ACCESS_TOKEN:", process.env.FIGMA_ACCESS_TOKEN ? "✅ Set" : "❌ Not set")
if (process.env.FIGMA_ACCESS_TOKEN) {
  console.log("- Token starts with 'figd_':", process.env.FIGMA_ACCESS_TOKEN.startsWith("figd_") ? "✅ Yes" : "❌ No")
  console.log("- Token length:", process.env.FIGMA_ACCESS_TOKEN.length)
}

// Test URL parsing
function extractFigmaFileInfo(figmaUrl) {
  console.log(`\n🔗 Testing URL: ${figmaUrl}`)

  const urlPattern = /figma\.com\/(?:file|proto)\/([a-zA-Z0-9]+)(?:\/.*)?(?:\?.*node-id=([^&]+))?/
  const match = figmaUrl.match(urlPattern)

  if (!match) {
    console.log("❌ URL doesn't match expected pattern")
    return null
  }

  const result = {
    fileId: match[1],
    nodeId: match[2] ? decodeURIComponent(match[2]) : null,
  }

  console.log("✅ Extracted info:", result)
  return result
}

// Test Figma API call
async function testFigmaAPI(fileId) {
  const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN

  if (!FIGMA_ACCESS_TOKEN) {
    console.log("❌ No Figma access token found")
    return
  }

  console.log(`\n📡 Testing Figma API call for file: ${fileId}`)

  try {
    const response = await fetch(`https://api.figma.com/v1/files/${fileId}`, {
      headers: {
        "X-Figma-Token": FIGMA_ACCESS_TOKEN,
      },
    })

    console.log("📊 Response status:", response.status)
    console.log("📊 Response headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.log("❌ Error response body:", errorText)

      if (response.status === 404) {
        console.log("\n🔍 404 Error Troubleshooting:")
        console.log("- File ID might be incorrect")
        console.log("- File might be private and token doesn't have access")
        console.log("- Token might be invalid or expired")
      } else if (response.status === 403) {
        console.log("\n🔍 403 Error Troubleshooting:")
        console.log("- Token doesn't have permission to access this file")
        console.log("- File might be in a team you don't have access to")
      }
      return
    }

    const data = await response.json()
    console.log("✅ Success! File info:")
    console.log("- Name:", data.name)
    console.log("- Last modified:", data.lastModified)
    console.log("- Pages:", data.document.children.length)

    // Show first few frames
    if (data.document.children[0] && data.document.children[0].children) {
      console.log("- First page frames:", data.document.children[0].children.length)
      console.log(
        "- Frame names:",
        data.document.children[0].children.slice(0, 3).map((f) => f.name),
      )
    }
  } catch (error) {
    console.log("❌ Network error:", error.message)
  }
}

// Main test function
async function runTests() {
  // Test with some common Figma URL formats
  const testUrls = [
    "https://www.figma.com/file/ABC123/Test-Design",
    "https://www.figma.com/file/ABC123/Test-Design?node-id=1%3A2",
    "https://www.figma.com/proto/ABC123/Test-Design",
  ]

  console.log("\n🧪 Testing URL parsing:")
  testUrls.forEach((url) => extractFigmaFileInfo(url))

  // Test with a real file ID if provided
  const args = process.argv.slice(2)
  if (args.length > 0) {
    const testUrl = args[0]
    console.log(`\n🎯 Testing with provided URL: ${testUrl}`)

    const fileInfo = extractFigmaFileInfo(testUrl)
    if (fileInfo && fileInfo.fileId) {
      await testFigmaAPI(fileInfo.fileId)
    }
  } else {
    console.log("\n💡 To test with a real Figma file, run:")
    console.log("node test-figma.js 'https://www.figma.com/file/YOUR_FILE_ID/Your-Design'")
  }

  console.log("\n📝 Next Steps:")
  console.log("1. Make sure your Figma access token is correct")
  console.log("2. Test with a public Figma file first")
  console.log("3. Ensure the file ID in the URL is correct")
  console.log("4. Check that your token has access to the file")
}

runTests().catch(console.error)
