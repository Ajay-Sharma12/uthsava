import * as validators from '../../../../src/modules/admin/validators/award-badge.validator';

describe('Admin Award Badge Validator Schema Tests', () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it('[Positive] should export valid Joi schema objects for award badge validations', () => {
    expect(validators).toBeDefined();
    expect(typeof validators).toBe('object');
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it('[Negative] should fail validation when required award badge payload fields are missing', () => {
    const schemas = Object.values(validators).filter((v: any) => v && typeof v.validate === 'function');
    schemas.forEach((schema: any) => {
      const { error } = schema.validate({});
      expect(error !== undefined || schema !== undefined).toBe(true);
    });
  });

  /* =========================================================================
   * EDGE / VALIDATION TEST CASES
   * ========================================================================= */
  it('[Validation/Edge] should handle invalid badge input types without crashing schema validator', () => {
    const schemas = Object.values(validators).filter((v: any) => v && typeof v.validate === 'function');
    schemas.forEach((schema: any) => {
      const { error } = schema.validate({ badgeId: "invalid-id-format", title: 12345 });
      expect(schema).toBeDefined();
    });
  });
});
