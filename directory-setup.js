// This script creates the necessary directories for your project
const fs = require("fs")
const path = require("path")

// Create directories
const dirs = ["public", "uploads"]

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
    console.log(`Created directory: ${dir}`)
  } else {
    console.log(`Directory already exists: ${dir}`)
  }
})

// Move frontend files to public directory
const frontendFiles = ["index.html", "styles.css", "script.js"]
frontendFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join("public", file))
    console.log(`Copied ${file} to public directory`)
  }
})

console.log("Project structure setup complete!")
