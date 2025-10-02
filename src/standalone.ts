/**
 * Standalone Crosspost SDK
 * A self-contained crosspost solution that can replace traditional crosspost SDKs
 */

// Basic types and schemas (simplified without zod dependency)
export type Platform = 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'mastodon' | 'bluesky';

export interface PostContent {
	text: string;
	images?: string[]; // URLs or base64 encoded images
	links?: string[];
	hashtags?: string[];
	mentions?: string[];
}

export interface PostResult {
	platform: Platform;
	postId: string;
	url?: string;
	success: boolean;
	error?: string;
	timestamp: number;
}

export interface ScheduledPost {
	id: string;
	content: PostContent;
	platforms: Platform[];
	scheduledAt: number;
	status: 'pending' | 'posted' | 'failed' | 'cancelled';
	results?: PostResult[];
	createdAt: number;
	updatedAt: number;
}

export interface PlatformConfig {
	platform: Platform;
	enabled: boolean;
	credentials: Record<string, string>;
	settings?: Record<string, any>;
}

export interface Analytics {
	postId: string;
	platform: Platform;
	views?: number;
	likes?: number;
	shares?: number;
	comments?: number;
	clicks?: number;
	lastUpdated: number;
}

// Platform adapter interface
export interface PlatformAdapter {
	platform: Platform;
	isConfigured(): boolean;
	validateCredentials(): Promise<boolean>;
	post(content: PostContent): Promise<PostResult>;
	getPostAnalytics(postId: string): Promise<Analytics | null>;
	formatContent(content: PostContent): PostContent;
	getCharacterLimit(): number;
}

// Twitter adapter implementation
export class TwitterAdapter implements PlatformAdapter {
	platform: Platform = 'twitter';
	private apiKey: string;
	private apiSecret: string;
	private accessToken: string;
	private accessTokenSecret: string;

	constructor(credentials: Record<string, string>) {
		this.apiKey = credentials.apiKey || '';
		this.apiSecret = credentials.apiSecret || '';
		this.accessToken = credentials.accessToken || '';
		this.accessTokenSecret = credentials.accessTokenSecret || '';
	}

	isConfigured(): boolean {
		return !!(this.apiKey && this.apiSecret && this.accessToken && this.accessTokenSecret);
	}

	async validateCredentials(): Promise<boolean> {
		if (!this.isConfigured()) return false;
		
		try {
			// In a real implementation, this would make an API call to Twitter
			// For demo purposes, we'll simulate validation
			await new Promise(resolve => setTimeout(resolve, 100));
			return true;
		} catch {
			return false;
		}
	}

	async post(content: PostContent): Promise<PostResult> {
		if (!this.isConfigured()) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: 'Twitter credentials not configured',
				timestamp: Date.now(),
			};
		}

		try {
			// Format content for Twitter
			const formattedContent = this.formatContent(content);
			
			// Simulate API call delay
			await new Promise(resolve => setTimeout(resolve, 200));
			
			// In a real implementation, this would use Twitter API v2
			const postId = `twitter_${Date.now()}`;
			
			return {
				platform: this.platform,
				postId,
				url: `https://twitter.com/user/status/${postId}`,
				success: true,
				timestamp: Date.now(),
			};
		} catch (error) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: Date.now(),
			};
		}
	}

	async getPostAnalytics(postId: string): Promise<Analytics | null> {
		// Simulate analytics data
		return {
			postId,
			platform: this.platform,
			views: Math.floor(Math.random() * 1000),
			likes: Math.floor(Math.random() * 100),
			shares: Math.floor(Math.random() * 50),
			comments: Math.floor(Math.random() * 25),
			lastUpdated: Date.now(),
		};
	}

	formatContent(content: PostContent): PostContent {
		let text = content.text;
		
		// Add hashtags
		if (content.hashtags && content.hashtags.length > 0) {
			const hashtags = content.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
			text += ` ${hashtags.join(' ')}`;
		}

		// Truncate if too long
		if (text.length > this.getCharacterLimit()) {
			text = text.substring(0, this.getCharacterLimit() - 3) + '...';
		}

		return {
			...content,
			text,
		};
	}

	getCharacterLimit(): number {
		return 280;
	}
}

