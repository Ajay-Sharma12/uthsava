import Joi from "joi";
import {
  ContentType,
  ContentStatus,
  ContentApprovalStatus,
  ContentTag,
  AgeCategory,
  AgeRating,
} from "../../../models/content.model";

const IMAGE_FILE_PATTERN = /\.(jpe?g|png|webp|gif|svg)$/i;
const VIDEO_FILE_PATTERN = /\.(mp4|mkv|mov|avi|webm|m4v)$/i;

const validateImageUrl = (value: string, helpers: Joi.CustomHelpers) => {
  if (!value || typeof value !== "string") return value;
  const cleanUrl = value.split("?")[0].split("#")[0].trim();
  if (cleanUrl.startsWith("data:") || cleanUrl.startsWith("blob:")) return value;
  if (!IMAGE_FILE_PATTERN.test(cleanUrl)) {
    if (cleanUrl.includes("/") || cleanUrl.length > 5) {
      return value;
    }
    return helpers.error("string.imageExtension");
  }
  return value;
};

const validateVideoUrl = (value: string, helpers: Joi.CustomHelpers) => {
  if (!value || typeof value !== "string") return value;
  const cleanUrl = value.split("?")[0].split("#")[0].trim();
  if (cleanUrl.startsWith("data:") || cleanUrl.startsWith("blob:")) return value;
  if (!VIDEO_FILE_PATTERN.test(cleanUrl)) {
    if (cleanUrl.includes("/") || cleanUrl.length > 5) {
      return value;
    }
    return helpers.error("string.videoExtension");
  }
  return value;
};

// const getStartOfToday = () => {
//   const d = new Date();
//   d.setHours(0, 0, 0, 0);
//   return d;
// };

// ─── Param ───────────────────────────────────────────────────────────────────

export const contentIdParamSchema = Joi.object({
  contentId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "validation.invalidContentIdFormat",
      "any.required": "validation.contentIdIsRequired",
    }),
});

export const seasonIdParamSchema = Joi.object({
  contentId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
  seasonId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "validation.invalidSeasonIdFormat",
      "any.required": "validation.seasonIdIsRequired",
    }),
});

export const episodeIdParamSchema = Joi.object({
  contentId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
  seasonId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
  episodeId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "validation.invalidEpisodeIdFormat",
      "any.required": "validation.episodeIdIsRequired",
    }),
});

// ─── Create ──────────────────────────────────────────────────────────────────

