import { Sparkles } from "lucide-react";
import { getRecommendations } from "@/lib/recommendations";
import { LibraryItem } from "@/components/LibraryItem";
import { MovieCard, MovieGrid } from "@/components/MovieCard";
import { StatusButtons } from "@/components/StatusButtons";
import { Skeleton } from "@/components/ui/skeleton";

export async function Recommendations() {
  const recommendations = await getRecommendations();

  return (
    <RecommendationsSection>
      {recommendations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add or rate a few movies to get recommendations.
        </p>
      ) : (
        <MovieGrid>
          {recommendations.map((rec) => (
            // Not in the library yet: the card hides as soon as it's added anywhere.
            <LibraryItem key={rec.id} listStatus={null}>
              <MovieCard tmdbId={rec.id} title={rec.title} year={rec.year} posterPath={rec.posterPath}>
                <p className="line-clamp-2 text-xs text-muted-foreground">{rec.reason}</p>
                <StatusButtons tmdbId={rec.id} title={rec.title} status={null} signedIn compact />
              </MovieCard>
            </LibraryItem>
          ))}
        </MovieGrid>
      )}
    </RecommendationsSection>
  );
}

export function RecommendationsSkeleton() {
  return (
    <RecommendationsSection>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[2/3] w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </RecommendationsSection>
  );
}

function RecommendationsSection({ children }: { children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t pt-8" aria-labelledby="recommendations-heading">
      <div className="space-y-1">
        <h2 id="recommendations-heading" className="flex items-center gap-2 text-xl font-semibold">
          <Sparkles className="size-5 text-primary" aria-hidden />
          Recommended for you
        </h2>
        <p className="text-sm text-muted-foreground">
          Based on the genres and directors you watch most, weighted by your ratings.
        </p>
      </div>
      {children}
    </section>
  );
}
