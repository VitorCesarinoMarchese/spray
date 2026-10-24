import { supabase } from "./supabase"

export const keys = {
  walls: () => ["walls"],
  wall: (id) => ["walls", id],
  holds: (url) => ["holds", url],
  wallRoutes: (id) => ["wall-routes", id],
  route: (id) => ["routes", id],
  ascents: (id) => ["ascents", id],
  siblings: (id) => ["siblings", id],
  profile: (id) => ["profiles", id],
  rankings: () => ["rankings"],
  setterRankings: () => ["setter-rankings"],
  myWallAscents: (wallId, userId) => ["my-wall-ascents", wallId, userId],
  myWallFavorites: (wallId, userId) => ["my-wall-favorites", wallId, userId],
  borders: () => ["borders"],
  purchases: (id) => ["purchases", id],
}

// one shape for ["borders"]: pages used to cache a map and an array under it
export const borderQuery = {
  queryKey: keys.borders(),
  staleTime: Infinity,
  queryFn: async () => {
    const { data } = await supabase
      .from("borders")
      .select("id, file, min_pts")
      .order("min_pts")
    return data || []
  },
}
