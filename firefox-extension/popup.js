document.addEventListener('DOMContentLoaded', function() {
    const trackButton = document.getElementById('trackButton');
    const statusMessage = document.getElementById('statusMessage');

    trackButton.addEventListener('click', function() {
        // Logic to start tracking Gmail activities
        startTracking();
    });

    function startTracking() {
        // Placeholder for tracking logic
        statusMessage.textContent = 'Tracking started...';
        
        // You can add more functionality here to interact with gmail-tracker.js
    }
});