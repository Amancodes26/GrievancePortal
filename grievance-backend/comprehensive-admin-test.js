// Comprehensive Admin API Test Suite
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000/api/v1';

async function runComprehensiveAdminTests() {
  console.log('🧪 Running Comprehensive Admin API Test Suite...\n');

  const testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Database Migration
  try {
    console.log('1️⃣  Testing Database Migration Endpoint...');
    const migrateResponse = await fetch(`${BASE_URL}/admin/migrate`);
    const migrateData = await migrateResponse.json();
    
    if (migrateResponse.status === 200 && migrateData.tables && Array.isArray(migrateData.tables)) {
      testResults.passed++;
      testResults.tests.push({ name: 'Database Migration', status: 'PASS' });
      console.log('✅ PASS: Database migration endpoint working');
    } else {
      testResults.failed++;
      testResults.tests.push({ name: 'Database Migration', status: 'FAIL', error: 'Invalid response structure' });
      console.log('❌ FAIL: Database migration endpoint');
    }
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name: 'Database Migration', status: 'FAIL', error: error.message });
    console.log('❌ FAIL: Database migration endpoint -', error.message);
  }

  // Test 2: Admin Login with Correct Credentials
  let adminToken = null;
  try {
    console.log('\n2️⃣  Testing Admin Login (Valid Credentials)...');
    const loginResponse = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@dseu.ac.in',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (loginResponse.status === 200 && loginData.success && loginData.token && loginData.admin) {
      testResults.passed++;
      testResults.tests.push({ name: 'Admin Login (Valid)', status: 'PASS' });
      console.log('✅ PASS: Admin login successful');
      console.log(`   Admin ID: ${loginData.admin.id}`);
      console.log(`   Admin Role: ${loginData.admin.role}`);
      adminToken = loginData.token;
    } else {
      testResults.failed++;
      testResults.tests.push({ name: 'Admin Login (Valid)', status: 'FAIL', error: 'Login failed or invalid response' });
      console.log('❌ FAIL: Admin login failed');
      console.log('   Response:', loginData);
    }
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name: 'Admin Login (Valid)', status: 'FAIL', error: error.message });
    console.log('❌ FAIL: Admin login -', error.message);
  }

  // Test 3: Admin Login with Invalid Credentials
  try {
    console.log('\n3️⃣  Testing Admin Login (Invalid Credentials)...');
    const invalidLoginResponse = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'invalid@dseu.ac.in',
        password: 'wrongpassword'
      })
    });
    
    const invalidLoginData = await invalidLoginResponse.json();
    
    if (invalidLoginResponse.status === 401 && !invalidLoginData.success) {
      testResults.passed++;
      testResults.tests.push({ name: 'Admin Login (Invalid)', status: 'PASS' });
      console.log('✅ PASS: Invalid login correctly rejected');
    } else {
      testResults.failed++;
      testResults.tests.push({ name: 'Admin Login (Invalid)', status: 'FAIL', error: 'Should reject invalid credentials' });
      console.log('❌ FAIL: Invalid login not properly rejected');
    }
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name: 'Admin Login (Invalid)', status: 'FAIL', error: error.message });
    console.log('❌ FAIL: Invalid login test -', error.message);
  }

  // Test 4: Admin Login with Missing Fields
  try {
    console.log('\n4️⃣  Testing Admin Login (Missing Fields)...');
    const missingFieldsResponse = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@dseu.ac.in'
        // missing password
      })
    });
    
    const missingFieldsData = await missingFieldsResponse.json();
    
    if (missingFieldsResponse.status === 400 && !missingFieldsData.success) {
      testResults.passed++;
      testResults.tests.push({ name: 'Admin Login (Missing Fields)', status: 'PASS' });
      console.log('✅ PASS: Missing fields correctly handled');
    } else {
      testResults.failed++;
      testResults.tests.push({ name: 'Admin Login (Missing Fields)', status: 'FAIL', error: 'Should reject missing fields' });
      console.log('❌ FAIL: Missing fields not properly handled');
    }
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name: 'Admin Login (Missing Fields)', status: 'FAIL', error: error.message });
    console.log('❌ FAIL: Missing fields test -', error.message);
  }

  // Test 5: Admin Profile (Authenticated)
  if (adminToken) {
    try {
      console.log('\n5️⃣  Testing Admin Profile (Authenticated)...');
      const profileResponse = await fetch(`${BASE_URL}/admin/profile`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const profileData = await profileResponse.json();
      
      if (profileResponse.status === 200 && profileData.success && profileData.data && profileData.data.AdminId) {
        testResults.passed++;
        testResults.tests.push({ name: 'Admin Profile (Authenticated)', status: 'PASS' });
        console.log('✅ PASS: Admin profile retrieved successfully');
        console.log(`   Admin Name: ${profileData.data.Name}`);
        console.log(`   Admin Role: ${profileData.data.Role}`);
      } else {
        testResults.failed++;
        testResults.tests.push({ name: 'Admin Profile (Authenticated)', status: 'FAIL', error: 'Profile retrieval failed' });
        console.log('❌ FAIL: Admin profile retrieval failed');
      }
    } catch (error) {
      testResults.failed++;
      testResults.tests.push({ name: 'Admin Profile (Authenticated)', status: 'FAIL', error: error.message });
      console.log('❌ FAIL: Admin profile test -', error.message);
    }
  }

  // Test 6: Admin Profile (Unauthenticated)
  try {
    console.log('\n6️⃣  Testing Admin Profile (Unauthenticated)...');
    const unauthedProfileResponse = await fetch(`${BASE_URL}/admin/profile`, {
      headers: {
        'Authorization': 'Bearer invalid_token',
        'Content-Type': 'application/json'
      }
    });
    
    const unauthedProfileData = await unauthedProfileResponse.json();
    
    if ((unauthedProfileResponse.status === 401 || unauthedProfileResponse.status === 403) && !unauthedProfileData.success) {
      testResults.passed++;
      testResults.tests.push({ name: 'Admin Profile (Unauthenticated)', status: 'PASS' });
      console.log('✅ PASS: Unauthorized access correctly blocked');
    } else {
      testResults.failed++;
      testResults.tests.push({ name: 'Admin Profile (Unauthenticated)', status: 'FAIL', error: 'Should block unauthorized access' });
      console.log('❌ FAIL: Unauthorized access not properly blocked');
    }
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name: 'Admin Profile (Unauthenticated)', status: 'FAIL', error: error.message });
    console.log('❌ FAIL: Unauthorized profile test -', error.message);
  }

  // Test 7: Admin Dashboard (Authenticated)
  if (adminToken) {
    try {
      console.log('\n7️⃣  Testing Admin Dashboard (Authenticated)...');
      const dashboardResponse = await fetch(`${BASE_URL}/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const dashboardData = await dashboardResponse.json();
      
      if (dashboardResponse.status === 200 && dashboardData.success && dashboardData.data) {
        const data = dashboardData.data;
        if (data.adminInfo && data.statistics && data.systemStatus) {
          testResults.passed++;
          testResults.tests.push({ name: 'Admin Dashboard (Authenticated)', status: 'PASS' });
          console.log('✅ PASS: Admin dashboard retrieved successfully');
          console.log(`   System Status: ${data.systemStatus.status}`);
          console.log(`   Total Users: ${data.statistics.totalUsers}`);
        } else {
          testResults.failed++;
          testResults.tests.push({ name: 'Admin Dashboard (Authenticated)', status: 'FAIL', error: 'Dashboard structure incomplete' });
          console.log('❌ FAIL: Dashboard structure incomplete');
        }
      } else {
        testResults.failed++;
        testResults.tests.push({ name: 'Admin Dashboard (Authenticated)', status: 'FAIL', error: 'Dashboard retrieval failed' });
        console.log('❌ FAIL: Admin dashboard retrieval failed');
      }
    } catch (error) {
      testResults.failed++;
      testResults.tests.push({ name: 'Admin Dashboard (Authenticated)', status: 'FAIL', error: error.message });
      console.log('❌ FAIL: Admin dashboard test -', error.message);
    }
  }

  // Test 8: Set Admin Password
  try {
    console.log('\n8️⃣  Testing Set Admin Password...');
    const setPasswordResponse = await fetch(`${BASE_URL}/admin/auth/set-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@dseu.ac.in',
        newPassword: 'admin123'
      })
    });
    
    const setPasswordData = await setPasswordResponse.json();
    
    if (setPasswordResponse.status === 200 && setPasswordData.success) {
      testResults.passed++;
      testResults.tests.push({ name: 'Set Admin Password', status: 'PASS' });
      console.log('✅ PASS: Admin password set successfully');
    } else {
      testResults.failed++;
      testResults.tests.push({ name: 'Set Admin Password', status: 'FAIL', error: 'Password setting failed' });
      console.log('❌ FAIL: Admin password setting failed');
    }
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name: 'Set Admin Password', status: 'FAIL', error: error.message });
    console.log('❌ FAIL: Set password test -', error.message);
  }

  // Print Test Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 ADMIN API TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  console.log('\nDetailed Results:');
  testResults.tests.forEach((test, index) => {
    const icon = test.status === 'PASS' ? '✅' : '❌';
    console.log(`${index + 1}. ${icon} ${test.name}: ${test.status}`);
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    }
  });

  return testResults;
}

runComprehensiveAdminTests()
  .then(results => {
    console.log('\n🏁 Test suite completed!');
    if (results.failed === 0) {
      console.log('🎉 All tests passed! Admin API is ready for production.');
    } else {
      console.log(`⚠️  ${results.failed} test(s) failed. Please review and fix issues.`);
    }
  })
  .catch(error => {
    console.error('💥 Test suite failed to run:', error);
  });
