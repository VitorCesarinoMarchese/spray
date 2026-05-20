import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import Header from "../components/Header"

export default function Login() {
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const action = isSignUp
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password })

    const { error: err } = await action

    if (err) {
      setError(err.message)
    } else {
      navigate("/walls")
    }
  }

  return (
    <div className="page">
      <Header />

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>e-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label>senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="error">{error}</p>}

        <div className="actions">
          <button type="submit">
            {isSignUp ? "criar conta" : "entrar"}
          </button>
        </div>
      </form>

      <p style={{ marginTop: 16, fontSize: 12 }}>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            setIsSignUp(!isSignUp)
          }}
        >
          {isSignUp
            ? "já tens conta? entrar"
            : "criar conta"}
        </a>
      </p>
    </div>
  )
}
