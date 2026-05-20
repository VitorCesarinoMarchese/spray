import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { useAuth } from "../components/AuthContext"
import WallCanvas from "../components/WallCanvas"
import Header from "../components/Header"

const HOLD_TYPES = ["hand", "start", "finish", "feet"]
const HOLD_TYPE_LABELS = { hand: "mão", start: "saída", finish: "top", feet: "pé" }

const GRADES = ["V0", "V1", "V2", "V3", "V4inho", "V4", "V4ão", "V4asso"]


export default function SetRoute() {
  const { id }                    = useParams()
  const { user }                  = useAuth()
  const navigate                  = useNavigate()
  const location                  = useLocation()
  const isEdit                    = location.pathname.startsWith("/routes/")
  const [routeId, setRouteId]     = useState(isEdit ? id : null)
  const [wallId, setWallId]       = useState(isEdit ? null : id)
  const [wall, setWall]           = useState(null)
  const [holds, setHolds]         = useState([])
  const [holdsMap, setHoldsMap]    = useState({})
  const [name, setName]           = useState("")
  const [grade, setGrade]         = useState(null)
  const [match, setMatch]         = useState(false)
  const [volumes, setVolumes]     = useState("any")
  const [campus, setCampus]       = useState(false)
  const [masked, setMasked]       = useState(false)
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (isEdit) {
      supabase
        .from("routes")
        .select("*")
        .eq("id", id)
        .single()
        .then(({ data }) => {
          if (!data) { return }
          setRouteId(data.id)
          setWallId(data.wall_id)
          setName(data.name)
          setGrade(data.grade)
          setHoldsMap(data.holds_map || {})
          setMatch(data.match || true)
          setVolumes(data.volumes || "any")
          setCampus(data.campus || false)
        })
    }
  }, [id, isEdit])

  useEffect(() => {
    if (!wallId) { return }
    supabase
      .from("walls")
      .select("*")
      .eq("id", wallId)
      .single()
      .then(({ data }) => {
        if (!data) { return }
        setWall(data)
      })
  }, [wallId])

  useEffect(() => {
    if (!wall?.holds_json_url) { return }

    fetch(wall.holds_json_url)
      .then((r) => r.json())
      .then(setHolds)
      .catch(() => {})
  }, [wall])

  const selectedIds = Object.keys(holdsMap)
  const lastTap = useRef({ id: null, time: 0 })

  function handleHoldTap(holdId) {
    const now = Date.now()
    const isDoubleTap = lastTap.current.id === holdId && now - lastTap.current.time < 400
    lastTap.current = { id: holdId, time: now }

    const current = holdsMap[holdId]
    if (!current && !isDoubleTap) return

    if (!current) {
      setHoldsMap({ ...holdsMap, [holdId]: "hand" })
    } else {
      const idx = HOLD_TYPES.indexOf(current)
      const next = HOLD_TYPES[idx + 1]
      if (next) {
        setHoldsMap({ ...holdsMap, [holdId]: next })
      } else {
        const { [holdId]: _, ...rest } = holdsMap
        setHoldsMap(rest)
      }
    }
  }

  async function handleSave() {
    if (!name || selectedIds.length === 0) { return }

    setSaving(true)

    const fields = {
      name, grade, holds_map: holdsMap,
      match, volumes, campus,
    }

    const { error } = isEdit
      ? await supabase.from("routes").update(fields).eq("id", routeId)
      : await supabase.from("routes").insert({ ...fields, wall_id: wallId, setter_id: user.id })

    setSaving(false)

    if (!error) {
      navigate(isEdit ? `/routes/${routeId}` : `/walls/${wallId}`)
    }
  }

  const imageUrl = wall?.image_url || ""
  const thumbUrl = wall?.image_thumb_url || ""

  return (
    <div className="page">
      <Header back={isEdit ? { to: `/routes/${routeId}`, label: "via" } : { to: `/walls/${wallId}`, label: "muro" }} />

      {imageUrl && (
        <>
          <WallCanvas
            imageUrl={imageUrl}
            thumbUrl={thumbUrl}
            holds={holds}
            selectedIds={selectedIds}
            holdsMap={holdsMap}
            masked={masked}
            maskedIds={selectedIds}
            onHoldTap={masked ? undefined : handleHoldTap}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <p style={{ fontSize: 11 }}>
              {selectedIds.length} agarras
            </p>
            <button
              onClick={() => setMasked(!masked)}
              style={{ fontSize: 11, padding: "4px 8px" }}
            >
              {masked ? "editar agarras" : "preview via"}
            </button>
          </div>
        </>
      )}

      <div className="field" style={{ marginTop: 24 }}>
        <label>nome da via</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="field">
        <label>grade</label>
        <select
          value={grade ?? ""}
          onChange={(e) => {
            const v = e.target.value
            setGrade(v === "" ? null : parseInt(v))
          }}
        >
          <option value="">--</option>
          {GRADES.map((label, i) => (
            <option key={i} value={i}>{label}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>volumes</label>
        <select value={volumes} onChange={(e) => setVolumes(e.target.value)}>
          <option value="any">qualquer</option>
          <option value="holds only">só das agarras</option>
          <option value="none">nenhum</option>
        </select>
      </div>

      <div className="field">
        <label>match</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, textTransform: "none", letterSpacing: 0, color: "var(--fg)" }}>
          <input type="checkbox" checked={match} onChange={(e) => setMatch(e.target.checked)} style={{ width: "auto" }} />
          duas mãos na mesma agarra
        </label>
      </div>

      <div className="field">
        <label>campus</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, textTransform: "none", letterSpacing: 0, color: "var(--fg)" }}>
          <input type="checkbox" checked={campus} onChange={(e) => setCampus(e.target.checked)} style={{ width: "auto" }} />
          sem pés
        </label>
      </div>

      <div className="actions">
        <button
          onClick={handleSave}
          disabled={saving || !name || selectedIds.length === 0}
        >
          {saving ? "guardando..." : isEdit ? "atualizar via" : "guardar via"}
        </button>
        <button onClick={() => navigate(isEdit ? `/routes/${routeId}` : `/walls/${wallId}`)}>
          cancelar
        </button>
      </div>
    </div>
  )
}
