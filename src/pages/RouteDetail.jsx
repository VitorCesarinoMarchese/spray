import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
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
  const navigate                = useNavigate()
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
  const [existingAscent, setExistingAscent] = useState(null)
  const [siblingIds, setSiblingIds] = useState([])

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

        supabase
          .from("routes")
          .select("id")
          .eq("wall_id", data.wall_id)
          .order("id")
          .then(({ data: rows }) => {
            if (rows) setSiblingIds(rows.map(r => r.id))
          })
      })

    loadAscents()
  }, [id])

  useEffect(() => {
    if (!user || !ascents) return
    const mine = ascents.find((a) => a.climber_id === user.id)
    setExistingAscent(mine || null)
  }, [user, ascents])

  useEffect(() => {
    if (!existingAscent) return
    setStars(existingAscent.stars ?? 3)
    setSugGrade(existingAscent.suggested_grade)
    setAttempts(existingAscent.attempts ?? 1)
    setNotes(existingAscent.notes || "")
  }, [existingAscent?.id])

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

    const payload = {
      stars:          stars,
      suggested_grade: sugGrade,
      attempts:       Math.max(1, parseInt(attempts) || 1),
      notes:          notes || null,
    }

    await supabase.from("ascents").upsert({
      ...payload,
      route_id:   id,
      climber_id: user.id,
      date:       existingAscent?.date || new Date().toISOString().split("T")[0],
    }, { onConflict: "route_id,climber_id" })

    setSaving(false)
    loadAscents()
  }

  if (!route) {
    return <div className="page"><p>loading...</p></div>
  }

  const imageUrl = wall?.image_url || ""
  const thumbUrl = wall?.image_thumb_url || ""

  const idx = siblingIds.indexOf(Number(id))
  const prevId = idx >= 0 ? siblingIds[(idx - 1 + siblingIds.length) % siblingIds.length] : null
  const nextId = idx >= 0 ? siblingIds[(idx + 1) % siblingIds.length] : null

  return (
    <div className="page">
      <Header back={{ to: `/walls/${route.wall_id}`, label: "muro" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12 }}>
        <button onClick={() => prevId && navigate(`/routes/${prevId}`)} disabled={!prevId} style={{ padding: "4px 8px", fontSize: 14 }}>&larr;</button>
        <div style={{ textAlign: "center", flex: 1 }}>
          <b style={{textTransform: "capitalize"}}>
            {route.name}
          </b>
          <br/>
          <span className="grade">{gradeLabel(route.grade)}</span>
          {setter && <span style={{ fontSize: 12 }}> por {setter}</span>}
        </div>
        <button onClick={() => nextId && navigate(`/routes/${nextId}`)} disabled={!nextId} style={{ padding: "4px 8px", fontSize: 14 }}>&rarr;</button>
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
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <button
              onClick={() => setMasked(!masked)}
              style={{ fontSize: 11, padding: "4px 8px" }}
            >
              {masked ? "ver muro" : "só agarras"}
            </button>
            {user && user.id === route.setter_id && (
              <Link to={`/routes/${id}/edit`} style={{ fontSize: 12 }}>editar</Link>
            )}
          </div>
        </>
      )}

      <h2 style={{ marginTop: ascents && ascents.length > 0 ? 32 : 16 }}>
        sends {ascents && `(${ascents.length})`}
      </h2>

      {ascents === null && <p>loading...</p>}

      {ascents && ascents.length > 0 && (
        <ul className="ascent-list">
          {ascents.map((a) => (
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
      )}

      {user && (
        <>
          <h2 style={{ marginTop: 16 }}>{existingAscent ? "editar send" : "log send"}</h2>

          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div className="field" style={{ margin: 0 }}>
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

            <div className="field" style={{ margin: 0 }}>
              <label>grade</label>
              <select
                value={sugGrade ?? ""}
                onChange={(e) => {
                  const v = e.target.value
                  setSugGrade(v === "" ? null : parseInt(v))
                }}
                style={{ padding: "4px 8px", fontSize: 14 }}
              >
                <option value="">--</option>
                {GRADES.map((label, i) => (
                  <option key={i} value={i}>{label}</option>
                ))}
              </select>
            </div>

            <div className="field" style={{ margin: 0 }}>
              <label>tentativas</label>
              <input
                type="number"
                min={1}
                value={attempts}
                onChange={(e) => setAttempts(e.target.value)}
                onBlur={() => {
                  const n = parseInt(attempts)
                  setAttempts(n >= 1 ? n : 1)
                }}
                style={{ width: 80, padding: "4px 8px", fontSize: 14 }}
              />
            </div>
          </div>

          <div className="field" style={{ marginTop: 16 }}>
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
            {saving ? "guardando..." : existingAscent ? "editar send" : "log send"}
          </button>
        </>
      )}

    </div>
  )
}
