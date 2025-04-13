"use client";

import { supabase } from "@/services/supabase";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const Register: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
    } else if (data.session) {
      router.push("/transcribe");
    } else {
      setMessage("Unexpected error. Try logging in.");
    }
  };

  return (
    <div className="landing-page">
      <h1 className="title">Register</h1>
      <form onSubmit={handleRegister}>
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
          {loading ? "Registering..." : "Register"}
        </button>
        <br />
        <button
          type="submit"
          disabled={loading}
          className="cta-button"
          onClick={() => router.push("/login")}
          style={{ marginTop: "1rem" }}
        >
          Already have an account? LogIn
        </button>
      </form>
      {message && <p>{message}</p>}
      <div className="stars" />
    </div>
  );
};

export default Register;
