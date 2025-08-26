/**
 * Tracking API Test Script
 * Tests the complete Tracking API implementation
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbklkIjoiQWRtaW4wMDEiLCJlbWFpbCI6InNha3NoaUBkc2V1LmFjLmluIiwicm9sZSI6IlNVUEVSX0FETUlOIiwiaWF0IjoxNzM1NTgxMDcxLCJleHAiOjE3MzU2Njc0NzF9.0lQpQLLqgQ4OvmKH9mJCZpCQmYMPbTEqfvhJZD-ZNjM'; // Replace with actual admin token

// Test data
const trackingEntry = {
  grievanceId: 'GRV-2024-000001', // Replace with actual grievance ID
  responseText: 'Initial review completed. Moving to department admin for further processing.',
  adminStatus: 'PENDING',
  studentStatus: 'UNDER_REVIEW',
  responseBy: 'Admin001', // Replace with actual admin ID
  isRedirect: false,
  hasAttachments: false
};

const headers = {
  'Authorization': `Bearer ${ADMIN_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testTrackingAPI() {
  console.log('🧪 Testing Tracking API Implementation...\n');

  try {
    // Test 1: Create Tracking Entry
    console.log('1️⃣  Testing POST /api/v1/tracking (Create Tracking Entry)');
    console.log('Request Data:', JSON.stringify(trackingEntry, null, 2));
    
    const createResponse = await axios.post(
      `${API_BASE_URL}/tracking`, 
      trackingEntry, 
      { headers }
    );
    
    console.log('✅ CREATE SUCCESS');
    console.log('Status Code:', createResponse.status);
    console.log('Response:', JSON.stringify(createResponse.data, null, 2));
    
    // Test 2: Get Tracking History
    console.log('\n2️⃣  Testing GET /api/v1/tracking/:grievanceId (Get Tracking History)');
    
    const historyResponse = await axios.get(
      `${API_BASE_URL}/tracking/${trackingEntry.grievanceId}`,
      { headers }
    );
    
    console.log('✅ HISTORY SUCCESS');
    console.log('Status Code:', historyResponse.status);
    console.log('Response:', JSON.stringify(historyResponse.data, null, 2));
    
    // Test 3: Get Current Status
    console.log('\n3️⃣  Testing GET /api/v1/tracking/:grievanceId/status (Get Current Status)');
    
    const statusResponse = await axios.get(
      `${API_BASE_URL}/tracking/${trackingEntry.grievanceId}/status`,
      { headers }
    );
    
    console.log('✅ STATUS SUCCESS');
    console.log('Status Code:', statusResponse.status);
    console.log('Response:', JSON.stringify(statusResponse.data, null, 2));
    
    // Test 4: Create Redirect Entry
    console.log('\n4️⃣  Testing POST /api/v1/tracking (Create Redirect Entry)');
    
    const redirectEntry = {
      ...trackingEntry,
      responseText: 'Redirecting grievance to appropriate department admin for specialized handling.',
      adminStatus: 'REDIRECTED',
      studentStatus: 'UNDER_REVIEW',
      redirectTo: 'Admin002', // Replace with actual target admin
      isRedirect: true
    };
    
    console.log('Request Data:', JSON.stringify(redirectEntry, null, 2));
    
    const redirectResponse = await axios.post(
      `${API_BASE_URL}/tracking`, 
      redirectEntry, 
      { headers }
    );
    
    console.log('✅ REDIRECT SUCCESS');
    console.log('Status Code:', redirectResponse.status);
    console.log('Response:', JSON.stringify(redirectResponse.data, null, 2));
    
    console.log('\n🎉 All Tracking API tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ API Test Failed:');
    
    if (error.response) {
      console.error('Status Code:', error.response.status);
      console.error('Error Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('Request Error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Validation Tests
async function testValidationErrors() {
  console.log('\n🔍 Testing Validation Error Handling...\n');

  const invalidTests = [
    {
      name: 'Invalid Grievance ID Format',
      data: { ...trackingEntry, grievanceId: 'INVALID_FORMAT' }
    },
    {
      name: 'Missing Response Text',
      data: { ...trackingEntry, responseText: '' }
    },
    {
      name: 'Invalid Admin Status',
      data: { ...trackingEntry, adminStatus: 'INVALID_STATUS' }
    },
    {
      name: 'Invalid Student Status',
      data: { ...trackingEntry, studentStatus: 'INVALID_STATUS' }
    },
    {
      name: 'Response Text Too Long',
      data: { ...trackingEntry, responseText: 'A'.repeat(2001) }
    }
  ];

  for (const test of invalidTests) {
    try {
      console.log(`Testing: ${test.name}`);
      
      const response = await axios.post(
        `${API_BASE_URL}/tracking`, 
        test.data, 
        { headers }
      );
      
      console.log(`❌ Expected validation error but got success: ${response.status}`);
      
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log(`✅ Validation error correctly caught: ${error.response.data.message}`);
      } else {
        console.log(`⚠️  Unexpected error: ${error.response?.status || 'Unknown'}`);
      }
    }
  }
}

// Run tests
if (require.main === module) {
  testTrackingAPI()
    .then(() => testValidationErrors())
    .catch(console.error);
}

export { testTrackingAPI, testValidationErrors };
