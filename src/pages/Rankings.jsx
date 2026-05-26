import { useQuery } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import { keys } from "../lib/queries"
import Header from "../components/Header"

const GRADES = ["V0", "V1", "V2", "V3", "V4inho", "V4", "V4ão", "V4asso"]

export default function Rankings() {
  const { data: rankings } = useQuery({
    queryKey: keys.rankings(),
    staleTime: 60_000,
    queryFn: async () => {
      const [ascRes, routeRes, profRes] = await Promise.all([
        supabase.from("ascents").select("climber_id, route_id, attempts"),
        supabase.from("routes").select("id, grade"),
        supabase.from("profiles").select("id, display_name"),
      ])
      const ascents  = ascRes.data  || []
      const routes   = routeRes.data || []
      const profiles = profRes.data  || []

      const gradeMap = {}
      for (const r of routes) {
        gradeMap[r.id] = r.grade ?? 0
      }

      const nameMap = {}
      for (const p of profiles) {
        nameMap[p.id] = p.display_name
      }

      const scores = {}
      for (const a of ascents) {
        const grade = gradeMap[a.route_id] ?? 0
        if (!scores[a.climber_id]) {
          scores[a.climber_id] = { pts: 0, byGrade: {} }
        }
        let pts = grade * grade;
        if (a.attempts == 1) {
          pts = Math.ceil(pts * 1.5);
        }
        scores[a.climber_id].pts += pts
        scores[a.climber_id].byGrade[grade] = (scores[a.climber_id].byGrade[grade] || 0) + 1
      }

      return Object.entries(scores)
        .map(([id, { pts, byGrade }]) => ({
          name: nameMap[id] || "anon",
          pts,
          byGrade,
        }))
        .sort((a, b) => b.pts - a.pts)
    },
  })

  return (
    <div className="page">
      <Header back={{ to: "/walls", label: "muros" }} />

      <h1>rankings</h1>

      {!rankings && <p>loading...</p>}
      {rankings?.length === 0 && <p>sem sends.</p>}

      <ul className="ranking-list">
        {(rankings || []).map((r, i) => (
          <li key={i}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{i + 1}. {r.name}</span>
              <span className="grade">{r.pts} pts</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--gray)", marginTop: 4 }}>
              {GRADES.map((label, g) =>
                r.byGrade[g]
                  ? <span key={g} style={{ marginRight: 8 }}>{r.byGrade[g]}×{label}</span>
                  : null
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