export const createContentSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required().messages({
    "string.min": "validation.titleMustBeAtLeast3Characters",
    "string.max": "validation.titleCannotExceed200Characters",
    "any.required": "validation.titleIsRequired",
  }),
  shortDescription: Joi.string().trim().max(500).optional().allow(""),
  ageCategory: Joi.string()
    .valid(...Object.values(AgeCategory))
    .optional(),
  ageRating: Joi.string()
    .valid(...Object.values(AgeRating))
    .optional(),
  censorCertificate: Joi.string().optional().allow(null, ""),
  censorCertificateHash: Joi.string().optional().allow(null, ""),
  type: Joi.string()
    .valid(...Object.values(ContentType))
    .optional()
    .default(ContentType.MOVIE)
    .messages({
      "any.only": "validation.contentTypeMustBeMovieOrSeries",
    }),
  categoryId: Joi.alternatives().try(
    Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    Joi.string().trim().max(100)
  ).optional(),
  genres: Joi.array()
    .items(
      Joi.alternatives().try(
        Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
        Joi.string().trim().max(100)
      )
    )
    .optional(),
  category: Joi.alternatives().try(
    Joi.array().items(
      Joi.alternatives().try(
        Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
        Joi.string().trim().max(100)
      )
    ),
    Joi.string().trim().max(100)
  ).optional(),
  categories: Joi.array()
    .items(
      Joi.alternatives().try(
        Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
        Joi.string().trim().max(100),
        Joi.object().unknown(true)
      )
    )
    .optional(),
  language: Joi.array()
    .items(
      Joi.alternatives().try(
        Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
        Joi.string().trim().max(50)
      )
    )
    .optional()
    .default(["en"]),
  description: Joi.string().trim().max(5000).optional().allow(""),
  releaseYear: Joi.number()
    .integer()
    .min(1900)
    .max(new Date().getFullYear() + 10)
    .optional(),
  releaseDate: Joi.date()
    .iso()
    .required()
    .messages({
      "date.format": "validation.releaseDateMustBeIsoFormat",
      "any.required": "validation.releaseDateIsRequired",
    }),
  contentReleaseDate: Joi.date().iso().optional(),
  producer: Joi.string().trim().optional().allow("", null),
  director: Joi.string().trim().optional().allow("", null),
  totalSeasons: Joi.number().integer().min(0).optional().allow(null),
  totalEpisodes: Joi.number().integer().min(0).optional().allow(null),
  duration: Joi.number().integer().min(1).optional().messages({
    "number.min": "validation.durationMustBeAtLeast1Minute",
  }),
  banner: Joi.alternatives().try(
    Joi.array().items(
      Joi.string()
        .allow("")
        .custom(validateImageUrl)
    ),
    Joi.string()
      .allow("")
      .custom(validateImageUrl)
  ).optional(),
  poster: Joi.alternatives().try(
    Joi.array().items(
      Joi.string()
        .custom(validateImageUrl)
        .messages({
          "string.imageExtension": "validation.posterImageMustBeJpgJpegPngOrWebp",
        })
    ),
    Joi.string()
      .custom(validateImageUrl)
      .messages({
        "string.imageExtension": "validation.posterImageMustBeJpgJpegPngOrWebp",
      })
  )
    .required()
    .messages({
      "any.required": "validation.posterImageIsRequired",
    }),
  thumbnail: Joi.string()
    .required()
    .custom(validateImageUrl)
    .messages({
      "any.required": "validation.thumbnailImageIsRequired",
      "string.imageExtension":
        "validation.thumbnailImageMustBeJpgJpegPngOrWebp",
    }),
  posterHash: Joi.string().optional(),
  thumbnailHash: Joi.string().optional(),
  mainVideo: Joi.when("type", {
    is: "MOVIE",
    then: Joi.string()
      .required()
      .custom(validateVideoUrl)
      .messages({
        "any.required": "validation.mainVideoFileIsRequiredForMovies",
        "string.videoExtension": "validation.mainVideoMustBeMp4MkvMovAviOrWebm",
      }),
    otherwise: Joi.string()
      .optional()
      .allow("")
      .custom(validateVideoUrl)
      .messages({
        "string.videoExtension": "validation.mainVideoMustBeMp4MkvMovAviOrWebm",
      }),
  }),
  mainVideoHash: Joi.string().allow(null, ""),
  teaserVideo: Joi.array()
    .items(
      Joi.string()
        .allow("")
        .custom(validateVideoUrl)
        .messages({
          "string.videoExtension":
            "validation.teaserVideoMustBeMp4MkvMovAviOrWebm",
        })
    )
    .optional(),
  teaserVideoHash: Joi.string().allow(null, ""),
  teaserDuration: Joi.number().integer().min(1).max(360).optional().messages({
    "number.min": "validation.teaserDurationMustBeAtLeast1Second",
    "number.max": "validation.teaserDurationCannotExceed360Seconds6Minutes",
  }),
  cast: Joi.alternatives().try(
    Joi.array().items(
      Joi.alternatives().try(
        Joi.object({
          name: Joi.string().required(),
          role: Joi.string().allow(null, "").optional(),
          type: Joi.string().allow(null, "").optional(),
          image: Joi.string().allow(null, "").optional(),
        }),
        Joi.string().trim().allow("")
      )
    ),
    Joi.string().allow("", null)
  ).optional(),
  crew: Joi.alternatives().try(
    Joi.array().items(
      Joi.alternatives().try(
        Joi.object({
          name: Joi.string().required(),
          role: Joi.string().allow(null, "").optional(),
          type: Joi.string().allow(null, "").optional(),
          image: Joi.string().allow(null, "").optional(),
        }),
        Joi.string().trim().allow("")
      )
    ),
    Joi.string().allow("", null)
  ).optional(),
  imdb: Joi.alternatives().try(
    Joi.object({
      imdbId: Joi.string().allow(null, "").optional(),
      url: Joi.string().allow(null, "").optional(),
      rating: Joi.number().min(0).max(10).allow(null).optional(),
      voteCount: Joi.number().allow(null).optional(),
    }),
    Joi.number().min(0).max(10).allow(null),
    Joi.string().allow(null, "")
  ).optional().allow(null),
  subtitles: Joi.alternatives().try(
    Joi.array().items(
      Joi.alternatives().try(
        Joi.string().allow(""),
        Joi.object({
          languageId: Joi.string().optional().allow("", null),
          language: Joi.string().optional().allow("", null),
          fileUrl: Joi.string().optional().allow("", null),
        })
      )
    ),
    Joi.string().allow("")
  ).optional(),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().allow("")),
    Joi.string().trim().allow("")
  ).optional(),
  status: Joi.string()
    .valid(...Object.values(ContentStatus), "DRAFT", "PENDING")
    .optional()
    .default(ContentStatus.ACTIVE),
  approvalStatus: Joi.string()
    .valid(...Object.values(ContentApprovalStatus))
    .optional()
    .default(ContentApprovalStatus.PENDING),
  isFeatured: Joi.boolean().optional().default(false),
  isTrending: Joi.boolean().optional().default(false),
  isSubscriptionRequired: Joi.boolean().optional().default(false),
  isDownloadEnabled: Joi.boolean().optional().default(false),
  freePreviewEnabled: Joi.boolean().optional().default(false),
  freePreviewDuration: Joi.number().integer().min(0).optional().default(0),

  seasons: Joi.array()
    .items(
      Joi.object({
        _id: Joi.string().optional().allow("", null),
        id: Joi.string().optional().allow("", null),
        seasonNumber: Joi.number().integer().min(1).required(),
        title: Joi.string().trim().min(1).max(200).required().messages({
          "any.required": "validation.seasonTitleIsRequired",
        }),
        description: Joi.string().trim().max(500).optional().allow(""),
        episodes: Joi.array()
          .items(
            Joi.object({
              _id: Joi.string().optional().allow("", null),
              id: Joi.string().optional().allow("", null),
              episodeNumber: Joi.number().integer().min(1).optional(),
              title: Joi.string().trim().min(1).max(200).required().messages({
                "any.required": "validation.episodeTitleIsRequired",
              }),
              description: Joi.string().trim().max(500).optional().allow(""),
              duration: Joi.number().integer().min(0).optional(),
              videoFile: Joi.string().trim().optional().allow("", null),
              thumbnail: Joi.string().trim().optional().allow("", null),
              status: Joi.string().optional().allow("", null),
              releaseDate: Joi.date().iso().optional().allow("", null),
            })
          )
          .optional(),
      })
    )
    .optional(),
})
  .rename("contentType", "type", { override: true, ignoreUndefined: true })
  .rename("contentTitle", "title", { override: true, ignoreUndefined: true })
  .rename("genre", "genres", { override: true, ignoreUndefined: true })
  .rename("castAndCrew", "cast", { override: true, ignoreUndefined: true })
  .rename("posterImage", "poster", { override: true, ignoreUndefined: true })
  .rename("thumbnailImage", "thumbnail", { override: true, ignoreUndefined: true })
  .rename("mainVideoFile", "mainVideo", { override: true, ignoreUndefined: true })
  .rename("contentReleaseDate", "releaseDate", { override: true, ignoreUndefined: true });

