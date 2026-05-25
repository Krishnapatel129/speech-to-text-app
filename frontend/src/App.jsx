import { useState, useRef } from "react";

export default function App() {
  const [file, setFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

 
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };


  const handleUpload = () => {
    if (!file) return alert("Select a file first");

    setTranscript("Processing audio...");

    setTimeout(() => {
      setTranscript(
        "This is a simulated transcription from uploaded audio file."
      );
    }, 2000);
  };

  
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorderRef.current = new MediaRecorder(stream);
    chunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      setTranscript("Processing recording...");

      setTimeout(() => {
        setTranscript(
          "This is a simulated transcription from recorded audio."
        );
      }, 2000);
    };

    mediaRecorderRef.current.start();
    setRecording(true);
  };


  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white shadow-lg rounded-2xl p-6 w-full max-w-xl">

        <h1 className="text-2xl font-bold mb-6 text-center">
          Real Time Speech to Text 
        </h1>

        
        <div className="mb-6">
          <input type="file" accept="audio/*" onChange={handleFileChange} />

          <button
            onClick={handleUpload}
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
          >
            Upload File
          </button>
        </div>

     
        <div className="mb-6">
          {!recording ? (
            <button
              onClick={startRecording}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Stop Recording
            </button>
          )}
        </div>

        
        <div className="bg-gray-50 p-4 rounded border min-h-[120px]">
          <h2 className="font-semibold mb-2">Transcription:</h2>
          <p className="text-gray-700">
            {transcript || "No transcription yet..."}
          </p>
        </div>
      </div>
    </div>
  );
}