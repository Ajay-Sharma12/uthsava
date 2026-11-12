import { apiDelete, apiGet, apiPatch, apiPost, apiPut, uploadToPresignedUrl } from "../api";

const UPLOAD_API = "https://uthsava-upload-api.onrender.com";
export type ContentType = "MOVIE" | "SERIES";
export type ContentStatus = "DRAFT" | "PENDING" | "ACTIVE" | "INACTIVE" | string;

export type ContentItem = {
  _id: string;
  title: string;
  description?: string;
  shortDescription?: string;
  type?: ContentType | string;
  contentType?: ContentType | string;
  genres?: Array<string | { _id?: string; id?: string; name?: string }>;
  categories?: Array<string | { _id?: string; id?: string; name?: string }>;
  category?: string | string[];
  categoryId?: string;
  categoryIds?: string[];
  tags?: string[];
  cast?: Array<
    | string
    | {
        name?: string;
        role?: string;
        type?: string;
        image?: string | null;
      }
  >;
  crew?: Array<
    | string
    | {
        name?: string;
        role?: string;
        type?: string;
        image?: string | null;
      }
  >;
  language?: string[];
  lang?: string;
  subtitles?: string[];
  subtitleLanguages?: string[];
  posterUrl?: string;
  poster?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  trailerUrl?: string;
  trailer?: string;
  videoUrl?: string;
  video?: string;
  mainVideoUrl?: string;
  mainVideo?: string;
  durationInSeconds?: number;
  duration?: number | string;
  releaseYear?: number;
  releaseDate?: string;
  status?: string;
  approvalStatus?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  reEditRequestedReason?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  isSubscriptionRequired?: boolean;
  isDownloadEnabled?: boolean;
  isFree?: boolean;
  createdAt?: string;
  updatedAt?: string;
  reviewCount?: number;
  viewsCount?: number;
  revenue?: number;
  producer?: string | { name?: string; companyName?: string };
  uploadedBy?: { name?: string; fullName?: string; companyName?: string };
  director?: string;
};

export type ContentGenre = {
  _id: string;
  name: string;
  type?: string;
};

export type ContentPayload = {
  title: string;
  type: ContentType;
  description: string;
  shortDescription?: string;
  genres: string[];
  categories?: string[];
  category?: string | string[];
  categoryId?: string;
  tags: string[];
  cast: Array<string | { name: string; role?: string; image?: string | null }>;
  crew: Array<{
    name: string;
    role: string;
  }>;
  language: string[];
  lang?: string;
  subtitles?: string[];
  subtitleLanguages?: string[];
  posterUrl?: string;
  thumbnailUrl?: string;
  trailerUrl?: string;
  videoUrl?: string;
  durationInSeconds?: number;
  duration?: number;
  releaseYear?: number;
  releaseDate?: string;
  isFree: boolean;
  status: ContentStatus;
  approvalStatus?: string;
  producer?: string;
  isFeatured?: boolean;
  isTrending?: boolean;
  isSubscriptionRequired?: boolean;
  isDownloadEnabled?: boolean;
  poster?: string;
  thumbnail?: string;
  trailer?: string;
  video?: string;
  mainVideoUrl?: string;
  mainVideo?: string;
};

type PresignedUpload = {
  uploadUrl: string;
  fileKey?: string;
  fileUrl: string;
};

function unwrapResult<T>(response: unknown): T {
  const value = response as { results?: T; data?: T } | T;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if ("results" in value && value.results !== undefined) return value.results as T;
    if ("data" in value && value.data !== undefined) return value.data as T;
  }
  return value as T;
}

function listFromResponse(response: unknown, keys: string[]): ContentItem[] {
  const result = unwrapResult<Record<string, unknown> | ContentItem[]>(response);
  if (Array.isArray(result)) return result as ContentItem[];

  for (const key of keys) {
    const candidate = result?.[key];
    if (Array.isArray(candidate)) return candidate as ContentItem[];
  }

  return [];
}