// ─── Update ──────────────────────────────────────────────────────────────────

export const updateContentSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).optional().messages({
    "string.min": "validation.titleMustBeAtLeast3Characters",
    "string.max": "validation.titleCannotExceed200Characters",
  }),
  shortDescription: Joi.string().trim().max(500).optional().allow(""),
  ageCategory: Joi.string()
    .valid(...Object.values(AgeCategory))
    .optional(),
  ageRating: Joi.string()
    .valid(...Object.values(AgeRating))
    .optional(),
  censorCertificate: Joi.string().optional().allow(null, ""),
  censorCertificateHash: Joi.string().optional().allow(null, ""),
  type: Joi.string()
    .valid(...Object.values(ContentType))
    .optional(),
  categoryId: Joi.alternatives().try(
    Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    Joi.string().trim().max(100)
  ).optional(),
  genres: Joi.array()
    .items(
      Joi.alternatives().try(
        Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
        Joi.string().trim().max(100)
      )
    )
    .optional(),
  category: Joi.alternatives().try(
    Joi.array().items(
      Joi.alternatives().try(
        Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
        Joi.string().trim().max(100)
      )
    ),
    Joi.string().trim().max(100)
  ).optional(),
  categories: Joi.array()
    .items(
      Joi.alternatives().try(
        Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
        Joi.string().trim().max(100),
        Joi.object().unknown(true)
      )
    )
    .optional(),
  language: Joi.array()
    .items(
      Joi.alternatives().try(
        Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
        Joi.string().trim().max(50)
      )
    )
    .optional(),
  description: Joi.string().trim().max(5000).optional().allow(""),
  releaseYear: Joi.number()
    .integer()
    .min(1900)
    .max(new Date().getFullYear() + 10)
    .optional(),
  releaseDate: Joi.date()
    .iso()
    .optional()
    .messages({
      "date.format": "validation.releaseDateMustBeIsoFormat",
    }),
  producer: Joi.string().trim().optional().allow("", null),
  director: Joi.string().trim().optional().allow("", null),
  totalSeasons: Joi.number().integer().min(0).optional().allow(null),
  totalEpisodes: Joi.number().integer().min(0).optional().allow(null),
  duration: Joi.number().integer().min(1).optional().messages({
    "number.min": "validation.durationMustBeAtLeast1Minute",
  }),
  banner: Joi.alternatives().try(
    Joi.array().items(
      Joi.string()
        .allow("")
        .custom(validateImageUrl)
    ),
    Joi.string()
      .allow("")
      .custom(validateImageUrl)
  ).optional(),
  poster: Joi.alternatives().try(
    Joi.array().items(
      Joi.string()
        .allow("")
        .custom(validateImageUrl)
        .messages({
          "string.imageExtension": "validation.posterImageMustBeJpgJpegPngOrWebp",
        })
    ),
    Joi.string()
      .optional()
      .allow("")
      .custom(validateImageUrl)
      .messages({
        "string.imageExtension": "validation.posterImageMustBeJpgJpegPngOrWebp",
      })
  ).optional(),
  thumbnail: Joi.string()
    .optional()
    .allow("")
    .custom(validateImageUrl)
    .messages({
      "string.imageExtension":
        "validation.thumbnailImageMustBeJpgJpegPngOrWebp",
    }),
  posterHash: Joi.string().optional(),
  thumbnailHash: Joi.string().optional(),
  mainVideo: Joi.string()
    .optional()
    .allow("")
    .custom(validateVideoUrl)
    .messages({
      "string.videoExtension": "validation.mainVideoMustBeMp4MkvMovAviOrWebm",
    }),
  mainVideoHash: Joi.string().optional().allow(null, ""),
  teaserVideo: Joi.array()
    .items(
      Joi.string()
        .allow("")
        .custom(validateVideoUrl)
        .messages({
          "string.videoExtension":
            "validation.teaserVideoMustBeMp4MkvMovAviOrWebm",
        })
    )
    .optional(),
  teaserVideoHash: Joi.string().optional().allow(null, ""),
  teaserDuration: Joi.number().integer().min(1).max(360).optional().messages({
    "number.min": "validation.teaserDurationMustBeAtLeast1Second",
    "number.max": "validation.teaserDurationCannotExceed360Seconds6Minutes",
  }),
  cast: Joi.alternatives().try(
    Joi.array().items(
      Joi.alternatives().try(
        Joi.object({
          name: Joi.string().required(),
          role: Joi.string().allow(null, "").optional(),
          type: Joi.string().allow(null, "").optional(),
          image: Joi.string().allow(null, "").optional(),
        }),
        Joi.string().trim().allow("")
      )
    ),
    Joi.string().allow("", null)
  ).optional(),
  crew: Joi.alternatives().try(
    Joi.array().items(
      Joi.alternatives().try(
        Joi.object({
          name: Joi.string().required(),
          role: Joi.string().allow(null, "").optional(),
          type: Joi.string().allow(null, "").optional(),
          image: Joi.string().allow(null, "").optional(),
        }),
        Joi.string().trim().allow("")
      )
    ),
    Joi.string().allow("", null)
  ).optional(),
  imdb: Joi.alternatives().try(
    Joi.object({
      imdbId: Joi.string().allow(null, "").optional(),
      url: Joi.string().allow(null, "").optional(),
      rating: Joi.number().min(0).max(10).allow(null).optional(),
      voteCount: Joi.number().allow(null).optional(),
    }),
    Joi.number().min(0).max(10).allow(null),
    Joi.string().allow(null, "")
  ).optional().allow(null),
  subtitles: Joi.alternatives().try(
    Joi.array().items(
      Joi.alternatives().try(
        Joi.string().allow(""),
        Joi.object({
          languageId: Joi.string().optional().allow("", null),
          language: Joi.string().optional().allow("", null),
          fileUrl: Joi.string().optional().allow("", null),
        })
      )
    ),
    Joi.string().allow("")
  ).optional(),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().allow("")),
    Joi.string().trim().allow("")
  ).optional(),
  status: Joi.string()
    .valid(...Object.values(ContentStatus), "DRAFT", "PENDING")
    .optional(),
  approvalStatus: Joi.string()
    .valid(...Object.values(ContentApprovalStatus))
    .optional(),
  isFeatured: Joi.boolean().optional(),
  isTrending: Joi.boolean().optional(),
  isSubscriptionRequired: Joi.boolean().optional(),
  isDownloadEnabled: Joi.boolean().optional(),
  freePreviewEnabled: Joi.boolean().optional(),
  freePreviewDuration: Joi.number().integer().min(0).optional(),
  seasons: Joi.array()
    .items(
      Joi.object({
        _id: Joi.string().optional().allow("", null),
        id: Joi.string().optional().allow("", null),
        seasonNumber: Joi.number().integer().min(1).optional(),
        title: Joi.string().trim().min(1).max(200).optional(),
        description: Joi.string().trim().max(500).optional().allow(""),
        episodes: Joi.array()
          .items(
            Joi.object({
              _id: Joi.string().optional().allow("", null),
              id: Joi.string().optional().allow("", null),
              episodeNumber: Joi.number().integer().min(1).optional(),
              title: Joi.string().trim().min(1).max(200).optional(),
              description: Joi.string().trim().max(500).optional().allow(""),
              duration: Joi.number().integer().min(1).optional(),
              videoFile: Joi.string().trim().optional(),
              thumbnail: Joi.string().trim().optional(),
            })
          )
          .optional(),
      })
    )
    .optional(),

  // Revenue rules
  /*
  revenueOwnerType: Joi.string().valid("PLATFORM", "PRODUCER", "SPLIT").optional(),
  assignedProducerId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional().allow(null, ""),
  producerPercentage: Joi.number().min(0).max(100).optional().allow(null),
  platformPercentage: Joi.number().min(0).max(100).optional().allow(null),
  */
})
  .rename("contentType", "type", { override: true, ignoreUndefined: true })
  .rename("contentTitle", "title", { override: true, ignoreUndefined: true })
  .rename("genre", "genres", { override: true, ignoreUndefined: true })
  .rename("castAndCrew", "cast", { override: true, ignoreUndefined: true })
  .rename("posterImage", "poster", { override: true, ignoreUndefined: true })
  .rename("thumbnailImage", "thumbnail", { override: true, ignoreUndefined: true })
  .rename("mainVideoFile", "mainVideo", { override: true, ignoreUndefined: true });

