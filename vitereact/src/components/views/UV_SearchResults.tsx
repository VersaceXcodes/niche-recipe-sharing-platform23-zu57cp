import React, { useEffect, useState, useCallback } from 'react';
import {
  useSearchParams,
  useNavigate,
  Link,
  createSearchParams,
} from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main'; // Assuming the store hook is exported as useAppStore

// --- Interfaces and Types ---

// RecipeSummary structure as expected from API and global state
interface RecipeSummary {
  recipe_id: number;
  title: string;
  description: string;
  cover_photo_url: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  difficulty_level: 'Easy' | 'Medium' | 'Hard';
  average_rating: number | null;
  username: string;
  tags: string[];
}

interface PaginationInfo {
  total_items: number;
  total_pages: number;
  current_page: number;
  items_per_page: number;
}

interface PaginatedRecipesResponse {
  recipes: RecipeSummary[];
  pagination: PaginationInfo;
}

interface FilterParams {
  tags: string[];
  difficulty: string[];
  max_prep_time: number | null;
  max_cook_time: number | null;
  min_rating: number | null;
}

// Define the structure for the search results recipes within the store's paginated_recipes
interface SearchResultsStateSlice {
  paginated_recipes: PaginatedRecipesResponse;
  filter_params: FilterParams;
  sort_order: 'newest' | 'rating' | 'popularity';
  search_query: string; // Used for potentially re-triggering search
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const UV_SearchResults: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Accessing global state and actions
  const {
    filter_params: global_filter_params,
    sort_order: global_sort_order,
    search_query: global_search_query,
    setFilters,
    setSortOrder,
    setPage,
    setSearchQuery, // To synchronize search query from top nav if needed
  } = useAppStore((state) => ({
    paginated_recipes: state.paginated_recipes as PaginatedRecipesResponse, // cast or ensure correct type
    filter_params: state.filter_params,
    sort_order: state.sort_order,
    search_query: state.search_query, // current search query from global state
    setFilters: state.setFilters,
    setSortOrder: state.setSortOrder,
    setPage: state.setPage,
    setSearchQuery: state.setSearchQuery,
  }));

  // Local state for filters and sorting to control UI elements
  const [local_filter_params, set_local_filter_params] = useState<FilterParams>(() => {
    const tagsParam = searchParams.get('tags');
    const difficultyParam = searchParams.get('difficulty');
    const max_prep_timeParam = searchParams.get('max_prep_time');
    const max_cook_timeParam = searchParams.get('max_cook_time');
    const min_ratingParam = searchParams.get('min_rating');

    return {
      tags: tagsParam ? tagsParam.split(',') : [],
      difficulty: difficultyParam ? difficultyParam.split(',') : [],
      max_prep_time: max_prep_timeParam ? parseInt(max_prep_timeParam, 10) : null,
      max_cook_time: max_cook_timeParam ? parseInt(max_cook_timeParam, 10) : null,
      min_rating: min_ratingParam ? parseFloat(min_ratingParam) : null,
    };
  });

  const [local_sort_order, set_local_sort_order] = useState<SearchResultsStateSlice['sort_order']>(() => {
    return (searchParams.get('sort_by') as SearchResultsStateSlice['sort_order']) || global_sort_order || 'newest';
  });

  const [local_page, set_local_page] = useState<number>(() => {
    return parseInt(searchParams.get('page') || '1', 10) || 1;
  });

  const current_search_query_from_url = searchParams.get('q') || '';

  // --- Actions ---

  // Function to fetch search results
  const fetch_search_results = useCallback(async (
    query: string,
    filters: FilterParams,
    sort: SearchResultsStateSlice['sort_order'],
    page: number,
    limit: number
  ): Promise<PaginatedRecipesResponse> => {
    const queryParams = new URLSearchParams();
    
    if (!query) {
      // If no query, return empty results to avoid hitting API incorrectly
      return { recipes: [], pagination: { total_items: 0, total_pages: 0, current_page: 1, items_per_page: limit } };
    }
    
    queryParams.append('q', query);

    // Apply filters
    if (filters.tags.length) queryParams.append('tags', filters.tags.join(','));
    if (filters.difficulty.length) queryParams.append('difficulty', filters.difficulty.join(','));
    if (filters.max_prep_time !== null) queryParams.append('max_prep_time', String(filters.max_prep_time));
    if (filters.max_cook_time !== null) queryParams.append('max_cook_time', String(filters.max_cook_time));
    if (filters.min_rating !== null) queryParams.append('min_rating', String(filters.min_rating));

    // Apply sorting and pagination
    queryParams.append('sort_by', sort);
    queryParams.append('page', String(page));
    queryParams.append('limit', String(limit));

    const url = `${API_BASE_URL}/api/v1/search/recipes?${queryParams.toString()}`;

    const { data } = await axios.get<PaginatedRecipesResponse>(url);
    return data;
  }, [API_BASE_URL]);

