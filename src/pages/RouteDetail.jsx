import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import { keys } from "../lib/queries"
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
  const queryClient             = useQueryClient()
  const [stars, setStars]       = useState(3)
  const [sugGrade, setSugGrade] = useState(null)
  const [attempts, setAttempts] = useState(1)
  const [notes, setNotes]       = useState("")
  const [masked, setMasked]     = useState(false)

  const { data: route } = useQuery({
    queryKey: keys.route(id),
    queryFn: async () => {
      const { data } = await supabase
        .from("routes")
        .select("*")
        .eq("id", id)
        .single()
      return data
    },
  })

  const { data: wall } = useQuery({
    queryKey: keys.wall(route?.wall_id),
    enabled: !!route?.wall_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("walls")
        .select("*")
        .eq("id", route.wall_id)
        .single()
      return data
    },
  })

  const { data: setter } = useQuery({
    queryKey: keys.profile(route?.setter_id),
    enabled: !!route?.setter_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", route.setter_id)
        .single()
      return data?.display_name || null
    },
  })

  const { data: siblingIds = [] } = useQuery({
    queryKey: keys.siblings(route?.wall_id),
    enabled: !!route?.wall_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("routes")
        .select("id")
        .eq("wall_id", route.wall_id)
        .order("id")
      return (data || []).map(r => r.id)
    },
  })

  const { data: ascents } = useQuery({
    queryKey: keys.ascents(id),
    queryFn: async () => {
      const { data } = await supabase
        .from("ascents")
        .select("*, profiles(display_name)")
        .eq("route_id", id)
        .order("date", { ascending: false })
      return data || []
    },
  })

  const { data: holds = [] } = useQuery({
    queryKey: keys.holds(wall?.holds_json_url),
    enabled: !!wall?.holds_json_url,
    staleTime: Infinity,
    queryFn: async () => {
      const r = await fetch(wall.holds_json_url)
      return r.json()
    },
  })

  const existingAscent = user && ascents
    ? ascents.find((a) => a.climber_id === user.id) || null
    : null

  useEffect(() => {
    if (route) setSugGrade(route.grade)
  }, [route?.id])

  useEffect(() => {
    if (!existingAscent) return
    setStars(existingAscent.stars ?? 3)
    setSugGrade(existingAscent.suggested_grade)
    setAttempts(existingAscent.attempts ?? 1)
    setNotes(existingAscent.notes || "")
  }, [existingAscent?.id])

  const ascentMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        stars,
        suggested_grade: sugGrade,
        attempts: Math.max(1, parseInt(attempts) || 1),
        notes: notes || null,
      }
      await supabase.from("ascents").upsert({
        ...payload,
        route_id:   id,
        climber_id: user.id,
        date:       existingAscent?.date || new Date().toISOString().split("T")[0],
      }, { onConflict: "route_id,climber_id" })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.ascents(id) })
      if (route?.wall_id) {
        queryClient.invalidateQueries({ queryKey: keys.wallRoutes(String(route.wall_id)) })
      }
      queryClient.invalidateQueries({ queryKey: keys.rankings() })
    },
  })

  if (!route) {
    return (
      <div className="page">
        <Header back={{ to: "/walls", label: "muros" }} />
        <p>loading...</p>
      </div>
    )
  }

  const imageUrl = wall?.image_url || ""
  const thumbUrl = wall?.image_thumb_url || ""

  const idx = siblingIds.indexOf(Number(id))
  const prevId = idx >= 0 ? siblingIds[(idx - 1 + siblingIds.length) % siblingIds.length] : null
  const nextId = idx >= 0 ? siblingIds[(idx + 1) % siblingIds.length] : null

  const touchStart = useRef(null)
  const handleTouchStart = useCallback((e) => {
    touchStart.current = e.touches[0].clientX
  }, [])
  const handleTouchEnd = useCallback((e) => {
    if (touchStart.current === null) return
    const dx = e.changedTouches[0].clientX - touchStart.current
    touchStart.current = null
    if (Math.abs(dx) < 50) return
    if (dx > 0 && prevId) navigate(`/routes/${prevId}`)
    if (dx < 0 && nextId) navigate(`/routes/${nextId}`)
  }, [prevId, nextId, navigate])

  return (
    <div className="page">
      <Header back={{ to: `/walls/${route.wall_id}`, label: "muro" }} />
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, touchAction: "pan-y" }}
      >
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

      {!ascents && <p>loading...</p>}

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
            onClick={() => ascentMutation.mutate()}
            disabled={ascentMutation.isPending}
          >
            {ascentMutation.isPending ? "guardando..." : existingAscent ? "editar send" : "log send"}
          </button>
        </>
      )}

    </div>
  )
}