// ─── Status toggle ───────────────────────────────────────────────────────────

export const updateContentStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(ContentStatus), "DRAFT", "draft")
    .optional()
    .messages({
      "any.only": "validation.statusMustBeActiveOrInactive",
    }),
  isActive: Joi.boolean()
    .optional()
    .messages({
      "boolean.base": "validation.isactiveMustBeABoolean",
    }),
  approvalStatus: Joi.string()
    .valid(...Object.values(ContentApprovalStatus))
    .optional()
    .messages({
      "any.only": "validation.approvalStatusMustBePendingApprovedOrRejected",
      "any.required": "validation.approvalStatusIsRequired",
    }),
});

// ─── Season ───────────────────────────────────────────────────────────────────

export const createSeasonSchema = Joi.object({
  seasonNumber: Joi.number().integer().min(1).required().messages({
    "number.min": "validation.seasonNumberMustBeAtLeast1",
    "any.required": "validation.seasonNumberIsRequired",
  }),
  title: Joi.string().trim().min(1).max(200).required().messages({
    "string.min": "validation.seasonTitleMustBeAtLeast3Characters",
    "string.max": "validation.seasonTitleCannotExceed200Characters",
    "any.required": "validation.seasonTitleIsRequired",
  }),
  description: Joi.string().trim().max(1000).optional().allow("", null),
  posterImage: Joi.string().optional().allow("", null),
  poster: Joi.alternatives().try(Joi.string().allow("", null), Joi.array().items(Joi.string())).optional(),
  thumbnail: Joi.string().optional().allow("", null),
  videoFile: Joi.string().optional().allow("", null),
  duration: Joi.number().optional().allow(null),
  releaseDate: Joi.string().optional().allow("", null),
  status: Joi.string().optional().allow("", null),
  approvalStatus: Joi.string().optional().allow("", null),
});

