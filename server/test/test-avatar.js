import fs from 'fs';
import path from 'path';

async function run() {
  // Create a minimal fake 1x1 PNG image buffer
  const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  
  const blob = new Blob([samplePng], { type: 'image/png' });
  const formData = new FormData();
  formData.append('avatar', blob, 'test-profile.png');

  const res = await fetch('http://localhost:5000/api/auth/citizen/upload-avatar', {
    method: 'POST',
    body: formData
  });

  const json = await res.json();
  console.log('Status:', res.status);
  console.log('Result:', JSON.stringify(json, null, 2));

  if (res.status === 200 && json.success && json.data?.avatarUrl) {
    console.log('✅ Direct Profile Picture Upload Test Passed! Avatar URL:', json.data.avatarUrl);
    
    // Check if the file is reachable
    const fileRes = await fetch(json.data.avatarUrl);
    console.log('Image fetch status:', fileRes.status);
    if (fileRes.status === 200) {
      console.log('✅ Uploaded image is statically accessible and persistent!');
    }
  } else {
    console.error('❌ Upload failed!');
    process.exit(1);
  }
}

run().catch(console.error);
