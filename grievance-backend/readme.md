# Grievance Portal Backend

A Node.js/Express backend for the Grievance Portal system with PostgreSQL database integration.

## 🚀 Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Database Configuration
   PGHOST=your_database_host
   PGUSER=your_database_user
   PGPASSWORD=your_database_password
   PGDATABASE=grievance
   PGPORT=26066

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key

   # Email Configuration (Optional)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REFRESH_TOKEN=your_google_refresh_token
   EMAIL=your_email@gmail.com

   # Optional Configuration
   LOG_QUERIES=true
   NODE_ENV=development
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## 🌐 Vercel Deployment

### Prerequisites
- Vercel account
- PostgreSQL database (recommended: Aiven, Supabase, or Railway)
- Google OAuth credentials (for email functionality)

### Step 1: Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following environment variables:

#### Required Variables:
```
PGHOST=your_database_host
PGUSER=your_database_user
PGPASSWORD=your_database_password
PGDATABASE=grievance
PGPORT=26066
JWT_SECRET=your_secure_jwt_secret_key
```

#### Optional Variables:
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
EMAIL=your_email@gmail.com
LOG_QUERIES=false
NODE_ENV=production
```

### Step 2: Deploy to Vercel

1. **Connect your repository to Vercel**
2. **Configure build settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Deploy:**
   ```bash
   vercel --prod
   ```

### Step 3: Verify Deployment

After deployment, check these endpoints:

1. **Health Check:** `https://your-app.vercel.app/api/health`
2. **Environment Check:** `https://your-app.vercel.app/api/env-check`
3. **Test Endpoint:** `https://your-app.vercel.app/api/test`

## 🔧 Troubleshooting

### Common Issues

#### 1. "Serverless Function has crashed" Error

**Cause:** Missing environment variables or database connection issues.

**Solution:**
1. Check the `/api/env-check` endpoint to see which variables are missing
2. Ensure all required environment variables are set in Vercel
3. Verify your database connection details

#### 2. Database Connection Timeout

**Cause:** Database not accessible from Vercel's servers.

**Solution:**
1. Ensure your database allows connections from all IPs (0.0.0.0/0)
2. Check if your database provider supports serverless connections
3. Consider using connection pooling services like PgBouncer

#### 3. Build Failures

**Cause:** TypeScript compilation errors or missing dependencies.

**Solution:**
1. Run `npm run build` locally to identify errors
2. Check that all dependencies are in `package.json`
3. Ensure TypeScript configuration is correct

### Debug Endpoints

- `/api/health` - Database and pool status
- `/api/env-check` - Environment variables status
- `/api/pool-status` - Connection pool monitoring
- `/api/test` - Basic functionality test

## 📁 Project Structure

```
src/
├── controllers/     # Request handlers
├── db/             # Database configuration
├── middlewares/    # Express middlewares
├── models/         # Data models
├── routes/         # API routes
├── services/       # Business logic
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── app.ts          # Express app configuration
└── index.ts        # Application entry point
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Helmet security headers
- Rate limiting
- Input validation with Zod
- SQL injection protection

## 📊 Database Schema

The application uses PostgreSQL with the following main tables:
- `Admin` - Admin user management
- `PersonalInfo` - User personal information
- `AcademicInfo` - Academic details
- `Grievance` - Grievance records
- `GrievanceHistory` - Grievance status history
- `Attachment` - File attachments

## 🚀 Performance Optimizations

- Connection pooling optimized for serverless
- Query timeout protection
- Efficient database queries
- Caching strategies
- Graceful error handling

## 📝 API Documentation

The API follows RESTful conventions with the following main endpoints:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/grievance` - Create grievance
- `GET /api/grievance` - List grievances
- `PUT /api/grievance/:id` - Update grievance
- `POST /api/admin/login` - Admin login

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

//vercel+1
+2


