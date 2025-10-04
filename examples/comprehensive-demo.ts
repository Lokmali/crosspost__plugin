/**
 * Comprehensive demo showcasing all crosspost plugin features
 */

import CrosspostSDK, {
  type PlatformConfig,
  type PostContent,
} from "../src/standalone";
import {
  validatePostContent,
  sanitizePostContent,
} from "../src/utils/validation";
import { withRetry } from "../src/utils/retry";
import { uploadMedia } from "../src/utils/media";

// Example configuration for all supported platforms
const platformConfigs: PlatformConfig[] = [
  {
    platform: "twitter",
    enabled: true,
    credentials: {
      apiKey: process.env.TWITTER_API_KEY || "your-twitter-api-key",
      apiSecret: process.env.TWITTER_API_SECRET || "your-twitter-api-secret",
      accessToken:
        process.env.TWITTER_ACCESS_TOKEN || "your-twitter-access-token",
      accessTokenSecret:
        process.env.TWITTER_ACCESS_TOKEN_SECRET ||
        "your-twitter-access-token-secret",
    },
  },
  {
    platform: "linkedin",
    enabled: true,
    credentials: {
      accessToken:
        process.env.LINKEDIN_ACCESS_TOKEN || "your-linkedin-access-token",
    },
  },
  {
    platform: "facebook",
    enabled: true,
    credentials: {
      accessToken:
        process.env.FACEBOOK_ACCESS_TOKEN || "your-facebook-access-token",
      pageId: process.env.FACEBOOK_PAGE_ID || "your-facebook-page-id",
    },
  },
  {
    platform: "instagram",
    enabled: true,
    credentials: {
      accessToken:
        process.env.INSTAGRAM_ACCESS_TOKEN || "your-instagram-access-token",
      instagramAccountId:
        process.env.INSTAGRAM_ACCOUNT_ID || "your-instagram-account-id",
    },
  },
  {
    platform: "mastodon",
    enabled: true,
    credentials: {
      accessToken:
        process.env.MASTODON_ACCESS_TOKEN || "your-mastodon-access-token",
      instanceUrl:
        process.env.MASTODON_INSTANCE_URL || "https://mastodon.social",
    },
  },
  {
    platform: "bluesky",
    enabled: true,
    credentials: {
      identifier: process.env.BLUESKY_IDENTIFIER || "your-handle.bsky.social",
      password: process.env.BLUESKY_PASSWORD || "your-bluesky-password",
    },
  },
];

// Initialize the SDK
const crosspost = new CrosspostSDK(platformConfigs);

// Demo functions

export async function demoBasicPosting() {
  console.log("🚀 Demo: Basic Cross-Platform Posting");
  console.log("=====================================");

  const content: PostContent = {
    text: "Hello from the Crosspost Plugin! 🌟 This message is being posted across multiple social media platforms simultaneously.",
    hashtags: ["crosspost", "socialmedia", "automation", "demo"],
    links: ["https://github.com/your-repo/crosspost-plugin"],
  };

  try {
    // Validate and sanitize content
    validatePostContent(content);
    const sanitizedContent = sanitizePostContent(content);

    console.log("📝 Content to post:", sanitizedContent);

    // Post to all platforms
    const results = await crosspost.postToAll(sanitizedContent);

    console.log("\n📊 Results:");
    results.forEach((result) => {
      console.log(
        `  ${result.platform}: ${result.success ? "✅ SUCCESS" : "❌ FAILED"}`,
      );
      if (result.success) {
        console.log(`    Post ID: ${result.postId}`);
        console.log(`    URL: ${result.url}`);
      } else {
        console.log(`    Error: ${result.error}`);
      }
    });

    const successCount = results.filter((r) => r.success).length;
    console.log(
      `\n🎉 Successfully posted to ${successCount}/${results.length} platforms!`,
    );

    return results;
  } catch (error) {
    console.error("❌ Failed to post:", error);
    throw error;
  }
}

export async function demoScheduledPosting() {
  console.log("\n⏰ Demo: Scheduled Posting");
  console.log("===========================");

  const content: PostContent = {
    text: "This is a scheduled post that was created in advance! Perfect for maintaining consistent social media presence.",
    hashtags: ["scheduled", "automation", "planning"],
  };

  try {
    // Schedule for 2 minutes from now
    const scheduledAt = Date.now() + 2 * 60 * 1000;

    console.log(
      `📅 Scheduling post for: ${new Date(scheduledAt).toISOString()}`,
    );

    const scheduledPost = await crosspost.schedulePost(
      content,
      ["twitter", "linkedin", "mastodon"],
      scheduledAt,
    );

    console.log(`✅ Post scheduled with ID: ${scheduledPost.id}`);
    console.log(`📋 Status: ${scheduledPost.status}`);
    console.log(`🎯 Target platforms: ${scheduledPost.platforms.join(", ")}`);

    // Demonstrate getting scheduled posts
    const allScheduled = crosspost.getScheduledPosts();
    console.log(`\n📋 Total scheduled posts: ${allScheduled.length}`);

    // Demonstrate immediate execution (for demo purposes)
    console.log("\n🚀 Executing scheduled post immediately for demo...");
    const executedPost = await crosspost.executeScheduledPost(scheduledPost.id);

    if (executedPost) {
      console.log(`✅ Post executed successfully!`);
      console.log(`📊 Final status: ${executedPost.status}`);
      if (executedPost.results) {
        executedPost.results.forEach((result) => {
          console.log(`  ${result.platform}: ${result.success ? "✅" : "❌"}`);
        });
      }
    }

    return scheduledPost;
  } catch (error) {
    console.error("❌ Failed to schedule post:", error);
    throw error;
  }
}

