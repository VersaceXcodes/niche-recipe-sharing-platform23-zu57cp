import React, { useState, useEffect, Fragment, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as OutlineStarIcon } from '@heroicons/react/24/outline'; // For empty stars when disabled

// Import necessary types and store hooks
import { useAppStore } from '@/store/main'; // Assuming the store hook is exported as useAppStore
import {
  RecipeDetail,
  RecipeComment,
  UserSummary,
  IngredientDetail,
  InstructionDetail,
  Notification,
  RecipeSummary, // Import RecipeSummary for saved recipes check
} from '@/store/main'; // Import types from the store

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// --- Helper Interfaces ---
// Specific state managed within this component
interface RecipeViewLocalState {
  recipe_details: RecipeDetail | null;
  user_rating: number | null; // User's current rating (1-5) for this recipe
  comment_input: string;
  is_authenticated: boolean;
  is_recipe_owner: boolean;
  is_recipe_saved: boolean;
  is_posting_comment: boolean;
  is_updating_rating: boolean;
  comment_error: string | null;
  fetch_error: string | null;
}

// Payload types for mutations
interface UpdateRatingPayload {
  rating: number;
}

interface PostCommentPayload {
  comment_text: string;
}

// Define the structure for useParams hook
type RecipeParams = {
  recipe_id: string;
};

