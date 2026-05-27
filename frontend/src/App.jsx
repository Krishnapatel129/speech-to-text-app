import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {

  const [transcript, setTranscript] =
    useState("");

  const [isRecording, setIsRecording] =
    useState(false);

  const mediaRecorderRef = useRef(null);


  useEffect(() => {

    socket.on("transcript", (data) => {

      setTranscript((prev) =>
        prev + " " + data
      );
    });

    return () => {

      socket.off("transcript");
    };

  }, []);


  const startRecording = async () => {

    try {

      
      setTranscript("");

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      const mediaRecorder =
        new MediaRecorder(stream, {
          mimeType: "audio/webm",
        });

      mediaRecorderRef.current =
        mediaRecorder;

      setIsRecording(true);

      mediaRecorder.start(250);

      mediaRecorder.ondataavailable =
        async (event) => {

          if (
            event.data.size > 0
          ) {

            const arrayBuffer =
              await event.data.arrayBuffer();

            socket.emit(
              "audio",
              arrayBuffer
            );
          }
        };

    } catch (err) {

      console.log(err);

      alert(
        "Microphone access denied"
      );
    }
  };


  const stopRecording = () => {

    if (
      mediaRecorderRef.current &&
      isRecording
    ) {

      mediaRecorderRef.current.stop();

     
      socket.emit("stop");

      setIsRecording(false);
    }
  };


  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">

      <h1 className="text-4xl font-bold text-blue-400 mb-8">
        Real-Time Speech To Text
      </h1>

      <div className="flex gap-4">

        <button
          onClick={startRecording}
          disabled={isRecording}
          className="bg-green-500 px-5 py-2 rounded-lg disabled:opacity-50"
        >
          Start
        </button>

        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className="bg-red-500 px-5 py-2 rounded-lg disabled:opacity-50"
        >
          Stop
        </button>
      </div>

      <div className="mt-8 bg-gray-900 p-5 rounded-lg w-full max-w-3xl">

        <h2 className="text-2xl mb-4">
          Live Transcript
        </h2>

        <p className="leading-7">
          {transcript || "Start speaking..."}
        </p>
      </div>
    </div>
  );
}

export default App;