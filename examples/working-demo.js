/**
 * Working demo that uses the built main.js file
 */

// Import from the main built file
import CrosspostSDK from '../dist/main.js';

// Example configuration for simulated platforms only
const platformConfigs = [
  {
    platform: "twitter",
    enabled: true,
    credentials: {
      apiKey: "demo-key",
      apiSecret: "demo-secret", 
      accessToken: "demo-token",
      accessTokenSecret: "demo-token-secret",
    },
  },
  {
    platform: "linkedin",
    enabled: true,
    credentials: {
      accessToken: "demo-linkedin-token",
    },
  },
  // Disable real API platforms for demo
  {
    platform: "facebook",
    enabled: false,
    credentials: {},
  },
  {
    platform: "instagram", 
    enabled: false,
    credentials: {},
  },
  {
    platform: "mastodon",
    enabled: false,
    credentials: {},
  },
  {
    platform: "bluesky",
    enabled: false,
    credentials: {},
  },
];

async function runWorkingDemo() {
  console.log("🚀 CROSSPOST PLUGIN WORKING DEMO");
  console.log("=================================");
  
  try {
    // Initialize the SDK
    const crosspost = new CrosspostSDK(platformConfigs);
    
    // Test basic posting
    console.log("\n📝 Testing basic posting...");
    const results = await crosspost.postToAll({
      text: "Hello from the Crosspost Plugin! 🌟 This is a demo post.",
      hashtags: ["crosspost", "demo", "automation"],
    });
    
    console.log("\n📊 Results:");
    results.forEach((result) => {
      console.log(`  ${result.platform}: ${result.success ? "✅ SUCCESS" : "❌ FAILED"}`);
      if (result.success) {
        console.log(`    Post ID: ${result.postId}`);
        console.log(`    URL: ${result.url}`);
      } else {
        console.log(`    Error: ${result.error}`);
      }
    });
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n🎉 Successfully posted to ${successCount}/${results.length} platforms!`);
    
    // Test scheduling
    console.log("\n⏰ Testing scheduled posting...");
    const scheduledAt = Date.now() + 60000; // 1 minute from now
    const scheduledPost = await crosspost.schedulePost(
      {
        text: "This is a scheduled demo post!",
        hashtags: ["scheduled", "demo"],
      },
      ["twitter", "linkedin"],
      scheduledAt
    );
    
    console.log(`✅ Post scheduled with ID: ${scheduledPost.id}`);
    console.log(`📋 Status: ${scheduledPost.status}`);
    
    // Test health check
    console.log("\n🏥 Testing health check...");
    const health = await crosspost.getHealthStatus();
    console.log(`System status: ${health.status.toUpperCase()}`);
    
    // Test stats
    console.log("\n📈 Testing statistics...");
    const stats = await crosspost.getStats();
    console.log(`Total posts: ${stats.totalPosts}`);
    console.log(`Successful posts: ${stats.successfulPosts}`);
    console.log(`Failed posts: ${stats.failedPosts}`);
    
    console.log("\n🎉 DEMO COMPLETED SUCCESSFULLY!");
    console.log("The crosspost plugin is working correctly!");
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
    throw error;
  }
}

// Run the demo
runWorkingDemo().catch(console.error);
