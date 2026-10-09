import { mockLeadProvider } from "./mock-provider";
import {
  geoapifyProvider,
  GeoapifyProviderError,
} from "./geoapify-provider";
import {
  LeadProvider,
  LeadProviderSearchParams,
  ProviderSearchResult,
} from "./types";

/**
 * Server-side provider selection boundary.
 *
 * The UI and API route do not need to know which provider is active. A real
 * provider can be added here later without changing the search experience.
 */
class ProviderRouter {
  private getProvider(): LeadProvider {
    if (process.env.GEOAPIFY_API_KEY) return geoapifyProvider;
    if (process.env.NODE_ENV === "production") {
      throw new GeoapifyProviderError(
        "The real lead provider is not configured.",
        502
      );
    }
    return mockLeadProvider;
  }

  async search(
    params: LeadProviderSearchParams,
    signal?: AbortSignal
  ): Promise<ProviderSearchResult> {
    const provider = this.getProvider();
    const leads = await provider.search(params, signal);
    return {
      provider: provider.getName(),
      leads,
    };
  }
}

export const providerRouter = new ProviderRouter();
