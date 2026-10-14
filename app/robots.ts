import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: ["/", "/about", "/contact", "/privacy", "/llms.txt"], disallow: ["/api/", "/dashboard", "/find-leads", "/searches", "/saved-leads", "/settings"] }, sitemap: "https://outreach-saas-lio-8f66.vercel.app/sitemap.xml" }; }
