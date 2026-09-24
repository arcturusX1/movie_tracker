import { describe, expect, it } from "vitest";
import {
  findDirector,
  parseLibraryQuery,
  parseOmdbScores,
  posterUrl,
  yearOf,
} from "@/lib/movie-utils";

describe("parseOmdbScores", () => {
  it("extracts Rotten Tomatoes, Metacritic and IMDb scores", () => {
    expect(
      parseOmdbScores({
        Response: "True",
        imdbRating: "8.8",
        Metascore: "74",
        Ratings: [
          { Source: "Internet Movie Database", Value: "8.8/10" },
          { Source: "Rotten Tomatoes", Value: "87%" },
          { Source: "Metacritic", Value: "74/100" },
        ],
      }),
    ).toEqual({ rottenTomatoes: "87%", metacritic: "74", imdb: "8.8" });
  });

  it("falls back to Metascore and treats N/A as missing", () => {
    expect(
      parseOmdbScores({ Response: "True", imdbRating: "N/A", Metascore: "61", Ratings: [] }),
    ).toEqual({ rottenTomatoes: null, metacritic: "61", imdb: null });
    expect(parseOmdbScores({ Response: "True", Metascore: "N/A" })?.metacritic).toBeNull();
  });

  it("returns null for failed lookups", () => {
    expect(parseOmdbScores({ Response: "False" })).toBeNull();
  });
});

describe("findDirector", () => {
  it("joins co-directors and ignores other crew", () => {
    expect(
      findDirector([
        { job: "Director", name: "Joel Coen" },
        { job: "Producer", name: "Someone" },
        { job: "Director", name: "Ethan Coen" },
      ]),
    ).toBe("Joel Coen, Ethan Coen");
    expect(findDirector([])).toBeNull();
    expect(findDirector(undefined)).toBeNull();
  });
});

describe("parseLibraryQuery", () => {
  it("defaults to newest-added first", () => {
    expect(parseLibraryQuery({})).toEqual({ sort: "added", dir: "desc", genre: null });
  });

  it("uses A→Z for text sorts and honours explicit direction", () => {
    expect(parseLibraryQuery({ sort: "director" }).dir).toBe("asc");
    expect(parseLibraryQuery({ sort: "year" }).dir).toBe("desc");
    expect(parseLibraryQuery({ sort: "year", dir: "asc" }).dir).toBe("asc");
  });

  it("rejects invalid values", () => {
    expect(parseLibraryQuery({ sort: "drop table", dir: "sideways", genre: "-3" })).toEqual({
      sort: "added",
      dir: "desc",
      genre: null,
    });
    expect(parseLibraryQuery({ genre: ["28", "12"] }).genre).toBe(28);
  });
});

describe("small helpers", () => {
  it("builds poster URLs and years", () => {
    expect(posterUrl("/abc.jpg", "w185")).toBe("https://image.tmdb.org/t/p/w185/abc.jpg");
    expect(posterUrl(null)).toBeNull();
    expect(yearOf("2010-07-15")).toBe(2010);
    expect(yearOf("")).toBeNull();
  });
});
