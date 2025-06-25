import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// Re-importing necessary types from the store for clarity and usage within the component
import { useAppStore } from '@/store/main'; // Assuming your store hook is exported as useAppStore
import {
  RecipeSummary,
  PaginationInfo,
  FilterParams,
  RecipeDetail, // For potential use in context, though not directly fetched here
} from '@/store/main'; // Import types from your store definition

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// --- Interfaces ---

interface RecipeCardProps {
  recipe: RecipeSummary;
}

// --- Helper Components (Inline JSX for Recipe Card) ---
const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  return (
    <Link to={`/recipes/${recipe.recipe_id}`} className="group rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 bg-white">
      <img
        src={recipe.cover_photo_url || `https://picsum.photos/seed/${recipe.recipe_id}/400/300`}
        alt={recipe.title}
        className="w-full h-48 object-cover"
        loading="lazy"
      />
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{recipe.title}</h3>
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{recipe.description}</p>
        <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
          <span>
            Prep: {recipe.prep_time_minutes} min | Cook: {recipe.cook_time_minutes} min
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium
            ${recipe.difficulty_level === 'Easy' ? 'bg-green-100 text-green-800' : ''}
            ${recipe.difficulty_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' : ''}
            ${recipe.difficulty_level === 'Hard' ? 'bg-red-100 text-red-800' : ''}
          `}>
            {recipe.difficulty_level}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-4 h-4 ` + (i < Math.floor(recipe.average_rating ?? 0) ? 'text-yellow-400 fill-current' : 'text-gray-300 fill-current')}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.283 1.886.321l.914 2.172a1 1 0 00.978.677l2.38.347c.958.136 1.287 1.216.597 1.872l-1.714 1.767a1 1 0 00-.294.924l.411 2.37a1 1 0 01-1.463.992l-2.164-.887a1 1 0 00-1.004 0l-2.164.887a1 1 0 01-1.462-.992l.41-2.37a1 1 0 00-.294-.924l-1.714-1.767c-.691-.656-.363-1.736.597-1.872l2.38-.347a1 1 0 00.978-.677l.914-2.172z" />
              </svg>
            ))}
            {recipe.average_rating !== null && (
              <span className="ml-1 text-gray-700 text-sm font-medium">
                {recipe.average_rating.toFixed(1)}
              </span>
            )}
          </div>
           <div className="flex items-center text-gray-600 text-xs">
             <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
            </svg>
            {recipe.username}
           </div>
        </div>
        {recipe.tags && recipe.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
                {recipe.tags.slice(0, 2).map((tag) => (
                    <Link
                        key={tag}
                        to={`/browse?tags=${encodeURIComponent(tag)}`}
                        className="text-indigo-600 hover:text-indigo-800 text-xs bg-indigo-100 px-2 py-1 rounded-md"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent navigating to recipe detail
                        }}
                    >
                        {tag}
                    </Link>
                ))}
                 {recipe.tags.length > 2 && <span className="text-xs text-gray-500">+{recipe.tags.length - 2} more</span>}
            </div>
        )}
      </div>
    </Link>
  );
};

// --- API Fetching Function ---
const fetchRecipesFn = async (
  currentFilters: FilterParams,
  currentSortOrder: string,
  currentPage: number,
  itemsPerPage: number,
): Promise<PaginatedRecipesResponse> => {
  const queryParams = new URLSearchParams();

  // Apply filters
  if (currentFilters.tags && currentFilters.tags.length > 0)
    queryParams.append('tags', currentFilters.tags.join(','));
  if (currentFilters.difficulty && currentFilters.difficulty.length > 0)
    queryParams.append('difficulty', currentFilters.difficulty.join(','));
  if (currentFilters.max_prep_time !== null && currentFilters.max_prep_time !== undefined)
    queryParams.append('max_prep_time', String(currentFilters.max_prep_time));
  if (currentFilters.max_cook_time !== null && currentFilters.max_cook_time !== undefined)
    queryParams.append('max_cook_time', String(currentFilters.max_cook_time));
  if (currentFilters.min_rating !== null && currentFilters.min_rating !== undefined)
    queryParams.append('min_rating', String(currentFilters.min_rating));

  // Apply sorting and pagination
  queryParams.append('sort_by', currentSortOrder);
  queryParams.append('page', String(currentPage));
  queryParams.append('limit', String(itemsPerPage));

  const { data } = await axios.get<PaginatedRecipesResponse>(
    `${API_BASE_URL}/recipes?${queryParams.toString()}`,
  );
  return data;
};

