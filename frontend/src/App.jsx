import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import socket from "./socket";
import { supabase } from "./supabaseClient";


export default function App() {
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
const [page, setPage] = useState("login");

const [fullName, setFullName] = useState("");
const [contact, setContact] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [authLoading, setAuthLoading] = useState(true);
  

  const mediaRef = useRef(null);

 
 const fetchHistory = async () => {
  try {
    
async function fetchHistory() {
  try {
    // ✅ Declare the variable properly
    const res = await fetch("https://speech-to-text-app-1-h8o2.onrender.com/transcriptions", {
      credentials: "include"
    });

    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("fetchHistory error:", err);
    return [];
  }
}



    const contentType = res.headers.get("content-type") || "";
    if (!res.ok) {
      // If backend returns HTML (404 page), prevent JSON parse crash.
      if (contentType.includes("application/json")) {
        const errJson = await res.json();
        throw new Error(errJson.message || `Request failed: ${res.status}`);
      }
      const text = await res.text();
      throw new Error(`Request failed: ${res.status}. ${text.slice(0, 120)}`);
    }

    const data = await res.json();
    setHistory(data);
  } catch (err) {
    console.error("fetchHistory error:", err);
    setError(err.message || "Failed to load history");
  }
};


useEffect(() => {
  fetchHistory();
}, []);

  useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    const currentUser = data.session?.user || null;

    setUser(currentUser);
    setPage(currentUser ? "app" : "login");

    setAuthLoading(false);
  });

  const { data } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      const currentUser = session?.user || null;

      setUser(currentUser);
      setPage(currentUser ? "app" : "login");
    }
  );

  return () => data.subscription.unsubscribe();
}, []);
   useEffect(() => {
  if (user) {
    fetchHistory();
  }
}, [user]);

  useEffect(() => {
  const handleTranscript = (text) => {
    setTranscript((prev) => prev + " " + text);
  };

  const handleSaved = () => {
    setSuccess("Transcription saved successfully.");
    setLoading(false);
    fetchHistory();
  };

  const handleError = (data) => {
    setError(data.message || "Something went wrong.");
    setLoading(false);
  };

  socket.on("transcript", handleTranscript);
  socket.on("saved", handleSaved);
  socket.on("error", handleError);

  return () => {
    socket.off("transcript", handleTranscript);
    socket.off("saved", handleSaved);
    socket.off("error", handleError);
  };
}, []);

  const startRecording = async () => {
    socket.emit("start", {
  userId: user.id
});
    try {
      setError("");
      setSuccess("");
      setTranscript("");
      if (mediaRef.current) {
  mediaRef.current = null;
}
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      const audioContext = new AudioContext({
        sampleRate: 16000,
      });

      const source =
        audioContext.createMediaStreamSource(stream);

      const processor =
        audioContext.createScriptProcessor(
          4096,
          1,
          1
        );

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);

      processor.onaudioprocess = (e) => {
        const input =
          e.inputBuffer.getChannelData(0);

        const buffer = new ArrayBuffer(
          input.length * 2
        );

        const view = new DataView(buffer);

        let offset = 0;

        for (let i = 0; i < input.length; i++) {
          let s = Math.max(
            -1,
            Math.min(1, input[i])
          );

          view.setInt16(
            offset,
            s < 0 ? s * 0x8000 : s * 0x7fff,
            true
          );

          offset += 2;
        }

        socket.emit("audio", buffer);
      };

      mediaRef.current = {
        stream,
        processor,
        audioContext,
      };
    } catch (err) {
      console.error(err);

      setError(
        "Microphone permission denied or unavailable."
      );
    }
  };


const stopRecording = () => {
  try {
    if (!mediaRef.current) {
      console.log("No active recording");
      return;
    }

    const { stream, processor, audioContext } = mediaRef.current;

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    if (processor) {
      processor.disconnect();
    }

    if (audioContext) {
      audioContext.close();
    }

    mediaRef.current = null;

    socket.emit("stop", { userId: user?.id }); // FIXED (NO userId)

    setIsRecording(false);
    setLoading(true);

  } catch (err) {
    console.error("STOP ERROR:", err);
    setError("Failed to stop recording.");
  }
  };


 const signup = async () => {
  if (!fullName || !contact || !email || !password) {
    alert("Please fill all fields");
    return;
  }

  if (!/^[A-Za-z ]+$/.test(fullName)) {
    alert("Full Name should contain only letters");
    return;
  }

  if (!/^\d{10}$/.test(contact)) {
    alert("Enter valid 10 digit contact number");
    return;
  }
  if (!email) {
  alert("Email is required");
  return;
}

if (email.length > 100) {
  alert("Email must be less than 100 characters");
  return;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailRegex.test(email)) {
  alert("Enter a valid email address");
  return;
}

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        contact_number: contact,
      },
    },
  });

  if (error) {
    alert(error.message);
  } else {
    alert("Signup successful");
    setPage("login");
  }
};


  const login = async () => {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  console.log("LOGIN:", data);
  console.log("ERROR:", error);

  if (error) {
    alert(error.message);
    return;
  }

  setUser(data.user);
  setPage("app");
};