  // Initialize global state and URL params from initial URL on mount
  useEffect(() => {
    const query = searchParams.get('q') || '';
    setSearchQuery(query); 

    const currentSortOrder = (searchParams.get('sort_by') as SearchResultsStateSlice['sort_order']) || 'newest';
    const currentPage = parseInt(searchParams.get('page') || '1', 10) || 1;

    set_local_filter_params(local_filter_params);
    set_local_sort_order(currentSortOrder);
    set_local_page(currentPage);

    setFilters(local_filter_params);
    setSortOrder(currentSortOrder);
    setPage(currentPage);
  }, [searchParams, setSearchQuery, setFilters, setSortOrder, setPage, local_filter_params]);

  // React Query for fetching search results
  const { data: searchResults, isLoading: isQueryLoading, error: queryError } = useQuery<PaginatedRecipesResponse, Error>(
    ['searchResults', current_search_query_from_url, local_filter_params, local_sort_order, local_page],
    () => {
      if (!current_search_query_from_url) {
        return { recipes: [], pagination: { total_items: 0, total_pages: 0, current_page: 1, items_per_page: 10 }};
      }
      return fetch_search_results(
        current_search_query_from_url,
        local_filter_params,
        local_sort_order,
        local_page,
        searchResults?.pagination?.items_per_page || 10 // Use current or default limit
      );
    },
    {
      enabled: !!current_search_query_from_url, // Only run query if search query exists
      keepPreviousData: true, // Keep previous data while fetching new data
      onError: (error) => {
        console.error("Error fetching search results:", error);
        // Optionally use global notification system
        // showNotification(error.message || "Failed to load search results", "error");
      },
    }
  );

  // Unified handler for filter changes
  const handleFilterChange = useCallback((filterName: keyof FilterParams, value: any) => {
    set_local_filter_params(prev => {
      const newFilters = { ...prev };
      newFilters[filterName] = value;
      
      // Update Global State
      setFilters(newFilters);
      set_local_page(1);
      setPage(1);

      // Update URL
      const currentParams = createSearchParams(searchParams);
      if (filterName === 'tags' || filterName === 'difficulty') {
        if (value.length > 0) {
          currentParams.set(filterName, value.join(','));
        } else {
          currentParams.delete(filterName);
        }
      } else if (value !== null && value !== '') {
        currentParams.set(filterName, String(value));
      } else {
        currentParams.delete(filterName);
      }
      currentParams.set('page', '1');
      setSearchParams(currentParams);

      return newFilters;
    });
  }, [setFilters, setPage, setSearchParams, searchParams, local_filter_params]);

  // Handler for sort order change
  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSortOrder = e.target.value as SearchResultsStateSlice['sort_order'];
    set_local_sort_order(newSortOrder);
    setSortOrder(newSortOrder);
    set_local_page(1);
    setPage(1);

