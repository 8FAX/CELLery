# AI-Powered Spreadsheet Application

A modern, interactive spreadsheet application built with Next.js, featuring AI-powered assistance for data analysis, formula creation, and intelligent suggestions.

## 🚀 Features

- **Interactive Spreadsheet Interface**: Full-featured spreadsheet with cell editing, formula support, and data management
- **AI-Powered Assistance**: Integrated AI chat sidebar for formula help, data analysis, and suggestions
- **Modern UI**: Built with React, Tailwind CSS, and Radix UI components for a sleek, responsive design
- **Formula Engine**: Advanced formula calculation with support for common spreadsheet functions
- **Data Import/Export**: Support for Excel files and various data formats
- **Multi-Sheet Support**: Create and manage multiple sheets within a workbook
- **Real-time Updates**: Live cell updates and formula recalculation

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **AI Integration**: Google Gemini AI API
- **State Management**: Zustand
- **Form Handling**: React Hook Form with Zod validation
- **Data Processing**: XLSX for Excel file handling
- **Charts**: Recharts for data visualization

## 📋 Prerequisites

- Node.js 18 or higher
- npm, yarn, or pnpm
- Google Gemini AI API key

## 🔑 API Key Setup

### Getting Your Google Gemini AI API Key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key" or "Get API Key"
4. Copy your generated API key
5. Enter the API key directly in the application's settings/configuration when prompted

**📝 Note**: This application uses the API key on the frontend for direct communication with Google's Gemini AI. You'll be prompted to enter your API key when using AI features in the application.

## 🚀 Getting Started

### Running Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/8FAX/CELLery.git
   cd CELLery
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser** and navigate to [http://localhost:3000](http://localhost:3000)

5. **Enter your API key** when prompted in the application to enable AI features

### Building for Production

```bash
npm run build
npm start
```

## 🐳 Docker Setup

### Building and Running with Docker

1. **Build the Docker image**:
   ```bash
   docker build -t CELLery .
   ```

2. **Run the container**:
   ```bash
   docker run -p 3000:3000 CELLery
   ```

3. **Access the application** at [http://localhost:3000](http://localhost:3000)

4. **Enter your API key** when prompted in the application to enable AI features

### Using Docker Compose (Optional)

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  CELLery:
    build: .
    ports:
      - "3000:3000"
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

## 📖 Usage

### Basic Operations

1. **Creating Data**: Click on any cell to start editing
2. **Formulas**: Start with `=` to create formulas (e.g., `=SUM(A1:A10)`)
3. **AI Assistance**: Use the chat sidebar to ask for help with formulas or data analysis
4. **Sheet Management**: Create new sheets using the tab controls at the bottom

### AI Features

- **Formula Help**: Ask the AI to create complex formulas
- **Data Analysis**: Get insights and suggestions for your data
- **Error Correction**: AI can help debug formula errors
- **Smart Suggestions**: Contextual recommendations based on your data

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

## 🚧 Current Limitations & Future Improvements

### Known Issues
- [ ] Large datasets may experience performance issues
- [ ] Limited offline functionality
- [ ] Mobile responsiveness needs improvement

### Planned Features
- [ ] **Collaborative Editing**: Real-time multi-user collaboration
- [ ] **Advanced Charts**: More chart types and customization options
- [ ] **Data Connectors**: Integration with external data sources (APIs, databases)
- [ ] **Plugin System**: Support for custom functions and extensions
- [ ] **Offline Mode**: PWA capabilities for offline usage
- [ ] **Export Options**: PDF, CSV, and more export formats
- [ ] **Templates**: Pre-built spreadsheet templates for common use cases
- [ ] **Version History**: Track and revert changes
- [ ] **Advanced AI Features**:
  - Natural language query processing
  - Automated data cleaning suggestions
  - Predictive analytics
  - Smart data type detection
- [ ] **Performance Optimizations**:
  - Virtual scrolling for large datasets
  - Lazy loading of sheets
  - Background formula calculation
- [ ] **Enhanced UI/UX**:
  - Dark mode improvements
  - Keyboard shortcuts
  - Drag-and-drop functionality
  - Better mobile experience

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page for existing problems
2. Create a new issue with detailed information about your problem
3. Include your environment details (OS, Node.js version, browser)

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
- AI powered by [Google Gemini](https://deepmind.google/technologies/gemini/)
- Icons from [Lucide React](https://lucide.dev/)
