import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// --- Global State ---
// Assuming the Zustand store hook is exported as useAppStore from '@/store/main'
import { useAppStore } from '@/store/main'; // Adjust path if necessary

// --- API Base URL ---
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// --- Interfaces (ensure these match your API specifications or global types) ---

// Assuming RecipeSummary is defined in global types or can be defined here
interface RecipeSummary {
  recipe_id: number;
  title: string;
  description: string;
  cover_photo_url: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  difficulty_level: 'Easy' | 'Medium' | 'Hard';
  average_rating: number | null;
  user_id: number;
  username: string;
  tags: string[];
  saved_at?: string | null; // Optional, useful if API returns it
}

interface PaginatedSavedRecipesResponse {
  recipes: RecipeSummary[];
  pagination: {
    total_items: number;
    total_pages: number;
    current_page: number;
    items_per_page: number;
  };
}

// --- API Fetching Functions ---

const fetchSavedRecipes = async (accessToken: string): Promise<PaginatedSavedRecipesResponse> => {
  if (!accessToken) {
    throw new Error('User not authenticated');
  }

  // Set auth header for Axios. Use instance if configured in store, otherwise set directly.
  const { data } = await axios.get<PaginatedSavedRecipesResponse>(
     `${API_BASE_URL}/users/me/saved-recipes`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return data;
};

const unsaveRecipe = async ({ recipe_id, accessToken }: { recipe_id: number; accessToken: string }): Promise<void> => {
  if (!accessToken) {
    throw new Error('User not authenticated');
  }

  await axios.delete(
     `${API_BASE_URL}/users/me/saved-recipes/${recipe_id}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
};

// --- View Component ---

const UV_UserSavedRecipes: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Access Zustand store for state and actions
  const { saved_recipes, saved_recipes_loading, showNotification, setSavedRecipes, setSavedRecipesLoading, setPaginationInfo } = useAppStore((state) => ({
    saved_recipes: state.saved_recipes,
    saved_recipes_loading: state.saved_recipes_loading,
    showNotification: state.showNotification,
    setSavedRecipes: state.setSavedRecipes,
    setSavedRecipesLoading: state.setSavedRecipesLoading,
    setPaginationInfo: state.setPaginationInfo,
  }));

  const accessToken = useAppStore((state) => state.access_token);

  // --- React Query Hooks ---

  // Query for fetching saved recipes
  const savedRecipesQuery = useQuery<PaginatedSavedRecipesResponse, Error>({
    queryKey: ['savedRecipes'],
    queryFn: () => fetchSavedRecipes(accessToken!),
    enabled: !!accessToken, // Only fetch if authenticated
    onSuccess: (data) => {
      setSavedRecipes(data.recipes || []);
      setPaginationInfo(data.pagination);
      setSavedRecipesLoading(false);
    },
    onError: (error) => {
      console.error("Error fetching saved recipes:", error);
      showNotification(error.message || "Could not load saved recipes.", 'error');
      setSavedRecipes([]);
      setPaginationInfo({ total_items: 0, total_pages: 0, current_page: 1, items_per_page: 10 }); // Reset pagination
      setSavedRecipesLoading(false);
    },
  });

  // Mutation for unsaving a recipe
  const unsaveRecipeMutation = useMutation<void, Error, { recipeId: number }>({
    mutationFn: ({ recipeId }) => unsaveRecipe({ recipe_id: recipeId, accessToken: accessToken! }),
    onMutate: async ({ recipeId }) => {
      await queryClient.cancelQueries({ queryKey: ['savedRecipes'] });
      
      const previousSavedRecipes = saved_recipes;
      setSavedRecipes(previousSavedRecipes.filter(recipe => recipe.recipe_id !== recipeId));
      setSavedRecipesLoading(true); // Indicate ongoing update

      return { previousSavedRecipes };
    },
    onSuccess: () => {
      showNotification("Recipe unsaved successfully!", 'success');
      // Invalidate to ensure cache consistency, although optimistic update is done.
      // This also helps if background fetches are happening.
      queryClient.invalidateQueries({ queryKey: ['savedRecipes'] });
      setSavedRecipesLoading(false); // Turn off loading indicator after success
    },
    onError: (error, { recipeId }, context) => {
      if (context?.previousSavedRecipes) {
        setSavedRecipes(context.previousSavedRecipes);
      }
      console.error(`Error unsaving recipe ${recipeId}:`, error);
      showNotification(error.message || "Failed to unsave recipe.", 'error');
      setSavedRecipesLoading(false); // Ensure loading is off on error
    },
  });

  // Effect to handle navigation if not authenticated
  useEffect(() => {
    if (!accessToken) {
      navigate('/login');
    }
  }, [accessToken, navigate]); // Dependency on accessToken to react to auth changes

  const handleUnsave = (recipeId: number) => {
    unsaveRecipeMutation.mutate({ recipeId });
  };

  const isLoading = savedRecipesQuery.isLoading || saved_recipes_loading;
  const displayedRecipes = useMemo(() => saved_recipes, [saved_recipes]); // Memoize for performance

  return (
    <>
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">
        My Saved Recipes
      </h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 dark:text-gray-400 animate-pulse">Loading your saved recipes...</p>
        </div>
      ) : displayedRecipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            You haven't saved any recipes yet. Time to explore!
          </p>
          <Link
            to="/browse"
            className="inline-block px-6 py-3 text-white bg-purple-600 rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
          >
            Browse Recipes
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedRecipes.map((recipe) => (
            <div
              key={recipe.recipe_id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden relative transition-shadow duration-300 hover:shadow-xl"
            >
              <Link to={`/recipes/${recipe.recipe_id}`} className="block group">
                <img
                  src={recipe.cover_photo_url || 'https://picsum.photos/seed/picsum/400/300'} // Fallback image
                  alt={recipe.title}
                  className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </Link>

              <div className="p-4">
                <Link to={`/recipes/${recipe.recipe_id}`} className="block group">
                 <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white group-hover:text-purple-600">
                    {recipe.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>{recipe.username}</span>
                    {recipe.average_rating !== null && (
                      <span className="flex items-center">
                        <svg className="w-4 h-4 fill-current text-yellow-500 mr-0.5" viewBox="0 0 20 20">
                           <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.431a1 1 0 00-.364.901l1.07 3.292c.3.921-.755 1.688-1.54 1.031l-2.8-2.43a1 1 0 00-1.069 0l-2.8 2.431c-.785.657-1.84-.109-1.54-1.031l1.07-3.292a1 1 0 00-.364-.901l-2.8-2.431c-.784-.57-0.383-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        {recipe.average_rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                   {recipe.description}
                  </p>
                </Link>


                {/* Unsave Button */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleUnsave(recipe.recipe_id)}
                    disabled={unsaveRecipeMutation.isPending}
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400 rounded-lg border border-red-300 hover:bg-red-200 dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.34 11.21a8.855 8.855 0 00-1.256 5.082 4.553 4.553 0 004.553 4.553c.765 0 1.528-.112 2.241-.331a8.855 8.855 0 002.778-1.325l1.486-1.485a.606.606 0 00.18-.505a.609.609 0 00-.39-.313l-.183-.061a8.859 8.859 0 00-3.004-1.485c-.679-.132-1.374-.207-2.08-.207a8.859 8.859 0 00-2.08.207l-2.507 1.146zm7.703-4.772a4.553 4.553 0 00-4.553-4.553c-.765 0-1.528.112-2.241.331a8.855 8.855 0 00-1.325 2.778c-.218.713-.331 1.476-.331 2.241 0 .786.206 1.549.588 2.241a8.859 8.859 0 001.485 3.004l1.486 1.485a.609.609 0 00.39.313c.132.047.276.043.409-.01l.183-.061a8.859 8.859 0 002.08-.207 4.559 4.559 0 002.241-.331 8.855 8.855 0 001.325-2.778 4.553 4.553 0 00-.331-2.241 4.553 4.553 0 00-1.81-1.588c-.69-.383-1.453-.588-2.241-.588zM11.5 1.5a.5.5 0 00-.5.5v12.097a8.864 8.864 0 005.177 1.549c1.24.23 2.32-.505 2.977-1.553.657-.993.991-2.149.991-3.36V2a.5.5 0 00-.5-.5h-5z"/></svg>
                    Unsave
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls - Uncomment and implement if using pagination */}
      {/* { !isLoading && savedRecipes.length > 0 && ( <PaginationControls pagination={pagination_info} onPageChange={handlePageChange} /> ) } */}
    </>
  );
};

export default UV_UserSavedRecipes;