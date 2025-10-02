# Crosspost Plugin

A comprehensive crosspost plugin for the every-plugin framework that enables posting content across multiple social media platforms simultaneously. This plugin can serve as a replacement for traditional crosspost SDKs, providing a unified interface for managing social media content distribution.

## Features

### 🚀 Multi-Platform Support
- **Twitter/X**: Full API integration with character limit optimization and media support
- **LinkedIn**: Professional content formatting with UGC API integration
- **Facebook**: Complete Graph API integration with page posting
- **Instagram**: Media posting through Facebook Graph API
- **Mastodon**: Full ActivityPub API support with custom instance configuration
- **Bluesky**: AT Protocol integration with session management

### 📅 Scheduling & Automation
- Schedule posts for future publication
- Automatic execution of scheduled posts
- Bulk posting capabilities
- Queue management with retry logic

### 📊 Analytics & Tracking
- Real-time post analytics
- Platform-specific metrics (views, likes, shares, comments)
- Success/failure tracking
- Performance statistics

### 🔧 Advanced Features
- **Smart Content Formatting**: Automatic optimization for each platform's requirements
- **Robust Error Handling**: Comprehensive retry logic with exponential backoff
- **Rate Limiting**: Platform-specific rate limiting to prevent API throttling
- **Media Upload**: Support for images across all platforms with format validation
- **Input Validation**: Comprehensive content sanitization and validation
- **Performance Optimization**: Caching, connection pooling, and batch processing
- **Persistent Scheduling**: Reliable scheduled posting with database persistence
- **Real-time Analytics**: Post performance tracking and insights
- **Health Monitoring**: System health checks and credential validation

## Installation

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Run tests
npm test

# Run the comprehensive demo
npm run demo
```

## Quick Start

```typescript
import CrosspostSDK from './src/standalone';

// Configure your platforms
const platforms = [
  {
    platform: 'twitter',
    enabled: true,
    credentials: {
      apiKey: 'your-api-key',
      apiSecret: 'your-api-secret',
      accessToken: 'your-access-token',
      accessTokenSecret: 'your-access-token-secret',
    },
  },
  // Add more platforms...
];

// Initialize the SDK
const crosspost = new CrosspostSDK(platforms);

// Post to all platforms
const results = await crosspost.postToAll({
  text: 'Hello, world!',
  hashtags: ['crosspost', 'automation'],
});

console.log(`Posted to ${results.filter(r => r.success).length} platforms!`);
```

## Configuration

The plugin requires platform-specific credentials configured in the secrets section:

```typescript
{
  "secrets": {
    "platforms": [
      {
        "platform": "twitter",
        "enabled": true,
        "credentials": {
          "apiKey": "your-twitter-api-key",
          "apiSecret": "your-twitter-api-secret",
          "accessToken": "your-twitter-access-token",
          "accessTokenSecret": "your-twitter-access-token-secret"
        }
      },
      {
        "platform": "linkedin",
        "enabled": true,
        "credentials": {
          "accessToken": "your-linkedin-access-token"
        }
      }
    ]
  },
  "variables": {
    "defaultPlatforms": ["twitter", "linkedin"],
    "enableScheduling": true,
    "maxScheduledPosts": 100,
    "rateLimitPerMinute": 10,
    "enableAnalytics": true
  }
}
```

## API Endpoints

### Immediate Posting
- `POST /postNow` - Post content immediately to specified platforms
- `POST /bulkPost` - Post multiple content pieces in bulk

### Scheduling
- `POST /schedulePost` - Schedule a post for future publication
- `GET /scheduledPosts` - Get all scheduled posts
- `GET /scheduledPost/{id}` - Get specific scheduled post
- `POST /executeScheduledPost` - Execute a scheduled post immediately
- `DELETE /scheduledPost/{id}` - Cancel a scheduled post

### Analytics
- `GET /analytics/{postId}` - Get analytics for a specific post
- `GET /stats` - Get overall plugin statistics

### Platform Management
- `GET /platforms` - Get supported platforms
- `GET /platforms/status` - Get platform configuration status
- `POST /platforms/validate` - Validate platform credentials

### Monitoring
- `GET /health` - Health check endpoint
- `POST /streamPostEvents` - Stream real-time posting events

## Usage Examples

### Basic Posting

```typescript
import { CrosspostPluginClient } from './crosspost-plugin';

