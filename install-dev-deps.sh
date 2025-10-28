#!/bin/bash

echo "🚀 Installing development dependencies for Bill Splitter..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install --save-dev eslint prettier

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install --save-dev \
  eslint \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  eslint-plugin-react-refresh \
  eslint-config-prettier \
  @eslint/js \
  prettier \
  typescript \
  jest-transform-stub \
  identity-obj-proxy

# Install server dependencies
echo "📦 Installing server dependencies..."
cd ../server
npm install --save-dev \
  eslint \
  eslint-config-prettier \
  @eslint/js \
  prettier

echo "✅ All development dependencies installed!"
echo ""
echo "🔧 Available commands:"
echo "  npm run lint          - Run linting for all components"
echo "  npm run lint:fix      - Fix linting issues automatically"
echo "  npm run format        - Format code with Prettier"
echo "  npm run format:check  - Check code formatting"
echo "  npm run test:coverage - Run tests with coverage"
echo ""
echo "📝 Next steps:"
echo "1. Run 'npm run format' to format existing code"
echo "2. Run 'npm run lint:fix' to fix linting issues"
echo "3. Commit the changes and create a PR to test the workflow"
