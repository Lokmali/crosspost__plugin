/**
 * Example usage of the Crosspost SDK
 */

import CrosspostSDK, { type PlatformConfig, type PostContent } from './standalone';

// Example configuration
const platformConfigs: PlatformConfig[] = [
	{
		platform: 'twitter',
		enabled: true,
		credentials: {
			apiKey: 'your-twitter-api-key',
			apiSecret: 'your-twitter-api-secret',
			accessToken: 'your-twitter-access-token',
			accessTokenSecret: 'your-twitter-access-token-secret',
		},
	},
	{
		platform: 'linkedin',
		enabled: true,
		credentials: {
			accessToken: 'your-linkedin-access-token',
		},
	},
];

// Initialize the SDK
const crosspost = new CrosspostSDK(platformConfigs);

// Example usage functions
export async function exampleBasicPost() {
	console.log('=== Basic Post Example ===');
	
	const content: PostContent = {
		text: 'Hello, world! This is a crosspost example using our standalone SDK.',
		hashtags: ['crosspost', 'socialmedia', 'automation'],
		links: ['https://example.com'],
	};

	try {
		const results = await crosspost.postToAll(content);
		
		console.log(`Posted to ${results.length} platforms:`);
		results.forEach(result => {
			console.log(`- ${result.platform}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
			if (result.success) {
				console.log(`  Post ID: ${result.postId}`);
				console.log(`  URL: ${result.url}`);
			} else {
				console.log(`  Error: ${result.error}`);
			}
		});
		
		return results;
	} catch (error) {
		console.error('Failed to post:', error);
		throw error;
	}
}

export async function exampleScheduledPost() {
	console.log('=== Scheduled Post Example ===');
	
	const content: PostContent = {
		text: 'This is a scheduled post that will be published automatically!',
		hashtags: ['scheduled', 'automation'],
	};

	// Schedule for 1 minute from now
	const scheduledAt = Date.now() + (60 * 1000);
	
	try {
		const scheduledPost = await crosspost.schedulePost(
			content,
			['twitter', 'linkedin'],
			scheduledAt
		);
		
		console.log(`Post scheduled with ID: ${scheduledPost.id}`);
		console.log(`Will be posted at: ${new Date(scheduledAt).toISOString()}`);
		
		return scheduledPost;
	} catch (error) {
		console.error('Failed to schedule post:', error);
		throw error;
	}
}

export async function exampleBulkPost() {
	console.log('=== Bulk Post Example ===');
	
	const posts = [
		{
			content: {
				text: 'First post in bulk operation',
				hashtags: ['bulk', 'first'],
			},
			platforms: ['twitter' as const],
		},
		{
			content: {
				text: 'Second post in bulk operation with more detailed content for LinkedIn',
				hashtags: ['bulk', 'second', 'linkedin'],
			},
			platforms: ['linkedin' as const],
		},
		{
			content: {
				text: 'Third post going to all platforms',
				hashtags: ['bulk', 'third', 'everywhere'],
			},
			platforms: ['twitter' as const, 'linkedin' as const],
		},
	];

	try {
		const result = await crosspost.bulkPost(posts);
		
		console.log(`Bulk posted ${result.totalPosts} posts:`);
		console.log(`- Successful: ${result.successCount}`);
		console.log(`- Failed: ${result.failureCount}`);
		
		result.results.forEach((post, index) => {
			console.log(`\nPost ${index + 1}:`);
			console.log(`  ID: ${post.id}`);
			console.log(`  Platforms: ${post.platforms.join(', ')}`);
			post.results.forEach(platformResult => {
				console.log(`  - ${platformResult.platform}: ${platformResult.success ? 'SUCCESS' : 'FAILED'}`);
			});
		});
		
		return result;
	} catch (error) {
		console.error('Failed to bulk post:', error);
		throw error;
	}
}

export async function exampleAnalytics() {
	console.log('=== Analytics Example ===');
	
	// First, post something to get analytics for
	const content: PostContent = {
		text: 'Analytics test post',
		hashtags: ['analytics', 'test'],
	};

	try {
		const results = await crosspost.postToAll(content, ['twitter']);
		const twitterResult = results.find(r => r.platform === 'twitter' && r.success);
		
		if (twitterResult) {
			// Wait a moment, then get analytics
			setTimeout(async () => {
				const analytics = await crosspost.getAnalytics(twitterResult.postId, 'twitter');
				
				if (analytics) {
					console.log(`Analytics for post ${twitterResult.postId}:`);
					console.log(`- Views: ${analytics.views}`);
					console.log(`- Likes: ${analytics.likes}`);
					console.log(`- Shares: ${analytics.shares}`);
					console.log(`- Comments: ${analytics.comments}`);
				}
			}, 1000);
		}
		
		return results;
	} catch (error) {
		console.error('Failed to get analytics:', error);
		throw error;
	}
}

export async function exampleHealthCheck() {
	console.log('=== Health Check Example ===');
	
	try {
		const health = await crosspost.getHealthStatus();
		
		console.log(`Overall status: ${health.status.toUpperCase()}`);
		console.log('Platform status:');
		
		Object.entries(health.platforms).forEach(([platform, isHealthy]) => {
			console.log(`- ${platform}: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
		});
		
		return health;
	} catch (error) {
		console.error('Failed to get health status:', error);
		throw error;
	}
}

export async function exampleStats() {
	console.log('=== Statistics Example ===');
	
	try {
		const stats = await crosspost.getStats();
		
		console.log('Overall Statistics:');
		console.log(`- Total posts: ${stats.totalPosts}`);
		console.log(`- Successful posts: ${stats.successfulPosts}`);
		console.log(`- Failed posts: ${stats.failedPosts}`);
		console.log(`- Scheduled posts: ${stats.scheduledPosts}`);
		
		console.log('\nPlatform Breakdown:');
		Object.entries(stats.platformBreakdown).forEach(([platform, breakdown]) => {
			console.log(`- ${platform}:`);
			console.log(`  Posts: ${breakdown.posts}`);
			console.log(`  Successes: ${breakdown.successes}`);
			console.log(`  Failures: ${breakdown.failures}`);
		});
		
		return stats;
	} catch (error) {
		console.error('Failed to get stats:', error);
		throw error;
	}
}

// Main demo function
export async function runDemo() {
	console.log('🚀 Crosspost SDK Demo Starting...\n');
	
	try {
		// Validate credentials first
		console.log('=== Credential Validation ===');
		const credentialResults = await crosspost.validateAllCredentials();
		console.log('Credential validation results:', credentialResults);
		
		// Run examples
		await exampleHealthCheck();
		console.log('\n');
		
		await exampleBasicPost();
		console.log('\n');
		
		await exampleScheduledPost();
		console.log('\n');
		
		await exampleBulkPost();
		console.log('\n');
		
		await exampleAnalytics();
		console.log('\n');
		
		await exampleStats();
		console.log('\n');
		
		console.log('✅ Demo completed successfully!');
		
	} catch (error) {
		console.error('❌ Demo failed:', error);
	}
}

// Export the configured SDK instance for external use
export { crosspost };
export default crosspost;

