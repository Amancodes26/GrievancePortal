// Test script to check admin users and test admin API
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testAdminAPI() {
  console.log('🔧 Testing Admin API Endpoints...\n');

  try {
    // Test 1: Check migrate endpoint
    console.log('1. Testing migrate endpoint...');
    const migrateResponse = await fetch(`${BASE_URL}/admin/migrate`);
    const migrateData = await migrateResponse.json();
    console.log('✅ Migrate endpoint:', migrateData);
    console.log('');

    // Test 2: Try admin login with default credentials
    console.log('2. Testing admin login...');
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
    console.log('Login response status:', loginResponse.status);
    console.log('Login response:', loginData);
    
    if (loginData.success && loginData.token) {
      const adminToken = loginData.token;
      console.log('✅ Admin login successful!');
      console.log('Admin info:', loginData.admin);
      console.log('');

      // Test 3: Get admin profile
      console.log('3. Testing admin profile...');
      const profileResponse = await fetch(`${BASE_URL}/admin/profile`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const profileData = await profileResponse.json();
      console.log('Profile response status:', profileResponse.status);
      console.log('Profile response:', profileData);
      console.log('');

      // Test 4: Get admin dashboard
      console.log('4. Testing admin dashboard...');
      const dashboardResponse = await fetch(`${BASE_URL}/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const dashboardData = await dashboardResponse.json();
      console.log('Dashboard response status:', dashboardResponse.status);
      console.log('Dashboard response:', dashboardData);
      console.log('');

      return {
        success: true,
        adminToken,
        adminInfo: loginData.admin
      };
    } else {
      console.log('❌ Admin login failed:', loginData);
      
      // Test with different credentials
      console.log('\n🔄 Trying alternative credentials...');
      const altLoginResponse = await fetch(`${BASE_URL}/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'campus.admin@dseu.ac.in',
          password: 'admin123'
        })
      });
      
      const altLoginData = await altLoginResponse.json();
      console.log('Alternative login response:', altLoginData);
      
      return {
        success: false,
        error: 'Login failed'
      };
    }

  } catch (error) {
    console.error('❌ Error testing admin API:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test password setting endpoint
async function testSetPassword() {
  console.log('\n5. Testing set password endpoint...');
  try {
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
    console.log('Set password response status:', setPasswordResponse.status);
    console.log('Set password response:', setPasswordData);
  } catch (error) {
    console.error('❌ Error testing set password:', error);
  }
}

async function main() {
  const result = await testAdminAPI();
  await testSetPassword();
  
  console.log('\n📋 Test Summary:');
  console.log('Success:', result.success);
  if (result.success) {
    console.log('Admin Token obtained and APIs working');
    console.log('Admin Info:', result.adminInfo);
  } else {
    console.log('Error:', result.error);
  }
}

main();
