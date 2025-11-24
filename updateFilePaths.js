import axios from 'axios';
import path from 'path';

const API_BASE_URL = 'http://localhost:3001/api';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJBRE1JTjAwMSIsImVtYWlsIjoiYWRtaW5AcHVwLmVkdS5waCIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTc2Mzg2NDY4MywiZXhwIjoxNzY0NDY5NDgzfQ.7uk6vkQgRHbJrD2Up3-R7ulYhM2XDx_dleIVYwBm8EI';

const debugFilePaths = async () => {
  try {
    console.log('Fetching all files for debugging...');
    const response = await axios.get(`${API_BASE_URL}/files/all`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`
      }
    });

    const files = response.data.files;
    console.log(`Found ${files.length} files.`);

    for (const file of files) {
      console.log(`File ID: ${file.id}, Filename: ${file.filename}, filePath: ${file.file_path}, fileUrl: ${file.fileUrl}`);
    }
    console.log('Debugging complete.');
  } catch (error) {
    console.error('Error fetching files for debugging:', error);
    if (error.response) {
      console.error('Error response data:', error.response.data);
    }
  }
};

debugFilePaths();
