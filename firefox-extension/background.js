const API_BASE_URL = 'http://localhost:8001/api';

browser.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details);
  
  browser.storage.local.set({
    isEnabled: true,
    trackingEnabled: true,
    apiUrl: API_BASE_URL,
    userEmail: ''
  });
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.type) {
    case 'CREATE_TRACKING':
      createEmailTracking(message.data)
        .then(response => sendResponse({ success: true, data: response }))
        .catch(error => sendResponse({ success: false, error: error.message }));
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
  }
});

async function createEmailTracking(emailData) {
  try {
    const response = await fetch(`${API_BASE_URL}/track/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Email tracking created:', result);
    return result;
  } catch (error) {
    console.error('Error creating email tracking:', error);
    throw error;
  }
}

async function getTrackedEmails(senderEmail) {
  try {
    const url = senderEmail 
      ? `${API_BASE_URL}/track/emails?sender_email=${encodeURIComponent(senderEmail)}`
      : `${API_BASE_URL}/track/emails`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Tracked emails retrieved:', result);
    return result;
  } catch (error) {
    console.error('Error getting tracked emails:', error);
    throw error;
  }
}

function generatePixelUrl(trackingId) {
  return `${API_BASE_URL}/pixel/${trackingId}`;
}

browser.contextMenus.create({
  id: "trackEmail",
  title: "Track this email",
  contexts: ["selection"]
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "trackEmail") {
    browser.tabs.sendMessage(tab.id, {
      type: 'TRACK_SELECTED_EMAIL',
      selectedText: info.selectionText
    });
  }
});

function showNotification(title, message) {
  browser.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: title,
    message: message
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createEmailTracking,
    getTrackedEmails,
    generatePixelUrl
  };
}