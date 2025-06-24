# Firefox Email Tracker

A lightweight, privacy-focused browser extension for tracking email opens without third-party services. Know exactly when your emails are opened with real-time notifications and detailed analytics.

## 📋 Features

- **Real-time open tracking**: Get instant notifications when recipients open your emails
- **Multi-pixel tracking**: Uses advanced techniques to bypass Gmail's image proxy caching
- **Privacy-focused**: Self-hosted solution that keeps your data under your control
- **Detailed analytics**: Track open rates, engagement times, and recipient behavior
- **Gmail integration**: Seamlessly works with Gmail's compose interface
- **Modern dashboard**: View all your tracked emails and their status in one place
- **Custom domains**: Use your own domain for tracking pixels
- **Mobile compatibility**: Tracks emails opened on mobile devices
- **Unlimited tracking**: No limits on how many emails you can track

## 🛠️ Installation & Setup

This project consists of three components: Firefox Extension, Backend API, and Frontend Dashboard.

### Prerequisites

- Python 3.8+
- Node.js 14+
- MongoDB database
- Firefox Browser (for extension testing)
- HTTPS domain or tunnel (ngrok) for production use

### Backend Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/firefox-email-tracker.git
   cd firefox-email-tracker/backend
   ```

2. **Create and activate virtual environment**

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Create `.env` file**

   ```
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=email_tracker
   PUBLIC_BASE_URL=https://yourdomain.com  # Or use ngrok URL for testing
   ```

5. **Run the server**

   ```bash
   python server.py
   ```

   The API will be available at `http://localhost:8001/api`.

### Frontend Setup

1. **Navigate to frontend directory**

   ```bash
   cd ../frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create `.env` file**

   ```
   REACT_APP_BACKEND_URL=http://localhost:8001
   ```

4. **Start the development server**

   ```bash
   npm start
   ```

   The dashboard will be available at `http://localhost:3000`.

### Firefox Extension Setup

1. **Navigate to extension directory**

   ```bash
   cd ../firefox-extension
   ```

2. **Update domain in `background.js`**

   Change `const API_URL = 'http://localhost:8001/api';` to your actual backend URL.

3. **Load the extension in Firefox**

   - Open Firefox
   - Navigate to `about:debugging`
   - Click on "This Firefox"
   - Click "Load Temporary Add-on"
   - Select any file from the extension directory (e.g., `manifest.json`)

## 📝 Usage

1. **Enable the extension**
   - Click the extension icon in the toolbar
   - Enter your email address
   - Toggle tracking on

2. **Send tracked emails**
   - Compose a new email in Gmail
   - The extension automatically injects tracking pixels when you send

3. **View tracking information**
   - Open the extension popup to see recent emails
   - Visit the dashboard at `http://localhost:3000` for detailed analytics
   - Receive real-time notifications when emails are opened

## 🔧 Production Deployment

For production use, you'll need:

1. **HTTPS domain**
   - Update `PUBLIC_BASE_URL` in your backend `.env` to your HTTPS domain
   - Gmail won't load tracking pixels from non-HTTPS sources

2. **MongoDB Atlas or self-hosted MongoDB**
   - Update `MONGO_URL` in your backend `.env` file

3. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

4. **Package the extension**
   - Create a `.zip` file of the extension directory
   - Submit to Firefox Add-ons Marketplace

5. **Deploy backend**
   - Deploy the FastAPI app using Gunicorn, Docker, or your preferred hosting method
   - Use Nginx as a reverse proxy for HTTPS

## ⚙️ Advanced Configuration

### Custom Domains

For production, use your own domain to avoid being blocked by email clients:

1. Set up DNS for a subdomain (e.g., `track.yourdomain.com`)
2. Configure HTTPS with Let's Encrypt
3. Update `PUBLIC_BASE_URL` in your backend `.env` file
4. The extension will use this domain for all tracking pixels

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Extension Testing

1. Send test emails to yourself
2. Check server logs for pixel hits
3. Verify that open count increases on the dashboard

## 🔍 Assumptions & Limitations

- **Email Client Support**: Tracking works in major email clients (Gmail, Outlook, Apple Mail) but may be affected by clients that block remote images
- **Gmail Changes**: The extension relies on Gmail's DOM structure which may change over time
- **Image Loading**: Tracking requires recipients to load images in their email client
- **Privacy Features**: Some email clients (like ProtonMail) may block tracking pixels

## 🚀 Future Enhancements

- **Click Tracking**: Track when recipients click links in your emails
- **Reply Detection**: Get notified when recipients reply to your emails
- **Scheduled Reports**: Receive daily/weekly reports of your email open rates
- **Team Collaboration**: Share tracking data with team members
- **Email Templates**: Save and reuse email templates with tracking
- **Geolocation**: See where your emails are being opened
- **A/B Testing**: Test different subject lines and content
- **API Access**: Integrate with other tools via REST API
- **Thunderbird Support**: Extend functionality to Mozilla Thunderbird

## Screenshot
![image](https://github.com/user-attachments/assets/3e91d0b3-3250-40b6-9945-91509edd190f)

![image](https://github.com/user-attachments/assets/b7be2388-489d-4d38-a790-8942f3333392)



## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🌟 Acknowledgments

- FastAPI for the efficient API framework
- MongoDB for the flexible document storage
- Firefox for the powerful WebExtensions API

---

Made with ❤️ for email productivity
