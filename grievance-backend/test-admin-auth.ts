import axios from 'axios';

const baseURL = 'http://localhost:5000/api/v1';

async function testAdminAuth() {
  try {
    console.log('🔐 Testing admin authentication...');
    
    // Test admin login with the sample data
    const loginData = {
      email: 'admin@dseu.ac.in',
      password: 'qwertyuiop'
    };
    
    console.log('📝 Attempting login with:', loginData);
    
    const loginResponse = await axios.post(`${baseURL}/admin/auth/login`, loginData);
    
    console.log('✅ Login successful!');
    console.log('📋 Response:', loginResponse.data);
    
    const token = loginResponse.data.token;
    
    // Test protected admin route
    console.log('\n🛡️ Testing protected admin route...');
    
    const profileResponse = await axios.get(`${baseURL}/admin/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Profile access successful!');
    console.log('📋 Profile data:', profileResponse.data);
    
  } catch (error: any) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAdminAuth();
