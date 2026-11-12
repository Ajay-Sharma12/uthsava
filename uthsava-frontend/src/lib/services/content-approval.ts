import { apiGet, apiPatch } from "@/lib/api";

export interface ApprovalItem {
  _id: string;
  id: string;
  contentId: string;
  title: string;
  contentType: "movie" | "series" | string;
  genre: string[];
  producerName: string;
  producer?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
  } | null;
  submissionDate: string;
  createdAt?: string;
  status: "pending" | "under_review" | "approved" | "rejected" | "on_hold" | "re_edit_requested" | string;
  approvalStatus?: string;
  isActive?: boolean;
  language?: string[];
  duration?: number;
  releaseYear?: number;
  posterUrl?: string;
  thumbnailUrl?: string;
  mainVideoUrl?: string;
  teaserVideoUrl?: string;
  description?: string;
  shortDescription?: string;
  rejectionReason?: string;
  reEditRequestedReason?: string;
  approvalNotes?: string;
  ageCategory?: string;
  castAndCrew?: { name: string; role?: string; avatar?: string }[];
  tags?: string[];
  seasons?: any[];
  score?: number;
}

export interface ApprovalSummaryStats {
  total?: number;
  pending?: number;
  approved?: number;
  rejected?: number;
  approvalRate?: number;
}

export async function fetchPendingApprovals(params: {
  page?: number;
  limit?: number;
  search?: string;
  contentType?: string;
  status?: string;
  genre?: string;
} = {}): Promise<{ data: ApprovalItem[]; total: number }> {
  try {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.search) query.set("search", params.search);
    if (params.contentType && params.contentType !== "ALL") query.set("contentType", params.contentType.toUpperCase());
    if (params.status && params.status !== "ALL") query.set("status", params.status.toLowerCase());
    if (params.genre && params.genre !== "ALL") query.set("genre", params.genre);

    const res = await apiGet("/admin/contents/approvals/pending?" + query.toString());
    const results = res?.results;
    return {
      data: results?.data || [],
      total: results?.pagination?.total || results?.data?.length || 0,
    };
  } catch (error) {
    console.error("Failed to fetch pending approvals:", error);
    try {
      const resFallback = await apiGet("/admin/contents?page=1&limit=50");
      const contents = resFallback?.results?.contents || [];
      const transformed: ApprovalItem[] = contents.map((c: any) => ({
        _id: c._id,
        id: c._id,
        contentId: c._id,
        title: c.title,
        contentType: (c.type || "movie").toLowerCase(),
        genre: Array.isArray(c.genres) ? c.genres.map((g: any) => g.name || g) : [],
        producerName: c.producer?.name || c.uploadedBy?.fullName || "Production Studio",
        producer: c.producer || c.uploadedBy || null,
        submissionDate: c.createdAt || new Date().toISOString(),
        status: (c.approvalStatus || c.status || "pending").toLowerCase(),
        language: Array.isArray(c.language) ? c.language.map((l: any) => l.name || l) : ["Hindi"],
        duration: c.duration,
        releaseYear: c.releaseYear,
        posterUrl: Array.isArray(c.poster) ? c.poster[0] : c.poster || c.thumbnail,
        thumbnailUrl: c.thumbnail,
        mainVideoUrl: c.mainVideo,
        teaserVideoUrl: Array.isArray(c.teaserVideo) ? c.teaserVideo[0] : c.teaserVideo,
        description: c.description || c.shortDescription || "",
        shortDescription: c.shortDescription || "",
        rejectionReason: c.rejectionReason,
        approvalNotes: c.approvalNotes,
        ageCategory: c.ageCategory,
        castAndCrew: c.castCrew || [],
        tags: c.tags || [],
        score: 85,
      }));
      return { data: transformed, total: transformed.length };
    } catch {
      return { data: [], total: 0 };
    }
  }
}

