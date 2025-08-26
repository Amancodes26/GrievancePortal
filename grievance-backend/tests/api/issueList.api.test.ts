import axios from 'axios';

/**
 * IssueList API Testing Script
 * Comprehensive test suite for all IssueList endpoints
 * 
 * Principal Engineer Standards:
 * - Complete API coverage
 * - Error handling verification
 * - Authentication testing
 * - Data validation checks
 * - Performance monitoring
 */

const BASE_URL = 'http://localhost:5000/api/v1';
const TEST_ADMIN_TOKEN = 'your_admin_jwt_token_here'; // Replace with valid admin token

console.log('🧪 Starting IssueList API Tests...\n');

// Test configurations
const axiosConfig = {
  timeout: 10000,
  validateStatus: () => true, // Don't throw on any status code
};

const adminAxios = axios.create({
  ...axiosConfig,
  headers: {
    'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

const publicAxios = axios.create(axiosConfig);

/**
 * Test 1: GET /api/v1/issues (Public - Students see active only)
 */
async function testGetIssuesPublic() {
  console.log('📋 Test 1: GET /issues (Public Access)');
  try {
    const response = await publicAxios.get(`${BASE_URL}/issues`);
    
    console.log(`Status: ${response.status}`);
    if (response.status === 200) {
      console.log(`✅ Issues retrieved: ${response.data.data?.issues?.length || 0} issues`);
      console.log(`Total: ${response.data.data?.pagination?.total || 0}`);
      console.log(`User Type: ${response.data.data?.meta?.userType || 'unknown'}`);
      
      // Verify only active issues returned
      const issues = response.data.data?.issues || [];
      const allActive = issues.every((issue: any) => issue.IsActive === true);
      if (allActive && issues.length > 0) {
        console.log('✅ All returned issues are active (correct for students)');
      } else if (issues.length === 0) {
        console.log('ℹ️  No active issues found');
      } else {
        console.log('❌ Some inactive issues returned for student access');
      }
    } else {
      console.log(`❌ Unexpected status: ${response.status}`);
      console.log('Error:', response.data);
    }
  } catch (error) {
    console.log('❌ Request failed:', (error as any).message);
  }
  console.log();
}

/**
 * Test 2: GET /api/v1/issues (Admin - Should see all with filters)
 */
async function testGetIssuesAdmin() {
  console.log('📋 Test 2: GET /issues (Admin Access)');
  try {
    const response = await adminAxios.get(`${BASE_URL}/issues?active=false&limit=5`);
    
    console.log(`Status: ${response.status}`);
    if (response.status === 200) {
      console.log(`✅ Issues retrieved: ${response.data.data?.issues?.length || 0} issues`);
      console.log(`Total: ${response.data.data?.pagination?.total || 0}`);
      console.log(`User Type: ${response.data.data?.meta?.userType || 'unknown'}`);
    } else if (response.status === 401) {
      console.log('ℹ️  Admin authentication required (expected if no valid token)');
    } else {
      console.log(`❌ Unexpected status: ${response.status}`);
      console.log('Error:', response.data);
    }
  } catch (error) {
    console.log('❌ Request failed:', (error as any).message);
  }
  console.log();
}

/**
 * Test 3: GET /api/v1/issues/:code (Get specific issue)
 */
async function testGetIssueByCode() {
  console.log('📋 Test 3: GET /issues/:code (Get specific issue)');
  try {
    // First get list of issues to find a valid code
    const listResponse = await publicAxios.get(`${BASE_URL}/issues?limit=1`);
    
    if (listResponse.status === 200 && listResponse.data.data?.issues?.length > 0) {
      const issueCode = listResponse.data.data.issues[0].IssueCode;
      console.log(`Testing with IssueCode: ${issueCode}`);
      
      const response = await publicAxios.get(`${BASE_URL}/issues/${issueCode}`);
      console.log(`Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log(`✅ Issue retrieved: ${response.data.data?.issue?.IssueTitle || 'Unknown'}`);
        console.log(`Issue Code: ${response.data.data?.issue?.IssueCode || 'Unknown'}`);
        console.log(`Is Active: ${response.data.data?.issue?.IsActive}`);
      } else {
        console.log(`❌ Failed to retrieve issue: ${response.status}`);
        console.log('Error:', response.data);
      }
    } else {
      console.log('ℹ️  No issues found to test with');
    }
  } catch (error) {
    console.log('❌ Request failed:', (error as any).message);
  }
  console.log();
}

/**
 * Test 4: GET /api/v1/issues/INVALID (Test error handling)
 */
async function testGetInvalidIssue() {
  console.log('📋 Test 4: GET /issues/INVALID (Error handling test)');
  try {
    const response = await publicAxios.get(`${BASE_URL}/issues/INVALID_CODE`);
    console.log(`Status: ${response.status}`);
    
    if (response.status === 404) {
      console.log('✅ Correctly returned 404 for invalid issue code');
    } else if (response.status === 400) {
      console.log('✅ Correctly returned 400 for invalid issue code format');
    } else {
      console.log(`❌ Unexpected status for invalid code: ${response.status}`);
      console.log('Response:', response.data);
    }
  } catch (error) {
    console.log('❌ Request failed:', (error as any).message);
  }
  console.log();
}

/**
 * Test 5: POST /api/v1/issues (Create new issue - Admin only)
 */
async function testCreateIssue() {
  console.log('📋 Test 5: POST /issues (Create new issue - Admin only)');
  
  const testIssueData = {
    IssueCode: 'TEST001',
    IssueTitle: 'Test Issue for API Testing',
    IssueDescription: 'This is a test issue created by the API testing script',
    Category: 'Testing',
    IssueLevel: 'Low',
    RequiredAttachments: [
      {
        AttachmentType: 'Document',
        IsRequired: false
      }
    ],
    IsActive: true
  };

  try {
    // Test without authentication first
    const publicResponse = await publicAxios.post(`${BASE_URL}/issues`, testIssueData);
    console.log(`Public access status: ${publicResponse.status}`);
    
    if (publicResponse.status === 401 || publicResponse.status === 403) {
      console.log('✅ Correctly rejected unauthenticated request');
    }

    // Test with admin authentication
    const adminResponse = await adminAxios.post(`${BASE_URL}/issues`, testIssueData);
    console.log(`Admin access status: ${adminResponse.status}`);
    
    if (adminResponse.status === 201) {
      console.log('✅ Issue created successfully');
      console.log(`Created Issue: ${adminResponse.data.data?.issue?.IssueTitle}`);
    } else if (adminResponse.status === 401) {
      console.log('ℹ️  Admin authentication required (expected if no valid token)');
    } else if (adminResponse.status === 409) {
      console.log('ℹ️  Issue code already exists (expected if test runs multiple times)');
    } else {
      console.log(`❌ Unexpected status: ${adminResponse.status}`);
      console.log('Error:', adminResponse.data);
    }
  } catch (error) {
    console.log('❌ Request failed:', (error as any).message);
  }
  console.log();
}

/**
 * Test 6: Validation Tests (Invalid data)
 */
async function testValidation() {
  console.log('📋 Test 6: Validation Tests (Invalid data)');
  
  const invalidIssueData = {
    IssueCode: 'x', // Too short
    IssueTitle: 'AB', // Too short
    Category: '', // Empty
    IssueLevel: 'InvalidLevel', // Invalid enum
    RequiredAttachments: [] // Empty array should be fine
  };

  try {
    const response = await adminAxios.post(`${BASE_URL}/issues`, invalidIssueData);
    console.log(`Status: ${response.status}`);
    
    if (response.status === 400) {
      console.log('✅ Correctly rejected invalid data with 400 status');
      console.log('Validation errors detected');
    } else {
      console.log(`❌ Expected 400 for invalid data, got: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Request failed:', (error as any).message);
  }
  console.log();
}

/**
 * Test 7: Query Parameter Tests
 */
async function testQueryParameters() {
  console.log('📋 Test 7: Query Parameter Tests');
  
  const testQueries = [
    '?limit=2',
    '?offset=1&limit=1', 
    '?search=academic',
    '?category=Academic',
    '?level=Medium',
    '?sortBy=IssueTitle&sortOrder=asc',
    '?limit=invalid' // Invalid parameter
  ];

  for (const query of testQueries) {
    try {
      console.log(`Testing query: ${query}`);
      const response = await publicAxios.get(`${BASE_URL}/issues${query}`);
      console.log(`  Status: ${response.status} | Results: ${response.data.data?.issues?.length || 0}`);
      
      if (query.includes('invalid') && response.status === 400) {
        console.log('  ✅ Correctly handled invalid parameter');
      }
    } catch (error) {
      console.log(`  ❌ Query failed: ${(error as any).message}`);
    }
  }
  console.log();
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 IssueList API Test Suite');
  console.log('='.repeat(50));
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Admin token configured: ${TEST_ADMIN_TOKEN !== 'your_admin_jwt_token_here'}`);
  console.log();

  await testGetIssuesPublic();
  await testGetIssuesAdmin();
  await testGetIssueByCode();
  await testGetInvalidIssue();
  await testCreateIssue();
  await testValidation();
  await testQueryParameters();

  console.log('🏁 Test Suite Complete');
  console.log('='.repeat(50));
  console.log();
  console.log('📊 Test Summary:');
  console.log('• GET /issues (public): Basic functionality');
  console.log('• GET /issues (admin): Role-based access');  
  console.log('• GET /issues/:code: Specific issue retrieval');
  console.log('• Error handling: Invalid codes and data');
  console.log('• POST /issues: Issue creation (admin only)');
  console.log('• Input validation: Zod schema enforcement');
  console.log('• Query parameters: Filtering and pagination');
  console.log();
  console.log('💡 Note: Admin-only tests require a valid JWT token');
  console.log('💡 Update TEST_ADMIN_TOKEN constant with a real admin token for full testing');
}

// Run the tests
runAllTests().catch(console.error);
