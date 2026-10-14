import type { MetadataRoute } from "next";
const base = "https://outreach-saas-lio-8f66.vercel.app";
export default function sitemap(): MetadataRoute.Sitemap { const lastModified = new Date("2026-10-14"); return ["/", "/about", "/contact", "/privacy", "/login"].map((path) => ({ url: `${base}${path}`, lastModified, changeFrequency: path === "/" ? "weekly" : "monthly", priority: path === "/" ? 1 : 0.6 })); }
