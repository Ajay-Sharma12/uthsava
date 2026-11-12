import {
  approveContentSchema,
  rejectContentSchema,
  listPendingApprovalsQuerySchema,
  listApprovalHistoryQuerySchema,
  getApprovalSummaryQuerySchema,
} from "../../../../src/modules/admin/validators/content-approval.validator";

describe("Content Approval Validator Unit Tests", () => {
  describe("approveContentSchema", () => {
    it("should validate valid approval payload (Positive)", () => {
      const { error } = approveContentSchema.validate({
        ageCategory: "KIDS",
        approvalNotes: "Looks good!",
      });
      expect(error).toBeUndefined();
    });

    it("should fail for invalid ageCategory (Validation)", () => {
      const { error } = approveContentSchema.validate({
        ageCategory: "SENIORS",
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.ageCategoryMustBeKidsOrAdults");
    });
  });

  describe("rejectContentSchema", () => {
    it("should validate valid rejection payload (Positive)", () => {
      const { error } = rejectContentSchema.validate({
        rejectionReason: "Inappropriate content in scene 2",
      });
      expect(error).toBeUndefined();
    });

    it("should fail if rejectionReason is too short (Validation)", () => {
      const { error } = rejectContentSchema.validate({
        rejectionReason: "No",
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.rejectionReasonMustBeAtLeast5Characters");
    });

    it("should fail if rejectionReason is missing (Validation)", () => {
      const { error } = rejectContentSchema.validate({});
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.rejectionReasonIsRequired");
    });
  });

  describe("listPendingApprovalsQuerySchema", () => {
    it("should validate query parameters (Positive)", () => {
      const { error, value } = listPendingApprovalsQuerySchema.validate({
        page: "2",
        limit: "20",
        contentType: "MOVIE",
        sortOrder: "asc",
      });
      expect(error).toBeUndefined();
      expect(value.page).toBe(2);
    });

    it("should fail for invalid dateFrom ISO string (Validation/Edge)", () => {
      const { error } = listPendingApprovalsQuerySchema.validate({
        dateFrom: "2026-13-45",
      });
      expect(error).toBeDefined();
    });
  });

  describe("listApprovalHistoryQuerySchema & getApprovalSummaryQuerySchema", () => {
    it("should validate valid query parameters (Positive)", () => {
      const { error } = listApprovalHistoryQuerySchema.validate({ status: "APPROVED" });
      expect(error).toBeUndefined();
    });

    it("should validate summary date range (Positive)", () => {
      const { error } = getApprovalSummaryQuerySchema.validate({
        dateFrom: "2026-01-01T00:00:00.000Z",
      });
      expect(error).toBeUndefined();
    });
  });
});
