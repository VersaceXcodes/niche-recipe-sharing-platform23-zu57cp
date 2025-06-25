import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

// --- API Base URL ---
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// --- Types ---

// User related types
export interface UserSummary {
  user_id: number;
  username: string;
  profile_picture_url: string | null;
}

export interface UserProfile extends UserSummary {
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export interface AuthState {
  is_authenticated: boolean;
  access_token: string | null;
  user_profile_summary: UserSummary | null;
  auth_error: string | null;
  loading_auth: boolean;
}

// Recipe related types
export interface IngredientDetail {
  quantity: number;
  unit?: string | null;
  name: string;
  order: number;
}

export interface InstructionDetail {
  step_number: number;
  description: string;
}

export interface RecipeComment {
  comment_id: number;
  user: UserSummary;
  comment_text: string;
  created_at: string;
}

export interface RecipeDetail {
  recipe_id: number;
  title: string;
  description: string;
  cover_photo_url: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  difficulty_level: 'Easy' | 'Medium' | 'Hard';
  nutri_net_carbs_grams_per_serving: number | null;
  nutri_protein_grams_per_serving: number | null;
  nutri_fat_grams_per_serving: number | null;
  notes_tips: string | null;
  average_rating: number | null;
  rating_count: number;
  submitter: UserSummary;
  tags: string[];
  ingredients: IngredientDetail[];
  instructions: InstructionDetail[];
  comments: RecipeComment[];
}

export interface RecipeSummary {
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
  saved_at?: string | null; // Optional for saved recipes list
}

export interface PaginationInfo {
  total_items: number;
  total_pages: number;
  current_page: number;
  items_per_page: number;
}

export interface PaginatedRecipesResponse {
  recipes: RecipeSummary[];
  pagination: PaginationInfo;
}

export interface FilterParams {
  tags: string[];
  difficulty: string[];
  max_prep_time: number | null;
  max_cook_time: number | null;
  min_rating: number | null;
}

export interface RecipesState {
  paginated_recipes: PaginatedRecipesResponse;
  current_recipe_details: RecipeDetail | null;
  recipe_fetch_error: string | null;
  recipe_loading: boolean;
  filter_params: FilterParams;
  sort_order: 'newest' | 'rating' | 'popularity';
  search_query: string;
}

// User Profile related states
export interface UserProfileState {
  current_user_profile: UserProfile | null;
  saved_recipes: RecipeSummary[];
  saved_recipes_loading: boolean;
  profile_fetch_error: string | null;
  public_user_profile: UserProfile | null; // Profile of another user
}

// UI State
export interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface UiState {
  modal_open: string | null; // e.g., 'login', 'register', 'recipe_details'
  notification: Notification | null;
}

// --- Combined State ---
export interface AppState
  extends AuthState,
    RecipesState,
    UserProfileState,
    UiState {}

// --- Actions ---
// Define action interfaces for better type safety if needed, but inline functions are fine for Zustand

// --- Axios Instance ---
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// --- Store ---
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // --- Auth State & Actions ---
      is_authenticated: false,
      access_token: null,
      user_profile_summary: null,
      auth_error: null,
      loading_auth: false,

      login: async (email, password) => {
        set({ loading_auth: true, auth_error: null });
        try {
          const response = await axiosInstance.post('/auth/login', {
            email,
            password,
          });
          const { access_token, user } = response.data;
          set({
            is_authenticated: true,
            access_token,
            user_profile_summary: user,
            loading_auth: false,
            auth_error: null,
          });
          // Optionally load full profile immediately after login
          get().loadUserProfile();
          return true;
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || error.message || 'Login failed';
          set({
            auth_error: errorMessage,
            loading_auth: false,
            is_authenticated: false,
            access_token: null,
            user_profile_summary: null,
          });
          return false;
        }
      },

      logout: () => {
        set({
          is_authenticated: false,
          access_token: null,
          user_profile_summary: null,
          current_user_profile: null, // Clear full profile too
          saved_recipes: [], // Clear saved recipes on logout
          auth_error: null,
          loading_auth: false,
        });
        // Any other cleanup like removing persisted user data might be needed here
        // if not handled automatically by persist middleware config.
      },

