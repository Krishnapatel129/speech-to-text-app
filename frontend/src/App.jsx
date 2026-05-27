import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  const [transcript, setTranscript] = useState("");
  const [history, setHistory] = useState([]);
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    socket.on("transcript", (data) => {
      setTranscript((prev) => prev + " " + data);
    });

    return () => socket.off("transcript");
  }, []);

  
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("http://localhost:5000/transcriptions");
        const data = await res.json();
        setHistory(data);
      } catch (err) {
        console.log(err);
      }
    };

    fetchHistory();
  }, []);

  
  const startRecording = async () => {
    try {
      setTranscript("");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const audioContext = new AudioContext({ sampleRate: 16000 });
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
          view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }

        socket.emit("audio", buffer);
      };

      mediaRecorderRef.current = {
        stream,
        processor,
        audioContext,
      };
    } catch (err) {
      alert("Microphone not allowed");
      console.log(err);
    }
  };

  
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
    <div className="min-h-screen bg-slate-950 text-white px-6 py-10">

      
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-blue-400">
          🎤 Speech to Text AI
        </h1>
        <p className="text-gray-400 mt-2">
          Real-time transcription powered by Deepgram
        </p>
      </div>

     
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={startRecording}
          disabled={isRecording}
          className="px-6 py-3 rounded-full bg-green-500 hover:bg-green-600 transition-all shadow-lg disabled:opacity-40"
        >
          ▶ Start Recording
        </button>

        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className="px-6 py-3 rounded-full bg-red-500 hover:bg-red-600 transition-all shadow-lg disabled:opacity-40"
        >
          ■ Stop
        </button>
      </div>

      {/* LIVE TRANSCRIPT CARD */}
      <div className="max-w-3xl mx-auto mb-10">
        <div className="bg-gray-800/60 backdrop-blur-md border border-gray-700 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-blue-300 mb-3">
            Live Transcript
          </h2>

          <p className="text-gray-200 leading-relaxed min-h-[60px]">
            {transcript || "Start speaking to see live transcription..."}
          </p>
        </div>
      </div>

      {/* HISTORY SECTION */}
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">
          📜 Previous Transcriptions
        </h2>

        {history.length === 0 ? (
          <p className="text-center text-gray-400">
            No history found
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {history.map((item) => (
              <div
                key={item._id}
                className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5 shadow-lg hover:scale-[1.02] transition-transform duration-300"
              >
                <p className="text-gray-100 text-sm leading-relaxed">
                  {item.transcription}
                </p>

                <div className="mt-4 text-xs text-gray-400 flex justify-between">
                  <span>🕒 Saved</span>
                  <span>
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;