import {
	CommonPluginErrors,
	createPlugin,
	PluginConfigurationError,
} from "every-plugin";
import { Effect, Queue } from "every-plugin/effect";
import { type ContractRouterClient, eventIterator, implement, oc } from "every-plugin/orpc";
import { z } from "every-plugin/zod";
import { 
	CrosspostClient, 
	platformSchema, 
	postContentSchema, 
	postResultSchema, 
	scheduledPostSchema,
	platformConfigSchema,
	analyticsSchema,
	type Platform,
	type PostContent,
	type PostResult,
	type ScheduledPost,
	type PlatformConfig
} from "./client";

// Schema for streaming post events
const postEventSchema = z.object({
	postId: z.string(),
	platform: platformSchema,
	status: z.enum(['queued', 'posting', 'posted', 'failed']),
	result: postResultSchema.optional(),
	timestamp: z.number(),
});

// Schema for bulk post operations
const bulkPostSchema = z.object({
	id: z.string(),
	content: postContentSchema,
	platforms: z.array(platformSchema),
	results: z.array(postResultSchema),
	completedAt: z.number(),
});

// Contract definition for the crosspost plugin
export const crosspostContract = oc.router({
	// Post content immediately to specified platforms
	postNow: oc
		.route({ method: 'POST', path: '/postNow' })
		.input(z.object({
			content: postContentSchema,
			platforms: z.array(platformSchema).optional(), // If not specified, posts to all configured platforms
		}))
		.output(z.object({
			results: z.array(postResultSchema),
			totalPlatforms: z.number(),
			successCount: z.number(),
			failureCount: z.number(),
		}))
		.errors(CommonPluginErrors),

	// Schedule a post for later
	schedulePost: oc
		.route({ method: 'POST', path: '/schedulePost' })
		.input(z.object({
			content: postContentSchema,
			platforms: z.array(platformSchema),
			scheduledAt: z.number(), // Unix timestamp
		}))
		.output(z.object({
			scheduledPost: scheduledPostSchema,
		}))
		.errors(CommonPluginErrors),

	// Get all scheduled posts
	getScheduledPosts: oc
		.route({ method: 'GET', path: '/scheduledPosts' })
		.input(z.object({
			status: z.enum(['pending', 'posted', 'failed', 'cancelled']).optional(),
			limit: z.number().min(1).max(100).default(50).optional(),
		}))
		.output(z.object({
			posts: z.array(scheduledPostSchema),
			total: z.number(),
		}))
		.errors(CommonPluginErrors),

	// Get specific scheduled post
	getScheduledPost: oc
		.route({ method: 'GET', path: '/scheduledPost/{id}' })
		.input(z.object({
			id: z.string(),
		}))
		.output(z.object({
			post: scheduledPostSchema.nullable(),
		}))
		.errors(CommonPluginErrors),

	// Execute a scheduled post immediately
	executeScheduledPost: oc
		.route({ method: 'POST', path: '/executeScheduledPost' })
		.input(z.object({
			id: z.string(),
		}))
		.output(z.object({
			post: scheduledPostSchema.nullable(),
			executed: z.boolean(),
		}))
		.errors(CommonPluginErrors),

	// Cancel a scheduled post
	cancelScheduledPost: oc
		.route({ method: 'DELETE', path: '/scheduledPost/{id}' })
		.input(z.object({
			id: z.string(),
		}))
		.output(z.object({
			cancelled: z.boolean(),
		}))
		.errors(CommonPluginErrors),

	// Get analytics for a specific post
	getPostAnalytics: oc
		.route({ method: 'GET', path: '/analytics/{postId}' })
		.input(z.object({
			postId: z.string(),
			platform: platformSchema,
		}))
		.output(z.object({
			analytics: analyticsSchema.nullable(),
		}))
		.errors(CommonPluginErrors),

	// Get platform status and configuration
	getPlatformStatus: oc
		.route({ method: 'GET', path: '/platforms/status' })
		.output(z.object({
			platforms: z.array(z.object({
				platform: platformSchema,
				configured: z.boolean(),
				credentialsValid: z.boolean(),
				characterLimit: z.number(),
			})),
		}))
		.errors(CommonPluginErrors),

	// Validate platform credentials
	validateCredentials: oc
		.route({ method: 'POST', path: '/platforms/validate' })
		.input(z.object({
			platforms: z.array(platformSchema).optional(),
		}))
		.output(z.object({
			results: z.record(platformSchema, z.boolean()),
		}))
		.errors(CommonPluginErrors),

	// Stream live posting events (useful for real-time UI updates)
	streamPostEvents: oc
		.route({ method: 'POST', path: '/streamPostEvents' })
		.input(z.object({
			platforms: z.array(platformSchema).optional(),
		}))
		.output(eventIterator(postEventSchema))
		.errors(CommonPluginErrors),

	// Bulk post multiple content pieces
	bulkPost: oc
		.route({ method: 'POST', path: '/bulkPost' })
		.input(z.object({
			posts: z.array(z.object({
				content: postContentSchema,
				platforms: z.array(platformSchema),
			})).max(10), // Limit bulk operations
		}))
		.output(z.object({
			results: z.array(bulkPostSchema),
			totalPosts: z.number(),
			successCount: z.number(),
			failureCount: z.number(),
		}))
		.errors(CommonPluginErrors),

	// Get supported platforms
	getSupportedPlatforms: oc
		.route({ method: 'GET', path: '/platforms' })
		.output(z.object({
			platforms: z.array(platformSchema),
		}))
		.errors(CommonPluginErrors),

	// Health check
	healthCheck: oc
		.route({ method: 'GET', path: '/health' })
		.output(z.object({
			status: z.enum(['healthy', 'degraded', 'unhealthy']),
			platforms: z.record(platformSchema, z.boolean()),
			timestamp: z.number(),
		}))
		.errors(CommonPluginErrors),

	// Get plugin statistics
	getStats: oc
		.route({ method: 'GET', path: '/stats' })
		.output(z.object({
			totalPosts: z.number(),
			successfulPosts: z.number(),
			failedPosts: z.number(),
			scheduledPosts: z.number(),
			platformBreakdown: z.record(platformSchema, z.object({
				posts: z.number(),
				successes: z.number(),
				failures: z.number(),
			})),
		}))
		.errors(CommonPluginErrors),
});

