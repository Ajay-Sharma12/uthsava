import {
  apiGet,
  apiPost,
  apiPostFormData,
  apiPut,
  apiDelete,
} from "../api";



export function fetchSeasons(contentId: string) {
  return apiGet(`/admin/contents/${contentId}/seasons`);
}

export function createSeason(contentId: string, payload: any) {
  return apiPost(`/admin/contents/${contentId}/seasons`, payload);
}

export function fetchSeasonById(
  contentId: string,
  seasonId: string
) {
  return apiGet(
    `/admin/contents/${contentId}/seasons/${seasonId}`
  );
}

export function updateSeason(
  contentId: string,
  seasonId: string,
  payload: any
) {
  return apiPut(
    `/admin/contents/${contentId}/seasons/${seasonId}`,
    payload
  );
}

export function deleteSeason(
  contentId: string,
  seasonId: string
) {
  return apiDelete(
    `/admin/contents/${contentId}/seasons/${seasonId}`
  );
}

// =========================
// Episodes
// =========================

export function fetchEpisodes(
  contentId: string,
  seasonId: string
) {
  return apiGet(
    `/admin/contents/${contentId}/seasons/${seasonId}/episodes`
  );
}
export function createEpisode(
  contentId: string,
  seasonId: string,
  payload: {
    episodeNumber: number;
    title: string;
    description?: string;
    duration?: number;
    videoFile: string;
    thumbnail: string;
    status?: string;
    approvalStatus?: string;
  }
) {
  return apiPost(
    `/admin/contents/${contentId}/seasons/${seasonId}/episodes`,
    payload
  );
}

export function updateEpisode(
  contentId: string,
  seasonId: string,
  episodeId: string,
  payload: any
) {
  return apiPut(
    `/admin/contents/${contentId}/seasons/${seasonId}/episodes/${episodeId}`,
    payload
  );
}

export function deleteEpisode(
  contentId: string,
  seasonId: string,
  episodeId: string
) {
  return apiDelete(
    `/admin/contents/${contentId}/seasons/${seasonId}/episodes/${episodeId}`
  );
}