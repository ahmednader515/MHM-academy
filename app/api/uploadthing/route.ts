import { createRouteHandler } from "uploadthing/next";

import { ourFileRouter } from "../../../lib/uploadthing/core";

// Log UploadThing configuration on route handler initialization
if (process.env.NODE_ENV === "development") {
    console.log("[UPLOADTHING_ROUTE] Initializing route handler");
    console.log("[UPLOADTHING_ROUTE] UPLOADTHING_SECRET:", process.env.UPLOADTHING_SECRET ? "✓ Set" : "✗ Missing");
    console.log("[UPLOADTHING_ROUTE] UPLOADTHING_APP_ID:", process.env.UPLOADTHING_APP_ID ? "✓ Set" : "✗ Missing");
}

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
