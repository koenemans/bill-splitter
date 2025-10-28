# Bill Splitter Wiki

Welcome to the Bill Splitter documentation! This wiki contains comprehensive documentation for the Bill Splitter application.

## 📋 Quick Navigation

### Getting Started
- **[Getting Started](Getting-Started)** - Installation and setup instructions
- **[Development Guide](Development-Guide)** - Development workflow and best practices

### Documentation
- **[Testing Documentation](Testing-Documentation)** - Test suite and coverage information
- **[Deployment Guide](Deployment-Guide)** - Production deployment instructions
- **[Security Features](Security-Features)** - Security measures and best practices
- **[API Documentation](API-Documentation)** - Backend API endpoints and usage

### Standards & Guidelines
- **[Coding Standards](Coding-Standards)** - Express.js and React coding rules

## 🚀 About Bill Splitter

A lightweight full-stack application for splitting bills among groups. Built with React frontend and Express.js backend in a monorepo structure.

### Key Features
- Create a split with a shareable link
- No account setup required
- In-memory storage (no database)
- Everyone adds their name and expenses
- Automatic calculation when everyone is done
- Euro currency only
- Production-ready deployment configuration

### Tech Stack
- **Frontend**: React, Vite, TailwindCSS
- **Backend**: Express.js, Node.js
- **Testing**: Jest, React Testing Library
- **Deployment**: Docker, Azure Web Apps, Heroku

## 🏗 Project Structure

```
bill-splitter/
├── client/                 # React frontend
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── server/                 # Express.js backend
│   ├── index.js
│   └── package.json
├── Dockerfile             # Container configuration
├── web.config            # Azure Web Apps configuration
├── deploy.json           # Deployment metadata
└── package.json          # Monorepo orchestrator
```

## 🤝 Contributing

Please refer to our [Development Guide](Development-Guide) for information on:
- Setting up your development environment
- Code quality standards
- Testing requirements
- CI/CD pipeline

## 📞 Support

For questions or issues, please check the relevant documentation sections or create an issue in the repository.
