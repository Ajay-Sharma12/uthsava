import jwt from "jsonwebtoken";
import { config } from "../../../core/config";
import { TOKEN_EXPIRY } from "../../../core/constants/app.constants";

/**
 * Token Service
 * Handles token generation, verification, and refresh operations
 */
export class TokenService {
  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const decoded = jwt.verify(
        refreshToken,
        String(config.jwt.refreshSecret || "default_refresh_secret"),
      ) as any;

      // Generate new access token
      const accessToken = jwt.sign(
        {
          _id: decoded._id,
          role: decoded.role,
          email: decoded.email || "",
          firstName: decoded.firstName || "",
          lastName: decoded.lastName || "",
        },
        String(config.jwt.accessSecret || "default_access_secret"),
        { expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN },
      );

      return accessToken;
    } catch {
      throw new Error("Invalid or expired refresh token");
    }
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): any {
    try {
      return jwt.verify(
        token,
        String(config.jwt.accessSecret || "default_access_secret"),
      );
    } catch {
      throw new Error("Invalid or expired access token");
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): any {
    return jwt.decode(token);
  }
}

export default TokenService;
