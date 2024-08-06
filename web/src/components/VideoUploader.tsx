import React, { useState } from 'react';
import axios from 'axios';

const VideoUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFile = event.target.files[0];
      if (selectedFile && selectedFile.type.startsWith('video/')) {
        setFile(selectedFile);
      } else {
        alert('Please select a valid video file.');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setProgress(0);

    try {
      // Get pre-signed URL from your backend
      const { data: { url } } = await axios.get('https://wwe5pixqhc.execute-api.us-east-1.amazonaws.com/prod/');

      // Upload to S3
      await axios.put(url, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percentCompleted);
          }
        }
      });

      alert('Upload successful!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} accept="video/*" disabled={loading} />
      <button onClick={handleUpload} disabled={!file || loading}>
        {loading ? 'Uploading...' : 'Upload Video'}
      </button>
      {loading && <progress value={progress} max="100" />}
    </div>
  );
};

export default VideoUploader;