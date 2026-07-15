import { baseUrl } from "@/lib/seo-config";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/user/",
        "/impersonate/",
        "/instagram/callback",
        "/whatsapp/callback",
        "/login",
        "/signup",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
