# Contributing to Ethereum Explorer

Thank you for your interest in contributing to the Ethereum Explorer project! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Reporting Issues](#reporting-issues)

## 🤝 Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow. Please be respectful, inclusive, and constructive in all interactions.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/nextjs-ethereum-explorer.git
   cd nextjs-ethereum-explorer
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/aakash4dev/nextjs-ethereum-explorer.git
   ```

## 🛠️ Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .example.env .env
   # Edit .env with your configuration
   ```

3. **Set up MongoDB** (local or Atlas)

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Run the sync service** (in a separate terminal):
   ```bash
   npm run sync
   ```

## 📝 How to Contribute

### Reporting Bugs

- Use the GitHub issue tracker
- Include a clear title and description
- Provide steps to reproduce
- Include error messages and logs
- Specify your environment (OS, Node version, etc.)

### Suggesting Features

- Open an issue with the "enhancement" label
- Clearly describe the feature and its use case
- Explain why it would be useful

### Code Contributions

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following the coding standards

3. **Test your changes**:
   ```bash
   npm run lint
   npm run build
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

## 🔄 Pull Request Process

1. **Update your branch** with the latest changes:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Ensure all tests pass** and code is linted

3. **Write a clear PR description**:
   - What changes were made
   - Why the changes were needed
   - How to test the changes
   - Screenshots (if UI changes)

4. **Wait for review** and address any feedback

5. **Squash commits** if requested before merging

## 📐 Coding Standards

### Code Style

- Follow existing code patterns
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for adding tests
- `chore:` for maintenance tasks

Examples:
```
feat: add address analytics page
fix: resolve BigInt conversion error in indexer
docs: update README with deployment instructions
```

### File Structure

- Keep components in `src/app/components/`
- API routes in `src/app/api/`
- Library functions in `src/lib/`
- Use descriptive file names

### Testing

- Test your changes locally
- Ensure the build passes: `npm run build`
- Test API endpoints
- Verify database operations

## 🐛 Reporting Issues

When reporting issues, please include:

1. **Environment**:
   - OS and version
   - Node.js version
   - MongoDB version
   - Package versions

2. **Steps to Reproduce**:
   - Clear, numbered steps
   - Expected vs actual behavior

3. **Error Messages**:
   - Full error stack traces
   - Console logs
   - Screenshots if applicable

4. **Additional Context**:
   - Related issues
   - Possible solutions you've tried

## 🎯 Areas for Contribution

We welcome contributions in these areas:

- **Performance improvements**: Optimize database queries, caching
- **New features**: Additional blockchain data, analytics, charts
- **UI/UX enhancements**: Better user experience, accessibility
- **Documentation**: Improve README, add examples, tutorials
- **Testing**: Add unit tests, integration tests
- **Bug fixes**: Fix reported issues
- **Code quality**: Refactoring, code organization

## 📞 Questions?

- Open an issue for questions
- Check existing issues and PRs
- Review the README for setup instructions

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to Ethereum Explorer! 🚀

