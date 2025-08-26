# DSEU Grievance Portal - Postman API Testing Collections

## Overview

This directory contains comprehensive Postman collection files for testing all API modules in the DSEU Grievance Portal system. Each collection is designed to provide thorough testing coverage with proper authentication flows, error handling, and validation scenarios.

## Collections Available

### 1. **Users_Auth_API.postman_collection.json**
- **Purpose:** User authentication and account management
- **Key Features:**
  - Roll number validation
  - Email verification
  - User login with JWT token generation
  - Password management (first-time setup)
  - Account activation workflows
  - Security validation tests

### 2. **Attachment_API.postman_collection.json**
- **Purpose:** File upload, download, and attachment management
- **Key Features:**
  - File upload with validation (PDF, images, documents)
  - Secure file download with authentication
  - File metadata management
  - Virus scanning integration tests
  - File size and type validation
  - Attachment security tests

### 3. **Tracking_API.postman_collection.json**
- **Purpose:** Grievance status tracking and redirection management
- **Key Features:**
  - Real-time status tracking
  - Grievance redirection workflows
  - Status update notifications
  - Tracking history retrieval
  - Department-wise tracking
  - Status transition validation

### 4. **IssueList_API.postman_collection.json**
- **Purpose:** Issue categories management (CRUD operations)
- **Key Features:**
  - Complete CRUD operations for issue categories
  - Role-based access control (Admin vs Student views)
  - Issue activation/deactivation
  - Search and filtering capabilities
  - Validation and error handling tests
  - Audit logging verification

### 5. **Grievance_API.postman_collection.json**
- **Purpose:** Core grievance management system
- **Key Features:**
  - Grievance submission workflow
  - Status management and updates
  - Department assignment and routing
  - Priority level management
  - Comprehensive grievance lifecycle testing
  - Search and filtering operations

### 6. **Auth-Grievance-API.postman_collection.json**
- **Purpose:** Legacy collection (combined auth and grievance)
- **Note:** This is an older combined collection. Use the separate collections above for better organization.

## Setup Instructions

### 1. Import Collections into Postman

1. Open Postman application
2. Click "Import" button
3. Select "File" tab
4. Choose the collection JSON files from this directory
5. Click "Import" to add collections to your workspace

### 2. Environment Configuration

Each collection uses environment variables. Set up the following variables in Postman:

#### Global Variables (Required for all collections):
```
baseUrl: http://localhost:5000
```

#### Collection-Specific Variables:

**For User Auth API:**
```
rollNumber: 20230101 (Replace with valid roll number)
partialEmail: student@dseu (Replace with student's partial email)
testPassword: TestPassword123! (For password setting tests)
userToken: Bearer user_jwt_token_here (Auto-set after login)
```

**For Grievance API:**
```
grievanceId: 1 (Valid grievance ID for testing)
adminToken: Bearer admin_jwt_token_here
studentToken: Bearer student_jwt_token_here
issueCode: ACADEMIC_001 (Valid issue code)
```

**For Attachment API:**
```
attachmentId: 1 (Valid attachment ID)
uploadToken: Bearer valid_jwt_token
filePath: C:\\path\\to\\test\\file.pdf (For file upload tests)
```

**For Tracking API:**
```
trackingId: TRK_001 (Valid tracking ID)
grievanceRef: GRV_2024_001 (Valid grievance reference)
```

**For IssueList API:**
```
issueCode: ACADEMIC_001 (Valid issue code for testing)
adminToken: Bearer admin_jwt_token
studentToken: Bearer student_jwt_token
```

### 3. Authentication Flow

Most APIs require authentication. Follow this sequence:

1. **First, run User Authentication:**
   - Use "Users_Auth_API" → "Authentication Operations" → "User Login"
   - This will generate a JWT token and store it in `userToken` variable
   - Token will be automatically used in subsequent requests

2. **For Admin Operations:**
   - Ensure you have admin credentials
   - Login through admin authentication endpoints
   - Admin token will be stored separately as `adminToken`

### 4. Running Tests

#### Recommended Test Sequence:

