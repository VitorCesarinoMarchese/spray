export function computeClimberScores(ascents, routes) {
  const grades = {}
  for (const r of routes) {
    grades[r.id] = r.grade ?? 0
  }

  const scores = {}
  for (const a of ascents) {
    const grade = grades[a.route_id] ?? 0
    if (!scores[a.climber_id]) {
      scores[a.climber_id] = { pts: 0, byGrade: {} }
    }

    // flash bonus
    let pts = grade * grade
    if (a.attempts == 1) {
      pts = Math.ceil(pts * 1.5)
    }

    scores[a.climber_id].pts += pts
    scores[a.climber_id].byGrade[grade] = (scores[a.climber_id].byGrade[grade] || 0) + 1
  }
  return scores
}