// Export the client type for typed oRPC clients
export type CrosspostPluginClient = ContractRouterClient<typeof crosspostContract>;

// Create the crosspost plugin
export default createPlugin({
	id: "crosspost-plugin",
	type: "action", // This is an action plugin that performs operations
	variables: z.object({
		// Global settings
		defaultPlatforms: z.array(platformSchema).default([]).optional(),
		enableScheduling: z.boolean().default(true).optional(),
		maxScheduledPosts: z.number().min(1).max(1000).default(100).optional(),
		
		// Rate limiting
		rateLimitPerMinute: z.number().min(1).max(60).default(10).optional(),
		rateLimitPerHour: z.number().min(1).max(300).default(100).optional(),
		
		// Retry settings
		maxRetries: z.number().min(0).max(5).default(3).optional(),
		retryDelayMs: z.number().min(1000).max(60000).default(5000).optional(),
		
		// Analytics
		enableAnalytics: z.boolean().default(true).optional(),
		analyticsRetentionDays: z.number().min(1).max(365).default(30).optional(),
	}),
	secrets: z.object({
		// Platform configurations - each platform can have multiple credential fields
		platforms: z.array(platformConfigSchema),
	}),
	contract: crosspostContract,
	initialize: (config) =>
		Effect.gen(function* () {
			// Validate platform configurations
			const platformConfigs = config.secrets.platforms;
			
			if (!platformConfigs || platformConfigs.length === 0) {
				yield* Effect.fail(new PluginConfigurationError({
					message: "At least one platform must be configured",
					retryable: false
				}));
			}

			// Initialize crosspost client
			const client = new CrosspostClient(platformConfigs);

			// Validate all platform credentials
			const credentialResults = yield* Effect.tryPromise({
				try: () => client.validateAllCredentials(),
				catch: (error) => new Error(`Failed to validate credentials: ${error instanceof Error ? error.message : String(error)}`)
			});

			// Check if at least one platform is properly configured
			const validPlatforms = Object.values(credentialResults).filter(Boolean);
			if (validPlatforms.length === 0) {
				yield* Effect.fail(new PluginConfigurationError({
					message: "No platforms have valid credentials configured",
					retryable: true
				}));
			}

			// Create event queue for streaming
			const eventQueue = yield* Effect.acquireRelease(
				Queue.bounded<typeof postEventSchema._type>(1000),
				(q) => Queue.shutdown(q)
			);

			// Initialize statistics tracking
			const stats = {
				totalPosts: 0,
				successfulPosts: 0,
				failedPosts: 0,
				platformBreakdown: new Map<Platform, { posts: number; successes: number; failures: number }>(),
			};

			// Initialize platform breakdown stats
			for (const platform of client.getSupportedPlatforms()) {
				stats.platformBreakdown.set(platform, { posts: 0, successes: 0, failures: 0 });
			}

			// Start scheduled post processor if scheduling is enabled
			if (config.variables.enableScheduling) {
				yield* Effect.forkScoped(
					Effect.gen(function* () {
						while (true) {
							// Check for scheduled posts that need to be executed
							const scheduledPosts = client.getScheduledPosts();
							const now = Date.now();
							
							for (const post of scheduledPosts) {
								if (post.status === 'pending' && post.scheduledAt <= now) {
									try {
										yield* Effect.tryPromise(() => client.executeScheduledPost(post.id));
									} catch (error) {
										console.error(`Failed to execute scheduled post ${post.id}:`, error);
									}
								}
							}

							// Wait 30 seconds before checking again
							yield* Effect.tryPromise(() =>
								new Promise(resolve => setTimeout(resolve, 30000))
							);
						}
					})
				);
			}

			console.log(`[CrosspostPlugin] Initialized with ${validPlatforms.length} valid platform(s)`);

			// Return context object
			return {
				client,
				eventQueue,
				stats,
				credentialResults
			};
		}),
	createRouter: (context) => {
		const { client, eventQueue, stats, credentialResults } = context;
		const os = implement(crosspostContract).$context<typeof context>();

		// Helper function to update stats
		const updateStats = (results: PostResult[]) => {
			stats.totalPosts += results.length;
			
			for (const result of results) {
				const platformStats = stats.platformBreakdown.get(result.platform);
				if (platformStats) {
					platformStats.posts++;
					if (result.success) {
						stats.successfulPosts++;
						platformStats.successes++;
					} else {
						stats.failedPosts++;
						platformStats.failures++;
					}
				}
			}
		};

		// Post content immediately
		const postNow = os.postNow.handler(async ({ input }) => {
			const platforms = input.platforms || client.getSupportedPlatforms();
			const results = await client.postToAll(input.content, platforms);
			
			updateStats(results);
			
			return {
				results,
				totalPlatforms: platforms.length,
				successCount: results.filter(r => r.success).length,
				failureCount: results.filter(r => !r.success).length,
			};
		});

		// Schedule a post
		const schedulePost = os.schedulePost.handler(async ({ input }) => {
			const scheduledPost = await client.schedulePost(
				input.content,
				input.platforms,
				input.scheduledAt
			);
			
			return { scheduledPost };
		});

		// Get scheduled posts
		const getScheduledPosts = os.getScheduledPosts.handler(async ({ input }) => {
			let posts = client.getScheduledPosts();
			
			if (input.status) {
				posts = posts.filter(p => p.status === input.status);
			}
			
			const limit = input.limit || 50;
			const total = posts.length;
			posts = posts.slice(0, limit);
			
			return { posts, total };
		});

		// Get specific scheduled post
		const getScheduledPost = os.getScheduledPost.handler(async ({ input }) => {
			const post = client.getScheduledPost(input.id);
			return { post };
		});

		// Execute scheduled post
		const executeScheduledPost = os.executeScheduledPost.handler(async ({ input }) => {
			const post = await client.executeScheduledPost(input.id);
			
			if (post && post.results) {
				updateStats(post.results);
			}
			
			return {
				post,
				executed: !!post,
			};
		});

		// Cancel scheduled post
		const cancelScheduledPost = os.cancelScheduledPost.handler(async ({ input }) => {
			const cancelled = await client.cancelScheduledPost(input.id);
			return { cancelled };
		});

		// Get post analytics
		const getPostAnalytics = os.getPostAnalytics.handler(async ({ input }) => {
			const analytics = await client.getAnalytics(input.postId, input.platform);
			return { analytics };
		});

		// Get platform status
		const getPlatformStatus = os.getPlatformStatus.handler(async () => {
			const platforms = client.getSupportedPlatforms().map(platform => ({
				platform,
				configured: client.isPlatformConfigured(platform),
				credentialsValid: credentialResults[platform] || false,
				characterLimit: platform === 'twitter' ? 280 : platform === 'linkedin' ? 3000 : 1000,
			}));
			
			return { platforms };
		});

		// Validate credentials
		const validateCredentials = os.validateCredentials.handler(async ({ input }) => {
			const platforms = input.platforms || client.getSupportedPlatforms();
			const results: Record<string, boolean> = {};
			
			for (const platform of platforms) {
				results[platform] = credentialResults[platform] || false;
			}
			
			return { results: results as Record<Platform, boolean> };
		});

		// Stream post events
		const streamPostEvents = os.streamPostEvents.handler(async function* ({ input }) {
			// This is a simplified implementation
			// In a real scenario, you'd want to emit events during actual posting operations
			const platforms = input.platforms || client.getSupportedPlatforms();
			
			for (const platform of platforms) {
				yield {
					postId: `demo_${Date.now()}`,
					platform,
					status: 'queued' as const,
					timestamp: Date.now(),
				};
				
				// Simulate some delay
				await new Promise(resolve => setTimeout(resolve, 100));
			}
		});

		// Bulk post
		const bulkPost = os.bulkPost.handler(async ({ input }) => {
			const results: typeof bulkPostSchema._type[] = [];
			let successCount = 0;
			let failureCount = 0;
			
			for (const post of input.posts) {
				const postResults = await client.postToAll(post.content, post.platforms);
				updateStats(postResults);
				
				const bulkResult = {
					id: `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					content: post.content,
					platforms: post.platforms,
					results: postResults,
					completedAt: Date.now(),
				};
				
				results.push(bulkResult);
				
				if (postResults.every(r => r.success)) {
					successCount++;
				} else {
					failureCount++;
				}
			}
			
			return {
				results,
				totalPosts: input.posts.length,
				successCount,
				failureCount,
			};
		});

		// Get supported platforms
		const getSupportedPlatforms = os.getSupportedPlatforms.handler(async () => {
			const platforms = client.getSupportedPlatforms();
			return { platforms };
		});

		// Health check
		const healthCheck = os.healthCheck.handler(async () => {
			const platforms: Record<string, boolean> = {};
			let healthyCount = 0;
			
			for (const platform of client.getSupportedPlatforms()) {
				const isHealthy = client.isPlatformConfigured(platform) && credentialResults[platform];
				platforms[platform] = isHealthy;
				if (isHealthy) healthyCount++;
			}
			
			const totalPlatforms = client.getSupportedPlatforms().length;
			let status: 'healthy' | 'degraded' | 'unhealthy';
			
			if (healthyCount === totalPlatforms) {
				status = 'healthy';
			} else if (healthyCount > 0) {
				status = 'degraded';
			} else {
				status = 'unhealthy';
			}
			
			return {
				status,
				platforms: platforms as Record<Platform, boolean>,
				timestamp: Date.now(),
			};
		});

		// Get statistics
		const getStats = os.getStats.handler(async () => {
			const platformBreakdown: Record<string, { posts: number; successes: number; failures: number }> = {};
			
			for (const [platform, breakdown] of stats.platformBreakdown) {
				platformBreakdown[platform] = breakdown;
			}
			
			return {
				totalPosts: stats.totalPosts,
				successfulPosts: stats.successfulPosts,
				failedPosts: stats.failedPosts,
				scheduledPosts: client.getScheduledPosts().length,
				platformBreakdown: platformBreakdown as Record<Platform, { posts: number; successes: number; failures: number }>,
			};
		});

		// Return the oRPC router
		return os.router({
			postNow,
			schedulePost,
			getScheduledPosts,
			getScheduledPost,
			executeScheduledPost,
			cancelScheduledPost,
			getPostAnalytics,
			getPlatformStatus,
			validateCredentials,
			streamPostEvents,
			bulkPost,
			getSupportedPlatforms,
			healthCheck,
			getStats,
		});
	}
});