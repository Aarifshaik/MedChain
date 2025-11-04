#!/bin/bash

# Healthcare DLT Core - Development Setup Script

echo "🏥 Healthcare DLT Core - Development Setup"
echo "=========================================="

# Check Node.js version
echo "📋 Checking prerequisites..."
node_version=$(node --version)
echo "Node.js version: $node_version"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 18.0.0"
    exit 1
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Install middleware dependencies
echo "📦 Installing middleware dependencies..."
cd middleware && npm install && cd ..

# Create environment files if they don't exist
echo "⚙️  Setting up environment files..."

if [ ! -f "frontend/.env.local" ]; then
    cp frontend/.env.local.example frontend/.env.local
    echo "✅ Created frontend/.env.local"
fi

if [ ! -f "middleware/.env" ]; then
    cp middleware/.env.example middleware/.env
    echo "✅ Created middleware/.env"
fi

# Build projects to verify setup
echo "🔨 Building projects..."
echo "Building frontend..."
cd frontend && npm run build && cd ..

echo "Building middleware..."
cd middleware && npm run build && cd ..

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "🚀 To start development:"
echo "   npm run dev"
echo ""
echo "📖 For more information, see docs/development/setup.md"