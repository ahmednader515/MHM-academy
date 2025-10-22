# Prisma Accelerate Setup

This project has been configured to use Prisma Accelerate for improved database performance and caching.

## What is Prisma Accelerate?

Prisma Accelerate is a connection pooling and caching service that helps improve database performance by:
- Reducing database connection overhead
- Providing intelligent caching for frequently accessed data
- Optimizing query performance
- Reducing database load

## Configuration

### 1. Prisma Client Setup

The Prisma Client has been extended with the Accelerate extension in `lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

const createPrismaClient = () => {
    return new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    }).$extends(withAccelerate());
};
```

### 2. Environment Variables

Make sure you have the following environment variables set:

```env
# Your main database URL (used by Accelerate)
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"

# Direct database URL (used for migrations)
DIRECT_URL="postgresql://username:password@host:port/database?schema=public"

# Prisma Accelerate URL (if using Prisma Accelerate service)
# ACCELERATE_URL="prisma://accelerate.prisma-data.net/?api_key=your_api_key"
```

### 3. Schema Configuration

The Prisma schema has been updated to include the `directUrl` for migrations:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Caching Strategies

### Cache TTL Guidelines

Different types of data have different caching strategies based on how frequently they change:

- **Static Data (1 hour)**: Curriculum data, course categories
- **Semi-Static Data (5 minutes)**: Published courses, user profiles
- **Dynamic Data (1-2 minutes)**: User progress, quiz results
- **Frequently Changing Data (30 seconds)**: User sessions, real-time progress

### Examples

#### Basic Caching
```typescript
const user = await db.user.findUnique({
  where: { id: userId },
  cacheStrategy: { ttl: 60 }, // Cache for 1 minute
});
```

#### Complex Queries with Caching
```typescript
const courses = await db.course.findMany({
  where: { isPublished: true },
  include: {
    user: true,
    chapters: { where: { isPublished: true } }
  },
  orderBy: { createdAt: 'desc' },
  cacheStrategy: { ttl: 300 }, // Cache for 5 minutes
});
```

## Implemented Caching

The following queries have been updated with caching strategies:

### API Routes
- `app/api/courses/route.ts` - Course listings with 5-minute cache
- User progress queries with 1-minute cache
- Quiz results with 1-minute cache

### Dashboard Pages
- `app/dashboard/page.tsx` - User data and course progress
- `app/dashboard/(routes)/search/page.tsx` - Search results and user preferences

### Authentication
- `lib/auth.ts` - User authentication queries with 1-minute cache

## Benefits

1. **Improved Performance**: Reduced database load and faster response times
2. **Cost Optimization**: Fewer database queries mean lower costs
3. **Better User Experience**: Faster page loads and smoother interactions
4. **Scalability**: Better handling of concurrent users

## Monitoring

To monitor the effectiveness of caching:

1. Check Prisma logs for cache hits/misses
2. Monitor database query counts
3. Measure response times for cached vs non-cached queries
4. Use Prisma Accelerate dashboard (if using the service)

## Best Practices

1. **Choose Appropriate TTL**: Match cache duration to data change frequency
2. **Cache at the Right Level**: Cache frequently accessed, rarely changing data
3. **Monitor Performance**: Regularly check cache hit rates and adjust TTL as needed
4. **Test Thoroughly**: Ensure cached data doesn't become stale inappropriately
5. **Use Conditional Caching**: Disable caching in development if needed

## Example Usage

See `lib/accelerate-examples.ts` for comprehensive examples of how to use the Accelerate extension with different caching strategies.

## Migration

If you're migrating from a non-Accelerate setup:

1. Install the extension: `npm install @prisma/extension-accelerate`
2. Update your Prisma Client configuration
3. Add caching strategies to your queries
4. Test thoroughly in a development environment
5. Deploy with monitoring

## Troubleshooting

### Common Issues

1. **Cache Not Working**: Ensure you're using the extended Prisma Client
2. **Stale Data**: Reduce TTL for frequently changing data
3. **Memory Issues**: Monitor cache size and adjust TTL accordingly
4. **Migration Issues**: Ensure `DIRECT_URL` is properly configured

### Debug Mode

Enable debug logging to see cache behavior:

```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
}).$extends(withAccelerate());
```