      register: async (userData) => {
        set({ loading_auth: true, auth_error: null });
        try {
          await axiosInstance.post('/auth/register', userData);
          set({ loading_auth: false });
          // Redirect handled by component after successful registration state change
          return true;
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || error.message || 'Registration failed';
          set({ auth_error: errorMessage, loading_auth: false });
          return false;
        }
      },

      loadUserProfile: async () => {
        const { access_token } = get();
        if (!access_token) return;

        set({ loading_auth: true }); // Use loading_auth for profile loading too if desired
        try {
          axiosInstance.defaults.headers.common.Authorization = `Bearer ${access_token}`;
          const response = await axiosInstance.get('/users/me');
          const userProfile: UserProfile = response.data;
          set({
            current_user_profile: userProfile,
            user_profile_summary: {
              user_id: userProfile.user_id,
              username: userProfile.username,
              profile_picture_url: userProfile.profile_picture_url,
            },
            loading_auth: false,
          });
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || error.message || 'Failed to load profile';
          // If profile loading fails, it might indicate an expired token
          if (error.response?.status === 401) {
            get().logout(); // Log out if token is expired
          }
          set({
            profile_fetch_error: errorMessage,
            loading_auth: false,
            // Keep auth state as is unless token is invalid
          });
        }
      },

      updateUserProfile: async (userData) => {
        const { access_token } = get();
        if (!access_token) return false;

        set((state) => ({ ...state, loading_auth: true, auth_error: null }));
        try {
          axiosInstance.defaults.headers.common.Authorization = `Bearer ${access_token}`;
          const response = await axiosInstance.put('/users/me', userData);
          const updatedUser: UserProfile = response.data.user;

          set((state) => ({
            ...state,
            current_user_profile: updatedUser,
            user_profile_summary: {
              user_id: updatedUser.user_id,
              username: updatedUser.username,
              profile_picture_url: updatedUser.profile_picture_url,
            },
            loading_auth: false,
            auth_error: null,
          }));
          get().showNotification(response.data.message || 'Profile updated successfully', 'success');
          return true;
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || error.message || 'Update profile failed';
          set((state) => ({
            ...state,
            auth_error: errorMessage,
            loading_auth: false,
          }));
          get().showNotification(errorMessage, 'error');
          return false;
        }
      },