// --- Fetch Available Tags Function ---
// Assumes tags are fetched separately. If they are part of another endpoint response, adjust accordingly.
// For now, let's assume a hypothetical endpoint or a default list if fetching fails.
const fetchAvailableTagsFn = async (): Promise<string[]> => {
    try {
        // This endpoint is hypothetical. Adjust if tags are available elsewhere (e.g., in recipe list response)
        // const response = await axios.get<{ tags: string[] }>(`${API_BASE_URL}/tags`);
        // return response.data.tags;

        // If no dedicated endpoint, use a mock list or integrate from another fetched resource
        // For this example, we'll use a static list that matches backend enum-like values for tags
        const mockTags = [
            "Pre-Workout Fuel", "Post-Workout Recovery", "High Protein",
            "Low Carb Snacks", "Quick Meals (<30 Min)", "Breakfast", "Lunch",
            "Dinner", "Snacks", "Beverages", "Endurance Fuel",
            "Strength Training Support", "Electrolyte Rich"
        ];
        return mockTags;

    } catch (error) {
        console.error("Failed to fetch available tags:", error);
        return []; // Return empty array on error
    }
};

// --- Main Component: UV_BrowseRecipes ---
const UV_BrowseRecipes: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- Global State Access ---
  const {
      filter_params: globalFilterParams,
      sort_order: globalSortOrder,
      // paginated_recipes, // Not directly used for fetching logic here
      // recipe_loading, // Not directly used, React Query state is preferred
      // recipe_fetch_error, // Not directly used, React Query state is preferred
      setFilters,
      setSortOrder,
      setPage,
      clearFilters: clearGlobalFilters,
      // available_tags: globalAvailableTags, // Replaced by fetched tags
  } = useAppStore();

  // --- Local State Management for Filters and Sorting ----
  const [localFilterParams, setLocalFilterParams] = useState<FilterParams>(() => {
    const params = Object.fromEntries(searchParams);
    return {
      tags: params.tags ? params.tags.split(',') : globalFilterParams?.tags || [],
      difficulty: params.difficulty ? params.difficulty.split(',') : globalFilterParams?.difficulty || [],
      max_prep_time: params.max_prep_time ? parseInt(params.max_prep_time, 10) : globalFilterParams?.max_prep_time ?? null,
      max_cook_time: params.max_cook_time ? parseInt(params.max_cook_time, 10) : globalFilterParams?.max_cook_time ?? null,
      min_rating: params.min_rating ? parseFloat(params.min_rating) : globalFilterParams?.min_rating ?? null,
    };
  });
  const [localSortOrder, setLocalSortOrder] = useState<string>(
    searchParams.get('sort_by') || globalSortOrder || 'newest',
  );
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const pageParam = searchParams.get('page');
    return pageParam ? parseInt(pageParam, 10) : 1;
  });
  const [itemsPerPage] = useState<number>(10); // Fixed items per page for now

  // --- Fetching Global Configurations (Tags) ---
  const { data: fetchedAvailableTags, isLoading: isLoadingTags } = useQuery<string[]>({
    queryKey: ['available_tags'], // Cache tags globally
    queryFn: fetchAvailableTagsFn,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour, adjust as needed
    refetchOnWindowFocus: false, // Tags usually don't change per window focus
  });

  // --- Effect to Sync State with URL Search Params and Global Store ---
  useEffect(() => {
    const params = Object.fromEntries(searchParams);
    let needsStateUpdate = false;

    const urlSortOrder = params.sort_by || 'newest';
    const urlPage = parseInt(params.page || '1', 10);

    let urlFilters: Partial<FilterParams> = {};
    if (params.tags) urlFilters.tags = params.tags.split(',');
    if (params.difficulty) urlFilters.difficulty = params.difficulty.split(',');
    if (params.max_prep_time) urlFilters.max_prep_time = parseInt(params.max_prep_time, 10);
    if (params.max_cook_time) urlFilters.max_cook_time = parseInt(params.max_cook_time, 10);
    if (params.min_rating) urlFilters.min_rating = parseFloat(params.min_rating);

    // Update local state and global state if URL params differ
    if (urlSortOrder !== localSortOrder) {
      setLocalSortOrder(urlSortOrder);
      setSortOrder(urlSortOrder as 'newest' | 'rating' | 'popularity'); // Type assertion
      needsStateUpdate = true;
    }
    if (urlPage !== currentPage) {
      setCurrentPage(urlPage);
      setPage(urlPage); // Update global state for pagination context
      needsStateUpdate = true;
    }

    // Check if any filters need updating
    const currentLocalFilters = localFilterParams;
    const updatedFilters: Partial<FilterParams> = {};
    let filterChanged = false;

    (['tags', 'difficulty', 'max_prep_time', 'max_cook_time', 'min_rating'] as (keyof FilterParams)[]).forEach(key => {
      let urlValue = urlFilters[key];
      let localValue = currentLocalFilters[key];

      // Normalize for comparison if comparing arrays
      if (Array.isArray(urlValue) && Array.isArray(localValue)) {
        if (JSON.stringify(urlValue.sort()) !== JSON.stringify(localValue.sort())) {
          updatedFilters[key] = urlValue as any;
          filterChanged = true;
        }
      } else if (urlValue !== localValue) {
        // Basic comparison for non-array types
        if (urlValue === undefined) urlValue = null; // Treat missing URL param as null rather than undefined
        if (localValue === undefined) localValue = null;

        if (urlValue !== localValue) {
          updatedFilters[key] = urlValue as any;
          filterChanged = true;
        }
      }
    });

    if (filterChanged) {
      setLocalFilterParams(prev => ({ ...prev, ...updatedFilters }));
      setFilters(updatedFilters as FilterParams);
      needsStateUpdate = true;
    }

    // Use the queryClient to invalidate and refetch if state has changed to avoid stale data due to sync issues
    if (needsStateUpdate) {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    }

  }, [searchParams, globalFilterParams, globalSortOrder, setFilters, setSortOrder, setPage, navigate, queryClient, localFilterParams, localSortOrder, currentPage]);

  // --- React Query for Fetching Recipes ---
  const queryClient = useQueryClient();
  const recipesQuery = useQuery<PaginatedRecipesResponse, Error>({
    queryKey: [
      'recipes',
      localFilterParams,
      localSortOrder,
      currentPage,
      itemsPerPage,
    ],
    queryFn: () => fetchRecipesFn(
      localFilterParams,
      localSortOrder,
      currentPage,
      itemsPerPage,
    ),
    keepPreviousData: true, // Improves UX during pagination/fetching
  });

  // --- Selectors for rendering data ---
  const recipes_list = recipesQuery.data?.recipes || [];
  const pagination_info: PaginationInfo = recipesQuery.data?.pagination || {
      total_items: 0,
      total_pages: 0,
      current_page: 1,
      items_per_page: itemsPerPage,
  };

  // --- Handlers ---

  const handleFilterChange = useCallback(
    (filterName: keyof FilterParams, value: any) => {
      setLocalFilterParams((prev) => {
        const newFilters = { ...prev };
        if (filterName === 'tags' || filterName === 'difficulty') {
          // Handle multi-select (toggle item)
          const currentArray = newFilters[filterName] as string[];
          if (currentArray.includes(value)) {
            newFilters[filterName] = currentArray.filter((item) => item !== value) as any;
          } else {
            newFilters[filterName] = [...currentArray, value] as any;
          }
        } else {
          // Handle single value filters (like time, rating)
          // Ensure numeric conversion for time/rating filters
          if (filterName === 'max_prep_time' || filterName === 'max_cook_time') {
            newFilters[filterName] = value === '' ? null : parseInt(value, 10);
          } else if (filterName === 'min_rating') {
            newFilters[filterName] = value === '' ? null : parseFloat(value);
          } else {
            newFilters[filterName] = value;
          }
        }
        return newFilters;
      });
    },
    [],
  );

  const handleApplyFilters = useCallback(() => {
    // Update global state with local changes
    setFilters(localFilterParams);
    setSortOrder(localSortOrder as 'newest' | 'rating' | 'popularity'); // Type assertion
    setCurrentPage(1); // Reset to first page when filters/sort change

    // Update URL search parameters
    const newSearchParams = new URLSearchParams();
    localFilterParams.tags?.forEach(tag => newSearchParams.append('tags', tag));
    localFilterParams.difficulty?.forEach(diff => newSearchParams.append('difficulty', diff));
    if (localFilterParams.max_prep_time !== null && localFilterParams.max_prep_time !== undefined) newSearchParams.append('max_prep_time', String(localFilterParams.max_prep_time));
    if (localFilterParams.max_cook_time !== null && localFilterParams.max_cook_time !== undefined) newSearchParams.append('max_cook_time', String(localFilterParams.max_cook_time));
    if (localFilterParams.min_rating !== null && localFilterParams.min_rating !== undefined) newSearchParams.append('min_rating', String(localFilterParams.min_rating));
    if (localSortOrder !== 'newest') newSearchParams.append('sort_by', localSortOrder);
    newSearchParams.append('page', '1'); // Always reset to page 1

    setSearchParams(newSearchParams, { replace: true }); // Use replace to avoid cluttering history

    // React query will refetch automatically due to queryKey dependency changes
  }, [localFilterParams, localSortOrder, setFilters, setSortOrder, setCurrentPage, setSearchParams, queryClient]);

  const handleClearFilters = useCallback(() => {
    setLocalFilterParams({
      tags: [],
      difficulty: [],
      max_prep_time: null,
      max_cook_time: null,
      min_rating: null,
    });
    setLocalSortOrder('newest');
    setCurrentPage(1);

    // Update global state
    clearGlobalFilters(); // This should reset global filters, sort, and pagination

    // Clear URL parameters related to filters and sort
    const newSearchParams = new URLSearchParams();
    newSearchParams.append('page', '1'); // Reset page param
    setSearchParams(newSearchParams, { replace: true });

    // React query will refetch automatically
  }, [clearGlobalFilters, setLocalFilterParams, setLocalSortOrder, setCurrentPage, setSearchParams, queryClient]);

  const handleSortChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSortOrder = event.target.value as 'newest' | 'rating' | 'popularity'; // Type assertion
    setLocalSortOrder(newSortOrder);
    setSortOrder(newSortOrder); // Update global state
    setCurrentPage(1); // Reset page on sort change

    // Update URL
    const current = new URLSearchParams(searchParams);
    if (newSortOrder !== 'newest') {
        current.set('sort_by', newSortOrder);
    } else {
        current.delete('sort_by');
    }
    current.set('page', '1'); // Reset page
    setSearchParams(current, { replace: true });

    // React query will refetch automatically
  }, [setSortOrder, setCurrentPage, setSearchParams, searchParams, queryClient]);

  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= pagination_info.total_pages) {
      setCurrentPage(page);
      setPage(page); // Update global state for pagination context

      // Update URL
      const current = new URLSearchParams(searchParams);
      current.set('page', String(page));
      setSearchParams(current, { replace: true });

      // React Query will refetch due to dependency change
    }
  }, [pagination_info.total_pages, setPage, setSearchParams, searchParams]);

  const handleTagFilterToggle = useCallback((tag: string) => {
    setLocalFilterParams(prev => {
      const currentTags = prev.tags || [];
      const newTags = currentTags.includes(tag)
          ? currentTags.filter(t => t !== tag)
          : [...currentTags, tag];
      return { ...prev, tags: newTags };
    });
  }, []);

  const handleDifficultyFilterFilterToggle = useCallback((difficulty: string) => {
    setLocalFilterParams(prev => {
      const currentDifficulties = prev.difficulty || [];
      const newDifficulties = currentDifficulties.includes(difficulty)
          ? currentDifficulties.filter(d => d !== difficulty)
          : [...currentDifficulties, difficulty];
      return { ...prev, difficulty: newDifficulties };
    });
  }, []);

  // --- Navigation Helper ---
  const navigate_to_recipe = useCallback(
    (recipe_id: number) => {
      navigate(`/recipes/${recipe_id}`);
    },
    [navigate],
  );

  // --- Determine available tags ---
  const effectiveAvailableTags = fetchedAvailableTags || []; // Use fetched tags, fallback to empty

  return (
    <>
      {/* Filter and Sort Controls Section */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Explore Recipes</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* Tags Filter */}
          <div>
            <label htmlFor="tags-filter" className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex flex-wrap gap-2">
              {isLoadingTags ? (
                <p className="text-sm text-gray-500">Loading tags...</p>
              ) : (
                effectiveAvailableTags.slice(0, 5).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagFilterToggle(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200
                      ${(localFilterParams.tags || []).includes(tag)
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    {tag}
                  </button>
                ))
              )}
              {effectiveAvailableTags.length > 5 && <span className="text-xs text-gray-500 ml-1">...</span>}
            </div>
            {/* Basic Multi-select dropdown for more tags */}
            <select
              id="tags-filter-dropdown"
              multiple
              value={localFilterParams.tags || []}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
                setLocalFilterParams(prev => ({ ...prev, tags: selectedOptions }));
              }}
              className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {effectiveAvailableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label htmlFor="difficulty-filter" className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
             <div className="flex flex-wrap gap-2">
                 {['Easy', 'Medium', 'Hard'].map(difficulty => (
                    <button
                        key={difficulty}
                        onClick={() => handleDifficultyFilterFilterToggle(difficulty)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200
                            ${(localFilterParams.difficulty || []).includes(difficulty)
                                ? 'bg-indigo-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        {difficulty}
                    </button>
                 ))}
             </div>
          </div>

          {/* Prep Time Filter */}
          <div>
            <label htmlFor="prep-time-filter" className="block text-sm font-medium text-gray-700 mb-1">Max Prep Time (min)</label>
            <input
              type="number"
              id="prep-time-filter"
              placeholder="e.g., 30"
              value={localFilterParams.max_prep_time ?? ''}
              onChange={(e) => handleFilterChange('max_prep_time', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              min="0"
            />
          </div>

          {/* Cook Time Filter */}
          <div>
            <label htmlFor="cook-time-filter" className="block text-sm font-medium text-gray-700 mb-1">Max Cook Time (min)</label>
            <input
              type="number"
              id="cook-time-filter"
              placeholder="e.g., 30"
              value={localFilterParams.max_cook_time ?? ''}
              onChange={(e) => handleFilterChange('max_cook_time', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
               min="0"
            />
          </div>

          {/* Min Rating Filter */}
          <div>
            <label htmlFor="min-rating-filter" className="block text-sm font-medium text-gray-700 mb-1">Min Rating</label>
            <select
              id="min-rating-filter"
              value={localFilterParams.min_rating ?? ''}
              onChange={(e) => handleFilterChange('min_rating', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">-- All Ratings --</option>
              {[1, 2, 3, 4, 5].map((rating) => (
                <option key={rating} value={rating}>{rating}+ Stars</option>
              ))}
            </select>
          </div>

            {/* Sort Order Selector */}
            <div className="flex flex-col">
                <label htmlFor="sort-order-select" className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                    id="sort-order-select"
                    value={localSortOrder}
                    onChange={handleSortChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                    <option value="newest">Newest</option>
                    <option value="rating">Highest Rated</option>
                    <option value="popularity">Most Popular</option>
                </select>
            </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={handleApplyFilters}
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            disabled={recipesQuery.isLoading || isLoadingTags}
          >
            Apply Filters
          </button>
          <button
            onClick={handleClearFilters}
            className="px-6 py-2 bg-gray-300 text-gray-800 font-semibold rounded-md shadow-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            disabled={recipesQuery.isLoading || isLoadingTags}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Recipe List Section */}
      <div className="relative">
        {recipesQuery.isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
            <div className="flex flex-col items-center">
              <svg className="animate-spin h-8 w-8 text-indigo-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 8l2.708-1.708z"></path>
              </svg>
              <span className="text-lg font-semibold text-gray-700">Loading recipes...</span>
            </div>
          </div>
        )}
        {recipesQuery.isError && (
          <div className="text-center py-10 px-4">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Error loading recipes</h3>
            <p className="text-red-500 mb-4 max-w-md mx-auto">{recipesQuery.error?.message || 'An unknown error occurred.'}</p>
            <button
              onClick={() => recipesQuery.refetch()}
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Retry
            </button>
          </div>
        )}

        {!recipesQuery.isLoading && !recipesQuery.isError && recipes_list.length === 0 && (
            <div className="text-center py-10 px-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No recipes found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your filters or search criteria.</p>
                 <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                    Clear Filters
                </button>
            </div>
        )}

        {!recipesQuery.isLoading && !recipesQuery.isError && recipes_list.length > 0 && (
            <>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {recipes_list.map((recipe) => (
                    <RecipeCard key={recipe.recipe_id} recipe={recipe} />
                ))}
            </div>

            {/* Pagination Controls */}
            {pagination_info.total_pages > 1 && (
              <div className="flex justify-center items-center mt-10 space-x-4">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || recipesQuery.isLoading}
                  className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <span className="text-sm font-medium text-gray-700">
                  Page {currentPage} of {pagination_info.total_pages}
                </span>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination_info.total_pages || recipesQuery.isLoading}
                  className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default UV_BrowseRecipes;