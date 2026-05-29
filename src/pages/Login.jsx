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
  const [checkEmail, setCheckEmail] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (isSignUp) {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name.trim() } },
      })
      setLoading(false)
      if (err) { setError(err.message); return }
      setCheckEmail(true)
      return
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (err) { setError(err.message); return }
      navigate("/walls")
    }
  }

  if (checkEmail) {
    return (
      <div className="page">
        <Header />
        <h1>verifica o teu e-mail</h1>
        <p style={{ marginTop: 16 }}>
          enviamos um link de confirmacao para <strong>{email}</strong>.
        </p>
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--gray)" }}>
          clica no link no e-mail para ativar a tua conta.
        </p>
      </div>
    )
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
          <button type="submit" disabled={loading}>
            {loading ? "a carregar…" : isSignUp ? "criar conta" : "entrar"}
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
