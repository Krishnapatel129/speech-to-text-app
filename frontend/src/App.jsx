import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  const [transcript, setTranscript] = useState("");
  const [history, setHistory] = useState([]);
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef(null);

  // LIVE TRANSCRIPT
  useEffect(() => {
    socket.on("transcript", (data) => {
      setTranscript((prev) => prev + " " + data);
    });

    return () => socket.off("transcript");
  }, []);

  // HISTORY FETCH
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(
          "http://localhost:5000/transcriptions"
        );

        const data = await res.json();
        setHistory(data);
      } catch (err) {
        console.log(err);
      }
    };

    fetchHistory();
  }, []);

  // START RECORDING (CRITICAL FIX)
  const startRecording = async () => {
    try {
      setTranscript("");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const audioContext = new AudioContext({
        sampleRate: 16000,
      });

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);

        const buffer = new ArrayBuffer(input.length * 2);
        const view = new DataView(buffer);

        let offset = 0;

        for (let i = 0; i < input.length; i++, offset += 2) {
          let s = Math.max(-1, Math.min(1, input[i]));
          view.setInt16(
            offset,
            s < 0 ? s * 0x8000 : s * 0x7fff,
            true
          );
        }

        socket.emit("audio", buffer);
      };

      mediaRecorderRef.current = {
        stream,
        processor,
        audioContext,
      };
    } catch (err) {
      console.log("Mic error:", err);
      alert("Microphone not allowed");
    }
  };

  // STOP RECORDING
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      const { stream, processor, audioContext } =
        mediaRecorderRef.current;

      stream.getTracks().forEach((t) => t.stop());
      processor.disconnect();
      audioContext.close();
    }

    socket.emit("stop");
    setIsRecording(false);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center">

      <h1 className="text-3xl font-bold text-blue-400 mb-6">
        Speech To Text App
      </h1>

      {/* BUTTONS */}
      <div className="flex gap-4">
        <button
          onClick={startRecording}
          disabled={isRecording}
          className="bg-green-500 px-4 py-2 rounded"
        >
          Start
        </button>

        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className="bg-red-500 px-4 py-2 rounded"
        >
          Stop
        </button>
      </div>

      {/* LIVE */}
      <div className="mt-6 bg-gray-900 p-4 w-full max-w-2xl rounded">
        <h2 className="text-xl mb-2">Live Transcript</h2>
        <p>{transcript || "Start speaking..."}</p>
      </div>

      {/* HISTORY */}
      <div className="mt-10 bg-gray-900 p-4 w-full max-w-2xl rounded">
        <h2 className="text-xl mb-2">History</h2>

        {history.length > 0 ? (
          history.map((item) => (
            <div key={item._id} className="mb-3 bg-gray-800 p-2 rounded">
              <p>{item.transcription}</p>
              <small className="text-gray-400">
                {new Date(item.createdAt).toLocaleString()}
              </small>
            </div>
          ))
        ) : (
          <p>No history found</p>
        )}
      </div>
    </div>
  );
}

export default App;