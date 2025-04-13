"use client";

import { supabase } from "@/services/supabase";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Logged in successfully!");
      router.push("/transcribe");
    }
  };

  return (
    <div className="landing-page">
      <h1 className="title">Login</h1>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: "1rem" }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>
        <button type="submit" disabled={loading} className="cta-button">
          {loading ? "Logging in..." : "LogIn"}
        </button>
        <br />
        <button
          type="submit"
          disabled={loading}
          className="cta-button"
          onClick={() => router.push("/register")}
          style={{ marginTop: "1rem" }}
        >
          Don't have an account? Register
        </button>
      </form>
      {message && <p>{message}</p>}
      <div className="stars" />
    </div>
  );
};

export default Login;
