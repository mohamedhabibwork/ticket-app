import { useQuery } from "@tanstack/react-query";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";

import { orpc } from "@/utils/orpc";

interface KbSearchProps {
  organizationId: number;
  locale?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

export function KbSearch({
  organizationId,
  locale = "en",
  placeholder,
  onSearch,
  className,
}: KbSearchProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const searchQuery = useQuery(
    orpc.kbArticles.search.queryOptions(
      {
        organizationId,
        query,
        locale,
        limit: 5,
      },
      {
        enabled: query.length >= 2,
      },
    ),
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch?.(query);
      navigate({ to: "/kb", search: { q: query } });
    }
  };

  const showResults = query.length >= 2 && !searchQuery.isLoading;

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={
            placeholder || (locale === "ar" ? "ابحث في المقالات..." : "Search articles...")
          }
          className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {showResults && searchQuery.data && searchQuery.data.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-96 overflow-auto rounded-lg border bg-background shadow-lg">
            {searchQuery.data.map((article) => (
              <a
                key={article.id}
                href={`/kb/${article.slug}`}
                className="block px-4 py-2 hover:bg-muted"
                onClick={() => setQuery("")}
              >
                <div className="font-medium">{article.title}</div>
                {article.metaDescription && (
                  <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {article.metaDescription}
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
        {showResults && searchQuery.data && searchQuery.data.length === 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border bg-background px-4 py-6 text-center shadow-lg">
            <p className="text-sm text-muted-foreground">
              {locale === "ar" ? "لم يتم العثور على نتائج" : "No results found"}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
