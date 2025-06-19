const API_BASE_URL = 'http://localhost:8001/api';

browser.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details);
  
  browser.storage.local.set({
    isEnabled: true,
    trackingEnabled: true,
    userEmail: ''
  }).then(() => {
    console.log("Default settings initialized");
  });
});

function showNotification(title, message) {
  browser.notifications.create({
    type: 'basic',
    iconUrl: browser.runtime.getURL('icons/icon-48.png'),
    title: title,
    message: message
  });
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.type) {
    case 'CREATE_TRACKING':
      createEmailTracking(message.data)
        .then(response => {
          console.log('Tracking created successfully:', response);
          sendResponse({ success: true, data: response });
        })
        .catch(error => {
          console.error('Error creating tracking:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; 
      
    case 'GET_TRACKED_EMAILS':
      getTrackedEmails(message.senderEmail)
        .then(response => sendResponse({ success: true, data: response }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'GET_SETTINGS':
      browser.storage.local.get(['isEnabled', 'trackingEnabled', 'userEmail'])
        .then(settings => sendResponse({ success: true, data: settings }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'SAVE_SETTINGS':
      browser.storage.local.set(message.data)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'TOGGLE_TRACKING':
      browser.storage.local.set({ 
        isEnabled: message.enabled, 
        trackingEnabled: message.enabled 
      })
      .then(() => {
        console.log('Tracking toggled:', message.enabled);
        showNotification(
          'Email Tracking', 
          `Email tracking has been ${message.enabled ? 'enabled' : 'disabled'}`
        );
        sendResponse({ success: true });
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'SHOW_NOTIFICATION':
      showNotification(message.title || 'Email Tracker', message.message || '');
      sendResponse({ success: true });
      return true;
  }
});

async function createEmailTracking(emailData) {
  try {
    console.log('Creating email tracking with data:', emailData);
    console.log('Sending request to:', `${API_BASE_URL}/track/email`);
    
    const response = await fetch(`${API_BASE_URL}/track/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const text = await response.text();
      console.error('Error response:', text);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Email tracking created successfully:', result);
    return result;
  } catch (error) {
    console.error('Error creating email tracking:', error, error.stack);
    throw error;
  }
}

async function getTrackedEmails(senderEmail) {
  try {
    let url = `${API_BASE_URL}/track/emails`;
    if (senderEmail && senderEmail.trim()) {
      url += `?sender_email=${encodeURIComponent(senderEmail)}`;
    }
    
    console.log('Fetching tracked emails from:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Tracked emails retrieved:', result.length);
    return result;
  } catch (error) {
    console.error('Error getting tracked emails:', error);
    throw error;
  }
}

function generatePixelUrl(trackingId) {
  return `${API_BASE_URL}/pixel/${trackingId}`;
}