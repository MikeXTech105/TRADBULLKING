import { publicApi } from "./api.js";
import { unwrap, collection, identify } from "./adapters.js";
export const leaderboardService = {
  list: async (signal) =>
    collection(
      unwrap(
        await publicApi.get("/leaderboard", { params: { limit: 50 }, signal }),
      ),
      "leaderboard",
    ),
  stats: async (signal) =>
    unwrap(await publicApi.get("/leaderboard/stats", { signal })),
  user: async (id) =>
    identify(
      unwrap(
        await publicApi.get(`/leaderboard/user/${encodeURIComponent(id)}`),
      ),
    ),
};