const logout = async () => {
  await supabase.auth.signOut();
  setUser(null);
  setPage("login");
};
if (authLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      Loading...
    </div>
  );
}




if (page === "login" && !user) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800">
      <div className="bg-white w-full max-w-md rounded-2xl p-8 shadow-2xl">

        <h1 className="text-3xl font-bold text-center text-black mb-6">
          Login
        </h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-3 rounded-lg mb-4 text-black"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-3 rounded-lg mb-4 text-black"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          className="w-full bg-blue-600 text-white py-3 rounded-lg"
        >
          Login
        </button>

        <p className="text-center text-black mt-4">
          Don't have an account?
          <span
            className="text-blue-600 ml-2 cursor-pointer"
            onClick={() => setPage("signup")}
          >
            Signup
          </span>
        </p>

      </div>
    </div>
  );
}

if (page === "signup" && !user) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 via-teal-600 to-cyan-700">
      <div className="bg-white w-full max-w-md rounded-2xl p-8 shadow-2xl">

        <h1 className="text-3xl font-bold text-center text-black mb-6">
          Create Account
        </h1>

        <input
  type="text"
  placeholder="Full Name"
  className="w-full border p-3 rounded-lg mb-4 text-black"
  value={fullName}
  onChange={(e) => {
    const value = e.target.value.replace(/[^A-Za-z ]/g, "");
    setFullName(value);
  }}
/>
        <input
          type="tel"
          placeholder="Contact Number"
          className="w-full border p-3 rounded-lg mb-4 text-black"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-3 rounded-lg mb-4 text-black"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-3 rounded-lg mb-4 text-black"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={signup}
          className="w-full bg-green-600 text-white py-3 rounded-lg"
        >
          Create Account
        </button>

        <p className="text-center text-black mt-4">
          Already have an account?
          <span
            className="text-green-600 ml-2 cursor-pointer"
            onClick={() => setPage("login")}
          >
            Login
          </span>
        </p>

      </div>
    </div>
    
  );
}

 
  return (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 to-black text-white p-6">
    <div className="max-w-5xl mx-auto">

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-blue-400">
            Speech To Text AI
          </h1>

          <p className="text-gray-400">
            Welcome, {user?.user_metadata?.full_name || "User"}
          </p>
        </div>

        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
        >
          Logout
        </button>
      </div>

        {/* Buttons */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={startRecording}
            disabled={isRecording}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 px-6 py-3 rounded-lg transition"
          >
            Start Recording
          </button>

          <button
            onClick={stopRecording}
            disabled={!isRecording}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-500 px-6 py-3 rounded-lg transition"
          >
            Stop Recording
          </button>
        </div>

        {/* Listening */}
        {isRecording && (
          <div className="flex justify-center items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span>Listening...</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center gap-2 mb-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
            <span>Processing audio...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-300 p-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        {/* Transcript */}
        <div className="bg-slate-800 rounded-xl p-5 shadow-lg">
          <h2 className="text-xl font-semibold mb-3">
            Live Transcript
          </h2>

          <p className="leading-7 text-gray-200">
            {transcript || "Start speaking..."}
          </p>
        </div>

        {/* History */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">
            Transcription History
          </h2>
          
          {history.length === 0 ? (
            <p className="text-gray-400">
              No history found
            </p>
          ) : (
            history.map((item) => (
              <div
                key={item._id}
                className="bg-slate-800 p-4 rounded-lg mb-3 shadow hover:bg-slate-700 transition"
              >
                <p className="mb-2">
                  {item.transcription}
                </p>

                <small className="text-gray-400">
                  {item.createdAt
                    ? new Date(
                        item.createdAt
                      ).toLocaleString()
                    : "No date"}
                </small>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}