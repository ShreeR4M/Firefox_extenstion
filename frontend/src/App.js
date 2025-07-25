import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';


function App() {
  const [trackedEmails, setTrackedEmails] = useState([]);
  const [testEmail, setTestEmail] = useState({
    email_subject: '',
    recipient_email: '',
    sender_email: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadTrackedEmails();
    
    // Set up periodic refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      loadTrackedEmails();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  const loadTrackedEmails = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/track/emails`);
      setTrackedEmails(response.data);
    } catch (error) {
      console.error('Error loading tracked emails:', error);
    }
  };

  const createTrackingEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${BACKEND_URL}/api/track/email`, testEmail);
      setMessage(`Email tracking created! Tracking ID: ${response.data.tracking_id}`);
      setTestEmail({ email_subject: '', recipient_email: '', sender_email: '' });
      loadTrackedEmails();
    } catch (error) {
      setMessage('Error creating email tracking: ' + error.message);
    }
    setLoading(false);
  };

  const simulateEmailOpen = async (trackingId) => {
    try {
      await axios.post(`${BACKEND_URL}/api/track/open/${trackingId}`);
      setMessage('Email open simulated!');
      loadTrackedEmails();
    } catch (error) {
      setMessage('Error simulating email open: ' + error.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not opened';
    return new Date(dateString).toLocaleString();
  };

  const getPixelUrls = (trackingId) => {
    return {
      redirect: `${BACKEND_URL}/api/r/${trackingId}`,
      alternateRedirect: `${BACKEND_URL}/api/t/${trackingId}`,
      direct: `${BACKEND_URL}/api/pixel/${trackingId}`,
    };
  };

  const generateAdvancedTrackingPixelHtml = (trackingId) => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    
    return `<!-- Advanced Multi-Pixel Tracking -->
<img src="${BACKEND_URL}/api/r/${trackingId}" width="1" height="1" style="display:none;" alt="" />
<img src="${BACKEND_URL}/api/t/${trackingId}" width="1" height="1" style="display:none;" alt="" />
<img src="${BACKEND_URL}/api/pixel/${trackingId}?cb=${timestamp}&r=${randomId}" width="1" height="1" style="display:none;" alt="" />`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🦊 Firefox Email Tracker
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Advanced email tracking with redirect chains - Bypass Gmail image caching
          </p>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {/* Create Tracking Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">Create Email Tracking</h2>
          <form onSubmit={createTrackingEmail} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={testEmail.email_subject}
                  onChange={(e) => setTestEmail({...testEmail, email_subject: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email subject"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={testEmail.recipient_email}
                  onChange={(e) => setTestEmail({...testEmail, recipient_email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="recipient@example.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sender Email
              </label>
              <input
                type="email"
                value={testEmail.sender_email}
                onChange={(e) => setTestEmail({...testEmail, sender_email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@example.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Advanced Email Tracking'}
            </button>
          </form>
        </div>

        {/* Tracked Emails */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">Tracked Emails</h2>
          {trackedEmails.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No tracked emails yet. Create one above to get started!</p>
          ) : (
            <div className="space-y-4">
              {trackedEmails.map((email) => (
                <div key={email.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-800">{email.email_subject}</h3>
                      <p className="text-sm text-gray-600">
                        To: {email.recipient_email} | From: {email.sender_email}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Sent: {formatDate(email.sent_at)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        email.is_opened 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {email.is_opened ? `📖 Opened (${email.open_count}x)` : '📧 Not Opened'}
                      </span>
                      <button
                        onClick={() => simulateEmailOpen(email.tracking_id)}
                        className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600"
                      >
                        Simulate Open
                      </button>
                    </div>
                  </div>
                  
                  {email.is_opened && (
                    <div className="bg-green-50 p-3 rounded-md text-sm">
                      <p><strong>First Opened:</strong> {formatDate(email.opened_at)}</p>
                      <p><strong>Last Opened:</strong> {formatDate(email.last_opened_at)}</p>
                      <p><strong>Total Opens:</strong> {email.open_count}</p>
                      {email.user_agent && <p><strong>User Agent:</strong> {email.user_agent}</p>}
                      {email.ip_address && <p><strong>IP Address:</strong> {email.ip_address}</p>}
                    </div>
                  )}
                  
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-700 mb-2">🔍 Advanced Tracking URLs:</p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-gray-600">Primary Redirect:</p>
                        <code className="text-xs bg-white p-2 rounded border block overflow-x-auto">
                          {getPixelUrls(email.tracking_id).redirect}
                        </code>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600">Alternate Redirect:</p>
                        <code className="text-xs bg-white p-2 rounded border block overflow-x-auto">
                          {getPixelUrls(email.tracking_id).alternateRedirect}
                        </code>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-2 mt-3">Advanced HTML to inject in email:</p>
                    <code className="text-xs bg-white p-2 rounded border block overflow-x-auto whitespace-pre-wrap">
                      {generateAdvancedTrackingPixelHtml(email.tracking_id)}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;