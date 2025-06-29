# Data Alchemist: AI-Powered Resource Allocation Configurator

A sophisticated Next.js web application that transforms messy spreadsheet data into clean, validated resource allocation configurations using AI-powered features.

## 🚀 Features

### Core Functionality
- **CSV/XLSX File Upload**: Upload clients, workers, and tasks data
- **Editable Data Grids**: Inline editing with real-time validation
- **Comprehensive Validation**: 12+ validation rules including cross-entity checks
- **Business Rule Builder**: Create complex allocation rules
- **Advanced Prioritization**: Multiple methods for setting allocation priorities
- **Export Functionality**: Clean CSV data and structured JSON rules

### AI-Powered Features 🤖

#### 1. Natural Language Data Retrieval
- Search data using plain English queries
- Example: "All tasks with duration > 5 days and priority high"
- AI understands context and relationships between entities

#### 2. AI-Powered Data Correction
- Automatic detection of validation errors
- AI suggests specific fixes for each error
- One-click application of corrections
- General advice for data quality improvement

#### 3. Natural Language Rule Creation
- Describe business rules in plain English
- AI converts descriptions to structured rules
- Supports co-run, slot-restriction, load-limit, and phase-window rules

#### 4. AI Rule Recommendations
- Analyzes data patterns to suggest optimal rules
- Provides confidence levels and expected impact
- Data insights and optimization suggestions

## 📊 Data Entities

### Clients
- **ClientID**: Unique identifier
- **ClientName**: Company/organization name
- **PriorityLevel**: 1-5 scale for importance
- **Industry**: Business sector
- **Location**: Geographic location
- **ContactPerson**: Primary contact
- **Status**: Current status (Active, Inactive, etc.)
- **LastContact**: Date of last interaction
- **ProjectValue**: Estimated project value
- **Viewers**: Number of document viewers
- **Collaborators**: Number of collaborators

### Workers
- **WorkerID**: Unique identifier
- **WorkerName**: Employee name
- **Skills**: Comma-separated skill tags
- **Experience**: Years of experience
- **Department**: Organizational department
- **Location**: Work location
- **Status**: Current status (Available, Busy, etc.)
- **CurrentProjects**: Active project count
- **Viewers**: Number of document viewers
- **Collaborators**: Number of collaborators
- **LastActive**: Last activity timestamp

### Tasks
- **TaskID**: Unique identifier
- **TaskName**: Task description
- **Category**: Task category
- **Duration**: Estimated duration in days
- **RequiredSkills**: Comma-separated required skills
- **Priority**: Task priority level
- **Status**: Current status (Pending, In Progress, etc.)
- **AssignedTo**: Assigned worker
- **Viewers**: Number of document viewers
- **Collaborators**: Number of collaborators
- **StartDate**: Planned start date
- **DueDate**: Target completion date

## 🔧 Validation Rules

### Core Validations (8+ implemented)
1. **Missing Required Columns**: Ensures all required fields are present
2. **Duplicate IDs**: Prevents duplicate ClientID, WorkerID, TaskID
3. **Malformed Lists**: Validates comma-separated lists and arrays
4. **Out-of-Range Values**: Checks numeric ranges (Priority 1-5, Duration ≥ 1)
5. **Date Format Validation**: Ensures proper date formats
6. **Cross-Entity References**: Validates AssignedTo references
7. **Skill Coverage**: Ensures all required skills are available
8. **Circular Co-Run Detection**: Prevents circular task dependencies

### Advanced Validations
9. **Phase-Slot Saturation**: Checks resource capacity vs. demand
10. **Max-Concurrency Feasibility**: Validates parallel execution limits
11. **Worker Overload Detection**: Identifies over-allocated workers
12. **Priority Level Conflicts**: Flags priority inconsistencies

## 🎯 Prioritization Methods

### 1. Sliders (Basic)
- Adjust weights using intuitive sliders
- 1-10 scale for each criterion
- Real-time weight updates

### 2. Drag & Drop Ranking
- Reorder criteria by importance
- Automatic weight calculation based on position
- Visual ranking interface

### 3. Pairwise Comparison (AHP)
- Compare criteria two at a time
- Uses Analytic Hierarchy Process
- Scientifically validated weight calculation