export async function fetchContent(
  params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    isActive?: string;
    type?: string;
    genre?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  } = {},
) {
  const response = await apiGet("/admin/contents", {
    page: params.page ?? 1,
    limit: params.limit ?? 10,
    search: params.search,
    status: params.status,
    isActive: params.isActive,
    type: params.type,
    genre: params.genre,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });

  const result = unwrapResult<any>(response);
  const contents = listFromResponse(result, ["contents", "data", "items"]);

  const normalizedContents = contents.map((item) => ({
    ...item,

    durationInSeconds:
      item.durationInSeconds ??
      (item.duration !== undefined && item.duration !== null
        ? Number(item.duration) * 60
        : undefined),
  }));

  const pagination = result?.pagination ?? {};
  const totalCount =
    pagination.totalCount ??
    pagination.total ??
    pagination.count ??
    normalizedContents.length;

  const totalPages =
    pagination.totalPages ??
    pagination.pages ??
    (pagination.limit ? Math.ceil(totalCount / pagination.limit) : 1);

  return {
    data: normalizedContents,
    pagination: {
      currentPage: pagination.currentPage ?? pagination.page ?? 1,
      totalPages,
      totalCount,
      total: totalCount,
      pages: totalPages,
      limit: pagination.limit ?? params.limit ?? 10,
    },
  };
}

export async function getContent(id: string): Promise<ContentItem> {
  const response: any = await apiGet(`/admin/contents/${id}`);

  const item = response?.results?.content ?? response?.results?.data ?? response?.results ?? response?.data?.content ?? response?.data ?? response;

  const posterUrl = (Array.isArray(item.poster) ? item.poster[0] : item.poster) || item.posterUrl || item.posterImage || "";
  const thumbnailUrl = item.thumbnail || item.thumbnailUrl || item.thumbnailImage || "";
  const trailerUrl = (Array.isArray(item.teaserVideo) ? item.teaserVideo[0] : item.teaserVideo) || item.trailerUrl || item.trailer || "";
  const videoUrl = item.mainVideo || item.videoUrl || item.mainVideoFile || "";

  return {
    ...item,
    shortDescription: item.shortDescription ?? item.shortDesc ?? item.overview ?? item.synopsis ?? item.plot ?? "",
    description: item.description ?? item.fullDesc ?? item.desc ?? item.overview ?? item.synopsis ?? "",
    language: item.language ?? item.languageIds ?? (item.lang ? [item.lang] : undefined),
    subtitles:
      item.subtitles ??
      item.subtitleLanguages ??
      item.subtitle ??
      item.subtitleLang ??
      (Array.isArray(item.language) && item.language.length > 1 ? item.language.slice(1) : undefined),
    posterUrl,
    thumbnailUrl,
    trailerUrl,
    videoUrl,
    durationInSeconds:
      item.durationInSeconds ?? (item.duration ? Number(item.duration) * 60 : undefined),
  };
}

export async function fetchContentGenres(): Promise<ContentGenre[]> {
  try {
    const response: any = await apiGet("/admin/categories", {
      type: "genre",
      page: 1,
      limit: 100,
    });

    const candidates =
      response?.results?.data ??
      response?.results?.genres ??
      response?.results ??
      response?.data?.data ??
      response?.data?.genres ??
      response?.data ??
      response?.genres ??
      (Array.isArray(response) ? response : []);

    if (Array.isArray(candidates)) {
      return candidates
        .filter((item: any) => Boolean(item && (item._id || item.id || item.name)))
        .map((item: any) => ({
          _id: item._id || item.id || item.name,
          name: item.name || item.label || item.title || "",
          type: "genre",
          ...item,
        }));
    }
    return [];
  } catch (err) {
    console.error("fetchContentGenres error:", err);
    return [];
  }
}

export async function fetchContentCategories(): Promise<ContentGenre[]> {
  try {
    const response: any = await apiGet("/admin/categories", {
      type: "category",
      page: 1,
      limit: 100,
    });

    const candidates =
      response?.results?.data ??
      response?.results?.categories ??
      response?.results ??
      response?.data?.data ??
      response?.data?.categories ??
      response?.data ??
      response?.categories ??
      (Array.isArray(response) ? response : []);

    if (Array.isArray(candidates)) {
      return candidates
        .filter((item: any) => Boolean(item && (item._id || item.id || item.name)))
        .map((item: any) => ({
          _id: item._id || item.id || item.name,
          name: item.name || item.label || item.title || "",
          type: "category",
          ...item,
        }));
    }
    return [];
  } catch (err) {
    console.error("fetchContentCategories error:", err);
    return [];
  }
}