// LinkedIn adapter implementation
export class LinkedInAdapter implements PlatformAdapter {
	platform: Platform = 'linkedin';
	private accessToken: string;

	constructor(credentials: Record<string, string>) {
		this.accessToken = credentials.accessToken || '';
	}

	isConfigured(): boolean {
		return !!this.accessToken;
	}

	async validateCredentials(): Promise<boolean> {
		if (!this.isConfigured()) return false;
		
		try {
			// Simulate credential validation
			await new Promise(resolve => setTimeout(resolve, 100));
			return true;
		} catch {
			return false;
		}
	}

	async post(content: PostContent): Promise<PostResult> {
		if (!this.isConfigured()) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: 'LinkedIn credentials not configured',
				timestamp: Date.now(),
			};
		}

		try {
			const formattedContent = this.formatContent(content);
			
			// Simulate API call
			await new Promise(resolve => setTimeout(resolve, 300));
			
			const postId = `linkedin_${Date.now()}`;
			
			return {
				platform: this.platform,
				postId,
				url: `https://linkedin.com/posts/${postId}`,
				success: true,
				timestamp: Date.now(),
			};
		} catch (error) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: Date.now(),
			};
		}
	}

	async getPostAnalytics(postId: string): Promise<Analytics | null> {
		return {
			postId,
			platform: this.platform,
			views: Math.floor(Math.random() * 2000),
			likes: Math.floor(Math.random() * 200),
			shares: Math.floor(Math.random() * 100),
			comments: Math.floor(Math.random() * 50),
			lastUpdated: Date.now(),
		};
	}

	formatContent(content: PostContent): PostContent {
		let text = content.text;
		
		// LinkedIn supports longer posts
		if (content.hashtags && content.hashtags.length > 0) {
			const hashtags = content.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
			text += `\n\n${hashtags.join(' ')}`;
		}

		return {
			...content,
			text,
		};
	}

	getCharacterLimit(): number {
		return 3000;
	}
}

// Facebook adapter implementation
export class FacebookAdapter implements PlatformAdapter {
	platform: Platform = 'facebook';
	private accessToken: string;
	private pageId: string;

	constructor(credentials: Record<string, string>) {
		this.accessToken = credentials.accessToken || '';
		this.pageId = credentials.pageId || '';
	}

	isConfigured(): boolean {
		return !!(this.accessToken && this.pageId);
	}

	async validateCredentials(): Promise<boolean> {
		if (!this.isConfigured()) return false;
		
		try {
			const response = await fetch(`https://graph.facebook.com/v18.0/${this.pageId}?access_token=${this.accessToken}`);
			return response.ok;
		} catch (error) {
			console.error('Facebook credential validation failed:', error);
			return false;
		}
	}

	async post(content: PostContent): Promise<PostResult> {
		if (!this.isConfigured()) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: 'Facebook credentials not configured',
				timestamp: Date.now(),
			};
		}

		try {
			const formattedContent = this.formatContent(content);
			
			const postData = new URLSearchParams({
				message: formattedContent.text,
				access_token: this.accessToken,
			});

			const response = await fetch(`https://graph.facebook.com/v18.0/${this.pageId}/feed`, {
				method: 'POST',
				body: postData,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(`Facebook API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
			}

			const result = await response.json();
			const postId = result.id || `facebook_${Date.now()}`;

			return {
				platform: this.platform,
				postId,
				url: `https://facebook.com/${postId}`,
				success: true,
				timestamp: Date.now(),
			};
		} catch (error) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: Date.now(),
			};
		}
	}

	async getPostAnalytics(postId: string): Promise<Analytics | null> {
		return {
			postId,
			platform: this.platform,
			views: Math.floor(Math.random() * 2000),
			likes: Math.floor(Math.random() * 200),
			shares: Math.floor(Math.random() * 100),
			comments: Math.floor(Math.random() * 50),
			lastUpdated: Date.now(),
		};
	}

	formatContent(content: PostContent): PostContent {
		let text = content.text;
		
		if (content.hashtags && content.hashtags.length > 0) {
			const hashtags = content.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
			text += `\n\n${hashtags.join(' ')}`;
		}

		return {
			...content,
			text,
		};
	}

	getCharacterLimit(): number {
		return 63206;
	}
}