// --- Axios Instance ---
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// --- Component Implementation ---
const UV_RecipeView: React.FC = () => {
  const { recipe_id } = useParams<RecipeParams>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- Global State Access ---
  // Destructure necessary states and actions from the Zustand store
  const {
    is_authenticated,
    user_profile_summary,
    saved_recipes, // Access the list of saved recipes to check status
    showNotification,
    fetchRecipeById, // Action to fetch recipe details
    submitRating,    // Action to submit/update rating
    postComment,     // Action to post a comment
    deleteComment,   // Action to delete a comment
    saveRecipe,      // Action to save a recipe
    unsaveRecipe,    // Action to unsave a recipe
    fetchSavedRecipes, // Action to fetch the list of saved recipes
    setFilters, // Action to set filters for browse page
    setSearchQuery, // Action to set search query for browse page
  } = useAppStore((state) => ({
    is_authenticated: state.is_authenticated,
    user_profile_summary: state.user_profile_summary,
    saved_recipes: state.saved_recipes,
    showNotification: state.showNotification,
    fetchRecipeById: state.fetchRecipeById,
    submitRating: state.submitRating,
    postComment: state.postComment,
    deleteComment: state.deleteComment,
    saveRecipe: state.saveRecipe,
    unsaveRecipe: state.unsaveRecipe,
    fetchSavedRecipes: state.fetchSavedRecipes,
    setFilters: state.setFilters,
    setSearchQuery: state.setSearchQuery,
  }));

  const recipeIdNum = React.useMemo(() => (recipe_id ? parseInt(recipe_id, 10) : NaN), [recipe_id]);

  // --- Local Component State ---
  const [localState, setLocalState] = useState<RecipeViewLocalState>({
    recipe_details: null,
    user_rating: null,
    comment_input: '',
    is_authenticated: is_authenticated, // Initialize based on global state
    is_recipe_owner: false,
    is_recipe_saved: false,
    is_posting_comment: false,
    is_updating_rating: false,
    comment_error: null,
    fetch_error: null,
  });

  // --- Data Fetching with React Query ---

  // Fetch main recipe details
  const {
    data: fetchedRecipeDetails, // Data from the query
    isLoading: isRecipeLoading,
    isError: isRecipeError,
    error: recipeError,
  } = useQuery<RecipeDetail, Error>({
    queryKey: ['recipe', recipe_id], // Unique key for this recipe
    queryFn: () => fetchRecipeById(recipeIdNum), // Call store action
    enabled: !isNaN(recipeIdNum), // Only fetch if recipe_id is available
    onSuccess: (data) => {
      // Determine ownership and initial saved status after recipe data is loaded
      const owner =
        user_profile_summary?.user_id === data.submitter?.user_id;
      
      // Check saved status against the globally fetched saved_recipes list.
      // This relies on saved_recipes being up-to-date (see useEffect below).
      const isSaved = saved_recipes.some((recipe: RecipeSummary) => recipe.recipe_id === data.recipe_id);

      setLocalState((prevState) => ({
        ...prevState,
        recipe_details: data,
        is_recipe_owner: owner,
        is_recipe_saved: isSaved,
        // user_rating is fetched separately or potentially included in data
      }));
    },
    onError: (error) => {
      console.error('Error fetching recipe details:', error);
      // Set local state to reflect error
      setLocalState((prevState) => ({
        ...prevState,
        recipe_details: null,
        fetch_error: error.message || 'An unknown error occurred.',
      }));
    },
  });

  // Fetch user's specific rating for this recipe
  // NOTE: This assumes a backend endpoint or that recipeDetailsData could potentially
  // include user-specific rating if authenticated. If not, a dedicated endpoint is needed.
  // For this example, we are keeping it as a separate query.
  const { data: userRatingData, isLoading: isUserRatingLoading, refetch: refetchUserRating } = useQuery<number | null, Error>({
    queryKey: ['recipe', recipe_id, 'userRating'],
    queryFn: async () => {
      if (!is_authenticated || isNaN(recipeIdNum)) return null; // Only fetch if authenticated
      try {
        // Hypothetical API call to get user's rating for this recipe
        // Example: GET /api/v1/recipes/{recipe_id}/ratings/me
        // Replace with actual endpoint if available, or handle logic differently
        const response = await axiosInstance.get(`/recipes/${recipeIdNum}/ratings/me`, {
          headers: { Authorization: `Bearer ${useAppStore.getState().access_token}` },
        });
        return response.data?.rating ?? null;
      } catch (error) {
        console.error('Error fetching user rating:', error);
        // Treat 404 or unauthorized as no rating, not a critical error for the component
        if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 401)) {
          return null;
        }
        throw error; // Re-throw other errors
      }
    },
    enabled: is_authenticated && !isNaN(recipeIdNum), // Only enable if authenticated and recipe_id exists
  });

  // Fetch saved recipes list to determine `is_recipe_saved` status
  const { data: savedRecipesList, isLoading: isSavedRecipesLoading, refetch: refetchSavedRecipes } = useQuery<RecipeSummary[], Error>({
    queryKey: ['user', 'savedRecipes'],
    queryFn: async () => {
      if (!is_authenticated) return [];
      // Assuming saveRecipe/unsaveRecipe internally call a fetchSavedRecipes or similar
      // If not, we fetch it here.
      try {
        // Ensure fetchSavedRecipes is called or call API directly
        // Example: await fetchSavedRecipes(); // If fetchSavedRecipes updates cache
        // Or directly fetch: const response = ...
        return await fetchSavedRecipes();
      } catch (error) {
        console.error('Error fetching saved recipes:', error);
        return [];
      }
    },
    enabled: is_authenticated,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Update component state when relevant data is fetched
  useEffect(() => {
    if (fetchedRecipeDetails) {
      const owner = user_profile_summary?.user_id === fetchedRecipeDetails.submitter?.user_id;
      const isSaved = savedRecipesList?.some((recipe: RecipeSummary) => recipe.recipe_id === fetchedRecipeDetails.recipe_id) ?? false;

      setLocalState((prevState) => ({
        ...prevState,
        recipe_details: fetchedRecipeDetails,
        is_recipe_owner: owner,
        is_recipe_saved: isSaved,
        user_rating: userRatingData ?? null,
      }));
    }
  }, [fetchedRecipeDetails, userRatingData, savedRecipesList, user_profile_summary]);

  // Update local auth state if global auth changes
  useEffect(() => {
    setLocalState((prevState) => ({ ...prevState, is_authenticated: is_authenticated }));
  }, [is_authenticated]);

  // --- Mutations ---

  // Mutation hook for handling Save/Unsave Recipe action
  const saveUnsaveMutation = useMutation<boolean, Error, { recipe_id: number; is_saving: boolean }>({
    mutationFn: async ({ recipe_id, is_saving }) => {
      if (!is_authenticated) {
        // Notify user if not logged in
        showNotification('Please log in to save recipes.', 'info');
        return false;
      }
      let result = false;
      try {
        if (is_saving) {
          // Call Zustand action to save recipe
          result = await saveRecipe(recipe_id);
        } else {
          // Call Zustand action to unsave recipe
          result = await unsaveRecipe(recipe_id);
        }
        // Update local state optimistically if mutation was successful
        if (result) {
          // Optimistic update of local state
          setLocalState((prevState) => ({ ...prevState, is_recipe_saved: is_saving }));
          // Invalidate saved recipes query to ensure consistency
          queryClient.invalidateQueries({ queryKey: ['user', 'savedRecipes'] });
        } else {
          showNotification(is_saving ? 'Failed to save recipe.' : 'Failed to unsave recipe.', 'error');
        }
        return result;
      } catch (error) {
        console.error('Save/Unsave failed:', error);
        showNotification('Failed to update saved status.', 'error');
        return false;
      }
    },
  });

  // Mutation hook for handling Recipe Rating
  const rateMutation = useMutation<boolean, Error, { rating: number }>({
    mutationFn: async ({ rating }) => {
      if (!is_authenticated || isNaN(recipeIdNum)) {
        showNotification('Please log in to rate recipes.', 'info');
        return false;
      }
      // Validate rating input
      if (rating < 1 || rating > 5) {
        showNotification('Rating must be between 1 and 5.', 'error');
        return false;
      }

      setLocalState((prev) => ({ ...prev, is_updating_rating: true })); // Set loading state
      try {
        const success = await submitRating(recipeIdNum, rating);
        if (success) {
          // Update local state with the new rating and remove loading indicator
          setLocalState((prevState) => ({
            ...prevState,
            user_rating: rating,
            is_updating_rating: false,
          }));
          // Invalidate recipe details query to refetch potentially updated avg rating/count
          queryClient.invalidateQueries({ queryKey: ['recipe', recipeIdNum] });
          // Re-fetch user rating as well, in case it's separate and updated
          refetchUserRating();
        } else {
          // Handle case where submitRating indicates failure without throwing error
          setLocalState((prev) => ({ ...prev, is_updating_rating: false }));
          showNotification('Failed to submit rating.', 'error');
        }
        return success;
      } catch (error) {
        console.error('Rating failed:', error);
        setLocalState((prev) => ({ ...prev, is_updating_rating: false }));
        showNotification('An error occurred while rating.', 'error');
        return false;
      }
    },
  });

  // Mutation hook for posting comments
  const commentMutation = useMutation<RecipeComment | null, Error, PostCommentPayload>({
    mutationFn: async ({ comment_text }) => {
      if (!is_authenticated || isNaN(recipeIdNum)) {
        showNotification('Please log in to comment.', 'info');
        return null;
      }
      // Validate comment input
      if (!comment_text.trim()) {
        setLocalState((prev) => ({ ...prev, comment_error: 'Comment cannot be empty' }));
        return null;
      }

      setLocalState((prev) => ({ ...prev, is_posting_comment: true, comment_error: null })); // Set loading state
      try {
        const newComment = await postComment(recipeIdNum, comment_text);
        if (newComment) {
          setLocalState((prevState) => ({
            ...prevState,
            comment_input: '', // Clear input field on success
            is_posting_comment: false,
          }));
          // The store action `postComment` should have updated the recipe_details.comments list.
          // No need to invalidate query if store action updates cache directly or component re-renders.
          // If strict cache invalidation is preferred:
          // queryClient.invalidateQueries({ queryKey: ['recipe', recipe_id] });
          // Invalidate recipe details to fetch the new comment
          queryClient.invalidateQueries({ queryKey: ['recipe', recipeIdNum] });
        } else {
             setLocalState((prev) => ({ ...prev, is_posting_comment: false }));
        }
        return newComment;
      } catch (error) {
        console.error('Comment posting failed:', error);
        setLocalState((prev) => ({ ...prev, is_posting_comment: false }));
        showNotification('Failed to post comment.', 'error');
        return null;
      }
    },
  });

  // Mutation hook for deleting comments
  const deleteCommentMutation = useMutation<boolean, Error, { comment_id: number }>({
    mutationFn: async ({ comment_id }) => {
      if (!is_authenticated) { // Additional security check
        showNotification('You must be logged in to delete comments.', 'info');
        return false;
      }
      // Confirm deletion with user
      if (!window.confirm('Are you sure you want to delete this comment?')) {
        return false;
      }
      try {
        const success = await deleteComment(comment_id);
        if (success) {
          // Store action `deleteComment` should update the local recipe_details.comments list.
          // Invalidate query if needed for strict consistency.
          // queryClient.invalidateQueries({ queryKey: ['recipe', recipe_id] });
          // Invalidate recipe details to refetch comments without the deleted one
          queryClient.invalidateQueries({ queryKey: ['recipe', recipeIdNum] });
        }
        return success;
      } catch (error) {
        console.error('Delete comment failed:', error);
        showNotification('Failed to delete comment.', 'error');
        return false;
      }
    },
  });

  // --- Navigation Handlers ---
  // Navigate to another user's profile page
  const handleNavigateToUserProfile = useCallback((username: string) => {
    navigate(`/profile/${username}`);
  }, [navigate]);

  // Navigate to the recipe editing form
  const handleNavigateToEditRecipe = useCallback(() => {
    if (localState.recipe_details?.recipe_id) {
      navigate(`/recipes/${localState.recipe_details.recipe_id}/edit`);
    }
  }, [navigate, localState.recipe_details?.recipe_id]);
  
  // Handle clicking on a recipe tag to filter browse results
  const handleTagClick = (tag: string) => {
    // Use global store action to set filter parameters
    setFilters({ tags: [tag] }); // Set filter to the clicked tag
    setSearchQuery(''); // Clear search query if navigating from recipe view
    navigate('/browse'); // Navigate to the browse page
  };
  

  // --- Render Logic ---

  // Show loading state while fetching recipe details
  if (isRecipeLoading || isUserRatingLoading || isSavedRecipesLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-gray-600">Loading recipe...</p>
      </div>
    );
  }

  // Show error state if fetching fails or no recipe details are available
  if (isRecipeError || !localState.recipe_details || isNaN(recipeIdNum)) {
    return (
      <div className="flex flex-col justify-center items-center h-96 text-red-500">
        <p>Error loading recipe.</p>
        {localState.fetch_error && <p className="text-sm">{localState.fetch_error}</p>}
        {!isNaN(recipeIdNum) && !isRecipeError && <p className="text-sm">Invalid Recipe ID.</p>}
      </div>
    );
  }

  // Destructure state for easier access in JSX
  const {
    recipe_details,
    user_rating,
    is_recipe_owner,
    is_recipe_saved,
    comment_input,
    is_posting_comment,
    is_updating_rating,
    comment_error,
  } = localState;
  
  const recipeIdNumFinal = recipeIdNum;

  // --- JSX Return ---
  return (
    <>
      {/* Main Recipe Card: Image and Core Details */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden md:flex mb-8">
        {/* Recipe Image Section */}
        <div className="md:w-1/2 lg:w-2/3">
          <img
            // Use fetched image URL or a placeholder if loading fails
            src={recipe_details.cover_photo_url || 'https://picsum.photos/seed/default_recipe_placeholder/800/600'}
            alt={recipe_details.title}
            className="w-full h-72 object-cover lg:h-96"
            onError={(e) => {
              // Basic error handling for image loading: replace with a fallback
              e.currentTarget.src = 'https://picsum.photos/seed/default_recipe_placeholder/800/600';
            }}
          />
        </div>

        {/* Recipe Details & Actions Section */}
        <div className="md:w-1/2 lg:w-1/3 p-6 flex flex-col justify-between">
          <div> {/* Content wrapper */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{recipe_details.title}</h1>
            <p className="text-gray-600 mb-4">{recipe_details.description}</p>

            {/* Key Timings & Servings */}
            <div className="flex items-center justify-between mb-4 text-sm text-gray-700 space-x-2">
              <div>
                <span className="font-medium">Prep time:</span> {recipe_details.prep_time_minutes} min
              </div>
              <div>
                <span className="font-medium">Cook time:</span> {recipe_details.cook_time_minutes} min
              </div>
              <div>
                <span className="font-medium">Servings:</span> {recipe_details.servings}
              </div>
            </div>
            
            {/* Difficulty Level */}
             <div className="mb-4">
                 <span className="font-medium text-gray-700 mr-2">Difficulty: </span>
                 <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                                  ${recipe_details.difficulty_level === 'Easy' ? 'bg-green-100 text-green-800' : 
                                    recipe_details.difficulty_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-red-100 text-red-800'}`}>
                     {recipe_details.difficulty_level}
                 </span>
            </div>

            {/* Average Rating Display */}
            <div className="flex items-center mb-4">
              <span className="font-medium text-gray-700 mr-2">Rating:</span>
              {recipe_details.average_rating !== null ? (
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon
                      key={i} // Unique key for each star icon
                      className={`h-5 w-5 ${i < Math.floor(recipe_details.average_rating ?? 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      aria-hidden="true"
                    />
                  ))}
                  <span className="ml-2 text-gray-700">
                    {recipe_details.average_rating.toFixed(1)} ({recipe_details.rating_count} votes)
                  </span>
                </div>
              ) : (
                <span className="text-gray-500">No ratings yet</span>
              )}
            </div>

            {/* Tags Display */}
            <div className="flex items-center">
              <span className="font-medium text-gray-700 mr-2">Tags:</span>
              <div className="flex flex-wrap gap-2">
                {recipe_details.tags.length > 0 ? (
                  recipe_details.tags.map((tag) => (
                    <Link
                      key={tag} // Unique key for each tag link
                      // Prevent default navigation to handle filter logic
                      onClick={(e) => {
                         e.preventDefault(); 
                         handleTagClick(tag); // Call handler to update filters and navigate
                      }}
                      // Link to browse page, tag filter will be applied via navigation logic
                      to="/browse" 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-200"
                    >
                      {tag}
                    </Link>
                  ))
                ) : (
                   <span className="text-gray-500">No tags</span>
                )}
              </div>
            </div>

            {/* Submitter Information */}
            <div className="mt-4 text-sm text-gray-600">
              Submitted By:{' '}
              <Link
                to={`/profile/${recipe_details.submitter.username}`} // Link to submitter's profile
                className="text-blue-600 hover:underline font-semibold"
              >
                {recipe_details.submitter.username}
              </Link>
            </div>
          </div>

          {/* Action Buttons Section */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col gap-3">
            {/* Conditional rendering for authenticated users */}
            {is_authenticated && (
              <>
                {/* Save/Unsave Recipe Button */}
                <button
                  onClick={() => saveUnsaveMutation.mutate({ recipe_id: recipeIdNumFinal, is_saving: !is_recipe_saved })}
                  disabled={saveUnsaveMutation.isPending} // Disable button while mutation is in progress
                  className={`w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium 
                              ${is_recipe_saved
                                ? 'bg-gray-300 hover:bg-gray-400 text-gray-800 cursor-not-allowed' // Style for already saved
                                : 'bg-red-600 hover:bg-red-700 text-white' // Style for saving
                              }
                            focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${is_recipe_saved ? 'focus:ring-gray-500' : 'focus:ring-red-500'}`}
                >
                  {is_recipe_saved ? 'Unsave Recipe' : 'Save Recipe'}
                </button>

                {/* User Rating Section */}
                <div className="flex items-center justify-center space-x-1 py-1">
                  {[1, 2, 3, 4, 5].map((starValue) => (
                    <Fragment key={starValue}>
                      {/* Use OutlineStarIcon when rating stars are disabled or updating */}
                      {is_updating_rating ? (
                        <OutlineStarIcon className="h-6 w-6 text-gray-400 cursor-not-allowed" />
                      ) : (
                        // Interactive star button
                        <button
                          key={starValue} // Unique key for each interactive star button
                          onClick={() => rateMutation.mutate({ rating: starValue })}
                          disabled={is_updating_rating}
                          className={`focus:outline-none transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400
                            ${starValue <= (user_rating ?? 0) // Apply styles based on user's current rating
                              ? 'text-yellow-400 fill-current' 
                              : 'text-gray-300'
                            }
                          `}
                        >
                          <StarIcon className="h-6 w-6" />
                        </button>
                      )}
                    </Fragment>
                  ))}
                </div>
              </>
            )}

            {/* Edit Recipe Button (visible only to the owner) */}
            {is_recipe_owner && (
              <button
                onClick={handleNavigateToEditRecipe}
                className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
              >
                Edit Recipe
              </button>
            )}
            
             {/* Prompt to log in if not authenticated */}
             {!is_authenticated && (
                <p className="text-center text-sm text-gray-500">
                   Log in to save, rate, and comment!
                </p>
             )}
          </div>
        </div>
      </div>

      {/* Full Recipe Details Section (Ingredients, Instructions, Nutrition, Notes) */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b pb-2">Recipe Details Breakdown</h2>

        {/* Nutritional Information Block */}
        {(recipe_details.nutri_net_carbs_grams_per_serving !== null ||
          recipe_details.nutri_protein_grams_per_serving !== null ||
          recipe_details.nutri_fat_grams_per_serving !== null) && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Nutritional Information (Per Serving)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Display Net Carbs */}
              {recipe_details.nutri_net_carbs_grams_per_serving !== null && (
                <div>
                  <span className="block text-sm font-medium text-gray-600">Net Carbs</span>
                  <span className="text-lg font-semibold text-gray-900">{recipe_details.nutri_net_carbs_grams_per_serving}g</span>
                </div>
              )}
              {/* Display Protein */}
              {recipe_details.nutri_protein_grams_per_serving !== null && (
                <div>
                  <span className="block text-sm font-medium text-gray-600">Protein</span>
                  <span className="text-lg font-semibold text-gray-900">{recipe_details.nutri_protein_grams_per_serving}g</span>
                </div>
              )}
              {/* Display Fat */}
              {recipe_details.nutri_fat_grams_per_serving !== null && (
                <div>
                  <span className="block text-sm font-medium text-gray-600">Fat</span>
                  <span className="text-lg font-semibold text-gray-900">{recipe_details.nutri_fat_grams_per_serving}g</span>
                </div>
              )}
            </div>
            {/* Disclaimer for nutritional info */}
            <p className="text-xs text-gray-500 mt-2">
              * Nutritional information is estimated and provided by the user.
            </p>
          </div>
        )}

        {/* Ingredients List */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">Ingredients</h3>
          <ul className="list-disc list-inside text-gray-700 space-y-1 marker:text-gray-700">
            {recipe_details.ingredients.map((ing, index) => (
              <li key={index}> {/* Unique key for each ingredient */}
                {ing.quantity} {ing.unit ? ing.unit : ''} {ing.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions List */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">Instructions</h3>
          <ol className="list-decimal list-inside text-gray-700 space-y-3 marker:font-semibold marker:text-gray-800">
            {recipe_details.instructions.map((ins, index) => (
              <li key={index}> {/* Unique key for each instruction */}
                <p className="ml-2 inline">{ins.description}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Notes/Tips Section (Conditional) */}
        {recipe_details.notes_tips && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Notes & Tips</h3>
            <p className="text-gray-700">{recipe_details.notes_tips}</p>
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-5 border-b pb-2">Comments</h2>

        {/* Comment Input Form (Conditional for authenticated users) */}
        {is_authenticated && (
          <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
            <textarea
              value={comment_input}
              onChange={(e) => 
                setLocalState((prev) => ({ ...prev, comment_input: e.target.value, comment_error: null }))
              }
              rows={3}
              className={`w-full p-3 border ${comment_error ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500 shadow-sm sm:text-sm resize-none`}
              placeholder="Add a comment..."
              aria-label="Add a comment"
            />
            {/* Display validation error for comment */}
            {comment_error && <p className="text-red-500 text-sm mt-1">{comment_error}</p>}
            {/* Post Comment Button */}
            <div className="flex justify-end mt-3">
              <button
                onClick={() => commentMutation.mutate({ comment_text: localState.comment_input })}
                disabled={is_posting_comment || !localState.comment_input.trim()} // Disable if posting or input is empty
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {is_posting_comment ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        )}

        {/* Display Existing Comments */}
        {recipe_details.comments && recipe_details.comments.length > 0 ? (
          recipe_details.comments.map((comment) => (
            <div key={comment.comment_id} className="mb-5 pb-5 border-b border-gray-200 last:border-b-0 last:pb-0">
              <div className="flex justify-between items-center mb-2">
                 {/* Comment Author Info */}
                <div className="flex items-center">
                  <Link to={`/profile/${comment.user.username}`} className="flex items-center">
                    <img
                      src={comment.user.profile_picture_url || 'https://picsum.photos/seed/default_avatar/40/40'}
                      alt={comment.user.username}
                      className="h-8 w-8 rounded-full mr-3 object-cover shadow-sm"
                      onError={(e) => { // Fallback image for avatar
                        e.currentTarget.src = 'https://picsum.photos/seed/default_avatar/40/40';
                      }}
                    />
                    <span className="font-semibold text-gray-900 hover:text-blue-600">{comment.user.username}</span>
                  </Link>
                  {/* Comment Timestamp */}
                  <span className="text-xs text-gray-500 ml-3">{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                {/* Delete Button (Visible only if user is owner of the comment) */}
                {is_authenticated && user_profile_summary?.user_id === comment.user.user_id && (
                  <button
                    onClick={() => deleteCommentMutation.mutate({ comment_id: comment.comment_id })}
                    className="text-red-500 hover:text-red-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-300 rounded"
                  >
                    Delete
                  </button>
                )}
              </div>
              {/* Comment Text */}
              <p className="text-gray-700 leading-relaxed ml-12 pl-3 border-l border-gray-300">
                {comment.comment_text}
              </p>
            </div>
          ))
        ) : (
          // Message if no comments are available
          <p className="text-gray-500">No comments yet. Be the first to comment!</p>
        )}
      </div>
    </>
  );
};

export default UV_RecipeView;