export async function demoBulkPosting() {
  console.log("\n📦 Demo: Bulk Posting");
  console.log("======================");

  const posts = [
    {
      content: {
        text: "First post in our bulk operation - showcasing Twitter optimization!",
        hashtags: ["bulk", "twitter", "first"],
      },
      platforms: ["twitter" as const],
    },
    {
      content: {
        text: "Second post targeting LinkedIn with professional content and extended character limit support. This platform is perfect for business updates and professional networking.",
        hashtags: ["bulk", "linkedin", "professional", "business"],
      },
      platforms: ["linkedin" as const],
    },
    {
      content: {
        text: "Third post going to multiple platforms simultaneously! This demonstrates the true power of cross-platform posting.",
        hashtags: ["bulk", "multiplatform", "crosspost"],
      },
      platforms: ["twitter" as const, "mastodon" as const, "bluesky" as const],
    },
  ];

  try {
    console.log(`📝 Preparing to post ${posts.length} items in bulk...`);

    const result = await crosspost.bulkPost(posts);

    console.log("\n📊 Bulk posting results:");
    console.log(`  Total posts: ${result.totalPosts}`);
    console.log(`  Successful: ${result.successCount}`);
    console.log(`  Failed: ${result.failureCount}`);

    result.results.forEach((post, index) => {
      console.log(`\n📄 Post ${index + 1} (ID: ${post.id}):`);
      console.log(`  Platforms: ${post.platforms.join(", ")}`);
      post.results.forEach((platformResult) => {
        console.log(
          `    ${platformResult.platform}: ${platformResult.success ? "✅" : "❌"}`,
        );
        if (!platformResult.success) {
          console.log(`      Error: ${platformResult.error}`);
        }
      });
    });

    return result;
  } catch (error) {
    console.error("❌ Bulk posting failed:", error);
    throw error;
  }
}

export async function demoAnalytics() {
  console.log("\n📈 Demo: Analytics and Insights");
  console.log("================================");

  try {
    // First, post something to get analytics for
    const content: PostContent = {
      text: "Analytics demo post! Let's see how this performs across platforms.",
      hashtags: ["analytics", "insights", "demo"],
    };

    const results = await crosspost.postToAll(content, ["twitter", "linkedin"]);
    const successfulPosts = results.filter((r) => r.success);

    if (successfulPosts.length === 0) {
      console.log("❌ No successful posts to analyze");
      return;
    }

    console.log(`📊 Getting analytics for ${successfulPosts.length} posts...`);

    // Wait a moment to simulate real analytics data
    await new Promise((resolve) => setTimeout(resolve, 1000));

    for (const post of successfulPosts) {
      console.log(
        `\n📈 Analytics for ${post.platform} (Post ID: ${post.postId}):`,
      );

      const analytics = await crosspost.getAnalytics(
        post.postId,
        post.platform,
      );

      if (analytics) {
        console.log(`  👀 Views: ${analytics.views || "N/A"}`);
        console.log(`  ❤️ Likes: ${analytics.likes || "N/A"}`);
        console.log(`  🔄 Shares: ${analytics.shares || "N/A"}`);
        console.log(`  💬 Comments: ${analytics.comments || "N/A"}`);
        console.log(`  🔗 Clicks: ${analytics.clicks || "N/A"}`);
        console.log(
          `  📅 Last updated: ${new Date(analytics.lastUpdated).toISOString()}`,
        );
      } else {
        console.log("  ❌ Analytics not available");
      }
    }

    return successfulPosts;
  } catch (error) {
    console.error("❌ Analytics demo failed:", error);
    throw error;
  }
}

