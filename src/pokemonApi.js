// PokeAPI client for the resource list / pagination endpoint.
// Docs: https://pokeapi.co/docs/v2#resource-listspagination-section
//
// GET https://pokeapi.co/api/v2/pokemon?limit={limit}&offset={offset}
// returns: { count, next, previous, results: [{ name, url }] }

const API_BASE = "https://pokeapi.co/api/v2/pokemon";

export async function fetchPokemonPage(limit = 20, offset = 0) {
  const response = await fetch(`${API_BASE}?limit=${limit}&offset=${offset}`);
  if (!response.ok) {
    throw new Error(`PokeAPI request failed with status ${response.status}`);
  }
  const data = await response.json();
  // The list response has no top-level `id` field, but each result's id is
  // embedded in its `url` (https://pokeapi.co/api/v2/pokemon/1/), so derive
  // it from there to give the grid a numeric, sortable key.
  const results = data.results.map((item) => ({
    id: Number(item.url.split("/").filter(Boolean).pop()),
    ...item,
  }));
  return { ...data, results };
}

// AG Grid's built-in pagination works on the client-side row model, so the
// whole list is fetched in one request and the grid pages through it locally.
// `limit=100000` is the largest value PokeAPI accepts and comfortably covers
// every Pokémon currently in the resource list.
export async function fetchAllPokemon() {
  const data = await fetchPokemonPage(100000, 0);
  return { count: data.count, results: data.results };
}

// Grid columns matching the shape of the response above.
export const pokemonColumnDefs = [
  { field: "id", headerName: "ID", width: 90 },
  { field: "name", headerName: "Name", width: 200 },
  { field: "url", headerName: "URL", width: 380 },
];