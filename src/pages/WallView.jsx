import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { useAuth } from "../components/AuthContext"
import WallCanvas from "../components/WallCanvas"
import Header from "../components/Header"

const GRADES = ["V0", "V1", "V2", "V3", "V4inho", "V4ão", "V4asso"]

function gradeLabel(n) {
  if (n == null) { return "?" }
  return GRADES[n] || "V?"
}


export default function WallView() {
  const { id }                  = useParams()
  const { user }                = useAuth()
  const [wall, setWall]         = useState(null)
  const [holds, setHolds]       = useState([])
  const [routes, setRoutes]     = useState(null)
  const [sort, setSort]         = useState("date")
  const [asc, setAsc]           = useState(true)
  const [masked, setMasked]     = useState(false)

  useEffect(() => {
    supabase
      .from("walls")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) { return }
        setWall(data)
      })

    supabase
      .from("routes")
      .select("*, profiles(display_name), ascents(count)")
      .eq("wall_id", id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRoutes(data || []))
  }, [id])

  useEffect(() => {
    if (!wall?.holds_json_url) { return }

    fetch(wall.holds_json_url)
      .then((r) => r.json())
      .then(setHolds)
      .catch(() => {})
  }, [wall])

  const imageUrl = wall?.image_url || ""

  return (
    <div className="page">
      <Header back={{ to: "/walls", label: "walls" }} />

      <h1>{wall?.name || "wall"}</h1>

      {imageUrl && (
        <>
          <WallCanvas
            imageUrl={imageUrl}
            holds={holds}
            masked={masked}
          />
          <button
            onClick={() => setMasked(!masked)}
            style={{ marginTop: 8, fontSize: 11, padding: "4px 8px" }}
          >
            {masked ? "show wall" : "show holds only"}
          </button>
        </>
      )}

      <div className="header" style={{ marginTop: 32 }}>
        <h2>routes</h2>
        <div className="header-links">
          <button
            className="theme-toggle"
            onClick={() => {
              if (sort === "date") { setSort("grade"); setAsc(false) }
              else { setSort("date"); setAsc(false) }
            }}
          >
            sort: {sort}
          </button>
          <button
            className="theme-toggle"
            onClick={() => setAsc(a => !a)}
          >
            {asc ? "↑" : "↓"}
          </button>
          {user && (
            <Link to={`/walls/${id}/set`}>+ set route</Link>
          )}
        </div>
      </div>

      {routes === null
        ? <p>loading...</p>
        : routes.length === 0
          ? <p>no routes yet.</p>
          : <ul className="route-list">
              {[...routes].sort((a, b) => {
                const dir = asc ? 1 : -1
                if (sort === "grade") return dir * ((a.grade ?? -1) - (b.grade ?? -1))
                return dir * (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0)
              }).map((r) => (
                <li key={r.id}>
                  <Link to={`/routes/${r.id}`}>
                    <span>
                      {r.name}
                      {r.profiles?.display_name && (
                        <span style={{ color: "var(--gray)", fontSize: 12 }}>
                          {" "}by {r.profiles.display_name}
                        </span>
                      )}
                    </span>

                    <span style={{ color: "var(--gray)", fontSize: 12, textAlign: "right" }}>
                      {r.created_at?.slice(0, 10)}
                    </span>
                    <span style={{ color: "var(--gray)", fontSize: 12, textAlign: "right" }}>
                      {r.ascents?.[0]?.count > 0 ? `${r.ascents[0].count} sends` : ""}
                    </span>
                    <span className="grade" style={{ textAlign: "right" }}>{gradeLabel(r.grade)}</span>
                  </Link>
                </li>
              ))}
            </ul>
      }
    </div>
  )
}
