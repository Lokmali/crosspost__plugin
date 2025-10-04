/**
 * Input validation and sanitization utilities
 */

import { PostContent, Platform } from "../client";

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validatePostContent(content: PostContent): void {
  if (!content) {
    throw new ValidationError("Content is required");
  }

  if (!content.text || typeof content.text !== "string") {
    throw new ValidationError(
      "Text content is required and must be a string",
      "text",
    );
  }

  if (content.text.trim().length === 0) {
    throw new ValidationError("Text content cannot be empty", "text");
  }

  if (content.text.length > 10000) {
    throw new ValidationError(
      "Text content exceeds maximum length of 10,000 characters",
      "text",
    );
  }

  // Validate hashtags
  if (content.hashtags) {
    if (!Array.isArray(content.hashtags)) {
      throw new ValidationError("Hashtags must be an array", "hashtags");
    }

    if (content.hashtags.length > 30) {
      throw new ValidationError("Maximum 30 hashtags allowed", "hashtags");
    }

    for (const hashtag of content.hashtags) {
      if (typeof hashtag !== "string") {
        throw new ValidationError("All hashtags must be strings", "hashtags");
      }

      if (hashtag.length > 100) {
        throw new ValidationError(
          "Hashtag too long (max 100 characters)",
          "hashtags",
        );
      }

      // Check for invalid characters
      if (!/^[a-zA-Z0-9_]+$/.test(hashtag.replace(/^#/, ""))) {
        throw new ValidationError(
          `Invalid hashtag format: ${hashtag}`,
          "hashtags",
        );
      }
    }
  }

  // Validate links
  if (content.links) {
    if (!Array.isArray(content.links)) {
      throw new ValidationError("Links must be an array", "links");
    }

    if (content.links.length > 10) {
      throw new ValidationError("Maximum 10 links allowed", "links");
    }

    for (const link of content.links) {
      if (typeof link !== "string") {
        throw new ValidationError("All links must be strings", "links");
      }

      try {
        new URL(link);
      } catch {
        throw new ValidationError(`Invalid URL format: ${link}`, "links");
      }
    }
  }

  // Validate mentions
  if (content.mentions) {
    if (!Array.isArray(content.mentions)) {
      throw new ValidationError("Mentions must be an array", "mentions");
    }

    if (content.mentions.length > 20) {
      throw new ValidationError("Maximum 20 mentions allowed", "mentions");
    }

    for (const mention of content.mentions) {
      if (typeof mention !== "string") {
        throw new ValidationError("All mentions must be strings", "mentions");
      }

      if (mention.length > 50) {
        throw new ValidationError(
          "Mention too long (max 50 characters)",
          "mentions",
        );
      }
    }
  }

  // Validate images
  if (content.images) {
    if (!Array.isArray(content.images)) {
      throw new ValidationError("Images must be an array", "images");
    }

    if (content.images.length > 4) {
      throw new ValidationError("Maximum 4 images allowed", "images");
    }

    for (const image of content.images) {
      if (typeof image !== "string") {
        throw new ValidationError(
          "All images must be strings (URLs or base64)",
          "images",
        );
      }

      // Check if it's a URL or base64
      if (!image.startsWith("data:image/") && !isValidUrl(image)) {
        throw new ValidationError(
          "Images must be valid URLs or base64 data URLs",
          "images",
        );
      }
    }
  }
}

export function validatePlatforms(platforms: Platform[]): void {
  if (!Array.isArray(platforms)) {
    throw new ValidationError("Platforms must be an array");
  }

  if (platforms.length === 0) {
    throw new ValidationError("At least one platform must be specified");
  }

  if (platforms.length > 10) {
    throw new ValidationError("Maximum 10 platforms allowed");
  }

  const validPlatforms: Platform[] = [
    "twitter",
    "linkedin",
    "facebook",
    "instagram",
    "mastodon",
    "bluesky",
  ];

  for (const platform of platforms) {
    if (!validPlatforms.includes(platform)) {
      throw new ValidationError(
        `Invalid platform: ${platform}. Valid platforms are: ${validPlatforms.join(", ")}`,
      );
    }
  }

  // Check for duplicates
  const uniquePlatforms = new Set(platforms);
  if (uniquePlatforms.size !== platforms.length) {
    throw new ValidationError("Duplicate platforms are not allowed");
  }
}

export function validateScheduledAt(scheduledAt: number): void {
  if (typeof scheduledAt !== "number") {
    throw new ValidationError(
      "Scheduled time must be a number (Unix timestamp)",
    );
  }

  if (scheduledAt <= Date.now()) {
    throw new ValidationError("Scheduled time must be in the future");
  }

  // Don't allow scheduling more than 1 year in advance
  const oneYearFromNow = Date.now() + 365 * 24 * 60 * 60 * 1000;
  if (scheduledAt > oneYearFromNow) {
    throw new ValidationError(
      "Cannot schedule posts more than 1 year in advance",
    );
  }
}

export function sanitizeText(text: string): string {
  if (typeof text !== "string") {
    return "";
  }

  // Remove null bytes and control characters (except newlines and tabs)
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

export function sanitizeHashtags(hashtags: string[]): string[] {
  if (!Array.isArray(hashtags)) {
    return [];
  }

  return hashtags
    .filter((tag) => typeof tag === "string" && tag.trim().length > 0)
    .map((tag) => {
      // Remove any characters that aren't alphanumeric or underscore
      let clean = tag.replace(/[^a-zA-Z0-9_#]/g, "");

      // Ensure it starts with # if it doesn't already
      if (!clean.startsWith("#")) {
        clean = "#" + clean;
      }

      return clean;
    })
    .filter((tag) => tag.length > 1) // Remove empty or just '#' tags
    .slice(0, 30); // Limit to 30 hashtags
}

export function sanitizeLinks(links: string[]): string[] {
  if (!Array.isArray(links)) {
    return [];
  }

  return links
    .filter((link) => typeof link === "string" && isValidUrl(link))
    .slice(0, 10); // Limit to 10 links
}

export function sanitizeMentions(mentions: string[]): string[] {
  if (!Array.isArray(mentions)) {
    return [];
  }

  return mentions
    .filter(
      (mention) => typeof mention === "string" && mention.trim().length > 0,
    )
    .map((mention) => {
      // Remove any characters that might be problematic
      return mention.replace(/[<>\"'&]/g, "").trim();
    })
    .filter((mention) => mention.length > 0 && mention.length <= 50)
    .slice(0, 20); // Limit to 20 mentions
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

export function sanitizePostContent(content: PostContent): PostContent {
  return {
    text: sanitizeText(content.text),
    hashtags: content.hashtags ? sanitizeHashtags(content.hashtags) : undefined,
    links: content.links ? sanitizeLinks(content.links) : undefined,
    mentions: content.mentions ? sanitizeMentions(content.mentions) : undefined,
    images: content.images
      ? content.images
          .filter(
            (img) =>
              typeof img === "string" &&
              (img.startsWith("data:image/") || isValidUrl(img)),
          )
          .slice(0, 4)
      : undefined,
  };
}


