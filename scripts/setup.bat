@echo off
REM Healthcare DLT Core - Development Setup Script (Windows)

echo 🏥 Healthcare DLT Core - Development Setup
echo ==========================================

REM Check Node.js version
echo 📋 Checking prerequisites...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js ^>= 18.0.0
    exit /b 1
)

REM Install root dependencies
echo 📦 Installing root dependencies...
npm install

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
npm install
cd ..

REM Install middleware dependencies
echo 📦 Installing middleware dependencies...
cd middleware
npm install
cd ..

REM Create environment files if they don't exist
echo ⚙️  Setting up environment files...

if not exist "frontend\.env.local" (
    copy "frontend\.env.local.example" "frontend\.env.local"
    echo ✅ Created frontend/.env.local
)

if not exist "middleware\.env" (
    copy "middleware\.env.example" "middleware\.env"
    echo ✅ Created middleware/.env
)

REM Build projects to verify setup
echo 🔨 Building projects...
echo Building frontend...
cd frontend
npm run build
cd ..

echo Building middleware...
cd middleware
npm run build
cd ..

echo.
echo ✅ Setup completed successfully!
echo.
echo 🚀 To start development:
echo    npm run dev
echo.
echo 📖 For more information, see docs/development/setup.md