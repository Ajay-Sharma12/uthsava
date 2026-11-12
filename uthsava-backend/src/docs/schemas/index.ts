/**
 * OpenAPI 3.0 Reusable Schemas & Components
 * Production-ready shared schema definitions for Uthsava Admin Backend
 */

export const swaggerSchemas = {
  // ─── Security Scheme Definition ──────────────────────────────────────────────
  securitySchemes: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
      description: "Enter your Admin JWT token in the format: `Bearer <JWT_TOKEN>`",
    },
  },

  // ─── Standard API Response Envelopes ─────────────────────────────────────────
  SuccessResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "Operation completed successfully" },
      results: { type: "object", nullable: true },
    },
    required: ["success", "message"],
  },

  ErrorResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: false },
      message: { type: "string", example: "An error occurred while processing your request" },
      error: { type: "object", nullable: true },
    },
    required: ["success", "message"],
  },

  ValidationErrorResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: false },
      message: { type: "string", example: "Validation failed" },
      errors: {
        type: "object",
        additionalProperties: { type: "string" },
        example: {
          email: "validation.email.invalid",
          password: "validation.passwordMustBeAtLeast6CharactersLong",
        },
      },
    },
    required: ["success", "message", "errors"],
  },

  PaginationMeta: {
    type: "object",
    properties: {
      page: { type: "integer", example: 1 },
      limit: { type: "integer", example: 10 },
      total: { type: "integer", example: 42 },
      totalPages: { type: "integer", example: 5 },
    },
    required: ["page", "limit", "total", "totalPages"],
  },

  PaginatedResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "Data fetched successfully" },
      results: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { type: "object" },
          },
          pagination: { $ref: "#/components/schemas/PaginationMeta" },
        },
        required: ["data", "pagination"],
      },
    },
    required: ["success", "message", "results"],
  },

  // ─── Shared Entity Schemas ───────────────────────────────────────────────────
  User: {
    type: "object",
    properties: {
      _id: { type: "string", example: "64f1a2b3c4d5e6f7a8b9c0d1" },
      firstName: { type: "string", example: "Jane" },
      lastName: { type: "string", example: "Doe" },
      email: { type: "string", format: "email", example: "jane.doe@example.com" },
      phoneNumber: { type: "string", example: "+1234567890" },
      role: { type: "string", enum: ["USER", "ADMIN", "ADMIN_SUB_USER", "PRODUCER"], example: "USER" },
      status: { type: "string", enum: ["ACTIVE", "INACTIVE", "BLOCKED"], example: "ACTIVE" },
      profileImage: { type: "string", example: "https://cdn.example.com/profiles/avatar1.jpg" },
      createdAt: { type: "string", format: "date-time", example: "2026-01-15T08:30:00.000Z" },
      updatedAt: { type: "string", format: "date-time", example: "2026-07-21T10:00:00.000Z" },
    },
  },

  Producer: {
    type: "object",
    properties: {
      _id: { type: "string", example: "650c1a2b3c4d5e6f7a8b9c0d" },
      companyName: { type: "string", example: "Apex Studios" },
      contactPersonName: { type: "string", example: "John Smith" },
      email: { type: "string", format: "email", example: "producer@apexstudios.com" },
      phoneNumber: { type: "string", example: "+919876543210" },
      status: { type: "string", enum: ["ACTIVE", "INACTIVE", "PENDING", "REJECTED"], example: "ACTIVE" },
      revenueSharePercentage: { type: "number", example: 70 },
      createdAt: { type: "string", format: "date-time", example: "2026-02-10T12:00:00.000Z" },
    },
  },

  ContentCategory: {
    type: "object",
    properties: {
      _id: { type: "string", example: "651a2b3c4d5e6f7a8b9c0d12" },
      name: { type: "string", example: "Action & Thriller" },
      type: { type: "string", enum: ["category", "genre"], example: "category" },
      displayOrder: { type: "integer", example: 1 },
      status: { type: "string", enum: ["active", "inactive"], example: "active" },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  Content: {
    type: "object",
    properties: {
      _id: { type: "string", example: "652a3b4c5d6e7f8a9b0c1d23" },
      title: { type: "string", example: "The Dark Knight" },
      description: { type: "string", example: "When the menace known as the Joker wreaks havoc..." },
      shortDescription: { type: "string", example: "Action thriller movie" },
      type: { type: "string", enum: ["MOVIE", "SERIES"], example: "MOVIE" },
      genres: {
        type: "array",
        items: { type: "string" },
        example: ["651a2b3c4d5e6f7a8b9c0d12"],
      },
      tags: {
        type: "array",
        items: { type: "string" },
        example: ["ACTION", "BLOCKBUSTER"],
      },
      cast: {
        type: "array",
        items: { type: "string" },
        example: ["Christian Bale", "Heath Ledger"],
      },
      crew: {
        type: "array",
        items: { type: "string" },
        example: ["Christopher Nolan (Director)"],
      },
      language: {
        type: "array",
        items: { type: "string" },
        example: ["English", "Hindi"],
      },
      thumbnailUrl: { type: "string", example: "https://cdn.example.com/content/thumb.jpg" },
      posterUrl: { type: "string", example: "https://cdn.example.com/content/poster.jpg" },
      trailerUrl: { type: "string", example: "https://cdn.example.com/content/trailer.mp4" },
      videoUrl: { type: "string", example: "https://cdn.example.com/content/movie.mp4" },
      durationInSeconds: { type: "integer", example: 9120 },
      isFree: { type: "boolean", example: false },
      status: { type: "string", enum: ["DRAFT", "PENDING", "APPROVED", "REJECTED", "ACTIVE", "INACTIVE"], example: "ACTIVE" },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  Season: {
    type: "object",
    properties: {
      _id: { type: "string", example: "653a4b5c6d7e8f9a0b1c2d34" },
      contentId: { type: "string", example: "652a3b4c5d6e7f8a9b0c1d23" },
      seasonNumber: { type: "integer", example: 1 },
      title: { type: "string", example: "Season 1" },
      description: { type: "string", example: "The beginning of the journey" },
      totalEpisodes: { type: "integer", example: 10 },
      status: { type: "string", enum: ["active", "inactive"], example: "active" },
    },
  },

  Episode: {
    type: "object",
    properties: {
      _id: { type: "string", example: "654a5b6c7d8e9f0a1b2c3d45" },
      seasonId: { type: "string", example: "653a4b5c6d7e8f9a0b1c2d34" },
      episodeNumber: { type: "integer", example: 1 },
      title: { type: "string", example: "Pilot Episode" },
      description: { type: "string", example: "Introduction to the main characters" },
      videoUrl: { type: "string", example: "https://cdn.example.com/episodes/ep1.mp4" },
      durationInSeconds: { type: "integer", example: 2700 },
      status: { type: "string", enum: ["active", "inactive"], example: "active" },
    },
  },

  Coupon: {
    type: "object",
    properties: {
      _id: { type: "string", example: "655a6b7c8d9e0f1a2b3c4d56" },
      code: { type: "string", example: "SUMMER50" },
      discountType: { type: "string", enum: ["PERCENTAGE", "FIXED"], example: "PERCENTAGE" },
      discountValue: { type: "number", example: 50 },
      minOrderAmount: { type: "number", example: 100 },
      maxDiscountAmount: { type: "number", example: 500 },
      startDate: { type: "string", format: "date-time", example: "2026-06-01T00:00:00.000Z" },
      endDate: { type: "string", format: "date-time", example: "2026-08-31T23:59:59.000Z" },
      usageLimit: { type: "integer", example: 1000 },
      usedCount: { type: "integer", example: 145 },
      status: { type: "string", enum: ["ACTIVE", "INACTIVE", "EXPIRED"], example: "ACTIVE" },
    },
  },

  Notification: {
    type: "object",
    properties: {
      _id: { type: "string", example: "656a7b8c9d0e1f2a3b4c5d67" },
      title: { type: "string", example: "New Feature Released" },
      message: { type: "string", example: "Check out our latest movie collections!" },
      targetType: { type: "string", enum: ["ALL", "SPECIFIC_USERS", "PRODUCERS"], example: "ALL" },
      status: { type: "string", enum: ["SENT", "PENDING", "FAILED"], example: "SENT" },
      sentAt: { type: "string", format: "date-time" },
    },
  },

  EmailTemplate: {
    type: "object",
    properties: {
      _id: { type: "string", example: "657a8b9c0d1e2f3a4b5c6d78" },
      templateCode: { type: "string", example: "WELCOME_EMAIL" },
      title: { type: "string", example: "Welcome to Uthsava" },
      subject: { type: "string", example: "Welcome {{userName}} to Uthsava platform!" },
      body: { type: "string", example: "<h1>Welcome</h1><p>Dear {{userName}},</p>" },
      keywordList: { type: "array", items: { type: "string" }, example: ["userName", "loginUrl"] },
      status: { type: "string", enum: ["active", "inactive"], example: "active" },
    },
  },

  CmsPage: {
    type: "object",
    properties: {
      _id: { type: "string", example: "658a9b0c1d2e3f4a5b6c7d89" },
      title: { type: "string", example: "Privacy Policy" },
      slug: { type: "string", example: "privacy-policy" },
      content: { type: "string", example: "<h1>Privacy Policy</h1><p>Your privacy matters...</p>" },
      metaTitle: { type: "string", example: "Privacy Policy | Uthsava" },
      metaDescription: { type: "string", example: "Read our privacy policy." },
      status: { type: "string", enum: ["active", "inactive"], example: "active" },
      publicationStatus: { type: "string", enum: ["DRAFT", "PUBLISHED"], example: "PUBLISHED" },
    },
  },

  TutorialSlide: {
    type: "object",
    properties: {
      _id: { type: "string", example: "659aa0b1c2d3e4f5a6b7c8d9" },
      title: { type: "string", example: "Welcome to Uthsava" },
      description: { type: "string", example: "Stream endless movies and series." },
      mediaType: { type: "string", enum: ["IMAGE", "VIDEO"], example: "IMAGE" },
      image: { type: "string", example: "https://cdn.example.com/tutorials/slide1.jpg" },
      video: { type: "string", example: "" },
      sequence: { type: "integer", example: 1 },
      status: { type: "string", enum: ["active", "inactive"], example: "active" },
    },
  },

  AwardBadge: {
    type: "object",
    properties: {
      _id: { type: "string", example: "65ab0c1d2e3f4a5b6c7d8e9f" },
      name: { type: "string", example: "Best Picture 2026" },
      type: { type: "string", enum: ["AWARD", "BADGE"], example: "AWARD" },
      iconUrl: { type: "string", example: "https://cdn.example.com/badges/gold.png" },
      contentIds: { type: "array", items: { type: "string" }, example: ["652a3b4c5d6e7f8a9b0c1d23"] },
      status: { type: "string", enum: ["active", "inactive"], example: "active" },
    },
  },

  Role: {
    type: "object",
    properties: {
      _id: { type: "string", example: "65bc1d2e3f4a5b6c7d8e9f0a" },
      name: { type: "string", example: "Content Moderator" },
      description: { type: "string", example: "Responsible for content review and approvals" },
      permissions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            module: { type: "string", example: "contents" },
            actions: {
              type: "array",
              items: { type: "string" },
              example: ["view", "edit", "approve"],
            },
          },
        },
      },
    },
  },

  AuditLog: {
    type: "object",
    properties: {
      _id: { type: "string", example: "65cd2e3f4a5b6c7d8e9f0a1b" },
      userId: { type: "string", example: "64f1a2b3c4d5e6f7a8b9c0d1" },
      userEmail: { type: "string", example: "admin@uthsava.com" },
      action: { type: "string", example: "UPDATE_CONTENT_STATUS" },
      module: { type: "string", example: "contents" },
      ipAddress: { type: "string", example: "192.168.1.1" },
      metadata: { type: "object" },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  Settings: {
    type: "object",
    properties: {
      freePreviewEnabled: { type: "boolean", example: true },
      freePreviewDurationMinutes: { type: "integer", example: 5 },
      payoutFrequencyDays: { type: "integer", example: 30 },
      revenueBrackets: {
        type: "array",
        items: {
          type: "object",
          properties: {
            _id: { type: "string", example: "65de3f4a5b6c7d8e9f0a1b2c" },
            minViews: { type: "integer", example: 0 },
            maxViews: { type: "integer", example: 10000 },
            producerPercentage: { type: "number", example: 60 },
          },
        },
      },
    },
  },

  PresignedUrlRequest: {
    type: "object",
    properties: {
      fileName: { type: "string", example: "poster.jpg" },
      fileType: { type: "string", example: "image/jpeg" },
      folder: { type: "string", example: "content/posters" },
    },
    required: ["fileName", "fileType"],
  },

  PresignedUrlResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "Presigned URL generated successfully" },
      results: {
        type: "object",
        properties: {
          uploadUrl: { type: "string", example: "https://s3.amazonaws.com/bucket/key?AWSAccessKeyId=..." },
          fileKey: { type: "string", example: "content/posters/16890000-poster.jpg" },
          fileUrl: { type: "string", example: "https://cdn.example.com/content/posters/16890000-poster.jpg" },
        },
      },
    },
  },
};