      uploadProfilePicture: async (file) => {
        const { access_token } = get();
        if (!access_token || !file) return false;

        set((state) => ({ ...state, loading_auth: true, auth_error: null }));
        const formData = new FormData();
        formData.append('profile_picture', file);

        try {
          axiosInstance.defaults.headers.common.Authorization = `Bearer ${access_token}`;
          const response = await axiosInstance.post(
            '/users/me/profile-picture',
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            },
          );
          const newProfilePictureUrl = response.data.profile_picture_url;

          set((state) => ({
            ...state,
            user_profile_summary: state.user_profile_summary
              ? { ...state.user_profile_summary, profile_picture_url: newProfilePictureUrl }
              : null,
            current_user_profile: state.current_user_profile
              ? { ...state.current_user_profile, profile_picture_url: newProfilePictureUrl }
              : null,
            loading_auth: false,
          }));
          get().showNotification(response.data.message || 'Profile picture updated', 'success');
          return true;
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || error.message || 'Upload failed';
          set((state) => ({
            ...state,
            auth_error: errorMessage,
            loading_auth: false,
          }));
          get().showNotification(errorMessage, 'error');
          return false;
        }
      },

      // --- Recipe State & Actions ---
      paginated_recipes: {
        recipes: [],
        pagination: {
          total_items: 0,
          total_pages: 0,
          current_page: 1,
          items_per_page: 10,
        },
      },
      current_recipe_details: null,
      recipe_fetch_error: null,
      recipe_loading: false,
      filter_params: {
        tags: [],
        difficulty: [],
        max_prep_time: null,
        max_cook_time: null,
        min_rating: null,
      },
      sort_order: 'newest',
      search_query: '',

      fetchRecipes: async (params = {}) => {
        const { filter_params, sort_order, paginated_recipes } = get();
        const { page = 1, limit = paginated_recipes.pagination.items_per_page } =
          params;

        const currentFilters = params.filters || filter_params;
        const currentSort = params.sort_by || sort_order;

        set({ recipe_loading: true, recipe_fetch_error: null });

        const queryParams = new URLSearchParams();

        // Apply filters
        if (currentFilters.tags.length)
          queryParams.append('tags', currentFilters.tags.join(','));
        if (currentFilters.difficulty.length)
          queryParams.append('difficulty', currentFilters.difficulty.join(','));
        if (currentFilters.max_prep_time !== null)
          queryParams.append('max_prep_time', String(currentFilters.max_prep_time));
        if (currentFilters.max_cook_time !== null)
          queryParams.append('max_cook_time', String(currentFilters.max_cook_time));
        if (currentFilters.min_rating !== null)
          queryParams.append('min_rating', String(currentFilters.min_rating));

        // Apply sorting and pagination
        queryParams.append('sort_by', currentSort);
        queryParams.append('page', String(page));
        queryParams.append('limit', String(limit));

        try {
          const response = await axiosInstance.get(`/recipes?${queryParams.toString()}`);
          set({
            paginated_recipes: response.data,
            recipe_loading: false,
            filter_params: currentFilters, // Update filters state
            sort_order: currentSort, // Update sort state
          });
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || error.message || 'Failed to fetch recipes';
          set({
            recipe_fetch_error: errorMessage,
            recipe_loading: false,
          });
        }
      },

      searchRecipes: async (query, params = {}) => {
        const { filter_params, sort_order, paginated_recipes } = get();
        const { page = 1, limit = paginated_recipes.pagination.items_per_page } =
          params;

        const currentFilters = params.filters || filter_params;
        const currentSort = params.sort_by || sort_order;

        set({
          recipe_loading: true,
          recipe_fetch_error: null,
          search_query: query, // Update search query state
        });

        const queryParams = new URLSearchParams();
        queryParams.append('q', query);

        // Apply filters (same as fetchRecipes)
        if (currentFilters.tags.length)
          queryParams.append('tags', currentFilters.tags.join(','));
        if (currentFilters.difficulty.length)
          queryParams.append('difficulty', currentFilters.difficulty.join(','));
        if (currentFilters.max_prep_time !== null)
          queryParams.append('max_prep_time', String(currentFilters.max_prep_time));
        if (currentFilters.max_cook_time !== null)
          queryParams.append('max_cook_time', String(currentFilters.max_cook_time));
        if (currentFilters.min_rating !== null)
          queryParams.append('min_rating', String(currentFilters.min_rating));

        // Apply sorting and pagination
        queryParams.append('sort_by', currentSort);
        queryParams.append('page', String(page));
        queryParams.append('limit', String(limit));

        try {
          const response = await axiosInstance.get(`/search/recipes?${queryParams.toString()}`);
          set({
            paginated_recipes: response.data,
            recipe_loading: false,
            filter_params: currentFilters, // Update filters state
            sort_order: currentSort, // Update sort state
          });
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || error.message || 'Search failed';
          set({
            recipe_fetch_error: errorMessage,
            recipe_loading: false,
          });
        }
      },

      fetchRecipeById: async (recipe_id) => {
        set({ current_recipe_details: null, recipe_loading: true, recipe_fetch_error: null });
        try {
          const response = await axiosInstance.get(`/recipes/${recipe_id}`);
          set({
            current_recipe_details: response.data,
            recipe_loading: false,
          });
          return response.data;
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || error.message || 'Failed to load recipe';
          set({
            recipe_fetch_error: errorMessage,
            recipe_loading: false,
            current_recipe_details: null, // Ensure null on error
          });
          return null;
        }
      },

      submitRecipe: async (recipeData) => {
        const { access_token } = get();
        if (!access_token) return null;

        set((state) => ({ ...state, recipe_fetch_error: null })); // Reuse error state

        const formData = new FormData();
        // Append text fields
        Object.keys(recipeData).forEach((key) => {
            // NOTE: Make sure to handle specific types like arrays (ingredients, instructions, tags) correctly.
            // For simplicity here, assuming FormData can handle stringified JSON for arrays or they are handled differently.
            // A common approach is to stringify array fields when sending as FormData.
            if (key !== 'cover_photo_file' && key !== 'ingredients' && key !== 'instructions' && key !== 'tags') {
                // @ts-ignore
                formData.append(key, recipeData[key] ?? '');
            }
        });

        // Handle array fields by stringifying JSON
        formData.append('ingredients', JSON.stringify(recipeData.ingredients));
        formData.append('instructions', JSON.stringify(recipeData.instructions));
        formData.append('tags', JSON.stringify(recipeData.tags));


        // Handle file upload
        if (recipeData.cover_photo_file) {
            formData.append('cover_photo', recipeData.cover_photo_file);
        }


        try {
          axiosInstance.defaults.headers.common.Authorization = `Bearer ${access_token}`;
          const response = await axiosInstance.post('/recipes', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          get().showNotification(response.data.message || 'Recipe submitted successfully', 'success');
          return response.data.recipe_id; // Return the new recipe ID
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || error.message || 'Failed to submit recipe';
          set((state) => ({
            ...state,
            recipe_fetch_error: errorMessage, // Reuse error state
          }));
          get().showNotification(errorMessage, 'error');
          return null;
        }
      },

       updateRecipe: async (recipe_id, recipeData) => {
        const { access_token } = get();
        if (!access_token) return false;

        set((state) => ({ ...state, recipe_fetch_error: null }));

        const formData = new FormData();
        Object.keys(recipeData).forEach((key) => {
             if (key !== 'cover_photo_file' && key !== 'ingredients' && key !== 'instructions' && key !== 'tags') {
                 // @ts-ignore
                formData.append(key, recipeData[key] ?? '');
            }
        });
        formData.append('ingredients', JSON.stringify(recipeData.ingredients));
        formData.append('instructions', JSON.stringify(recipeData.instructions));
        formData.append('tags', JSON.stringify(recipeData.tags));

        if (recipeData.cover_photo_file) {
            formData.append('cover_photo', recipeData.cover_photo_file);
        }

        try {
          axiosInstance.defaults.headers.common.Authorization = `Bearer ${access_token}`;
          const response = await axiosInstance.put(`/recipes/${recipe_id}`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          get().showNotification(response.data.message || 'Recipe updated successfully', 'success');

          // Optionally refetch the current recipe details to reflect changes
          if (get().current_recipe_details?.recipe_id === recipe_id) {
             get().fetchRecipeById(recipe_id);
          }
          return true;
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || error.message || 'Failed to update recipe';
          set((state) => ({
            ...state,
            recipe_fetch_error: errorMessage,
          }));
          get().showNotification(errorMessage, 'error');
          return false;
        }
      },


      submitRating: async (recipe_id, rating) => {
        const { access_token } = get();
        if (!access_token) return false;

        try {
          axiosInstance.defaults.headers.common.Authorization = `Bearer ${access_token}`;
          const response = await axiosInstance.post(`/recipes/${recipe_id}/ratings`, {
            rating,
          });
          get().showNotification(response.data.message || 'Rating submitted', 'success');

          // Update local state if current recipe details are loaded
          set((state) => {
            if (state.current_recipe_details?.recipe_id === recipe_id) {
              return {
                ...state,
                current_recipe_details: {
                  ...state.current_recipe_details,
                  average_rating: response.data.average_rating,
                  rating_count: state.current_recipe_details.rating_count
                    ? state.current_recipe_details.rating_count + 1 // Simple increment, may need adjustment based on API response
                    : 1,
                },
              };
            }
            return state;
          });
          return true;
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || error.message || 'Failed to submit rating';
          get().showNotification(errorMessage, 'error');
          return false;
        }
      },

      postComment: async (recipe_id, comment_text) => {
        const { access_token } = get();
        if (!access_token) return null;

        try {
          axiosInstance.defaults.headers.common.Authorization = `Bearer ${access_token}`;
          const response = await axiosInstance.post(`/recipes/${recipe_id}/comments`, {
            comment_text,
          });
          const newComment = response.data.comment;

          // Update local state if current recipe details are loaded
          set((state) => {
            if (state.current_recipe_details?.recipe_id === recipe_id) {
              return {
                ...state,
                current_recipe_details: {
                  ...state.current_recipe_details,
                  comments: [...(state.current_recipe_details.comments || []), newComment],
                },
              };
            }
            return state;
          });

          get().showNotification('Comment posted successfully', 'success');
          return newComment;
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || error.message || 'Failed to post comment';
          get().showNotification(errorMessage, 'error');
          return null;
        }
      },

      deleteComment: async (comment_id) => {
         const { access_token } = get();
         if (!access_token) return false;

        try {
          axiosInstance.defaults.headers.common.Authorization = `Bearer ${access_token}`;
          const response = await axiosInstance.delete(`/comments/${comment_id}`);
          get().showNotification(response.data.message || 'Comment deleted', 'success');

          // Update local state if current recipe details are loaded
          set((state) => {
            if (state.current_recipe_details) {
              const updatedComments = state.current_recipe_details.comments?.filter(
                (comment) => comment.comment_id !== comment_id,
              );
              return {
                ...state,
                current_recipe_details: {
                  ...state.current_recipe_details,
                  comments: updatedComments,
                },
              };
            }
            return state;
          });

          return true;
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || error.message || 'Failed to delete comment';
          get().showNotification(errorMessage, 'error');
          return false;
        }
      },

      saveRecipe: async (recipe_id) => {
        const { access_token } = get();
        if (!access_token) return false;

        try {
          axiosInstance.defaults.headers.common.Authorization = `Bearer ${access_token}`;
          const response = await axiosInstance.post('/users/me/saved-recipes', {
            recipe_id,
          });
          get().showNotification(response.data.message || 'Recipe saved', 'success');

          // Update local state
          set((state) => {
            // Update current recipe view if applicable
            const updatedCurrentRecipe = state.current_recipe_details
              ? {
                  ...state.current_recipe_details,
                  is_recipe_saved: true, // Assuming this field exists or managed implicitly
                }
              : state.current_recipe_details;

            // Add to saved recipes list if currently viewing that page
             const updatedSavedRecipes = state.saved_recipes.map(recipe =>
                 recipe.recipe_id === recipe_id ? {...recipe, saved_at: new Date().toISOString()} : recipe);
             // If recipe wasn't in the list (e.g., fetched separately), add it. Add dummy data if needed.
             const recipeExistsInList = updatedSavedRecipes.some(r => r.recipe_id === recipe_id);
             if (!recipeExistsInList) {
                 // Fetch minimal data to add to list if not already present
                 // This part might require another small API call or better state management if simplified
                 // For now, assume we can update state without full recipe fetch if saved_recipes list is managed carefully
                  updatedSavedRecipes.push({ // Placeholder for actual data fetch if needed
                      recipe_id: recipe_id,
                      title: state.current_recipe_details?.title || 'Saved Recipe',
                      description: state.current_recipe_details?.description || '',
                      cover_photo_url: state.current_recipe_details?.cover_photo_url || '',
                      prep_time_minutes: state.current_recipe_details?.prep_time_minutes ?? 0,
                      cook_time_minutes: state.current_recipe_details?.cook_time_minutes ?? 0,
                      difficulty_level: state.current_recipe_details?.difficulty_level ?? 'Easy',
                      average_rating: state.current_recipe_details?.average_rating ?? null,
                      user_id: state.current_recipe_details?.submitter?.user_id ?? 0,
                      username: state.current_recipe_details?.submitter?.username ?? 'Unknown',
                      tags: state.current_recipe_details?.tags ?? [],
                      saved_at: new Date().toISOString()
                   });
             }

            return {
              ...state,
              current_recipe_details: updatedCurrentRecipe,
              saved_recipes: updatedSavedRecipes,
            };
          });

          return true;
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || error.message || 'Failed to save recipe';
          get().showNotification(errorMessage, 'error');
          return false;
        }
      },

      unsaveRecipe: async (recipe_id) => {
        const { access_token } = get();
        if (!access_token) return false;

        try {
          axiosInstance.defaults.headers.common.Authorization = `Bearer ${access_token}`;
          const response = await axiosInstance.delete(`/users/me/saved-recipes/${recipe_id}`);
          get().showNotification(response.data.message || 'Recipe unsaved', 'success');

          // Update local state
          set((state) => {
            // Update current recipe view if applicable
            const updatedCurrentRecipe = state.current_recipe_details
              ? {
                  ...state.current_recipe_details,
                  is_recipe_saved: false, // Assuming this field exists or managed implicitly
                }
              : state.current_recipe_details;

            // Remove from saved recipes list
            const updatedSavedRecipes = state.saved_recipes.filter(
              (recipe) => recipe.recipe_id !== recipe_id,
            );

            return {
              ...state,
              current_recipe_details: updatedCurrentRecipe,
              saved_recipes: updatedSavedRecipes,
            };
          });

          return true;
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || error.message || 'Failed to unsave recipe';
          get().showNotification(errorMessage, 'error');
          return false;
        }
      },

      fetchSavedRecipes: async () => {
        const { access_token } = get();
        if (!access_token) {
           set({saved_recipes: [], saved_recipes_loading: false});
           return false;
        }

        set({ saved_recipes_loading: true, saved_recipes: [], profile_fetch_error: null });
        try {
          axiosInstance.defaults.headers.common.Authorization = `Bearer ${access_token}`;
          const response = await axiosInstance.get('/users/me/saved-recipes');
          set({
            saved_recipes: response.data.recipes || [],
            saved_recipes_loading: false,
          });
          return true;
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || error.message || 'Failed to load saved recipes';
          set({
            profile_fetch_error: errorMessage,
            saved_recipes_loading: false,
          });
           if (error.response?.status === 401) {
             get().logout(); // Kick user out if token expired
           }
          return false;
        }
      },

      setFilters: (params: Partial<FilterParams>) => {
        set((state) => ({
          filter_params: { ...state.filter_params, ...params },
        }));
      },

      setSortOrder: (order: AppState['sort_order']) => {
        set({ sort_order: order });
      },

      setSearchQuery: (query: string) => {
        set({ search_query: query });
      },

      setPage: (pageNumber: number) => {
         set((state) => ({
             paginated_recipes: {
                 ...state.paginated_recipes,
                 pagination: {...state.paginated_recipes.pagination, current_page: pageNumber}
             }
         }));
      },

       clearFilters: () => {
        set({
          filter_params: {
            tags: [],
            difficulty: [],
            max_prep_time: null,
            max_cook_time: null,
            min_rating: null,
          },
          sort_order: 'newest',
          search_query: '', // Clear search query as well if clearing browse filters
          paginated_recipes: { // Reset pagination
              recipes: [],
              pagination: {
                  total_items: 0,
                  total_pages: 0,
                  current_page: 1,
                  items_per_page: 10,
               }
          }
        });
      },

      // --- UI State & Actions ---
      modal_open: null,
      notification: null,

      openModal: (modalType: string) => {
        set({ modal_open: modalType });
      },

      closeModal: () => {
        set({ modal_open: null });
      },

      showNotification: (message: string, type: Notification['type']) => {
        set({ notification: { message, type } });
        // Auto-clear notification after some time
        setTimeout(() => {
          set((state) =>
            state.notification?.message === message ? { notification: null } : state,
          );
        }, 3000); // Clear after 3 seconds
      },

       // Additional Actions based on Analysis
       // Note: These should ideally be triggered ONCE by components or hooks,
       // not managed solely within the store's initial state if they rely on API calls.
       // Example: fetchRecipes might be called by BrowseView on mount.

    }),
    {
      name: 'ketoathlete-eats-storage', // name of the item in storage (must be unique)
      // storage: createJSONStorage(() => sessionStorage), // can be modified to store in sessionStorage or localStorage
      // Whitelist or blacklist state slices to persist
      partialize: (state) => ({
        // Persist authentication status and token, user summary
        is_authenticated: state.is_authenticated,
        access_token: state.access_token,
        user_profile_summary: state.user_profile_summary,
        // Persist filters and sort order for browsing/searching
        filter_params: state.filter_params,
        sort_order: state.sort_order,
        // Persist search query if needed across sessions, though usually context specific
        // search_query: state.search_query,
      }),
      // Optional: Define how to rehydrate state or handle conflicts
        onRehydrateStorage: (state) => {
            // This function is called right after the state is restored
            // Good place to re-initialize things that depend on persistent state, like API auth headers
            return (state, options) => {
              if (options.hydration da) { // hydrationState is undefined on error
                 if (state?.is_authenticated && state?.access_token) {
                    // Set Axios auth header upon rehydration
                    axiosInstance.defaults.headers.common.Authorization = `Bearer ${state.access_token}`;
                    // Optionally reload user profile data if it wasn't persisted or needs refresh
                    if (!state.current_user_profile) {
                       get().loadUserProfile();
                    }
                 }
              }
            };
        },
    },
  ),
);

// Add types for actions if needed for clarity, but dynamically typed functions are standard in Zustand
// Example:
// interface AppActions {
//   login: (email: string, password: string) => Promise<boolean>;
//   logout: () => void;
//   // ... other actions
// }


export default useAppStore;