1. **Setup Phase:**
   - Run environment setup requests first
   - Verify base URL connectivity

2. **Authentication Phase:**
   - Test roll number validation
   - Perform user login
   - Verify token generation

3. **Core Functionality Phase:**
   - Run IssueList API tests (for issue categories)
   - Run Grievance API tests (for grievance management)
   - Run Attachment API tests (for file operations)
   - Run Tracking API tests (for status management)

4. **Error Handling Phase:**
   - Run all error handling test scenarios
   - Validate input validation
   - Test authorization failures

#### Running Collection Tests:

**Option 1: Manual Execution**
- Open each collection
- Run requests individually
- Monitor test results in Test Results tab

**Option 2: Collection Runner**
- Click on collection name
- Select "Run collection"
- Configure iterations and delay
- Run all tests automatically

**Option 3: Newman (CLI)**
```bash
newman run Users_Auth_API.postman_collection.json -e environment.json
newman run Grievance_API.postman_collection.json -e environment.json
newman run Attachment_API.postman_collection.json -e environment.json
newman run Tracking_API.postman_collection.json -e environment.json
newman run IssueList_API.postman_collection.json -e environment.json
```

## Test Coverage

### Each collection includes:

- ✅ **Positive Test Cases:** Valid inputs and expected successful responses
- ✅ **Negative Test Cases:** Invalid inputs and error handling
- ✅ **Authentication Tests:** Token validation and security
- ✅ **Authorization Tests:** Role-based access control
- ✅ **Validation Tests:** Input validation and business rules
- ✅ **Edge Cases:** Boundary conditions and unusual scenarios
- ✅ **Performance Tests:** Response time validation
- ✅ **Security Tests:** SQL injection, XSS prevention

### Automated Test Scripts:

Each request includes comprehensive test scripts that validate:
- HTTP status codes
- Response structure and data types
- Business logic compliance
- Error message accuracy
- Token management
- Data persistence
- Security constraints

## Troubleshooting

### Common Issues:

1. **Connection Refused (ECONNREFUSED):**
   - Ensure the backend server is running on http://localhost:5000
   - Check if the port is correct in baseUrl variable

2. **Authentication Failures:**
   - Verify token is correctly set in userToken variable
   - Check if token has expired (tokens have limited validity)
   - Ensure proper login before running authenticated endpoints

3. **Validation Errors:**
   - Check if required fields are properly filled
   - Verify data format matches API expectations
   - Ensure test data exists in database

4. **File Upload Issues:**
   - Verify file path is correct and accessible
   - Check file size limits
   - Ensure file type is supported

### Getting Help:

1. Check the test results for detailed error messages
2. Review the API documentation in each collection's description
3. Verify environment variables are correctly configured
4. Check server logs for backend-specific issues

## Development Notes

### Collection Maintenance:

- Collections are organized by API module for better maintainability
- Each collection follows consistent naming conventions
- Test scripts use standard Postman testing practices
- Environment variables are clearly documented

### Adding New Tests:

1. Follow the existing folder structure within collections
2. Include comprehensive test scripts
3. Use descriptive names for requests
4. Document the purpose and expected behavior
5. Include both positive and negative test scenarios

### Security Considerations:

- Never commit real credentials to version control
- Use placeholder values in collection variables
- Regularly update test credentials
- Validate security features in test scripts

---

## Collection Statistics

| Collection | Requests | Test Scripts | Coverage Areas |
|------------|----------|--------------|----------------|
| Users_Auth_API | 8+ | 25+ tests | Authentication, Validation, Security |
| Attachment_API | 12+ | 35+ tests | File Operations, Security, Validation |
| Tracking_API | 10+ | 30+ tests | Status Management, Workflows, History |
| IssueList_API | 8+ | 25+ tests | CRUD Operations, Role Access, Search |
| Grievance_API | 15+ | 45+ tests | Full Lifecycle, Workflows, Management |

**Total: 50+ API endpoints with 160+ automated test scenarios**

---

*Last Updated: [Current Date]*
*Version: 1.0*
*Compatible with: DSEU Grievance Portal Backend v1.0*
