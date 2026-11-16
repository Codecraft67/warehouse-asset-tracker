// All communication with the backend lives here.
// VITE_API_URL is empty by default: the app calls the same origin it was
// loaded from (Flask in production, Vite proxy in development).
const BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options) {
  let res;
  try {
    res = await fetch(BASE + path, options);
  } catch {
    throw new Error("Cannot reach the server. Check that the backend is running and you are on the same network.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export const photoSrc = (url) => (url ? BASE + url : null);

export const listAssets = ({ search = "", category = "", page = 1, perPage = 12 }) => {
  const p = new URLSearchParams({ page, per_page: perPage });
  if (search) p.set("search", search);
  if (category) p.set("category", category);
  return request(`/api/assets?${p}`);
};
export const getAsset = (id) => request(`/api/assets/${id}`);
export const getStats = () => request("/api/stats");
export const getCategories = () => request("/api/categories");
export const deleteAsset = (id) => request(`/api/assets/${id}`, { method: "DELETE" });

export const createAsset = ({ assetId, category, photo }) => {
  const fd = new FormData();
  fd.append("asset_id", assetId);
  fd.append("category", category);
  fd.append("photo", photo);
  return request("/api/assets", { method: "POST", body: fd });
};