const client = new CrosspostPluginClient(/* config */);

// Post to all configured platforms
const result = await client.postNow({
  content: {
    text: "Hello, world! This is a crosspost example.",
    hashtags: ["crosspost", "socialmedia"],
    links: ["https://example.com"]
  }
});

console.log(`Posted to ${result.successCount} platforms successfully`);
```

### Scheduling Posts

```typescript
// Schedule a post for tomorrow at 9 AM
const scheduledPost = await client.schedulePost({
  content: {
    text: "Good morning! Here's today's update.",
    hashtags: ["morning", "update"]
  },
  platforms: ["twitter", "linkedin"],
  scheduledAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
});

console.log(`Post scheduled with ID: ${scheduledPost.scheduledPost.id}`);
```

### Bulk Posting

```typescript
const bulkResult = await client.bulkPost({
  posts: [
    {
      content: { text: "First post" },
      platforms: ["twitter"]
    },
    {
      content: { text: "Second post with more content for LinkedIn" },
      platforms: ["linkedin"]
    }
  ]
});

console.log(`Bulk posted ${bulkResult.successCount} out of ${bulkResult.totalPosts} posts`);
```

### Analytics

```typescript
// Get analytics for a specific post
const analytics = await client.getPostAnalytics({
  postId: "twitter_1234567890",
  platform: "twitter"
});

if (analytics.analytics) {
  console.log(`Post has ${analytics.analytics.views} views and ${analytics.analytics.likes} likes`);
}
```

## Platform-Specific Features

### Twitter/X
- Automatic character limit enforcement (280 characters)
- Hashtag optimization
- Thread support (planned)
- Media attachment support

### LinkedIn
- Extended character limit (3000 characters)
- Professional content formatting
- Company page posting (planned)
- Article publishing (planned)

## Error Handling

The plugin includes comprehensive error handling with specific error types:
- `UNAUTHORIZED` - Invalid or expired credentials
- `FORBIDDEN` - Insufficient permissions
- `RATE_LIMITED` - API rate limits exceeded
- `SERVICE_UNAVAILABLE` - Platform service issues

## Development

### Adding New Platforms

To add support for a new platform:

1. Create a new adapter class implementing the `PlatformAdapter` interface
2. Add the platform to the `platformSchema` enum
3. Update the `CrosspostClient` to initialize the new adapter
4. Add platform-specific configuration options

Example:

```typescript
export class FacebookAdapter implements PlatformAdapter {
  platform: Platform = 'facebook';
  
  // Implement required methods...
}
```

### Testing

```bash
npm run dev  # Start development server
npm run build  # Build for production
```

## Architecture

The plugin follows a modular architecture:

- **Client Layer** (`client.ts`): Platform adapters and core crosspost logic
- **Contract Layer** (`index.ts`): oRPC contract definitions and route handlers
- **Plugin Layer**: every-plugin framework integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Roadmap

- [x] **Core Platform Integration**
  - [x] Twitter/X API v2 integration
  - [x] LinkedIn UGC API integration
  - [x] Facebook Graph API integration
  - [x] Instagram Business API integration
  - [x] Mastodon ActivityPub API integration
  - [x] Bluesky AT Protocol integration

- [x] **Essential Features**
  - [x] Multi-platform posting
  - [x] Scheduled posting with persistence
  - [x] Bulk posting operations
  - [x] Content validation and sanitization
  - [x] Media upload support
  - [x] Error handling and retry logic
  - [x] Rate limiting per platform
  - [x] Analytics and insights
  - [x] Health monitoring
  - [x] Performance optimization

- [ ] **Advanced Features** (Future)
  - [ ] Thread/carousel support
  - [ ] Advanced media optimization
  - [ ] Recurring scheduled posts
  - [ ] Team collaboration features
  - [ ] Webhook notifications
  - [ ] Advanced analytics dashboard
  - [ ] A/B testing for posts
  - [ ] Content templates
  - [ ] Multi-account management

## Support

For issues and questions, please open an issue on the GitHub repository.