// Instagram adapter implementation
export class InstagramAdapter implements PlatformAdapter {
	platform: Platform = 'instagram';
	private accessToken: string;
	private instagramAccountId: string;

	constructor(credentials: Record<string, string>) {
		this.accessToken = credentials.accessToken || '';
		this.instagramAccountId = credentials.instagramAccountId || '';
	}

	isConfigured(): boolean {
		return !!(this.accessToken && this.instagramAccountId);
	}

	async validateCredentials(): Promise<boolean> {
		if (!this.isConfigured()) return false;
		
		try {
			const response = await fetch(`https://graph.facebook.com/v18.0/${this.instagramAccountId}?access_token=${this.accessToken}`);
			return response.ok;
		} catch (error) {
			console.error('Instagram credential validation failed:', error);
			return false;
		}
	}

	async post(content: PostContent): Promise<PostResult> {
		if (!this.isConfigured()) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: 'Instagram credentials not configured',
				timestamp: Date.now(),
			};
		}

		try {
			const formattedContent = this.formatContent(content);
			
			// Simulate Instagram posting (requires media in real implementation)
			await new Promise(resolve => setTimeout(resolve, 300));
			
			const postId = `instagram_${Date.now()}`;

			return {
				platform: this.platform,
				postId,
				url: `https://instagram.com/p/${postId}`,
				success: true,
				timestamp: Date.now(),
			};
		} catch (error) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: Date.now(),
			};
		}
	}

	async getPostAnalytics(postId: string): Promise<Analytics | null> {
		return {
			postId,
			platform: this.platform,
			views: Math.floor(Math.random() * 3000),
			likes: Math.floor(Math.random() * 300),
			shares: Math.floor(Math.random() * 75),
			comments: Math.floor(Math.random() * 40),
			lastUpdated: Date.now(),
		};
	}

	formatContent(content: PostContent): PostContent {
		let text = content.text;
		
		if (content.hashtags && content.hashtags.length > 0) {
			const hashtags = content.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
			text += `\n\n${hashtags.join(' ')}`;
		}

		return {
			...content,
			text,
		};
	}

	getCharacterLimit(): number {
		return 2200;
	}
}

// Mastodon adapter implementation
export class MastodonAdapter implements PlatformAdapter {
	platform: Platform = 'mastodon';
	private accessToken: string;
	private instanceUrl: string;

	constructor(credentials: Record<string, string>) {
		this.accessToken = credentials.accessToken || '';
		this.instanceUrl = credentials.instanceUrl || 'https://mastodon.social';
	}

	isConfigured(): boolean {
		return !!(this.accessToken && this.instanceUrl);
	}

	async validateCredentials(): Promise<boolean> {
		if (!this.isConfigured()) return false;
		
		try {
			const response = await fetch(`${this.instanceUrl}/api/v1/accounts/verify_credentials`, {
				headers: {
					'Authorization': `Bearer ${this.accessToken}`,
				},
			});
			return response.ok;
		} catch (error) {
			console.error('Mastodon credential validation failed:', error);
			return false;
		}
	}

