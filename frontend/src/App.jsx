import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  const [transcript, setTranscript] = useState("");
  const [history, setHistory] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef(null);

  
  useEffect(() => {
    socket.on("transcript", (data) => {
      setTranscript((prev) => prev + " " + data);
    });

    socket.on("error", (data) => {
      setError(data.message);
    });

    return () => {
      socket.off("transcript");
      socket.off("error");
    };
  }, []);

  
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(
          "http://localhost:5000/transcriptions"
        );

        const data = await res.json();
        setHistory(data);
      } catch (err) {
        setError("Failed to load history");
      }
    };

    fetchHistory();
  }, []);

  
  const startRecording = async () => {
    try {
      setError("");
      setTranscript("");

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error("Microphone not supported");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const audioContext = new AudioContext({
        sampleRate: 16000,
      });

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(
        4096,
        1,
        1
      );

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
      setError(err.message || "Microphone error");
      setIsRecording(false);
    }
  };

 
  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current) {
        const { stream, processor, audioContext } =
          mediaRecorderRef.current;

        stream.getTracks().forEach((t) => t.stop());
        processor.disconnect();
        audioContext.close();
      }

      socket.emit("stop");
      setIsRecording(false);
    } catch (err) {
      setError("Failed to stop recording");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-10">

      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-blue-400">
          Speech To Text AI
        </h1>
      </div>

      
      {error && (
        <div className="max-w-2xl mx-auto mb-6 bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={startRecording}
          disabled={isRecording}
          className="bg-green-500 px-5 py-2 rounded hover:bg-green-600 disabled:opacity-40"
        >
          Start
        </button>

        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className="bg-red-500 px-5 py-2 rounded hover:bg-red-600 disabled:opacity-40"
        >
          Stop
        </button>
      </div>

      
      <div className="max-w-3xl mx-auto bg-slate-900 p-5 rounded-xl mb-8">
        <h2 className="text-lg mb-2 text-blue-300">
          Live Transcript
        </h2>
        <p>{transcript || "Start speaking..."}</p>
      </div>

     
      <div className="max-w-5xl mx-auto">
        <h2 className="text-xl mb-4 text-center">
          History
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          {history.map((item) => (
            <div
              key={item._id}
              className="bg-slate-900 p-4 rounded-lg border border-slate-700"
            >
              <p>{item.transcription}</p>
              <small className="text-gray-400">
                {new Date(item.createdAt).toLocaleString()}
              </small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;