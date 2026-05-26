import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import Header from "../components/Header"

export default function Login() {
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [name, setName]         = useState("")
  const [error, setError]       = useState(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (isSignUp) {
      const { data, error: err } = await supabase.auth.signUp({ email, password })
      if (err) { setError(err.message); return }

      await supabase.from("profiles").insert({
        id: data.user.id,
        display_name: name.trim(),
      })
      navigate("/walls")
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); return }
      navigate("/walls")
    }
  }

  return (
    <div className="page">
      <Header />

      <form onSubmit={handleSubmit}>
        {isSignUp && (
          <div className="field">
            <label>nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        )}

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