// export async function uploadContentFile(file: File, folder: string) {
//   const response = await apiPost("/admin/utils/presigned-url", {
//     fileName: file.name,
//     fileType: file.type || "application/octet-stream",
//     folder,
//   });
//   const result = unwrapResult<PresignedUpload>(response);

//   if (!result?.uploadUrl || !result?.fileUrl) {
//     throw new Error("The upload service did not return a usable upload URL.");
//   }

//   await uploadToPresignedUrl(result.uploadUrl, file);
//   return result.fileUrl;
// }

// export async function uploadContentFile(file: File, folder: string) {
//   const response = await apiPost("/admin/utils/presigned-url", {
//     fileName: file.name,
//     fileType: file.type || "application/octet-stream",
//     folder,
//   });

//   console.log("Presigned URL API Response:", response);

//   const result = unwrapResult<PresignedUpload>(response);

//   console.log("Parsed Result:", result);

//   if (!result?.uploadUrl || !result?.fileUrl) {
//     throw new Error(
//       `Invalid presigned response: ${JSON.stringify(result, null, 2)}`
//     );
//   }

//   await uploadToPresignedUrl(result.uploadUrl, file);

//   console.log("Returning fileUrl:", result.fileUrl);

//   return result.fileUrl;
// }

export async function uploadContentFile(file: File, folder: string) {
  const sanitizedFileName = (file.name || "file").replace(/\s+/g, "_");
  const response = await fetch(`${UPLOAD_API}/admin/utils/presigned-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: sanitizedFileName,
      fileType: file.type || "application/octet-stream",
      folder,
    }),
  });

  // if (!response.ok) {
  //   throw new Error("Failed to get presigned URL");
  // }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();

  console.log("Upload API Response:", data);

  const result = data.results;

  if (!result?.uploadUrl || !result?.fileUrl) {
    throw new Error("Invalid upload response");
  }

  await uploadToPresignedUrl(result.uploadUrl, file);

  return result.fileUrl;
}

export async function createContent(payload: ContentPayload) {
  const response = await apiPost("/admin/contents", payload);
  return unwrapResult<ContentItem>(response);
}

export async function updateContent(id: string, payload: ContentPayload) {
  const response = await apiPut(`/admin/contents/${id}`, payload);
  return unwrapResult<ContentItem>(response);
}

export function deleteContent(id: string) {
  return apiDelete(`/admin/contents/${id}`);
}

export async function updateContentStatus(
  id: string,
  payloadOrIsActive: boolean | { status?: string; isActive?: boolean },
) {
  const payload =
    typeof payloadOrIsActive === "boolean"
      ? { isActive: payloadOrIsActive, status: payloadOrIsActive ? "ACTIVE" : "INACTIVE" }
      : payloadOrIsActive;
  const response = await apiPatch(`/admin/contents/${id}/status`, payload);

  return unwrapResult(response);
}

export async function fetchSeries(params: Record<string, unknown> = {}) {
  const response = await apiGet("/admin/contents", {
    type: "SERIES",
    contentType: "SERIES",
    limit: 100,
    page: 1,
    ...params,
  });

  return listFromResponse(response, ["contents", "data", "items", "results"]);
}

export async function fetchContentById(id: string) {
  const response = await apiGet(`/admin/contents/${id}`);
  return unwrapResult<ContentItem>(response);
}

export const fetchContents = fetchContent;

export async function fetchRejectedContent(
  params: Record<string, string | number | undefined> = {},
) {
  const response = await apiGet("/admin/contents/rejected/list", params);

  return listFromResponse(response, ["contents", "data", "items", "results"]);
}

export async function getVideoDuration(file: File) {
  const formData = new FormData();
  formData.append("video", file);

  return apiPost("/admin/contents/video-duration", formData);
}
export interface PresignedUrlPayload {
  fileName: string;
  fileType: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  key: string;
  fileUrl: string;
}

export const getPresignedUrl = async (
  payload: PresignedUrlPayload,
): Promise<PresignedUrlResponse> => {
  const response = await apiPost("/admin/utils/presigned-url", payload);

  return response.results;
};
