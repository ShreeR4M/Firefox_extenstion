class GmailTracker {
  constructor() {
    this.isEnabled = false;
    this.userEmail = '';
    this.observers = [];
    this.init();
  }

  async init() {
    await this.loadSettings();
    
    if (this.isEnabled) {
      this.setupGmailTracking();
    }
    
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });
  }

  async loadSettings() {
    try {
      const response = await browser.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response.success) {
        this.isEnabled = response.data.isEnabled && response.data.trackingEnabled;
        this.userEmail = response.data.userEmail || '';
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'TRACK_SELECTED_EMAIL':
        this.trackSelectedEmail(message.selectedText);
        break;
      case 'REFRESH_TRACKING':
        this.refreshTracking();
        break;
    }
  }

  setupGmailTracking() {
    console.log('Setting up Gmail tracking...');
    
    this.waitForGmail(() => {
      this.observeCompose();
      this.observeSendButton();
    });
  }

  waitForGmail(callback) {
    const checkGmail = () => {
      if (this.isGmailLoaded()) {
        callback();
      } else {
        setTimeout(checkGmail, 1000);
      }
    };
    checkGmail();
  }

  isGmailLoaded() {
    return document.querySelector('[role="main"]') !== null ||
           document.querySelector('.nH') !== null ||
           document.querySelector('.Kj-JD') !== null;
  }

  observeCompose() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (this.isComposeWindow(node)) {
              this.attachToCompose(node);
            }
            
            const composeWindows = node.querySelectorAll ? 
              node.querySelectorAll('[role="dialog"]') : [];
            composeWindows.forEach(compose => {
              if (this.isComposeWindow(compose)) {
                this.attachToCompose(compose);
              }
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observers.push(observer);
  }

  isComposeWindow(element) {
    return element.querySelector('[name="to"]') !== null ||
           element.querySelector('[name="subjectbox"]') !== null ||
           element.querySelector('.Ar.Au') !== null ||
           element.querySelector('.aoD.hl') !== null;
  }

  attachToCompose(composeWindow) {
    console.log('Attaching to compose window:', composeWindow);
    
    const sendButton = this.findSendButton(composeWindow);
    if (sendButton && !sendButton.dataset.trackerAttached) {
      sendButton.dataset.trackerAttached = 'true';
      sendButton.addEventListener('click', (e) => {
        this.handleSendClick(e, composeWindow);
      });
    }
  }

  findSendButton(composeWindow) {
    const selectors = [
      '[role="button"][data-tooltip*="Send"]',
      '.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3',
      '.T-I.J-J5-Ji.aoO.T-I-atl.L3',
      '[data-tooltip="Send"]',
      '.dC [role="button"]'
    ];
    
    for (const selector of selectors) {
      const button = composeWindow.querySelector(selector);
      if (button && (button.textContent.includes('Send') || button.getAttribute('data-tooltip')?.includes('Send'))) {
        return button;
      }
    }
    
    return null;
  }

  async handleSendClick(event, composeWindow) {
    if (!this.isEnabled) return;
    
    console.log('Send button clicked, preparing tracking...');
    
    const emailData = this.extractEmailData(composeWindow);
    if (!emailData) {
      console.log('Could not extract email data');
      return;
    }
    
    try {
      const response = await browser.runtime.sendMessage({
        type: 'CREATE_TRACKING',
        data: emailData
      });
      
      if (response.success) {
        const trackingData = response.data;
        console.log('Tracking created:', trackingData);
        
        this.injectTrackingPixel(composeWindow, trackingData.tracking_id);
        
        this.showTrackingNotification(emailData.email_subject);
      } else {
        console.error('Failed to create tracking:', response.error);
      }
    } catch (error) {
      console.error('Error creating tracking:', error);
    }
  }

  extractEmailData(composeWindow) {
    try {
      const toField = composeWindow.querySelector('[name="to"]') || 
                     composeWindow.querySelector('.vR') ||
                     composeWindow.querySelector('[email]');
      
      const subjectField = composeWindow.querySelector('[name="subjectbox"]') ||
                          composeWindow.querySelector('.aoT');
      
      let senderEmail = this.userEmail;
      if (!senderEmail) {
        const userEmailEl = document.querySelector('[email]') ||
                           document.querySelector('.gb_7.gb_Ia');
        if (userEmailEl) {
          senderEmail = userEmailEl.getAttribute('email') || userEmailEl.textContent;
        }
      }
      
      const recipientEmail = toField ? toField.value || toField.textContent : '';
      const subject = subjectField ? subjectField.value || subjectField.textContent : 'No Subject';
      
      if (!recipientEmail || !senderEmail) {
        console.log('Missing email data:', { recipientEmail, senderEmail, subject });
        return null;
      }
      
      return {
        email_subject: subject,
        recipient_email: recipientEmail,
        sender_email: senderEmail
      };
    } catch (error) {
      console.error('Error extracting email data:', error);
      return null;
    }
  }

  injectTrackingPixel(composeWindow, trackingId) {
    const iframe = composeWindow.querySelector('iframe.editable');
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    const body = doc.querySelector('body');

    if (!body) return;

    const protocol = window.location.protocol;
    const host = browser.runtime.getURL('').replace(/\/$/, '');

    const pixelUrl = `${protocol}//${host}/api/pixel/${trackingId}`;
    const img = document.createElement('img');

    img.src = pixelUrl + '?cb=' + Date.now();
    img.width = 1;
    img.height = 1;
    img.style.cssText = 'display:none!important;visibility:hidden!important;';
    body.appendChild(img);
    
}
  showTrackingNotification(subject) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    notification.textContent = `🦊 Email tracking enabled for: ${subject}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  observeSendButton() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const sendButtons = node.querySelectorAll ? 
              node.querySelectorAll('[data-tooltip*="Send"], .T-I.aoO') : [];
            sendButtons.forEach(button => {
              if (!button.dataset.trackerAttached) {
                const composeWindow = button.closest('[role="dialog"]');
                if (composeWindow) {
                  this.attachToCompose(composeWindow);
                }
              }
            });
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    this.observers.push(observer);
  }

  refreshTracking() {
    console.log('Refreshing tracking setup...');
    this.loadSettings().then(() => {
      if (this.isEnabled) {
        this.setupGmailTracking();
      }
    });
  }
  
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

let gmailTracker;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    gmailTracker = new GmailTracker();
  });
} else {
  gmailTracker = new GmailTracker();
}

let currentUrl = location.href;
const urlObserver = new MutationObserver(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    console.log('Page navigation detected, reinitializing tracker');
    if (gmailTracker) {
      gmailTracker.destroy();
    }
    setTimeout(() => {
      gmailTracker = new GmailTracker();
    }, 1000);
  }
});

urlObserver.observe(document.body, {
  childList: true,
  subtree: true
});