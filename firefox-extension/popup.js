class EmailTrackerPopup {
  constructor() {
    this.settings = {
      isEnabled: true,
      trackingEnabled: true,
      userEmail: ''
    };
    this.trackedEmails = [];
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
    this.loadTrackedEmails();
  }

  async loadSettings() {
    try {
      const response = await browser.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response.success) {
        this.settings = { ...this.settings, ...response.data };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showError('Failed to load settings');
    }
  }

  async saveSettings() {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        data: this.settings
      });
      
      if (!response.success) {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showError('Failed to save settings');
    }
  }

  setupEventListeners() {
    const enableTrackingToggle = document.getElementById('enableTracking');
    enableTrackingToggle.checked = this.settings.trackingEnabled;
    enableTrackingToggle.addEventListener('change', (e) => {
      this.settings.trackingEnabled = e.target.checked;
      this.saveSettings();

       browser.runtime.sendMessage({
          type: 'TOGGLE_TRACKING',
          enabled: e.target.checked
      });
    });

    const userEmailInput = document.getElementById('userEmail');
    userEmailInput.value = this.settings.userEmail;
    userEmailInput.addEventListener('blur', (e) => {
      const email = e.target.value.trim();
      if (this.validateEmail(email) || email === '') {
        this.settings.userEmail = email;
        this.saveSettings();
        this.clearEmailError();
        this.loadTrackedEmails(); 
      } else {
        this.showEmailError('Please enter a valid email address');
      }
    });

    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', () => {
      this.loadTrackedEmails();
    });
  }

  updateUI() {
    document.getElementById('enableTracking').checked = this.settings.trackingEnabled;
    document.getElementById('userEmail').value = this.settings.userEmail;
  }

  async loadTrackedEmails() {
  try {
    const emailsList = document.getElementById('emailsList');
    emailsList.innerHTML = '<div class="loading">Loading...</div>';

    const response = await browser.runtime.sendMessage({
      type: 'GET_TRACKED_EMAILS'
    });

    if (response.success) {
      this.trackedEmails = response.data;
      this.updateEmailsList();
      this.updateStats();
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error('Error loading tracked emails:', error);
    document.getElementById('emailsList').innerHTML = 
      '<div class="error">Failed to load emails. Please check your connection.</div>';
  }
}


  updateEmailsList() {
    const emailsList = document.getElementById('emailsList');
    
    if (this.trackedEmails.length === 0) {
      emailsList.innerHTML = '<div class="no-emails">No tracked emails yet.<br>Send an email to start tracking!</div>';
      return;
    }

    const emailsHtml = this.trackedEmails.slice(0, 5).map(email => {
      const statusClass = email.is_opened ? 'status-opened' : 'status-pending';
      const statusText = email.is_opened ? `Opened (${email.open_count}x)` : 'Pending';
      const sentDate = new Date(email.sent_at).toLocaleDateString();
      
      return `
        <div class="email-item">
          <div class="email-subject">${this.truncateText(email.email_subject, 40)}</div>
          <div class="email-meta">
            <span>To: ${this.truncateText(email.recipient_email, 25)}</span>
            <span class="status-badge ${statusClass}">${statusText}</span>
          </div>
          <div class="email-meta">
            <span style="font-size: 11px; color: #999;">Sent: ${sentDate}</span>
            ${email.is_opened ? `<span style="font-size: 11px; color: #999;">Opened: ${new Date(email.opened_at).toLocaleDateString()}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    emailsList.innerHTML = emailsHtml;
  }

  updateStats() {
    const totalEmails = this.trackedEmails.length;
    const openedEmails = this.trackedEmails.filter(email => email.is_opened).length;
    const openRate = totalEmails > 0 ? Math.round((openedEmails / totalEmails) * 100) : 0;

    document.getElementById('totalEmails').textContent = totalEmails;
    document.getElementById('openedEmails').textContent = openedEmails;
    document.getElementById('openRate').textContent = `${openRate}%`;
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  showEmailError(message) {
    const errorElement = document.getElementById('emailError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }

  clearEmailError() {
    const errorElement = document.getElementById('emailError');
    errorElement.style.display = 'none';
  }

  showError(message) {
    console.error('Popup error:', message);
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new EmailTrackerPopup();
});