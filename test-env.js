// Test script to check environment variables
require("dotenv").config()

console.log("=== Environment Variable Test ===")
console.log("Current working directory:", process.cwd())
console.log("__dirname:", __dirname)
console.log("")

console.log("=== Checking .env file ===")
const fs = require("fs")
const path = require("path")

// Check if .env file exists
const envPath = path.join(process.cwd(), ".env")
console.log("Looking for .env at:", envPath)
console.log(".env file exists:", fs.existsSync(envPath))

if (fs.existsSync(envPath)) {
  console.log(".env file contents:")
  const envContent = fs.readFileSync(envPath, "utf8")
  console.log(envContent)
} else {
  console.log("❌ .env file not found!")
}

console.log("")
console.log("=== Environment Variables ===")
console.log("process.env.OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "SET" : "NOT SET")
console.log("process.env.PORT:", process.env.PORT || "NOT SET")

console.log("")
console.log("=== All Environment Variables ===")
Object.keys(process.env)
  .filter((key) => key.includes("OPENAI") || key.includes("PORT"))
  .forEach((key) => {
    console.log(`${key}:`, process.env[key] ? "SET" : "NOT SET")
  })
