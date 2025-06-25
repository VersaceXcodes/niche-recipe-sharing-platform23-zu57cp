import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// Import store for authentication status and user info
import { useAppStore } from '@/store/main';

// --- Local Type Definitions (if not globally imported) ---

interface UserSummaryLocal {
  user_id: number;
  username: string;
  profile_picture_url: string | null;
}

interface UserProfileLocal {
  user_id: number;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  profile_picture_url: string | null;
}

interface RecipeSummaryLocal {
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
}

interface PaginationInfoLocal {
  total_items: number;
  total_pages: number;
  current_page: number;
  items_per_page: number;
}

interface PaginatedRecipesResponseLocal {
  recipes: RecipeSummaryLocal[];
  pagination: PaginationInfoLocal;
}

// --- API Base URL ---
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// --- Fetcher Functions ---

// Fetch user profile data by username
const fetchUserProfile = async (username: string): Promise<UserProfileLocal> => {
  const response = await axios.get<UserProfileLocal>(`${API_BASE_URL}/users/${username}`);
  return response.data;
};

// Fetch recipes submitted by a specific user ID
const fetchUserRecipes = async (userId: number | undefined, page: number = 1, limit: number = 10): Promise<PaginatedRecipesResponseLocal> => {
  if (!userId) {
    // Return an empty response or throw an error if userId is not available
    return { recipes: [], pagination: { total_items: 0, total_pages: 0, current_page: 1, items_per_page: 10 } };
  }
  const queryParams = new URLSearchParams();
  queryParams.append('user_id', String(userId));
  queryParams.append('page', String(page));
  queryParams.append('limit', String(limit));

  const response = await axios.get<PaginatedRecipesResponseLocal>(`${API_BASE_URL}/recipes?${queryParams.toString()}`);
  return response.data;
};

// --- Component Implementation ---

const UV_UserProfileView = () => {
  const { username } = useParams<{ username: string }>();
  const { is_authenticated, user_profile_summary } = useAppStore((state) => ({
    is_authenticated: state.is_authenticated,
    user_profile_summary: state.user_profile_summary,
  }));

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [is_owner, setIs_owner] = useState<boolean>(false);

  // Query for user profile
  const userProfileQuery = useQuery<UserProfileLocal, Error>({
    queryKey: ['userProfile', username],
    queryFn: () => fetchUserProfile(username!),
    enabled: !!username, // Only run if username is available
    onError: (error) => {
      console.error("Error fetching user profile:", error);
      // Implement global error handling or local state for user feedback
    }
  });

  // Query for user's submitted recipes, depends on userProfileQuery for userId
  const userRecipesQuery = useQuery<PaginatedRecipesResponseLocal, Error>({
    queryKey: ['userRecipes', userProfileQuery.data?.user_id, currentPage], // Include currentPage in key for pagination
    queryFn: () => fetchUserRecipes(userProfileQuery.data?.user_id, currentPage), // Pass currentPage to fetcher
    enabled: !!userProfileQuery.data?.user_id, // Only run if user profile is loaded and has userId
    onError: (error) => {
      console.error("Error fetching user recipes:", error);
      // Implement global error handling or local state for user feedback
    }
  });

  // Determine if the viewing user is the owner of the profile
  useEffect(() => {
    if (userProfileQuery.data && user_profile_summary) {
      setIs_owner(userProfileQuery.data.user_id === user_profile_summary.user_id);
    } else {
      setIs_owner(false);
    }
  }, [userProfileQuery.data, user_profile_summary]); // Added user_profile_summary dependency

  const isLoading = userProfileQuery.isLoading || userRecipesQuery.isLoading;
  const isError = userProfileQuery.isError || userRecipesQuery.isError;
  const error = userProfileQuery.error || userRecipesQuery.error;

  // Fallback image handler
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'https://picsum.photos/seed/placeholder_image/400/300';
  };
  const handleProfileImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'https://picsum.photos/seed/default_avatar/128';
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    // No need to call refetch directly here, as queryKey change handles it.
    // If queryFn needs manual update, it can be done via `setQueryData` or `refetch` with queryClient.
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {isLoading && (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
        </div>
      )}

      {isError && (
        <div className="text-center py-10">
          <p className="text-red-500 text-lg">
            Error loading profile:{' '}
            {(error as any).message || 'An unknown error occurred'}
          </p>
        </div>
      )}

      {!isLoading && !isError && userProfileQuery.data ? (
        <div className="space-y-8">
          {/* Profile Header Section */}
          <div className="bg-white rounded-lg shadow-xl p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              {userProfileQuery.data.profile_picture_url ? (
                <img
                  src={userProfileQuery.data.profile_picture_url}
                  alt={`Profile picture of ${userProfileQuery.data.username}`}
                  className="w-32 h-32 rounded-full object-cover border-4 border-indigo-500"
                  onError={handleProfileImageError}
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-4xl font-bold border-4 border-indigo-500">
                  {userProfileQuery.data.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="text-center md:text-left w-full">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {userProfileQuery.data.username}
              </h1>
              {(userProfileQuery.data.first_name || userProfileQuery.data.last_name) && (
                <p className="text-xl text-gray-600 mb-4">
                  {userProfileQuery.data.first_name} {userProfileQuery.data.last_name}
                </p>
              )}
              <p className="text-sm text-gray-500">
                Email:{' '}
                {is_owner ? userProfileQuery.data.email : 'Hidden for privacy'}
              </p>

              {is_owner && (
                <div className="mt-4">
                  <Link
                    to="/profile/me/edit"
                    className="inline-block px-6 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
                  >
                    Edit Profile
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Submitted Recipes Section */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-5">
              Recipes Submitted by {userProfileQuery.data.username}
            </h2>

            {userRecipesQuery.isLoading && <p>Loading recipes...</p>}
            {userRecipesQuery.isError && <p className="text-red-500">Failed to load recipes.</p>}

            {userRecipesQuery.data && userRecipesQuery.data.recipes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userRecipesQuery.data.recipes.map((recipe) => (
                  <div
                    key={recipe.recipe_id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition duration-300 ease-in-out"
                  >
                    <Link to={`/recipes/${recipe.recipe_id}`}>
                      <img
                        src={recipe.cover_photo_url || 'https://picsum.photos/seed/placeholderrecipe/400/300'}
                        alt={recipe.title}
                        className="w-full h-48 object-cover"
                        onError={handleImageError}
                      />
                    </Link>
                    <div className="p-4">
                      <Link to={`/recipes/${recipe.recipe_id}`}>
                        <h3 className="text-lg font-semibold text-gray-800 hover:text-indigo-600 transition duration-200">
                          {recipe.title}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                        {recipe.description}
                      </p>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                        <span className="text-sm text-gray-600">
                          By:{' '}
                          <Link
                            to={`/profile/${recipe.username}`}
                            className="text-indigo-600 hover:underline font-medium"
                          >
                            {recipe.username}
                          </Link>
                        </span>
                        <span className="text-sm text-gray-600">
                          Rating: {recipe.average_rating !== null ? recipe.average_rating.toFixed(1) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-10">
                {userProfileQuery.data.username} has not submitted any recipes yet.
              </p>
            )}
          </div>
        </div>
      ) : (
        // Optional: Render a message if profile data is not available but no error occurred
        !isLoading && !isError && <p className="text-center text-gray-500 py-10">User profile not found.</p>
      )}
    </div>
  );
};

export default UV_UserProfileView;