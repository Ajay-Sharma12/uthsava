import { Express, NextFunction, Request, RequestHandler, Response } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { config } from "../core/config";
import { logger } from "../core/constants/logger";
import { swaggerSchemas } from "../docs/schemas";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Uthsava Admin Backend API Documentation",
      version: "1.0.0",
      description:
        "Comprehensive OpenAPI 3.0 specification for the Uthsava Admin Backend application. Every endpoint is documented with path parameters, query parameters, request body schemas, response formats, and JWT authentication details.",
      contact: {
        name: "Uthsava Engineering Team",
        email: "support@uthsava.com",
      },
    },
    servers: [
      {
        url: "/",
        description: "Current Server (Relative Path)",
      },
      {
        url: `http://localhost:${config.port || 2601}`,
        description: "Local Development Server",
      },
      {
        url: "https://uthsava-api-staging.octallabs.com",
        description: "Staging Server",
      },
    ],
    tags: [
      { name: "Authentication", description: "Admin login, logout, password reset & profile management" },
      { name: "Dashboard", description: "Admin dashboard metrics and overview statistics" },
      { name: "Users", description: "User listing, status management and lookup" },
      { name: "Producers", description: "Producer account management and status workflow" },
      { name: "Content", description: "Movies and Series management" },
      { name: "Series & Seasons", description: "Seasons and Episode management for Series content" },
      { name: "Content Approval", description: "Producer content submission, approval, and rejection workflow" },
      { name: "Categories & Genres", description: "Content category and genre management" },
      { name: "Coupons", description: "Discount coupon generation and user assignments" },
      { name: "Notifications", description: "Push, Email, and In-App notification management" },
      { name: "Email Templates", description: "Dynamic system email templates and keywords" },
      { name: "CMS & Static Content", description: "Static pages and CMS page management" },
      { name: "FAQs", description: "Frequently Asked Questions management" },
      { name: "Tutorials", description: "App onboarding tutorial slides" },
      { name: "Awards & Badges", description: "Content awards and recognition badges" },
      { name: "Role & Permission", description: "Sub-admin role definition and permission modules" },
      { name: "Sub-Admins", description: "Sub-admin user accounts and activity logging" },
      { name: "Settings", description: "Platform configuration, free preview, and revenue sharing" },
      { name: "Utility", description: "AWS S3 presigned URL generation and media upload helpers" },
      { name: "Audit Logs", description: "Administrative action audit trails" },
    ],
    components: {
      securitySchemes: swaggerSchemas.securitySchemes,
      schemas: {
        SuccessResponse: swaggerSchemas.SuccessResponse,
        ErrorResponse: swaggerSchemas.ErrorResponse,
        ValidationErrorResponse: swaggerSchemas.ValidationErrorResponse,
        PaginationMeta: swaggerSchemas.PaginationMeta,
        PaginatedResponse: swaggerSchemas.PaginatedResponse,
        User: swaggerSchemas.User,
        Producer: swaggerSchemas.Producer,
        ContentCategory: swaggerSchemas.ContentCategory,
        Content: swaggerSchemas.Content,
        Season: swaggerSchemas.Season,
        Episode: swaggerSchemas.Episode,
        Coupon: swaggerSchemas.Coupon,
        Notification: swaggerSchemas.Notification,
        EmailTemplate: swaggerSchemas.EmailTemplate,
        CmsPage: swaggerSchemas.CmsPage,
        TutorialSlide: swaggerSchemas.TutorialSlide,
        AwardBadge: swaggerSchemas.AwardBadge,
        Role: swaggerSchemas.Role,
        AuditLog: swaggerSchemas.AuditLog,
        Settings: swaggerSchemas.Settings,
        PresignedUrlRequest: swaggerSchemas.PresignedUrlRequest,
        PresignedUrlResponse: swaggerSchemas.PresignedUrlResponse,
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/docs/admin/*.ts", "./src/docs/admin/*.js", "./src/modules/**/*.ts"],
};

type SwaggerSpec = {
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  [key: string]: any;
};

let cachedSwaggerSpec: SwaggerSpec | null = null;

/**
 * Lazily generate and cache the OpenAPI specification so startup does not scan all docs synchronously.
 */
export const getSwaggerSpec = (): SwaggerSpec => {
  if (!cachedSwaggerSpec) {
    cachedSwaggerSpec = swaggerJsdoc(options) as SwaggerSpec;
  }
  return cachedSwaggerSpec;
};

/**
 * Setup Swagger UI middleware on Express app
 */
export const setupSwagger = (app: Express): void => {
  try {
    let swaggerSetupHandler: RequestHandler | null = null;

    // Serve OpenAPI JSON document
    app.get("/api-docs.json", (req: Request, res: Response) => {
      res.setHeader("Content-Type", "application/json");
      res.send(getSwaggerSpec());
    });

    // Serve Swagger UI lazily on first documentation request
    app.use(
      "/api-docs",
      swaggerUi.serve,
      (req: Request, res: Response, next: NextFunction) => {
        if (!swaggerSetupHandler) {
          swaggerSetupHandler = swaggerUi.setup(getSwaggerSpec(), {
            customCss: ".swagger-ui .topbar { display: none }",
            customSiteTitle: "Uthsava Admin API Documentation",
            swaggerOptions: {
              persistAuthorization: true,
              displayRequestDuration: true,
              filter: true,
            },
          });
        }
        return swaggerSetupHandler(req, res, next);
      },
    );

    logger.info("Swagger documentation UI initialized at /api-docs");
  } catch (error) {
    logger.error("Failed to initialize Swagger UI", error);
  }
};

export default setupSwagger;
