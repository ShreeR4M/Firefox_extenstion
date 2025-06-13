# README.md

# Firefox Extension Frontend

This project is the frontend for the Firefox extension. It is built using React and styled with Tailwind CSS.

## Project Structure

- **public/index.html**: The main HTML entry point for the application. This file includes the root element where the React app will be rendered.
- **src/index.js**: The entry point for the JavaScript application. It renders the main App component into the DOM.
- **src/App.js**: The main App component of the application, containing the application's structure and logic.
- **src/index.css**: Global CSS styles for the application, imported in index.js.
- **src/App.css**: Styles specific to the App component, imported in App.js.
- **package.json**: Configuration file for npm, listing dependencies, scripts, and metadata for the project.
- **postcss.config.js**: Configuration file for PostCSS, used to process CSS with various plugins.
- **tailwind.config.js**: Configuration file for Tailwind CSS, allowing customization of default styles and settings.

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd frontend
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Start the development server:
   ```
   npm start
   ```

## Usage

Once the development server is running, you can view the application in your browser at `http://localhost:3000`. Make changes to the source files, and the application will automatically reload to reflect your changes.