import React from 'react';
import VideoUploader from './components/VideoUploader';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>
          Welcome to the Video Uploader
        </h1>
        <p>
          Upload Videos
        </p>
        <VideoUploader />

      </header>
    </div>
  );
}

export default App;
