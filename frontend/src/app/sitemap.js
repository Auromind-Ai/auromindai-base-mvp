import { baseUrl } from "@/lib/seo-config";

// List of all public static routes identified in the route audit
const routes = [
  "",
  "/product/ai-brain",
  "/product/inbox",
  "/product/whatsapp",
  "/product/wires",
  "/resources/blog",
  "/resources/case-studies",
  "/resources/demo-videos",
  "/resources/docs",
  "/resources/help",
  "/solutions/ecommerce",
  "/solutions/education",
  "/solutions/high-ticket",
  "/solutions/lead-qualification",
  "/solutions/real-estate",
  "/solutions/saas",
  "/solutions/sales-automation",
];

/**
 * Assigns SEO metadata based on route patterns
 * @param {string} route 
 */
function getRouteMetadata(route) {
  if (route === "") {
    return { priority: 1.0, changeFrequency: "daily" };
  }
  if (route.startsWith("/solutions/")) {
    // Top-level vertical marketing pages
    return { priority: 0.9, changeFrequency: "weekly" };
  }
  if (route.startsWith("/product/")) {
    // Feature/product detail pages
    return { priority: 0.8, changeFrequency: "weekly" };
  }
  if (route.startsWith("/resources/")) {
    // Resources, docs, help pages
    return { priority: 0.7, changeFrequency: "weekly" };
  }
  // Fallback for default public pages
  return { priority: 0.6, changeFrequency: "monthly" };
}

export default async function sitemap() {
  const staticEntries = routes.map((route) => {
    const { priority, changeFrequency } = getRouteMetadata(route);
    return {
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency,
      priority,
    };
  });

  const dynamicEntries = [];

  // Resilient try-catch placeholder for future dynamic routes (e.g. blog posts, case study articles)
  try {
    // In the future, you can fetch data from backend and push to dynamicEntries:
    // const response = await fetch(`${process.env.BACKEND_URL}/posts`);
    // const posts = await response.json();
    // posts.forEach(post => {
    //   dynamicEntries.push({
    //     url: `${baseUrl}/resources/blog/${post.slug}`,
    //     lastModified: new Date(post.updated_at),
    //     changeFrequency: "weekly",
    //     priority: 0.7,
    //   });
    // });
  } catch (error) {
    console.warn("Warning: Failed to generate dynamic sitemap entries:", error);
  }

  return [...staticEntries, ...dynamicEntries];
}

