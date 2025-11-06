/**
 * Application State Management Module
 * 
 * This module manages the application state using immutable updates.
 * All state changes create new objects rather than mutating existing ones.
 * This approach makes the code more predictable and easier to debug.
 */
const AppState = {
  capabilities: {},
  
  // Initialize state from API
  async init() {
    await this.fetchCapabilities();
  },
  
  // Fetch capabilities and update state immutably
  async fetchCapabilities() {
    try {
      const response = await fetch("/capabilities");
      const data = await response.json();
      
      // Immutably update state
      this.capabilities = { ...data };
      this.render();
    } catch (error) {
      console.error("Error fetching capabilities:", error);
      UI.showError("Failed to load capabilities. Please try again later.");
    }
  },
  
  // Register a consultant - immutable state update
  async registerConsultant(capability, email) {
    try {
      const response = await fetch(
        `/capabilities/${encodeURIComponent(capability)}/register?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );
      
      const result = await response.json();
      
      if (response.ok) {
        // Immutably update state
        this.capabilities = {
          ...this.capabilities,
          [capability]: {
            ...this.capabilities[capability],
            consultants: [...this.capabilities[capability].consultants, email]
          }
        };
        this.render();
        UI.showMessage(result.message, 'success');
        return true;
      } else {
        UI.showMessage(result.detail || "An error occurred", 'error');
        return false;
      }
    } catch (error) {
      console.error("Error registering:", error);
      UI.showMessage("Failed to register. Please try again.", 'error');
      return false;
    }
  },
  
  // Unregister a consultant - immutable state update
  async unregisterConsultant(capability, email) {
    try {
      const response = await fetch(
        `/capabilities/${encodeURIComponent(capability)}/unregister?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      
      const result = await response.json();
      
      if (response.ok) {
        // Immutably update state
        this.capabilities = {
          ...this.capabilities,
          [capability]: {
            ...this.capabilities[capability],
            consultants: this.capabilities[capability].consultants.filter(c => c !== email)
          }
        };
        this.render();
        UI.showMessage(result.message, 'success');
      } else {
        UI.showMessage(result.detail || "An error occurred", 'error');
      }
    } catch (error) {
      console.error("Error unregistering:", error);
      UI.showMessage("Failed to unregister. Please try again.", 'error');
    }
  },
  
  // Render the UI based on current state
  render() {
    UI.renderCapabilities(this.capabilities);
    UI.renderCapabilitySelect(this.capabilities);
  }
};

/**
 * UI Rendering Module
 * 
 * This module is responsible for all DOM manipulation and rendering.
 * It is completely separated from state management, following the 
 * separation of concerns principle.
 */
const UI = {
  elements: {
    capabilitiesList: null,
    capabilitySelect: null,
    registerForm: null,
    messageDiv: null
  },
  
  init() {
    this.elements.capabilitiesList = document.getElementById("capabilities-list");
    this.elements.capabilitySelect = document.getElementById("capability");
    this.elements.registerForm = document.getElementById("register-form");
    this.elements.messageDiv = document.getElementById("message");
    
    // Set up form submission handler
    this.elements.registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const capability = document.getElementById("capability").value;
      
      const success = await AppState.registerConsultant(capability, email);
      if (success) {
        this.elements.registerForm.reset();
      }
    });
  },
  
  renderCapabilities(capabilities) {
    if (!this.elements.capabilitiesList) return;
    
    // Clear existing content
    this.elements.capabilitiesList.innerHTML = "";
    
    // Render each capability card
    Object.entries(capabilities).forEach(([name, details]) => {
      const card = this.createCapabilityCard(name, details);
      this.elements.capabilitiesList.appendChild(card);
    });
  },
  
  createCapabilityCard(name, details) {
    const capabilityCard = document.createElement("div");
    capabilityCard.className = "capability-card";
    
    const availableCapacity = details.capacity || 0;
    const currentConsultants = details.consultants ? details.consultants.length : 0;
    
    // Create consultants HTML
    const consultantsHTML = details.consultants && details.consultants.length > 0
      ? `<div class="consultants-section">
          <h5>Registered Consultants:</h5>
          <ul class="consultants-list">
            ${details.consultants.map(email => 
              `<li>
                <span class="consultant-email">${email}</span>
                <button class="delete-btn" data-capability="${name}" data-email="${email}">❌</button>
              </li>`
            ).join("")}
          </ul>
        </div>`
      : `<p><em>No consultants registered yet</em></p>`;
    
    capabilityCard.innerHTML = `
      <h4>${name}</h4>
      <p>${details.description}</p>
      <p><strong>Practice Area:</strong> ${details.practice_area}</p>
      <p><strong>Industry Verticals:</strong> ${details.industry_verticals ? details.industry_verticals.join(', ') : 'Not specified'}</p>
      <p><strong>Capacity:</strong> ${availableCapacity} hours/week available</p>
      <p><strong>Current Team:</strong> ${currentConsultants} consultants</p>
      <div class="consultants-container">
        ${consultantsHTML}
      </div>
    `;
    
    // Add event listeners to delete buttons
    capabilityCard.querySelectorAll(".delete-btn").forEach(button => {
      button.addEventListener("click", (e) => {
        const capability = e.target.getAttribute("data-capability");
        const email = e.target.getAttribute("data-email");
        AppState.unregisterConsultant(capability, email);
      });
    });
    
    return capabilityCard;
  },
  
  renderCapabilitySelect(capabilities) {
    if (!this.elements.capabilitySelect) return;
    
    // Keep the default option, clear the rest
    this.elements.capabilitySelect.innerHTML = '<option value="">-- Select a capability --</option>';
    
    // Add capability options
    Object.keys(capabilities).forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      this.elements.capabilitySelect.appendChild(option);
    });
  },
  
  showMessage(message, type) {
    if (!this.elements.messageDiv) return;
    
    this.elements.messageDiv.textContent = message;
    this.elements.messageDiv.className = type;
    this.elements.messageDiv.classList.remove("hidden");
    
    setTimeout(() => {
      this.elements.messageDiv.classList.add("hidden");
    }, 5000);
  },
  
  showError(message) {
    if (!this.elements.capabilitiesList) return;
    this.elements.capabilitiesList.innerHTML = `<p>${message}</p>`;
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize UI
  UI.init();
  
  // Initialize application state
  await AppState.init();
});

