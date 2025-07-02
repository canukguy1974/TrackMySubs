#!/usr/bin/env node

/**
 * Gmail Integration Test Script
 * 
 * This script tests the Gmail integration functionality:
 * 1. Environment variable configuration
 * 2. API endpoint availability 
 * 3. OAuth flow initialization
 * 4. Mock scanning functionality
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkEnvironmentVariables() {
  log('\n📋 Checking Environment Variables...', colors.blue);
  
  const requiredVars = [
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET',
    'NEXT_PUBLIC_BASE_URL'
  ];
  
  const missingVars = [];
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      log(`✅ ${varName}: Configured`, colors.green);
    } else {
      log(`❌ ${varName}: Missing`, colors.red);
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    log(`\n⚠️  Missing environment variables: ${missingVars.join(', ')}`, colors.yellow);
    log('Please check your .env file or environment configuration.', colors.yellow);
    return false;
  }
  
  log('\n✅ All required environment variables are configured!', colors.green);
  return true;
}

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testAPIEndpoints() {
  log('\n🔗 Testing API Endpoints...', colors.blue);
  
  const endpoints = [
    {
      name: 'Gmail Status Check',
      url: `${BASE_URL}/api/auth/gmail/status`,
      method: 'GET'
    },
    {
      name: 'Gmail Auth URL Generation',
      url: `${BASE_URL}/api/auth/gmail`,
      method: 'GET'
    }
  ];
  
  for (const endpoint of endpoints) {
    try {
      log(`\nTesting: ${endpoint.name}...`);
      
      const response = await makeRequest(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        log(`✅ ${endpoint.name}: Working (${response.status})`, colors.green);
        if (endpoint.name === 'Gmail Status Check') {
          log(`   Configuration: ${response.data.configured ? 'Valid' : 'Invalid'}`, 
              response.data.configured ? colors.green : colors.red);
        }
        if (endpoint.name === 'Gmail Auth URL Generation') {
          log(`   Auth URL: ${response.data.authUrl ? 'Generated' : 'Failed'}`, 
              response.data.authUrl ? colors.green : colors.red);
        }
      } else {
        log(`❌ ${endpoint.name}: Failed (${response.status})`, colors.red);
        if (response.data.error) {
          log(`   Error: ${response.data.error}`, colors.red);
        }
      }
    } catch (error) {
      log(`❌ ${endpoint.name}: Connection failed`, colors.red);
      log(`   Error: ${error.message}`, colors.red);
    }
  }
}

async function testMockGmailScan() {
  log('\n📧 Testing Mock Gmail Scan...', colors.blue);
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/scan/mock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com'
      })
    });
    
    if (response.status === 200) {
      log('✅ Mock Gmail Scan: Working', colors.green);
      if (response.data.subscriptions) {
        log(`   Found ${response.data.subscriptions.length} mock subscriptions`, colors.green);
      }
    } else {
      log(`❌ Mock Gmail Scan: Failed (${response.status})`, colors.red);
    }
  } catch (error) {
    log(`❌ Mock Gmail Scan: Connection failed`, colors.red);
    log(`   Error: ${error.message}`, colors.red);
  }
}

function checkProjectStructure() {
  log('\n📁 Checking Project Structure...', colors.blue);
  
  const requiredFiles = [
    'src/services/gmail.ts',
    'src/app/api/auth/gmail/route.ts',
    'src/app/api/auth/gmail/callback/route.ts',
    'src/app/api/auth/gmail/status/route.ts',
    'src/app/api/gmail/scan/route.ts',
    'src/app/connect-account/page.tsx'
  ];
  
  const missingFiles = [];
  
  requiredFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      log(`✅ ${filePath}`, colors.green);
    } else {
      log(`❌ ${filePath}: Missing`, colors.red);
      missingFiles.push(filePath);
    }
  });
  
  if (missingFiles.length > 0) {
    log(`\n⚠️  Missing files: ${missingFiles.length}`, colors.yellow);
    return false;
  }
  
  log('\n✅ All required files are present!', colors.green);
  return true;
}

function generateSetupInstructions() {
  log('\n🔧 Gmail Integration Setup Instructions:', colors.blue);
  log('\n1. Get Google Cloud Project:', colors.bold);
  log('   - Go to https://console.cloud.google.com/');
  log('   - Create a new project or select existing one');
  
  log('\n2. Enable Gmail API:', colors.bold);
  log('   - Go to APIs & Services > Library');
  log('   - Search for "Gmail API" and enable it');
  
  log('\n3. Create OAuth Credentials:', colors.bold);
  log('   - Go to APIs & Services > Credentials');
  log('   - Click "Create Credentials" > "OAuth client ID"');
  log('   - Choose "Web application"');
  log(`   - Add authorized redirect URI: ${BASE_URL}/api/auth/gmail/callback`);
  
  log('\n4. Configure Environment Variables:', colors.bold);
  log('   Create a .env.local file with:');
  log('   GMAIL_CLIENT_ID="your-client-id.apps.googleusercontent.com"');
  log('   GMAIL_CLIENT_SECRET="your-client-secret"');
  log(`   NEXT_PUBLIC_BASE_URL="${BASE_URL}"`);
  
  log('\n5. Test the Integration:', colors.bold);
  log('   - Restart your development server');
  log('   - Visit /connect-account page');
  log('   - Try connecting a Gmail account');
}

async function runAllTests() {
  log('🧪 Gmail Integration Test Suite', colors.bold);
  log('=====================================');
  
  const structureOk = checkProjectStructure();
  const envOk = checkEnvironmentVariables();
  
  if (structureOk && envOk) {
    await testAPIEndpoints();
    await testMockGmailScan();
    
    log('\n🎉 Gmail Integration Test Complete!', colors.green);
    log('If all tests passed, your Gmail integration is ready for production.', colors.green);
  } else {
    log('\n❌ Setup Issues Detected', colors.red);
    generateSetupInstructions();
  }
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  checkEnvironmentVariables,
  testAPIEndpoints,
  testMockGmailScan,
  checkProjectStructure
};
