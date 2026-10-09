import {
  Lead,
  LeadProvider,
  LeadProviderSearchParams,
} from "./types";
import { filterMockLeads } from "@/data/mock-leads";

/**
 * MockLeadProvider — simulates a lead discovery provider.
 * UI must never depend on this implementation details.
 * Later replaceable with GooglePlacesProvider, OverpassProvider, etc.
 */
export class MockLeadProvider implements LeadProvider {
  getName(): string {
    return "Mock Business Directory";
  }

  async search(params: LeadProviderSearchParams): Promise<Lead[]> {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 80 + Math.random() * 120));

    const results = filterMockLeads(
      params.businessType,
      params.location,
      params.limit,
      params.offset ?? 0
    );

    return results;
  }
}

export const mockLeadProvider = new MockLeadProvider();