export async function getContentApprovalDetails(contentId: string): Promise<ApprovalItem | null> {
  try {
    const res = await apiGet("/admin/contents/" + contentId + "/approval-details");
    return res?.results || null;
  } catch (error) {
    console.error("Failed to fetch approval details for " + contentId + ":", error);
    try {
      const fallback = await apiGet("/admin/contents/" + contentId);
      const c = fallback?.results;
      if (!c) return null;
      return {
        _id: c._id,
        id: c._id,
        contentId: c._id,
        title: c.title,
        contentType: (c.type || "movie").toLowerCase(),
        genre: Array.isArray(c.genres) ? c.genres.map((g: any) => g.name || g) : [],
        producerName: c.producer?.name || c.uploadedBy?.fullName || "Production Studio",
        producer: c.producer || c.uploadedBy || null,
        submissionDate: c.createdAt || new Date().toISOString(),
        status: (c.approvalStatus || c.status || "pending").toLowerCase(),
        language: Array.isArray(c.language) ? c.language.map((l: any) => l.name || l) : ["Hindi"],
        duration: c.duration,
        releaseYear: c.releaseYear,
        posterUrl: Array.isArray(c.poster) ? c.poster[0] : c.poster || c.thumbnail,
        thumbnailUrl: c.thumbnail,
        mainVideoUrl: c.mainVideo,
        teaserVideoUrl: Array.isArray(c.teaserVideo) ? c.teaserVideo[0] : c.teaserVideo,
        description: c.description || c.shortDescription || "",
        shortDescription: c.shortDescription || "",
        rejectionReason: c.rejectionReason,
        approvalNotes: c.approvalNotes,
        ageCategory: c.ageCategory,
        castAndCrew: c.castCrew || [],
        tags: c.tags || [],
        score: 85,
      };
    } catch {
      return null;
    }
  }
}

export const LANGUAGE_FULL_NAMES: Record<string, string> = {
  EN: "English",
  ENGLISH: "English",
  HI: "Hindi",
  HINDI: "Hindi",
  AR: "Arabic",
  ARABIC: "Arabic",
  TA: "Tamil",
  TAMIL: "Tamil",
  TE: "Telugu",
  TELUGU: "Telugu",
  KN: "Kannada",
  KANNADA: "Kannada",
  ML: "Malayalam",
  MALAYALAM: "Malayalam",
  MR: "Marathi",
  MARATHI: "Marathi",
  GU: "Gujarati",
  GUJARATI: "Gujarati",
  PA: "Punjabi",
  PUNJABI: "Punjabi",
  BN: "Bengali",
  BENGALI: "Bengali",
  ES: "Spanish",
  SPANISH: "Spanish",
  FR: "French",
  FRENCH: "French",
  DE: "German",
  GERMAN: "German",
  IT: "Italian",
  ITALIAN: "Italian",
  JA: "Japanese",
  JAPANESE: "Japanese",
  KO: "Korean",
  KOREAN: "Korean",
  ZH: "Chinese",
  CHINESE: "Chinese",
  RU: "Russian",
  RUSSIAN: "Russian",
  PT: "Portuguese",
  PORTUGUESE: "Portuguese",
};

export function displayLanguage(languages?: any): string {
  if (!languages) return "—";
  const list = Array.isArray(languages) ? languages : [languages];
  const formatted = list
    .map((item: any) => {
      if (!item) return "";
      const val = typeof item === "object" ? item.name || item.code || "" : String(item);
      const upper = val.trim().toUpperCase();
      return LANGUAGE_FULL_NAMES[upper] || val.trim();
    })
    .filter(Boolean);
  return formatted.length > 0 ? formatted.join(", ") : "—";
}

export function displayPrimaryLanguage(languages?: any): string {
  if (!languages) return "—";
  const list = Array.isArray(languages) ? languages : [languages];
  const first = list[0];
  if (!first) return "—";
  const val = typeof first === "object" ? first.name || first.code || "" : String(first);
  const upper = val.trim().toUpperCase();
  return LANGUAGE_FULL_NAMES[upper] || val.trim() || "—";
}