    const currentParams = createSearchParams(searchParams);
    currentParams.set('sort_by', newSortOrder);
    currentParams.set('page', '1');
    setSearchParams(currentParams);
  }, [setSortOrder, setPage, setSearchParams, searchParams]);

  // Handler for pagination change
  const handlePageChange = useCallback((pageNumber: number) => {
    if (!searchResults?.pagination) return;

    if (pageNumber > 0 && pageNumber <= searchResults.pagination.total_pages) {
      set_local_page(pageNumber);
      setPage(pageNumber); 

      const currentParams = createSearchParams(searchParams);
      currentParams.set('page', String(pageNumber));
      setSearchParams(currentParams);
    }
  }, [setPage, setSearchParams, searchParams, searchResults]);

  // Handler for clearing filters
  const handleClearFilters = useCallback(() => {
    // Reset local and global filter state
    const defaultFilters: FilterParams = {
      tags: [],
      difficulty: [],
      max_prep_time: null,
      max_cook_time: null,
      min_rating: null,
    };
    set_local_filter_params(defaultFilters);
    setFilters(defaultFilters);
    
    const defaultSortOrder = 'newest';
    set_local_sort_order(defaultSortOrder);
    setSortOrder(defaultSortOrder);
    
    set_local_page(1);
    setPage(1);

    // Update URL search parameters
    const currentParams = createSearchParams(searchParams);
    currentParams.delete('tags');
    currentParams.delete('difficulty');
    currentParams.delete('max_prep_time');
    currentParams.delete('max_cook_time');
    currentParams.delete('min_rating');
    currentParams.set('sort_by', defaultSortOrder);
    currentParams.set('page', '1');
    setSearchParams(currentParams);
  }, [setFilters, setSortOrder, setPage, setSearchParams, searchParams]);

  // Handler to navigate to a recipe's detail page
  const navigate_to_recipe = (recipe_id: number) => {
    navigate(`/recipes/${recipe_id}`);
  };

  // --- Render Logic ---
  const recipesToDisplay = searchResults?.recipes || [];
  const pagination = searchResults?.pagination || { total_items: 0, total_pages: 0, current_page: 1, items_per_page: 10 };

  const hasResults = recipesToDisplay.length > 0;
  const isLoading = isQueryLoading;
  const error = queryError;

  // Simplified filter control rendering for demonstration
  // In a real app, these would be more sophisticated UI components (e.g., from a UI library)
  const renderDifficultyFilter = () => (
      <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Difficulty:</label>
          <div className="flex flex-wrap gap-2">
              {['Easy', 'Medium', 'Hard'].map(level => (
                  <label key={level} className="inline-flex items-center">
                      <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={local_filter_params.difficulty.includes(level)}
                          onChange={(e) => {
                              const updatedDifficulty = e.target.checked
                                  ? [...local_filter_params.difficulty, level]
                                  : local_filter_params.difficulty.filter(d => d !== level);
                              handleFilterChange('difficulty', updatedDifficulty);
                          }}
                      />
                      <span className="ml-2 text-sm">{level}</span>
                  </label>
              ))}
          </div>
      </div>
  );

  const renderRatingFilter = () => (
      <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Minimum Rating:</label>
          <select
              className="shadow border rounded py-1 px-2 w-full text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={local_filter_params.min_rating ?? ''}
              onChange={(e) => handleFilterChange('min_rating', e.target.value ? parseFloat(e.target.value) : null)}
          >
              <option value="">All Ratings</option>
              <option value="3.0">3 Stars & Up</option>
              <option value="3.5">3.5 Stars & Up</option>
              <option value="4.0">4 Stars & Up</option>
              <option value="4.5">4.5 Stars & Up</option>
          </select>
      </div>
  );
  
  const renderPrepTimeFilter = () => (
      <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Max Prep Time (min):</label>
          <select
              className="shadow border rounded py-1 px-2 w-full text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={local_filter_params.max_prep_time ?? ''}
              onChange={(e) => handleFilterChange('max_prep_time', e.target.value ? parseInt(e.target.value, 10) : null)}
          >
              <option value="">Any</option>
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="45">45 Minutes</option>
              <option value="60">60 Minutes</option>
          </select>
      </div>
  );

  const renderCookTimeFilter = () => (
      <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Max Cook Time (min):</label>
          <select
              className="shadow border rounded py-1 px-2 w-full text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={local_filter_params.max_cook_time ?? ''}
              onChange={(e) => handleFilterChange('max_cook_time', e.target.value ? parseInt(e.target.value, 10) : null)}
          >
              <option value="">Any</option>
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="45">45 Minutes</option>
              <option value="60">60 Minutes</option>
          </select>
      </div>
  );

  // Placeholder for tag filtering UI, would need a list of available tags
  const renderTagsFilter = () => (
      <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Tags:</label>
          <div className="shadow border rounded py-2 px-2">
              {/* Example tags, ideally fetched or defined globally */}
              {['Quick Meals', 'High Protein', 'Keto Snacks'].map(tag => (
                   <label key={tag} className="inline-flex items-center mr-4 mb-1">
                      <input
                          type="checkbox"
                          className="form-checkbox h-4 w-4 text-blue-600"
                          checked={local_filter_params.tags.includes(tag)}
                          onChange={(e) => {
                              const updatedTags = e.target.checked
                                  ? [...local_filter_params.tags, tag]
                                  : local_filter_params.tags.filter(t => t !== tag);
                              handleFilterChange('tags', updatedTags);
                          }}
                      />
                      <span className="ml-2 text-sm">{tag}</span>
                  </label>
              ))}
          </div>
      </div>
  );

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Search Results for "{current_search_query_from_url}"</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1 p-6 bg-white rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Filters</h2>
            <button
              onClick={handleClearFilters}
              className="text-sm text-blue-600 hover:underline focus:outline-none"
            >
              Clear All
            </button>
          </div>
          {renderTagsFilter()}
          {renderDifficultyFilter()}
          {renderRatingFilter()}
          {renderPrepTimeFilter()}
          {renderCookTimeFilter()}

          {/* Sort Order Selection */}
          <div className="mt-6">
            <label htmlFor="sortOrder" className="block text-gray-700 text-sm font-bold mb-2">Sort By:</label>
            <select
              id="sortOrder"
              className="shadow border rounded py-1 px-2 w-full text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={local_sort_order}
              onChange={handleSortChange}
            >
              <option value="newest">Newest</option>
              <option value="rating">Highest Rated</option>
              <option value="popularity">Most Popular</option>
            </select>
          </div>
        </aside>

        {/* Search Results Area */}
        <section className="lg:col-span-3">
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <p>Loading recipes...</p>
              {/* Could use a spinner component here */}
            </div>
          )}

          {error && (
            <div className="flex justify-center items-center h-64 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
               <p className="font-bold">Error:</p> <p className="ml-2">{error.message}</p>
            </div>
          )}

          {!isLoading && !error && !hasResults && (
            <div className="flex justify-center items-center h-64">
              <p>No recipes found matching your search criteria.</p>
            </div>
          )}

          {!isLoading && !error && hasResults && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipesToDisplay.map((recipe) => (
                  <div key={recipe.recipe_id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
                    <Link to={`/recipes/${recipe.recipe_id}`} className="cursor-pointer">
                      <img
                        src={recipe.cover_photo_url || `https://picsum.photos/seed/${recipe.recipe_id}/400/300`}
                        alt={recipe.title}
                        className="w-full h-48 object-cover"
                        loading="lazy"
                      />
                      <div className="p-4">
                        <h3 className="text-lg font-semibold mb-2 truncate">{recipe.title}</h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2 h-10">{recipe.description}</p>
                        <div className="flex justify-between items-center text-sm text-gray-700 mb-1">
                          <span>Prep: {recipe.prep_time_minutes} min</span>
                          <span>Cook: {recipe.cook_time_minutes} min</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-700 mb-1">
                          <span>Difficulty: {recipe.difficulty_level}</span>
                          <span>Rating: {recipe.average_rating !== null ? `${recipe.average_rating.toFixed(1)}/5` : 'N/A'}</span>
                        </div>
                          {recipe.tags && recipe.tags.length > 0 && (
                            <div className="mt-2">
                                {recipe.tags.slice(0, 2).map(tag => (
                                     <Link
                                         key={tag}
                                         to={`/search?q=${encodeURIComponent(current_search_query_from_url)}&tags=${tag}&page=1`} // Link to same search but filtered by tag
                                         className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full mr-2 hover:bg-blue-200 transition-colors duration-200"
                                     >
                                         {tag}
                                     </Link>
                                ))}
                                {recipe.tags.length > 2 && <span className="text-xs text-gray-500">+{recipe.tags.length - 2} more</span>}
                            </div>
                          )}
                        <p className="text-xs text-gray-500 mt-2">By: {recipe.username}</p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="flex justify-center mt-8 space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                    className={`px-4 py-2 rounded-md ${
                      pagination.current_page === 1
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-white text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(pagination.total_pages, 5) }, (_, i) => {
                      let pageNum = local_page - 2 + i;
                      if (pageNum < 1) pageNum = i + 1;
                      if (pageNum > pagination.total_pages) pageNum = pagination.total_pages - (5 - 1 - i);

                      const isCurrentPage = pageNum === local_page;
                      return (
                          <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-4 py-2 rounded-md font-semibold
                                ${isCurrentPage ? 'bg-blue-500 text-white' : 'bg-white text-blue-600 hover:bg-blue-100'}`}
                          >
                              {pageNum}
                          </button>
                      );
                  })}
                  <button
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.total_pages || !searchResults?.pagination}
                    className={`px-4 py-2 rounded-md ${
                      pagination.current_page === pagination.total_pages || !searchResults?.pagination
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-white text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
};

export default UV_SearchResults;