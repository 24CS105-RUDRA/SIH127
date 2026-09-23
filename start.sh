#!/bin/bash

# ANPR Traffic Analytics - Startup Script
# This script starts all services using Docker Compose

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=========================================="
echo "ANPR Traffic Analytics Platform"
echo "City-Wide Multi-Camera ANPR & Traffic Analytics"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "Error: docker-compose not found. Please install Docker Compose."
    exit 1
fi

# Create .env files if they don't exist
if [ ! -f backend/.env ]; then
    echo "Creating backend/.env from example..."
    cp backend/.env.example backend/.env
fi

if [ ! -f ml-service/.env ]; then
    echo "Creating ml-service/.env from example..."
    cp ml-service/.env.example ml-service/.env
fi

if [ ! -f frontend/.env ]; then
    echo "Creating frontend/.env..."
    cat > frontend/.env << EOF
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_MAPBOX_TOKEN=your-mapbox-token-here
EOF
fi

echo "Building and starting services..."
echo ""

# Build and start
docker-compose up --build -d

echo ""
echo "=========================================="
echo "Services started successfully!"
echo "=========================================="
echo ""
echo "Access the application:"
echo "  Frontend Dashboard:  http://localhost:3000"
echo "  Backend API:         http://localhost:8000"
echo "  API Documentation:   http://localhost:8000/docs"
echo "  ML Service:          http://localhost:8001"
echo "  ML Service Docs:     http://localhost:8001/docs"
echo ""
echo "Default login credentials:"
echo "  Email:    admin@anpr.local"
echo "  Password: admin123"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo ""
echo "To stop and remove volumes:"
echo "  docker-compose down -v"
echo ""