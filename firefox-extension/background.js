// This file manages background tasks and events for the Firefox extension.

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed");
});

chrome.runtime.onStartup.addListener(() => {
    console.log("Extension started");
});

// Example of listening for a browser action click
chrome.browserAction.onClicked.addListener((tab) => {
    console.log("Browser action clicked", tab);
});

// Additional background logic can be added here.