export async function demoHealthAndStats() {
  console.log("\n🏥 Demo: Health Check and Statistics");
  console.log("====================================");

  try {
    // Health check
    console.log("🔍 Performing health check...");
    const health = await crosspost.getHealthStatus();

    console.log(`\n🏥 Overall system status: ${health.status.toUpperCase()}`);
    console.log("📊 Platform health:");
    Object.entries(health.platforms).forEach(([platform, isHealthy]) => {
      console.log(
        `  ${platform}: ${isHealthy ? "✅ Healthy" : "❌ Unhealthy"}`,
      );
    });

    // Statistics
    console.log("\n📊 Getting system statistics...");
    const stats = await crosspost.getStats();

    console.log("\n📈 Overall Statistics:");
    console.log(`  Total posts: ${stats.totalPosts}`);
    console.log(`  Successful posts: ${stats.successfulPosts}`);
    console.log(`  Failed posts: ${stats.failedPosts}`);
    console.log(`  Scheduled posts: ${stats.scheduledPosts}`);

    console.log("\n🎯 Platform Breakdown:");
    Object.entries(stats.platformBreakdown).forEach(([platform, breakdown]) => {
      console.log(`  ${platform}:`);
      console.log(`    Posts: ${breakdown.posts}`);
      console.log(`    Successes: ${breakdown.successes}`);
      console.log(`    Failures: ${breakdown.failures}`);
      if (breakdown.posts > 0) {
        const successRate = (
          (breakdown.successes / breakdown.posts) *
          100
        ).toFixed(1);
        console.log(`    Success rate: ${successRate}%`);
      }
    });

    return { health, stats };
  } catch (error) {
    console.error("❌ Health and stats demo failed:", error);
    throw error;
  }
}

export async function demoErrorHandlingAndRetry() {
  console.log("\n🔄 Demo: Error Handling and Retry Logic");
  console.log("========================================");

  try {
    console.log("🧪 Testing retry logic with simulated failures...");

    // Simulate an operation that fails a few times then succeeds
    let attemptCount = 0;
    const unreliableOperation = async () => {
      attemptCount++;
      console.log(`  Attempt ${attemptCount}...`);

      if (attemptCount < 3) {
        throw new Error(`Simulated failure on attempt ${attemptCount}`);
      }

      return "Success after retries!";
    };

    const result = await withRetry(unreliableOperation, {
      maxRetries: 3,
      baseDelay: 1000,
      retryCondition: (error) => {
        console.log(`  ⚠️ Error occurred: ${error.message}`);
        return true; // Retry all errors for demo
      },
    });

    console.log(`✅ Operation succeeded: ${result}`);
    console.log(`📊 Total attempts: ${attemptCount}`);

    return result;
  } catch (error) {
    console.error("❌ Retry demo failed:", error);
    throw error;
  }
}

export async function demoCredentialValidation() {
  console.log("\n🔐 Demo: Credential Validation");
  console.log("===============================");

  try {
    console.log("🔍 Validating platform credentials...");

    const results = await crosspost.validateAllCredentials();

    console.log("\n📊 Validation Results:");
    Object.entries(results).forEach(([platform, isValid]) => {
      console.log(`  ${platform}: ${isValid ? "✅ Valid" : "❌ Invalid"}`);
    });

    const validPlatforms = Object.values(results).filter(Boolean).length;
    const totalPlatforms = Object.keys(results).length;

    console.log(
      `\n📈 Summary: ${validPlatforms}/${totalPlatforms} platforms have valid credentials`,
    );

    if (validPlatforms === 0) {
      console.log(
        "⚠️ No valid credentials found. Please check your configuration.",
      );
    } else if (validPlatforms < totalPlatforms) {
      console.log(
        "⚠️ Some platforms have invalid credentials. Check your configuration.",
      );
    } else {
      console.log("🎉 All platforms have valid credentials!");
    }

    return results;
  } catch (error) {
    console.error("❌ Credential validation failed:", error);
    throw error;
  }
}

// Main demo runner
export async function runComprehensiveDemo() {
  console.log("🌟 CROSSPOST PLUGIN COMPREHENSIVE DEMO");
  console.log("======================================");
  console.log("This demo showcases all features of the crosspost plugin.\n");

  try {
    // Run all demos in sequence
    await demoCredentialValidation();
    await demoHealthAndStats();
    await demoBasicPosting();
    await demoScheduledPosting();
    await demoBulkPosting();
    await demoAnalytics();
    await demoErrorHandlingAndRetry();

    console.log("\n🎉 COMPREHENSIVE DEMO COMPLETED SUCCESSFULLY!");
    console.log("=============================================");
    console.log(
      "All features have been demonstrated. The crosspost plugin is ready for production use!",
    );
  } catch (error) {
    console.error("\n❌ DEMO FAILED");
    console.error("===============");
    console.error("Error:", error);

    // Still show final stats even if demo failed
    try {
      const stats = await crosspost.getStats();
      console.log("\n📊 Final Statistics:");
      console.log(`  Total posts attempted: ${stats.totalPosts}`);
      console.log(`  Successful posts: ${stats.successfulPosts}`);
      console.log(`  Failed posts: ${stats.failedPosts}`);
    } catch (statsError) {
      console.error("Could not retrieve final statistics:", statsError);
    }
  }
}

// Export the configured SDK instance
export { crosspost };
export default crosspost;

// Run demo if this file is executed directly
if (require.main === module) {
  runComprehensiveDemo().catch(console.error);
}