export const updateSeasonSchema = Joi.object({
  seasonNumber: Joi.number().integer().min(1).optional(),
  title: Joi.string().trim().min(1).max(200).optional().messages({
    "string.min": "validation.seasonTitleMustBeAtLeast3Characters",
    "string.max": "validation.seasonTitleCannotExceed200Characters",
  }),
  description: Joi.string().trim().max(1000).optional().allow("", null),
  posterImage: Joi.string().optional().allow("", null),
  poster: Joi.alternatives().try(Joi.string().allow("", null), Joi.array().items(Joi.string())).optional(),
  thumbnail: Joi.string().optional().allow("", null),
  videoFile: Joi.string().optional().allow("", null),
  duration: Joi.number().optional().allow(null),
  releaseDate: Joi.string().optional().allow("", null),
  status: Joi.string().optional().allow("", null),
  approvalStatus: Joi.string().optional().allow("", null),
});

// ─── Episode ──────────────────────────────────────────────────────────────────

export const createEpisodeSchema = Joi.object({
  episodeNumber: Joi.number().integer().min(1).max(10000).required().messages({
    "number.min": "validation.episodeNumberMustBeAtLeast1",
    "number.max": "validation.episodeNumberCannotExceed1000",
    "any.required": "validation.episodeNumberIsRequired",
  }),
  title: Joi.string().trim().min(1).max(200).required().messages({
    "string.min": "validation.episodeTitleMustBeAtLeast3Characters",
    "string.max": "validation.episodeTitleCannotExceed200Characters",
    "any.required": "validation.episodeTitleIsRequired",
  }),
  description: Joi.string().trim().max(1000).optional().allow("", null),
  duration: Joi.number().integer().min(0).max(6000).optional().allow(null),
  videoFile: Joi.string().required().allow("").messages({
    "any.required": "validation.episodeVideoFileIsRequired",
  }),
  thumbnailImage: Joi.string().optional().allow("", null),
  thumbnail: Joi.string().optional().allow("", null),
  releaseDate: Joi.string().optional().allow("", null),
  status: Joi.string().optional().allow("", null),
  approvalStatus: Joi.string().optional().allow("", null),
}).rename("thumbnail", "thumbnailImage", { override: true, ignoreUndefined: true });

