import { apiGet, apiPost, apiPut } from "../api";


export const fetchPlatformSettings = () => {
  return apiGet("/admin/settings");
};

export const updatePlatformSettings = (payload: any) => {
  return apiPut("/admin/settings", payload);
};

export const updateFreePreviewSettings = (payload: any) => {
  return apiPut("/admin/settings/free-preview", payload);
};

export const fetchRevenueBrackets = () => {
  return apiGet("/admin/settings/revenue-brackets");
};

export const createRevenueBracket = (payload: any) => {
  return apiPost("/admin/settings/revenue-brackets", payload);
};

export const updateRevenueBracket = (payload: any) => {
  return apiPut(
    "/admin/settings/revenue-brackets/edit",
    payload
  );
};

export const deleteRevenueBracket = (payload: {
  bracketId: string;
}) => {
  return apiPost(
    "/admin/settings/revenue-brackets/delete",
    payload
  );
};

export const updatePayoutSettings = (payload: any) => {
  return apiPut(
    "/admin/settings/payout",
    payload
  );
};