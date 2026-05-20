import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { useAuth } from "../components/AuthContext"
import WallCanvas from "../components/WallCanvas"
import Header from "../components/Header"

const GRADES = ["V0", "V1", "V2", "V3", "V4inho", "V4", "V4ão", "V4asso"]

function gradeLabel(n) {
  if (n == null) { return "?" }
  return GRADES[n] || "V?"
}


export default function RouteDetail() {
  const { id }                  = useParams()
  const { user }                = useAuth()
  const [route, setRoute]       = useState(null)
  const [setter, setSetter]     = useState(null)
  const [wall, setWall]         = useState(null)
  const [holds, setHolds]       = useState([])
  const [ascents, setAscents]   = useState(null)
  const [stars, setStars]       = useState(3)
  const [sugGrade, setSugGrade] = useState(null)
  const [attempts, setAttempts] = useState(1)
  const [notes, setNotes]       = useState("")
  const [saving, setSaving]     = useState(false)
  const [masked, setMasked]     = useState(false)

  useEffect(() => {
    supabase
      .from("routes")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) { return }
        setRoute(data)
        setSugGrade(data.grade)

        supabase
          .from("walls")
          .select("*")
          .eq("id", data.wall_id)
          .single()
          .then((res) => {
            if (res?.data) { setWall(res.data) }
          })

        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", data.setter_id)
          .single()
          .then((res) => {
            if (res?.data) { setSetter(res.data.display_name) }
          })
      })

    loadAscents()
  }, [id])

  useEffect(() => {
    if (!wall?.holds_json_url) { return }

    fetch(wall.holds_json_url)
      .then((r) => r.json())
      .then(setHolds)
      .catch(() => {})
  }, [wall])

  function loadAscents() {
    supabase
      .from("ascents")
      .select("*, profiles(display_name)")
      .eq("route_id", id)
      .order("date", { ascending: false })
      .then(({ data }) => setAscents(data || []))
  }

  async function logAscent() {
    setSaving(true)

    await supabase.from("ascents").insert({
      route_id:       id,
      climber_id:     user.id,
      stars:          stars,
      suggested_grade: sugGrade,
      attempts:       attempts,
      notes:          notes || null,
      date:           new Date().toISOString().split("T")[0],
    })

    setAttempts(1)
    setNotes("")
    setSaving(false)
    loadAscents()
  }

  if (!route) {
    return <div className="page"><p>loading...</p></div>
  }

  const imageUrl = wall?.image_url || ""
  const thumbUrl = wall?.image_thumb_url || ""

  return (
    <div className="page">
      <Header back={{ to: `/walls/${route.wall_id}`, label: "muro" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12 }}>
        <div>
          <b style={{paddingRight: 12, textTransform: "capitalize"}}>
            {route.name}
          </b>
          <span className="grade">{gradeLabel(route.grade)}</span>
          {setter && <span> por {setter}</span>}
        </div>
        {user && user.id === route.setter_id && (
          <Link to={`/routes/${id}/edit`} style={{ fontSize: 12 }}>editar</Link>
        )}
      </div>
      <p style={{ paddingBottom: 12, fontSize: 12, color: "var(--gray)" }}>
        {route.match && <span>match · </span>}
        {route.campus && <span>campus · </span>}
        <span>volumes: {route.volumes === "any" ? "qualquer" : route.volumes === "holds only" ? "só das agarras" : route.volumes || "qualquer"}</span>
      </p>

      {imageUrl && (
        <>
          <WallCanvas
            imageUrl={imageUrl}
            thumbUrl={thumbUrl}
            holds={holds}
            selectedIds={Object.keys(route.holds_map || {})}
            holdsMap={route.holds_map || {}}
            masked={masked}
            maskedIds={Object.keys(route.holds_map || {})}
          />
          <button
            onClick={() => setMasked(!masked)}
            style={{ marginTop: 8, fontSize: 11, padding: "4px 8px" }}
          >
            {masked ? "ver muro" : "só agarras"}
          </button>
        </>
      )}

      <h2 style={{ marginTop: 32 }}>
        sends {ascents && `(${ascents.length})`}
      </h2>

      {ascents === null && <p>loading...</p>}

      <ul className="ascent-list">
        {(ascents || []).map((a) => (
          <li key={a.id}>
            <strong>{a.profiles?.display_name || "anon"}</strong>
            {" "}{a.date}
            {a.stars != null && (
              <span> — {a.stars}/5</span>
            )}
            {a.suggested_grade != null && (
              <span> — {gradeLabel(a.suggested_grade)}</span>
            )}
            {a.attempts != null && <span> — {a.attempts === 1 ? "⚡" : `${a.attempts} tentativas`}</span>}
            {a.notes && <span> — {a.notes}</span>}
          </li>
        ))}
      </ul>

      {user && (
        <>
          <h2 style={{ marginTop: 16 }}>log send</h2>

          <div className="field">
            <label>estrelas</label>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setStars(n)}
                  style={{
                    background: n <= stars
                      ? "var(--fg)"
                      : "var(--bg)",
                    color: n <= stars
                      ? "var(--bg)"
                      : "var(--fg)",
                    border: "1px solid var(--fg)",
                    padding: "4px 8px",
                    fontSize: 14,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>grade sugerido</label>
            <select
              value={sugGrade ?? ""}
              onChange={(e) => {
                const v = e.target.value
                setSugGrade(v === "" ? null : parseInt(v))
              }}
            >
              <option value="">--</option>
              {GRADES.map((label, i) => (
                <option key={i} value={i}>{label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>tentativas</label>
            <input
              type="number"
              min={1}
              value={attempts}
              onChange={(e) => setAttempts(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ width: 80 }}
            />
          </div>

          <div className="field">
            <label>notas (opcional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            onClick={logAscent}
            disabled={saving}
          >
            {saving ? "guardando..." : "log send"}
          </button>
        </>
      )}

    </div>
  )
}