export function formatMovieDuration(value: unknown): string {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return "—";
  }
  const minutes = num > 600 ? Math.ceil(num / 60) : Math.round(num);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function formatProducerName(item?: any): string {
  if (!item) return "Producer";
  if (typeof item === "string" && item.trim() && item.trim() !== "Unknown" && item.trim() !== "N/A") return item.trim();

  const directProducer =
    typeof item.producer === "string" && item.producer.trim() && item.producer.trim() !== "Studio" && item.producer.trim() !== "Unknown" && item.producer.trim() !== "N/A"
      ? item.producer.trim()
      : typeof item.producer?.name === "string" &&
          item.producer.name.trim() &&
          item.producer.name.trim() !== "Studio" &&
          item.producer.name.trim() !== "Unknown" &&
          item.producer.name.trim() !== "N/A"
        ? item.producer.name.trim()
        : null;

  if (directProducer) return directProducer;

  if (
    typeof item.producerName === "string" &&
    item.producerName.trim() &&
    item.producerName.trim() !== "Studio" &&
    item.producerName.trim() !== "Unknown" &&
    item.producerName.trim() !== "N/A"
  ) {
    return item.producerName.trim();
  }

  const name =
    (item.producer?.name && item.producer.name !== "Unknown" && item.producer.name !== "N/A" ? item.producer.name : null) ||
    (item.producer?.fullName && item.producer.fullName !== "Unknown" && item.producer.fullName !== "N/A" ? item.producer.fullName : null) ||
    (item.producerName && item.producerName !== "Unknown" && item.producerName !== "N/A" ? item.producerName : null) ||
    (item.uploadedBy?.companyName && item.uploadedBy.companyName !== "Unknown" && item.uploadedBy.companyName !== "N/A" ? item.uploadedBy.companyName : null) ||
    (item.uploadedBy?.fullName && item.uploadedBy.fullName !== "Unknown" && item.uploadedBy.fullName !== "N/A" ? item.uploadedBy.fullName : null) ||
    (item.uploadedBy?.name && item.uploadedBy.name !== "Unknown" && item.uploadedBy.name !== "N/A" ? item.uploadedBy.name : null) ||
    (item.uploaderInfo?.[0]?.fullName && item.uploaderInfo[0].fullName !== "Unknown" && item.uploaderInfo[0].fullName !== "N/A" ? item.uploaderInfo[0].fullName : null) ||
    (item.uploaderInfo?.[0]?.name && item.uploaderInfo[0].name !== "Unknown" && item.uploaderInfo[0].name !== "N/A" ? item.uploaderInfo[0].name : null);

  if (name && name !== "N/A" && name !== "Unknown" && name !== "Studio") return name;
  return typeof item.producer === "string" && item.producer && item.producer !== "Unknown" ? item.producer : "Producer";
}

export function formatSubmissionDate(dateVal?: any): string {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  } catch {}
  return String(dateVal).slice(0, 10) || "—";
}

export function resolveMedia(url?: string | null): string {
  if (!url || typeof url !== "string" || !url.trim()) return "";
  const trimmed = url.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  const base = "https://d1f23llskj06r6.cloudfront.net";
  return `${base}/${trimmed.replace(/^\/+/, "")}`;
}

export async function approveContentItem(
  contentId: string,
  payload: { approvalNotes?: string; ageCategory?: any } = {},
) {
  const res = await apiPatch("/admin/contents/" + contentId + "/approve", payload);
  return res?.results ?? res;
}

export async function rejectContentItem(
  contentId: string,
  payload: { rejectionReason: string } | any,
) {
  const res = await apiPatch("/admin/contents/" + contentId + "/reject", payload);
  return res?.results ?? res;
}

export async function holdContentItem(
  contentId: string,
  payload: { notes?: string; holdHours?: number } = {},
) {
  const res = await apiPatch("/admin/contents/" + contentId + "/hold", payload);
  return res?.results ?? res;
}

export async function requestReEditContentItem(
  contentId: string,
  payload: { reason?: string; notes?: string } | any,
) {
  const res = await apiPatch("/admin/contents/" + contentId + "/request-reedit", payload);
  return res?.results ?? res;
}

export async function revokeReEditContentItem(
  contentId: string,
  payload: { notes?: string } = {},
) {
  const res = await apiPatch("/admin/contents/" + contentId + "/revoke-reedit", payload);
  return res?.results ?? res;
}

export async function fetchApprovalSummary(): Promise<ApprovalSummaryStats | null> {
  try {
    const res = await apiGet("/admin/contents/approvals/summary");
    return res?.results?.summary || res?.results || null;
  } catch (error) {
    console.error("Failed to fetch approval summary:", error);
    return null;
  }
}

export const fetchApprovalStats = fetchApprovalSummary;
export const fetchApprovalDetails = getContentApprovalDetails;
export const approveContent = approveContentItem;
export const rejectContent = rejectContentItem;
export const holdContent = holdContentItem;
export const requestReEdit = requestReEditContentItem;
export const resolveMediaUrl = resolveMedia;

export async function fetchApprovalHistory(contentId: string) {
  try {
    const res = await apiGet(`/admin/contents/${contentId}/approval-history`);
    return res?.results || [];
  } catch {
    return [];
  }
}

export async function submitForReview(contentId: string, body?: any) {
  return apiPatch(`/admin/contents/${contentId}/submit-for-review`, body);
}
