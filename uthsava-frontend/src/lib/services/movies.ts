import { apiGet, apiPost, apiPut, apiDelete } from "../api";

// export async function fetchMovies(params?: Record<string, any>) {
//   const res = await apiGet("/admin/contents", {
//     ...params,
//     contentType: "MOVIE",
//   });

//   return res?.results?.contents ?? [];
// }
export async function fetchMovies(params?: Record<string, any>) {
  const res = await apiGet("/admin/contents", {
    page: 1,
    limit: 100,
    contentType: "MOVIE",
    ...params,
  });
  return res?.results?.contents ?? [];
}
export async function getMovieById(id: string) {
  const res = await apiGet(`/admin/contents/${id}`);
  return res?.results;
}

export async function createMovie(payload: any) {
  return apiPost("/admin/contents", {
    ...payload,
    contentType: "MOVIE",
  });
}

export async function updateMovie(id: string, payload: any) {
  return apiPut(`/admin/contents/${id}`, payload);
}

export async function deleteMovie(id: string) {
  return apiDelete(`/admin/contents/${id}`);
}
