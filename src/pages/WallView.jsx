import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
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


export default function WallView() {
  const { id }                  = useParams()
  const { user }                = useAuth()
  const [sort, setSort]         = useState("date")
  const [asc, setAsc]           = useState(true)
  const [masked, setMasked]     = useState(true)

  const { data: wall } = useQuery({
    queryKey: keys.wall(id),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("walls")
        .select("*")
        .eq("id", id)
        .single()
      return data
    },
  })

  const { data: routes } = useQuery({
    queryKey: keys.wallRoutes(id),
    queryFn: async () => {
      const { data } = await supabase
        .from("routes")
        .select("*, profiles(display_name), ascents(count)")
        .eq("wall_id", id)
        .order("created_at", { ascending: false })
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

  const imageUrl = wall?.image_url || ""
  const thumbUrl = wall?.image_thumb_url || ""

  return (
    <div className="page">
      <Header back={{ to: "/walls", label: "muros" }} />

      <h1>{wall?.name || "muro"}</h1>

      {imageUrl && (
        <>
          <WallCanvas
            imageUrl={imageUrl}
            thumbUrl={thumbUrl}
            holds={holds}
            masked={masked}
          />
          <button
            onClick={() => setMasked(!masked)}
            style={{ marginTop: 8, fontSize: 11, padding: "4px 8px" }}
          >
            {masked ? "ver muro" : "só agarras"}
          </button>
        </>
      )}

      <div className="header" style={{ marginTop: 32 }}>
        <div className="header-links">
          <h2>vias</h2>
          {user && (
            <Link to={`/walls/${id}/set`} className="btn" style={{marginLeft: "6px"}}>
              + abrir via
            </Link>
          )}
        </div>
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
        </div>
      </div>

      {!routes
        ? <p>loading...</p>
        : routes.length === 0
          ? <p>sem vias.</p>
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
                          {" "}<br/>por {r.profiles.display_name} em {r.created_at?.slice(0, 10)}
                        </span>
                      )}
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