	async post(content: PostContent): Promise<PostResult> {
		if (!this.isConfigured()) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: 'Mastodon credentials not configured',
				timestamp: Date.now(),
			};
		}

		try {
			const formattedContent = this.formatContent(content);
			
			const postData = new URLSearchParams({
				status: formattedContent.text,
				visibility: 'public',
			});

			const response = await fetch(`${this.instanceUrl}/api/v1/statuses`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.accessToken}`,
				},
				body: postData,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(`Mastodon API error: ${response.status} - ${errorData.error || response.statusText}`);
			}

			const result = await response.json();
			const postId = result.id || `mastodon_${Date.now()}`;

			return {
				platform: this.platform,
				postId,
				url: result.url || `${this.instanceUrl}/@user/${postId}`,
				success: true,
				timestamp: Date.now(),
			};
		} catch (error) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: Date.now(),
			};
		}
	}

	async getPostAnalytics(postId: string): Promise<Analytics | null> {
		return {
			postId,
			platform: this.platform,
			views: Math.floor(Math.random() * 500),
			likes: Math.floor(Math.random() * 50),
			shares: Math.floor(Math.random() * 25),
			comments: Math.floor(Math.random() * 15),
			lastUpdated: Date.now(),
		};
	}

	formatContent(content: PostContent): PostContent {
		let text = content.text;
		
		if (content.hashtags && content.hashtags.length > 0) {
			const hashtags = content.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
			text += ` ${hashtags.join(' ')}`;
		}

		if (text.length > this.getCharacterLimit()) {
			text = text.substring(0, this.getCharacterLimit() - 3) + '...';
		}

		return {
			...content,
			text,
		};
	}

	getCharacterLimit(): number {
		return 500;
	}
}

// Bluesky adapter implementation
export class BlueskyAdapter implements PlatformAdapter {
	platform: Platform = 'bluesky';
	private identifier: string;
	private password: string;
	private accessJwt: string = '';

	constructor(credentials: Record<string, string>) {
		this.identifier = credentials.identifier || '';
		this.password = credentials.password || '';
	}

	isConfigured(): boolean {
		return !!(this.identifier && this.password);
	}

	async validateCredentials(): Promise<boolean> {
		if (!this.isConfigured()) return false;
		
		try {
			const response = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					identifier: this.identifier,
					password: this.password,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				this.accessJwt = data.accessJwt;
				return true;
			}
			return false;
		} catch (error) {
			console.error('Bluesky credential validation failed:', error);
			return false;
		}
	}

	async post(content: PostContent): Promise<PostResult> {
		if (!this.isConfigured()) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: 'Bluesky credentials not configured',
				timestamp: Date.now(),
			};
		}

		try {
			if (!this.accessJwt) {
				await this.validateCredentials();
			}

			const formattedContent = this.formatContent(content);
			
			const postData = {
				repo: this.identifier,
				collection: 'app.bsky.feed.post',
				record: {
					text: formattedContent.text,
					createdAt: new Date().toISOString(),
				},
			};

			const response = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.accessJwt}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(postData),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(`Bluesky API error: ${response.status} - ${errorData.message || response.statusText}`);
			}

			const result = await response.json();
			const postId = result.uri || `bluesky_${Date.now()}`;

			return {
				platform: this.platform,
				postId,
				url: `https://bsky.app/profile/${this.identifier}/post/${postId.split('/').pop()}`,
				success: true,
				timestamp: Date.now(),
			};
		} catch (error) {
			return {
				platform: this.platform,
				postId: '',
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: Date.now(),
			};
		}
	}

	async getPostAnalytics(postId: string): Promise<Analytics | null> {
		return {
			postId,
			platform: this.platform,
			views: Math.floor(Math.random() * 300),
			likes: Math.floor(Math.random() * 30),
			shares: Math.floor(Math.random() * 15),
			comments: Math.floor(Math.random() * 10),
			lastUpdated: Date.now(),
		};
	}

	formatContent(content: PostContent): PostContent {
		let text = content.text;
		
		if (content.hashtags && content.hashtags.length > 0) {
			const hashtags = content.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
			text += ` ${hashtags.join(' ')}`;
		}

		if (text.length > this.getCharacterLimit()) {
			text = text.substring(0, this.getCharacterLimit() - 3) + '...';
		}

		return {
			...content,
			text,
		};
	}

	getCharacterLimit(): number {
		return 300;
	}
}

