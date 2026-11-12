import { Avatar, AvatarStatus } from "../../../models/avatar.model";
import { config } from "../../../core/config";

/**
 * Helper function to retrieve an avatar image URL from the Avatar category "UserProfile".
 * If an active "UserProfile" avatar category exists and contains images, resolves and returns the image URL.
 *
 * @returns CloudFront URL / Full URL of the UserProfile category avatar image, or null if unavailable.
 */
export async function getDefaultUserProfileAvatarUrl(): Promise<string | null> {
  try {
    const avatarDoc = await Avatar.findOne({
      category: { $regex: new RegExp("^userprofile$", "i") },
      status: AvatarStatus.ACTIVE,
    });

    if (avatarDoc && Array.isArray(avatarDoc.images) && avatarDoc.images.length > 0) {
      const imgKey = avatarDoc.images[0];
      if (!imgKey || imgKey.trim() === "") return null;

      if (imgKey.startsWith("http://") || imgKey.startsWith("https://")) {
        return imgKey;
      }

      const baseUrl = config.aws?.cloudFrontUrl || "";
      return baseUrl ? `${baseUrl}/${imgKey.replace(/^\/+/, "")}` : imgKey;
    }

    return null;
  } catch (error) {
    return null;
  }
}