### 4. Preset Profiles
- **Maximize Fulfillment**: Complete maximum tasks
- **Fair Distribution**: Equal workload distribution
- **Minimize Workload**: Reduce worker stress
- **Cost Optimization**: Minimize costs
- **Quality Focus**: Prioritize quality over speed
- **Balanced Approach**: Equal consideration

## 📋 Business Rules

### Supported Rule Types
1. **Co-Run Rules**: Tasks that must run together
2. **Slot Restrictions**: Minimum common time slots for groups
3. **Load Limits**: Maximum workload per phase for groups
4. **Phase Windows**: Allowed phases for specific tasks

### Rule Creation Methods
- **Manual UI**: Use the rule builder interface
- **Natural Language**: Describe rules in plain English
- **AI Recommendations**: Let AI suggest rules based on data patterns

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- OpenAI API key (for AI features)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd data-alchemist

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your OpenAI API key to .env.local
OPENAI_API_KEY=your_openai_api_key_here

# Start development server
npm run dev
```

### Usage
1. **Upload Data**: Upload your CSV/XLSX files for clients, workers, and tasks
2. **Review Validation**: Check the validation summary for any issues
3. **AI Corrections**: Use AI-powered correction suggestions to fix errors
4. **Create Rules**: Build business rules using the rule builder or natural language
5. **Set Priorities**: Configure allocation priorities using your preferred method
6. **Export**: Download cleaned data and rules for the next stage

## 🔧 API Endpoints

### AI-Powered APIs
- `POST /api/nl-search`: Natural language data search
- `POST /api/nl-rule`: Natural language rule creation
- `POST /api/ai-correction`: AI-powered data correction suggestions
- `POST /api/ai-rule-recommendations`: AI rule recommendations

## 📁 Project Structure
```
├── components/
│   ├── AICorrectionPanel.tsx      # AI data correction interface
│   ├── AIRuleRecommendations.tsx  # AI rule suggestions
│   ├── DataGridEditable.tsx       # Editable data grids
│   ├── FileUploader.tsx           # File upload component
│   ├── NaturalLanguageSearch.tsx  # NL search interface
│   ├── PrioritizationSliders.tsx  # Advanced prioritization
│   └── RuleBuilder.tsx            # Business rule builder
├── pages/
│   ├── api/                       # API endpoints
│   ├── _app.tsx                   # App wrapper
│   └── index.tsx                  # Main application page
├── samples/                       # Sample CSV files
├── utils/
│   └── validationUtils.ts         # Validation logic
└── styles/
    └── globals.css                # Global styles
```

## 🎨 UI/UX Features

### User-Friendly Design
- **Non-Technical Focus**: Designed for users with minimal technical expertise
- **Visual Feedback**: Clear error highlighting and success indicators
- **Progressive Disclosure**: Information revealed as needed
- **Responsive Design**: Works on desktop and tablet devices

### AI Integration
- **Contextual Help**: AI provides guidance based on current data
- **Smart Suggestions**: Intelligent recommendations for improvements
- **Natural Language**: Use plain English for complex operations
- **One-Click Actions**: Apply AI suggestions with single clicks

## 🔒 Security & Performance

### Security
- Client-side data processing (no data sent to external servers except OpenAI)
- Environment variable protection for API keys
- Input validation and sanitization

### Performance
- Efficient data grid rendering with virtualization
- Optimized validation algorithms
- Lazy loading of AI features
- Minimal API calls with intelligent caching

## 🧪 Testing

### Sample Data
The application includes sample CSV files in the `/samples` directory:
- `clients.csv`: Sample client data
- `workers.csv`: Sample worker data  
- `tasks.csv`: Sample task data

### Validation Testing
Upload the sample files to test all validation features and AI capabilities.

## 🚀 Deployment

### Build for Production
```bash
npm run build
npm start
```

### Environment Variables
- `OPENAI_API_KEY`: Required for AI features
- `NODE_ENV`: Set to 'production' for deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the validation summary for data issues
2. Review the AI suggestions for improvements
3. Ensure all required columns are present
4. Verify date formats (YYYY-MM-DD)

---

**Data Alchemist** - Transforming spreadsheet chaos into structured resource allocation magic! ✨ 