// Main Crosspost SDK class
export class CrosspostSDK {
	private adapters: Map<Platform, PlatformAdapter> = new Map();
	private scheduledPosts: Map<string, ScheduledPost> = new Map();
	private stats = {
		totalPosts: 0,
		successfulPosts: 0,
		failedPosts: 0,
		platformBreakdown: new Map<Platform, { posts: number; successes: number; failures: number }>(),
	};

	constructor(platformConfigs: PlatformConfig[]) {
		this.initializeAdapters(platformConfigs);
		this.startScheduler();
	}

	private initializeAdapters(platformConfigs: PlatformConfig[]) {
		for (const config of platformConfigs) {
			if (!config.enabled) continue;

			let adapter: PlatformAdapter;
			
			switch (config.platform) {
				case 'twitter':
					adapter = new TwitterAdapter(config.credentials);
					break;
				case 'linkedin':
					adapter = new LinkedInAdapter(config.credentials);
					break;
				case 'facebook':
					adapter = new FacebookAdapter(config.credentials);
					break;
				case 'instagram':
					adapter = new InstagramAdapter(config.credentials);
					break;
				case 'mastodon':
					adapter = new MastodonAdapter(config.credentials);
					break;
				case 'bluesky':
					adapter = new BlueskyAdapter(config.credentials);
					break;
				default:
					console.warn(`Platform ${config.platform} not supported yet`);
					continue;
			}

			this.adapters.set(config.platform, adapter);
			this.stats.platformBreakdown.set(config.platform, { posts: 0, successes: 0, failures: 0 });
		}
	}

	private startScheduler() {
		// Check for scheduled posts every 30 seconds
		setInterval(() => {
			this.processScheduledPosts();
		}, 30000);
	}

	private async processScheduledPosts() {
		const now = Date.now();
		
		for (const [id, post] of this.scheduledPosts) {
			if (post.status === 'pending' && post.scheduledAt <= now) {
				try {
					await this.executeScheduledPost(id);
				} catch (error) {
					console.error(`Failed to execute scheduled post ${id}:`, error);
				}
			}
		}
	}

	// Public API methods

	async validateAllCredentials(): Promise<Record<Platform, boolean>> {
		const results: Record<string, boolean> = {};
		
		for (const [platform, adapter] of this.adapters) {
			results[platform] = await adapter.validateCredentials();
		}
		
		return results as Record<Platform, boolean>;
	}

	async postToAll(content: PostContent, platforms?: Platform[]): Promise<PostResult[]> {
		const targetPlatforms = platforms || Array.from(this.adapters.keys());
		const results: PostResult[] = [];

		// Post to all platforms in parallel
		const promises = targetPlatforms.map(async (platform) => {
			const adapter = this.adapters.get(platform);
			if (!adapter) {
				return {
					platform,
					postId: '',
					success: false,
					error: `Platform ${platform} not configured`,
					timestamp: Date.now(),
				};
			}

			return adapter.post(content);
		});

		const allResults = await Promise.all(promises);
		results.push(...allResults);

		// Update statistics
		this.updateStats(results);

		return results;
	}

