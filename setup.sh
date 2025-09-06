#!/bin/bash

echo "🚀 News Sentiment Analyzer Setup Script"
echo "======================================="

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo "❌ MongoDB is not installed"
    echo "📥 Installing MongoDB..."
    
    # Check the OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "🍺 Installing MongoDB using Homebrew..."
            brew tap mongodb/brew
            brew install mongodb-community
        else
            echo "❌ Homebrew not found. Please install Homebrew first:"
            echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "🐧 Installing MongoDB for Linux..."
        sudo apt-get update
        sudo apt-get install -y mongodb
    else
        echo "❌ Unsupported OS. Please install MongoDB manually:"
        echo "   https://docs.mongodb.com/manual/installation/"
        exit 1
    fi
else
    echo "✅ MongoDB is already installed"
fi

# Start MongoDB service
echo "🔄 Starting MongoDB service..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    brew services start mongodb/brew/mongodb-community
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo systemctl start mongodb
    sudo systemctl enable mongodb
fi

# Wait a moment for MongoDB to start
sleep 3

# Check if MongoDB is running
if pgrep -x "mongod" > /dev/null; then
    echo "✅ MongoDB is running"
else
    echo "❌ Failed to start MongoDB. Please start it manually:"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "   brew services start mongodb/brew/mongodb-community"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "   sudo systemctl start mongodb"
    fi
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Copy environment file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📄 Creating .env.local from template..."
    cp .env.example .env.local
    echo "⚠️  Please edit .env.local and add your API keys:"
    echo "   - GEMINI_API_KEY (Required)"
    echo "   - NEWSAPI_KEY (Required)" 
    echo "   - GUARDIAN_API_KEY (Required)"
    echo ""
    echo "   Get API keys from:"
    echo "   - Gemini: https://makersuite.google.com/app/apikey"
    echo "   - NewsAPI: https://newsapi.org/"
    echo "   - Guardian: https://open-platform.theguardian.com/access/"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your API keys"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:3000"
echo ""
echo "💡 To seed the database with sample data:"
echo "   curl -X POST http://localhost:3000/api/seed"
