import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main.tsx'; // Assuming the store hook is exported like this

// --- Interfaces ---

// Interface for a single recipe summary item, matching the API response for lists
interface RecipeSummary {
  recipe_id: number;
  title: string;
  description: string;
  cover_photo_url: string;
  average_rating: number | null;
  username: string;
  prep_time_minutes: number; // Added based on common recipe details needed
  cook_time_minutes: number; // Added based on common recipe details needed
  difficulty_level: 'Easy' | 'Medium' | 'Hard'; // Added based on common recipe details needed
  tags: string[]; // Added based on common recipe details needed
}

// Interface for the data returned by the featured recipes endpoint
interface FeaturedRecipesResponse {
  recipes: RecipeSummary[];
  pagination: { // Although not strictly needed for display, good practice to acknowledge pagination structure
      total_items: number;
      total_pages: number;
      current_page: number;
      items_per_page: number;
  }
}

// --- API Fetch Function ---

const fetchFeaturedRecipes = async (): Promise<RecipeSummary[]> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const { data } = await axios.get<FeaturedRecipesResponse>(
    `${API_BASE_URL}/api/v1/recipes?sort_by=popularity&limit=5`
  );
  // Ensure we only return the array of recipes
  return data.recipes;
};

// --- View Component ---

const UV_Homepage: React.FC = () => {
  const navigate = useNavigate(); // Initialize useNavigate

  // Fetch featured recipes using React Query
  const {
    data: featured_recipes,
    isLoading,
    isError,
    error,
    refetch // Get refetch function
  } = useQuery<RecipeSummary[], Error>({
    queryKey: ['featuredRecipes'],
    queryFn: fetchFeaturedRecipes,
    staleTime: 1000 * 60 * 5, // 5 minutes stale time
  });

  // Get authentication status from the global store
  const is_authenticated = useAppStore((state) => state.is_authenticated);

  // Handler for navigating to a specific recipe
  const navigate_to_recipe = (recipeId: number) => {
    navigate(`/recipes/${recipeId}`);
  };

  // Handler for when the global search is triggered (assumed to be handled by GV_TopNav)
  // In a real app, you might pass a callback or use a global event emitter.
  // For this component, we assume the search bar in TopNav handles navigation directly.

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-500 text-white py-16 px-4 rounded-lg shadow-lg mb-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-extrabold mb-4 leading-tight">
            KetoAthlete Eats: Fuel Your Performance
          </h1>
          <p className="text-xl font-light mb-8">
            Discover and share delicious ketogenic recipes crafted specifically for athletes and active lifestyles.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/browse"
              className="inline-block bg-white text-primary-600 font-semibold py-3 px-8 rounded-full shadow-md hover:shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1"
            >
              Browse Recipes
            </Link>
            {is_authenticated ? (
              <Link
                to="/recipes/new"
                className="inline-block bg-transparent border-2 border-white text-white font-semibold py-3 px-8 rounded-full hover:bg-white hover:text-primary-600 transition duration-300 ease-in-out transform hover:-translate-y-1"
              >
                Submit Your Recipe
              </Link>
            ) : (
              <Link
                to="/register"
                className="inline-block bg-transparent border-2 border-white text-white font-semibold py-3 px-8 rounded-full hover:bg-white hover:text-primary-600 transition duration-300 ease-in-out transform hover:-translate-y-1"
              >
                Join Us
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Featured Recipes Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Featured Recipes</h2>
          <Link
            to="/browse"
            className="text-lg text-primary-600 font-semibold hover:underline"
          >
            View All &rarr;
          </Link>
        </div>

        {/* Recipe Grid */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {/* Placeholder for loading state */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-64 rounded-lg shadow-md"></div>
            ))}
          </div>
        )}

        {isError && error && (
          <div className="text-center text-red-500 py-8">
            <p>Error loading recipes: {error.message}</p>
            <button
              onClick={() => refetch()} // Use refetch from useQuery
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
            >
              Try Again
            </button>
          </div>
        )}

        {!isLoading && !isError && featured_recipes && featured_recipes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {featured_recipes.map((recipe) => (
              <div
                key={recipe.recipe_id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer"
                onClick={() => navigate_to_recipe(recipe.recipe_id)} // Call the implemented navigate function
              >
                <Link to={`/recipes/${recipe.recipe_id}`}>
                  <img
                    src={recipe.cover_photo_url || 'https://picsum.photos/seed/random1/400/300'} // Fallback image
                    alt={recipe.title}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                  />
                </Link>
                <div className="p-4">
                  <Link to={`/recipes/${recipe.recipe_id}`}>
                    <h3 className="text-lg font-semibold text-gray-800 truncate">
                      {recipe.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-600 h-12 overflow-hidden">
                    {recipe.description}
                  </p>
                  <div className="mt-3 flex justify-between items-center text-sm text-gray-700">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.431a1 1 0 00-.364.901l1.07 3.292c.3.921-.755 1.688-1.547 1.11L10 13.047l-2.804 2.431c-.792.577-1.847-.19-1.547-1.11l1.07-3.292a1 1 0 00-.364-.901l-2.8-2.431c-.792-.577-.37-1.81.588-1.81h3.461a1 1 0 00.95-.69l1.07-3.292z"/>
                      </svg>
                      {recipe.average_rating !== null ? recipe.average_rating.toFixed(1) : 'N/A'}
                    </span>
                    <span className="text-xs text-gray-500">
                      by {recipe.username}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
         {!isLoading && !isError && (!featured_recipes || featured_recipes.length === 0) && (
             <div className="text-center text-gray-500 py-8">
                <p>No featured recipes available at the moment.</p>
             </div>
         )}
      </section>
    </>
  );
};

export default UV_Homepage;