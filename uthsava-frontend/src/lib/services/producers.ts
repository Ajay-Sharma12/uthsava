import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "../api";

// export function getProducers(search = "") {
//   return apiGet("/admin/producers", {
//     search,
//   });
// }
export function getProducers(search = "") {
  return apiGet("/admin/producers", {
    search,
    limit: 100,
  });
}

export function createProducer(data: any) {
  return apiPost("/admin/producers", data);
}

export function updateProducer(id: string, data: any) {
  return apiPut(`/admin/producers/${id}`, data);
}

export function deleteProducer(id: string) {
  return apiDelete(`/admin/producers/${id}`);
}

export function getProducerDetail(id: string) {
  return apiGet(`/admin/producers/${id}/detail`);
}

// export function updateProducerStatus(
//   id: string,
//   status: "active" | "inactive"
// ) {
//   return apiPatch(`/admin/producers/${id}/status`, {
//     status,
//     rejectionReason:
//       status === "inactive" ? "Status changed by admin" : "",
//   });
// }

export function updateProducerStatus(id: string, status: "active" | "inactive" | "suspended") {
  return apiPatch(`/admin/producers/${id}/status`, {
    status,
  });
}
