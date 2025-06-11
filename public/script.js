document.addEventListener("DOMContentLoaded", () => {
  // Configuration
  const API_BASE_URL = `http://localhost:${window.location.port || 3001}/api` // Automatically use the correct port

  // Tab switching functionality
  const tabBtns = document.querySelectorAll(".tab-btn")
  const tabPanes = document.querySelectorAll(".tab-pane")

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      tabBtns.forEach((b) => b.classList.remove("active"))
      tabPanes.forEach((p) => p.classList.remove("active"))

      this.classList.add("active")
      const tabId = this.getAttribute("data-tab")
      document.getElementById(tabId).classList.add("active")
    })
  })

  // File upload functionality
  const fileInput = document.getElementById("file-input")
  const fileName = document.getElementById("file-name")
  const fileUpload = document.querySelector(".file-upload")

  fileInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      fileName.textContent = this.files[0].name

      if (this.files[0].type.match("image.*")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          sessionStorage.setItem("uploadedImage", e.target.result)
        }
        reader.readAsDataURL(this.files[0])
      }
    }
  })

  // Drag and drop functionality
  fileUpload.addEventListener("dragover", function (e) {
    e.preventDefault()
    this.style.borderColor = "var(--primary-color)"
  })

  fileUpload.addEventListener("dragleave", function () {
    this.style.borderColor = "var(--border-color)"
  })

  fileUpload.addEventListener("drop", function (e) {
    e.preventDefault()
    this.style.borderColor = "var(--border-color)"

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      fileInput.files = e.dataTransfer.files
      fileName.textContent = e.dataTransfer.files[0].name

      if (e.dataTransfer.files[0].type.match("image.*")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          sessionStorage.setItem("uploadedImage", e.target.result)
        }
        reader.readAsDataURL(e.dataTransfer.files[0])
      }
    }
  })

  // Form submission with GPT-4 integration
  const screenshotForm = document.getElementById("screenshot-form")
  const figmaForm = document.getElementById("figma-form")
  const uploadSection = document.getElementById("upload")
  const resultsSection = document.getElementById("results")
  const designImage = document.getElementById("design-image")
  const backBtn = document.getElementById("back-btn")

  screenshotForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    if (fileInput.files && fileInput.files[0]) {
      showLoading()

      // Add status message
      const statusMsg = document.createElement("div")
      statusMsg.className = "status-message"
      statusMsg.innerHTML = `
        <p>Analyzing your design with GPT-4...</p>
        <p class="small">This may take 15-30 seconds depending on the complexity of your design.</p>
      `
      document.querySelector(".upload-container").appendChild(statusMsg)

      try {
        // Create FormData for file upload
        const formData = new FormData()
        formData.append("screenshot", fileInput.files[0])

        // Call backend API
        const response = await fetch(`${API_BASE_URL}/analyze-screenshot`, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`)
        }

        const result = await response.json()

        if (result.success) {
          // Display results
          displayAnalysisResults(result.analysis)

          // Display the uploaded image
          const uploadedImage = sessionStorage.getItem("uploadedImage")
          if (uploadedImage) {
            const img = document.createElement("img")
            img.src = uploadedImage
            designImage.innerHTML = ""
            designImage.appendChild(img)
          }

          // Show results section
          uploadSection.classList.add("hidden")
          resultsSection.classList.remove("hidden")
          resultsSection.scrollIntoView({ behavior: "smooth" })
        } else {
          throw new Error(result.error || "Analysis failed")
        }
      } catch (error) {
        console.error("Error:", error)
        showErrorMessage(`Error analyzing design: ${error.message}`)
      } finally {
        hideLoading()
        // Remove status message
        const statusMsg = document.querySelector(".status-message")
        if (statusMsg) statusMsg.remove()
      }
    } else {
      showErrorMessage("Please upload a screenshot first.")
    }
  })

  figmaForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const figmaLink = document.getElementById("figma-link").value

    if (figmaLink) {
      showLoading()

      // Add status message
      const statusMsg = document.createElement("div")
      statusMsg.className = "status-message"
      statusMsg.innerHTML = `
        <p>Analyzing your Figma design with GPT-4...</p>
        <p class="small">This may take 15-30 seconds.</p>
      `
      document.querySelector(".upload-container").appendChild(statusMsg)

      try {
        // Call backend API for Figma analysis
        const response = await fetch(`${API_BASE_URL}/analyze-figma`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ figmaUrl: figmaLink }),
        })

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`)
        }

        const result = await response.json()

        if (result.success) {
          // Display results
          displayAnalysisResults(result.analysis)

          // Display Figma placeholder
          designImage.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"></path>
                <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"></path>
                <path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z"></path>
                <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z"></path>
                <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"></path>
              </svg>
              <p style="margin-top: 1rem;">Figma Design</p>
              <p style="font-size: 0.8rem; color: var(--text-light);">${figmaLink}</p>
            </div>
          `

          // Show results section
          uploadSection.classList.add("hidden")
          resultsSection.classList.remove("hidden")
          resultsSection.scrollIntoView({ behavior: "smooth" })
        } else {
          throw new Error(result.error || "Analysis failed")
        }
      } catch (error) {
        console.error("Error:", error)
        showErrorMessage(`Error analyzing Figma design: ${error.message}`)
      } finally {
        hideLoading()
        // Remove status message
        const statusMsg = document.querySelector(".status-message")
        if (statusMsg) statusMsg.remove()
      }
    } else {
      showErrorMessage("Please enter a valid Figma link.")
    }
  })

  backBtn.addEventListener("click", () => {
    resultsSection.classList.add("hidden")
    uploadSection.classList.remove("hidden")
    uploadSection.scrollIntoView({ behavior: "smooth" })
  })

  // Function to display analysis results from GPT-4
  function displayAnalysisResults(analysis) {
    const feedbackSection = document.querySelector(".feedback-list")

    // Clear existing feedback
    feedbackSection.innerHTML = ""

    // Add overall score with visual indicator
    const overallScore = document.createElement("div")
    overallScore.className = "feedback-item overall-score"

    // Create score indicator
    const scoreValue = analysis.overallScore || 7
    const scoreColor = getScoreColor(scoreValue)

    overallScore.innerHTML = `
      <div class="score-container">
        <div class="score-circle" style="background: ${scoreColor}">
          <span>${scoreValue}</span>
        </div>
        <div class="score-label">
          <h4>Overall UX Score</h4>
          <p>${getScoreLabel(scoreValue)}</p>
        </div>
      </div>
      <p class="summary">${analysis.summary}</p>
    `
    feedbackSection.appendChild(overallScore)

    // Add individual feedback items
    if (analysis.feedback && analysis.feedback.length) {
      analysis.feedback.forEach((item) => {
        if (item.heuristic === "General Analysis") return // Skip general analysis as it's redundant

        const feedbackItem = document.createElement("div")
        feedbackItem.className = "feedback-item"

        const issuesList =
          item.issues && item.issues.length ? item.issues.map((issue) => `<li>${issue}</li>`).join("") : ""

        const suggestionsList =
          item.suggestions && item.suggestions.length
            ? item.suggestions.map((suggestion) => `<li>${suggestion}</li>`).join("")
            : ""

        feedbackItem.innerHTML = `
          <h4>${item.heuristic} ${item.score ? `(Score: ${item.score}/10)` : ""}</h4>
          <p>${item.assessment || ""}</p>
          ${
            issuesList
              ? `
            <div class="issues">
              <strong>Issues Identified:</strong>
              <ul>
                ${issuesList}
              </ul>
            </div>
          `
              : ""
          }
          ${
            suggestionsList
              ? `
            <div class="suggestion">
              <strong>Suggestions:</strong>
              <ul>
                ${suggestionsList}
              </ul>
            </div>
          `
              : ""
          }
        `
        feedbackSection.appendChild(feedbackItem)
      })
    } else {
      // If no structured feedback, display the summary
      const generalFeedback = document.createElement("div")
      generalFeedback.className = "feedback-item"
      generalFeedback.innerHTML = `
        <h4>Design Analysis</h4>
        <p>${analysis.summary || "Analysis completed successfully."}</p>
      `
      feedbackSection.appendChild(generalFeedback)
    }
  }

  // Helper function to get color based on score
  function getScoreColor(score) {
    if (score >= 8) return "linear-gradient(135deg, #34d399, #10b981)"
    if (score >= 6) return "linear-gradient(135deg, #fbbf24, #f59e0b)"
    return "linear-gradient(135deg, #f87171, #ef4444)"
  }

  // Helper function to get label based on score
  function getScoreLabel(score) {
    if (score >= 8) return "Excellent"
    if (score >= 6) return "Good"
    if (score >= 4) return "Needs Improvement"
    return "Poor"
  }

  // Helper functions for loading states
  function showLoading() {
    const submitBtns = document.querySelectorAll(".submit-btn")
    submitBtns.forEach((btn) => {
      btn.disabled = true
      btn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style="display: inline-block; animation: spin 1s linear infinite;">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Analyzing with GPT-4...
      `
    })
  }

  function hideLoading() {
    const submitBtns = document.querySelectorAll(".submit-btn")
    submitBtns.forEach((btn) => {
      btn.disabled = false
      btn.innerHTML = "Analyze Design"
    })
  }

  // Error message display
  function showErrorMessage(message) {
    // Remove any existing error messages
    const existingError = document.querySelector(".error-message")
    if (existingError) existingError.remove()

    // Create new error message
    const errorDiv = document.createElement("div")
    errorDiv.className = "error-message"
    errorDiv.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>${message}</span>
      <button class="close-btn">&times;</button>
    `

    // Insert at the top of the form
    const formContainer = document.querySelector(".upload-container")
    formContainer.insertBefore(errorDiv, formContainer.firstChild)

    // Add close button functionality
    const closeBtn = errorDiv.querySelector(".close-btn")
    closeBtn.addEventListener("click", () => {
      errorDiv.remove()
    })

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove()
      }
    }, 5000)
  }

  // Mobile navigation toggle
  const header = document.querySelector("header")
  let lastScrollTop = 0

  window.addEventListener(
    "scroll",
    () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop

      if (scrollTop > lastScrollTop) {
        header.style.transform = "translateY(-100%)"
      } else {
        header.style.transform = "translateY(0)"
      }

      lastScrollTop = scrollTop <= 0 ? 0 : scrollTop
    },
    { passive: true },
  )
})
