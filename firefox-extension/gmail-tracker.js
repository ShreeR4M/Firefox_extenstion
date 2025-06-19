class GmailTracker {
  constructor() {
    this.isEnabled = false;
    this.userEmail = '';
    this.observers = [];
    this.processedComposeWindows = new Set();
    this.eventListeners = new Map(); 
    
    this.init();
  }

  async init() {
    try {
      const settings = await browser.storage.local.get(['isEnabled', 'trackingEnabled', 'userEmail']);
      this.isEnabled = (settings.trackingEnabled !== undefined) ? 
                        settings.trackingEnabled : 
                        (settings.isEnabled !== undefined ? settings.isEnabled : true);
                        
      this.userEmail = settings.userEmail || '';
      
      if (!this.userEmail) {
        this.userEmail = this.detectUserEmail();
        if (this.userEmail) {
          browser.storage.local.set({ userEmail: this.userEmail });
        }
      }
      
      console.log('Gmail Tracker initialized with isEnabled:', this.isEnabled, 'userEmail:', this.userEmail);
      
      if (this.isEnabled) {
        this.setupGmailTracking();
      }
      
      browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
    } catch (error) {
      console.error('Error initializing Gmail Tracker:', error);
    }
  }

  detectUserEmail() {
    try {
      const selectors = [
        '[email]',
        '.gb_Ab',
        '.gb_Bb', 
        '[data-email]',
        '.gb_yb .gb_zb',
        '.gb_yb'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const email = element.getAttribute('email') || 
                       element.getAttribute('data-email') || 
                       element.textContent.trim() ||
                       element.title;
          
          if (email && email.includes('@')) {
            console.log('Auto-detected user email:', email);
            return email;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error detecting user email:', error);
      return null;
    }
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'TOGGLE_TRACKING':
        this.isEnabled = message.enabled;
        console.log('Tracking toggled:', this.isEnabled);
        
        if (this.isEnabled) {
          this.setupGmailTracking();
        } else {
          this.destroy();
        }
        break;
      
      case 'REFRESH_TRACKING':
        this.refreshTracking();
        break;
    }
  }

  setupGmailTracking() {
    console.log('Setting up Gmail tracking...');
    
    this.waitForGmail(() => {
      console.log('Gmail loaded, initializing tracker');
      this.observeCompose();
    });
  }
  
  waitForGmail(callback) {
    const MAX_ATTEMPTS = 20;
    let attempts = 0;
    
    const checkGmail = () => {
      attempts++;
      
      if (document.querySelector('.compose') || 
          document.querySelector('[role="main"]') || 
          document.querySelector('.aAU') ||
          document.querySelector('.z0')) {
        callback();
        return;
      }
      
      if (attempts < MAX_ATTEMPTS) {
        setTimeout(checkGmail, 500);
      } else {
        console.log('Gmail elements not found after maximum attempts');
      }
    };
    
    checkGmail();
  }

  observeCompose() {
    console.log('Setting up compose observer...');
    
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes && mutation.addedNodes.length) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const composeWindow = node.closest('.M9') || 
                                   node.closest('.aA5') || 
                                   (node.getAttribute('role') === 'dialog' ? node : null) ||
                                   node.querySelector('.M9') ||
                                   node.querySelector('.aA5') ||
                                   node.querySelector('[role="dialog"]');
                                
              if (composeWindow) {
                this.setupComposeBox(composeWindow);
              }
            }
          }
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    this.observers.push(observer);
  }
  
  setupComposeBox(composeWindow) {
    const windowId = this.getComposeWindowId(composeWindow);
    if (!windowId || this.processedComposeWindows.has(windowId)) {
      return;
    }
    
    console.log('Setting up compose box with ID:', windowId);
    this.processedComposeWindows.add(windowId);
    
    const sendButton = composeWindow.querySelector('[role="button"][data-tooltip^="Send"]') ||
                      composeWindow.querySelector('[data-tooltip^="Send"]') ||
                      composeWindow.querySelector('.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3');
    
    if (sendButton) {
      console.log('Found send button, attaching listener');
      
      const handleSend = this.createSendHandler(composeWindow);
      
      if (this.eventListeners.has(sendButton)) {
        const oldHandler = this.eventListeners.get(sendButton);
        sendButton.removeEventListener('click', oldHandler, { capture: true });
      }
      
      this.eventListeners.set(sendButton, handleSend);
      sendButton.addEventListener('click', handleSend, { capture: true });
      
      sendButton.dataset.trackerAttached = 'true';
    } else {
      console.log('Send button not found in compose window');
    }
  }

  createSendHandler(composeWindow) {
    return (e) => {
      if (!this.isEnabled) {
        console.log('Email tracking is disabled, not tracking this email');
        return;
      }
      
      console.log('Send button clicked, preparing to track email');
      this.handleSendClick(e, composeWindow);
    };
  }

  getComposeWindowId(composeWindow) {
    if (composeWindow.dataset.trackerId) {
      return composeWindow.dataset.trackerId;
    }
    
    const id = 'compose_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    composeWindow.dataset.trackerId = id;
    return id;
  }

  async handleSendClick(event, composeWindow) {
    console.log('Processing send click');
    
    if (event.target.dataset.processing === 'true') {
      console.log('Already processing this send click, skipping');
      return;
    }
    
    event.target.dataset.processing = 'true';
    
    try {
      const emailData = this.extractEmailData(composeWindow);
      
      if (!emailData || !emailData.recipient_email) {
        console.log('Could not extract email data');
        return;
      }
      
      console.log('Extracted email data:', emailData);
      
      const response = await browser.runtime.sendMessage({
        type: 'CREATE_TRACKING',
        data: emailData
      });
      
      if (response && response.success) {
        const trackingData = response.data;
        console.log('Tracking created successfully:', trackingData);
        
        this.injectTrackingPixel(composeWindow, trackingData.tracking_id);
        this.showTrackingNotification(emailData.email_subject);
      } else {
        console.error('Failed to create tracking:', response ? response.error : 'No response');
      }
    } catch (error) {
      console.error('Error creating tracking:', error);
    } finally {
      setTimeout(() => {
        if (event.target) {
          event.target.dataset.processing = 'false';
        }
      }, 1000);
    }
  }

  extractEmailData(composeWindow) {
    try {
      const toField = composeWindow.querySelector('[name="to"]') || 
                     composeWindow.querySelector('input[name="to"]') || 
                     composeWindow.querySelector('textarea[name="to"]');
      
      const subjectField = composeWindow.querySelector('[name="subjectbox"]') ||
                          composeWindow.querySelector('input[name="subject"]');
      
      const vR = composeWindow.querySelector('.vR');
      const aoT = composeWindow.querySelector('.aoT');
      
      let recipientEmail = '';
      let emailSubject = '';
      let senderEmail = this.userEmail;
      
      if (toField) {
        recipientEmail = toField.value || toField.innerText;
      } else if (vR) {
        recipientEmail = vR.getAttribute('email') || vR.innerText;
      }
      
      if (subjectField) {
        emailSubject = subjectField.value || subjectField.innerText;
      } else if (aoT) {
        emailSubject = aoT.value || aoT.innerText;
      }
      
      if (!senderEmail) {
        const userEmailEl = document.querySelector('[email]') ||
                           document.querySelector('.gb_Ab') ||
                           document.querySelector('.gb_Bb') ||
                           document.querySelector('[data-email]');
        
        if (userEmailEl) {
          senderEmail = userEmailEl.getAttribute('email') || 
                       userEmailEl.getAttribute('data-email') || 
                       userEmailEl.textContent.trim() ||
                       userEmailEl.title;
        }
      }
      
      if (!senderEmail) {
        senderEmail = 'unknown@gmail.com';
      }
      
      if (!recipientEmail) {
        console.log('Could not extract recipient email');
        return null;
      }
      
      return {
        recipient_email: recipientEmail.trim(),
        email_subject: emailSubject || 'No subject',
        sender_email: senderEmail
      };
    } catch (error) {
      console.error('Error extracting email data:', error);
      return null;
    }
  }

  injectTrackingPixel(composeWindow, trackingId) {
    console.log('Injecting tracking pixel for ID:', trackingId);
    
    let bodyElement = null;
    
    const iframe = composeWindow.querySelector('iframe.editable');
    if (iframe) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        bodyElement = iframeDoc.body;
      } catch (e) {
        console.error('Error accessing iframe document:', e);
      }
    }
    
    if (!bodyElement) {
      bodyElement = composeWindow.querySelector('[contenteditable="true"]') || 
                   composeWindow.querySelector('[g_editable="true"]') || 
                   composeWindow.querySelector('.Am.Al.editable');
    }
    
    if (!bodyElement) {
      console.error('Could not find email body element');
      return;
    }
    
    const pixelUrl = `http://localhost:8001/api/pixel/${trackingId}?cb=${Date.now()}`;
    const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" style="display:none !important; opacity:0 !important; visibility:hidden !important; max-height:1px !important; max-width:1px !important;" alt="" />`;
    
    try {
      if (bodyElement.innerHTML) {
        bodyElement.innerHTML += pixelHtml;
      } else {
        bodyElement.innerHTML = pixelHtml;
      }
      console.log('Tracking pixel inserted successfully');
    } catch (e) {
      console.error('Error inserting tracking pixel:', e);
    }
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
      animation: fadeIn 0.3s ease-in, fadeOut 0.5s ease-in 4.5s forwards;
    `;
    
    notification.textContent = `Tracking enabled for: ${subject.length > 30 ? subject.substring(0, 27) + '...' : subject}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
  
  refreshTracking() {
    console.log('Refreshing tracking...');
    browser.storage.local.get(['isEnabled', 'trackingEnabled', 'userEmail']).then(settings => {
      this.isEnabled = (settings.trackingEnabled !== undefined) ? 
                        settings.trackingEnabled : 
                        (settings.isEnabled !== undefined ? settings.isEnabled : true);
      this.userEmail = settings.userEmail || '';
      
      if (this.isEnabled) {
        this.destroy();
        this.setupGmailTracking();
      }
    });
  }
  
  destroy() {
    console.log('Destroying Gmail tracker...');
    
    this.eventListeners.forEach((handler, element) => {
      element.removeEventListener('click', handler, { capture: true });
    });
    this.eventListeners.clear();
    
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    this.processedComposeWindows.clear();
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