export const updateEpisodeSchema = Joi.object({
  episodeNumber: Joi.number().integer().min(1).max(10000).optional(),
  title: Joi.string().trim().min(1).max(200).optional().messages({
    "string.min": "validation.episodeTitleMustBeAtLeast3Characters",
    "string.max": "validation.episodeTitleCannotExceed200Characters",
  }),
  description: Joi.string().trim().max(1000).optional().allow("", null),
  duration: Joi.number().integer().min(0).max(6000).optional().allow(null),
  videoFile: Joi.string().optional().allow("", null),
  thumbnailImage: Joi.string().optional().allow("", null),
  thumbnail: Joi.string().optional().allow("", null),
  releaseDate: Joi.string().optional().allow("", null),
  status: Joi.string().optional().allow("", null),
  approvalStatus: Joi.string().optional().allow("", null),
}).rename("thumbnail", "thumbnailImage", { override: true, ignoreUndefined: true });

// ─── List filters ─────────────────────────────────────────────────────────────

export const listContentsQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").max(100).optional(),
  type: Joi.string()
    .valid(...Object.values(ContentType), "all", "")
    .optional(),
  contentType: Joi.string()
    .valid(...Object.values(ContentType), "all", "")
    .optional(),
  tag: Joi.string()
    .valid(...Object.values(ContentTag), "all", "")
    .optional(),
  categoryId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),
  language: Joi.string().trim().max(50).optional(),
  cast: Joi.string().trim().max(100).optional().allow(""),
  crew: Joi.string().trim().max(100).optional().allow(""),
  status: Joi.string()
    .valid(
      ...Object.values(ContentStatus),
      ...Object.values(ContentStatus).map((s) => s.toLowerCase()),
      ...Object.values(ContentApprovalStatus),
      ...Object.values(ContentApprovalStatus).map((s) => s.toLowerCase()),
      "under_review",
      "UNDER_REVIEW",
      "all",
      ""
    )
    .optional(),
  isActive: Joi.string().valid("true", "false", "all", "").optional(),
  approvalStatus: Joi.string()
    .valid(...Object.values(ContentApprovalStatus))
    .optional(),
  releaseYear: Joi.number().integer().min(1900).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  sortBy: Joi.string()
    .valid("title", "createdAt", "updatedAt", "releaseYear", "status")
    .optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
}).rename("contentType", "type", { override: true, ignoreUndefined: true });