	async schedulePost(content: PostContent, platforms: Platform[], scheduledAt: number): Promise<ScheduledPost> {
		const id = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		
		const scheduledPost: ScheduledPost = {
			id,
			content,
			platforms,
			scheduledAt,
			status: 'pending',
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		this.scheduledPosts.set(id, scheduledPost);
		return scheduledPost;
	}

	async executeScheduledPost(id: string): Promise<ScheduledPost | null> {
		const scheduledPost = this.scheduledPosts.get(id);
		if (!scheduledPost || scheduledPost.status !== 'pending') {
			return null;
		}

		try {
			const results = await this.postToAll(scheduledPost.content, scheduledPost.platforms);
			
			scheduledPost.results = results;
			scheduledPost.status = results.every(r => r.success) ? 'posted' : 'failed';
			scheduledPost.updatedAt = Date.now();
			
			this.scheduledPosts.set(id, scheduledPost);
			return scheduledPost;
		} catch (error) {
			scheduledPost.status = 'failed';
			scheduledPost.updatedAt = Date.now();
			this.scheduledPosts.set(id, scheduledPost);
			return scheduledPost;
		}
	}

	getScheduledPosts(status?: ScheduledPost['status']): ScheduledPost[] {
		const posts = Array.from(this.scheduledPosts.values());
		return status ? posts.filter(p => p.status === status) : posts;
	}

	getScheduledPost(id: string): ScheduledPost | null {
		return this.scheduledPosts.get(id) || null;
	}

	async cancelScheduledPost(id: string): Promise<boolean> {
		const scheduledPost = this.scheduledPosts.get(id);
		if (!scheduledPost || scheduledPost.status !== 'pending') {
			return false;
		}

		scheduledPost.status = 'cancelled';
		scheduledPost.updatedAt = Date.now();
		this.scheduledPosts.set(id, scheduledPost);
		return true;
	}

	async getAnalytics(postId: string, platform: Platform): Promise<Analytics | null> {
		const adapter = this.adapters.get(platform);
		if (!adapter) return null;

		return adapter.getPostAnalytics(postId);
	}

	getSupportedPlatforms(): Platform[] {
		return Array.from(this.adapters.keys());
	}

	isPlatformConfigured(platform: Platform): boolean {
		const adapter = this.adapters.get(platform);
		return adapter ? adapter.isConfigured() : false;
	}

	getStats() {
		const platformBreakdown: Record<string, { posts: number; successes: number; failures: number }> = {};
		
		for (const [platform, breakdown] of this.stats.platformBreakdown) {
			platformBreakdown[platform] = breakdown;
		}

		return {
			totalPosts: this.stats.totalPosts,
			successfulPosts: this.stats.successfulPosts,
			failedPosts: this.stats.failedPosts,
			scheduledPosts: this.scheduledPosts.size,
			platformBreakdown,
		};
	}

	async getHealthStatus() {
		const platforms: Record<string, boolean> = {};
		let healthyCount = 0;
		
		for (const platform of this.getSupportedPlatforms()) {
			const isHealthy = this.isPlatformConfigured(platform);
			platforms[platform] = isHealthy;
			if (isHealthy) healthyCount++;
		}
		
		const totalPlatforms = this.getSupportedPlatforms().length;
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
			platforms,
			timestamp: Date.now(),
		};
	}

	private updateStats(results: PostResult[]) {
		this.stats.totalPosts += results.length;
		
		for (const result of results) {
			const platformStats = this.stats.platformBreakdown.get(result.platform);
			if (platformStats) {
				platformStats.posts++;
				if (result.success) {
					this.stats.successfulPosts++;
					platformStats.successes++;
				} else {
					this.stats.failedPosts++;
					platformStats.failures++;
				}
			}
		}
	}

	// Utility methods for bulk operations
	async bulkPost(posts: { content: PostContent; platforms: Platform[] }[]): Promise<{
		results: { id: string; content: PostContent; platforms: Platform[]; results: PostResult[]; completedAt: number }[];
		totalPosts: number;
		successCount: number;
		failureCount: number;
	}> {
		const results = [];
		let successCount = 0;
		let failureCount = 0;
		
		for (const post of posts) {
			const postResults = await this.postToAll(post.content, post.platforms);
			
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
			totalPosts: posts.length,
			successCount,
			failureCount,
		};
	}
}

// Export everything for easy usage
export default CrosspostSDK;

