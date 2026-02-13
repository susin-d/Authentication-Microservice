#!/bin/bash
# Setup script for M-Auth React Test Frontend

echo "🚀 M-Auth React Test Frontend Setup"
echo "====================================="
echo ""

# Check if Node.js is installed
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js $NODE_VERSION detected"
echo ""

# Navigate to react-test directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/react-test" || exit 1

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies!"
    exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Ensure M-Auth backend is running on http://localhost:3000"
echo "   Run: npm start (in the main project directory)"
echo ""
echo "2. Start the React test frontend:"
echo "   cd react-test"
echo "   npm run dev"
echo ""
echo "3. Open your browser at http://localhost:3000"
echo ""
echo "🎉 Happy testing!"
