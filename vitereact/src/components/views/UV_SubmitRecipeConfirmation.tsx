import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom'; // Ensure Link is imported if used, though buttons are specified here. Navigation is programmatic with useNavigate.

// Define the expected shape of the state passed from the previous route.
interface LocationState {
  submitted_recipe_title?: string;
  submitted_recipe_id?: number;
}

const UV_SubmitRecipeConfirmation: React.FC = () => {
  // Access navigation object
  const navigate = useNavigate();

  // Retrieve data passed from the previous route (UV_SubmitRecipe)
  // Safely access state, providing default values if undefined or missing properties.
  const location = useLocation();
  const locationState = location.state as LocationState | undefined | null;
  const submitted_recipe_title = locationState?.submitted_recipe_title ?? '';
  const submitted_recipe_id = locationState?.submitted_recipe_id;

  // --- Actions Handlers ---

  /**
   * Navigates the user to the detail view of the recipe they just submitted.
   */
  const navigateToRecipeView = () => {
    // This check should ideally not be needed if the button is rendered correctly,
    // but it adds robustness.
    if (submitted_recipe_id !== undefined && submitted_recipe_id !== null) {
      navigate(`/recipes/${submitted_recipe_id}`);
    } else {
      console.error('Recipe ID is missing for navigation to view.');
      // Fallback navigation if ID is missing.
      navigate('/browse');
    }
  };

  /**
   * Navigates the user back to the recipe submission form.
   */
  const navigateToSubmitAnother = () => {
    navigate('/recipes/new');
  };

  /**
   * Navigates the user to the general recipe browsing page.
   */
  const navigateToBrowse = () => {
    navigate('/browse');
  };

  // --- Component Render ---
  return (
    <>
      <div className="flex flex-col items-center justify-center text-center p-6 md:p-10 bg-white rounded-lg shadow-xl max-w-lg mx-auto my-8">
        {/* Success Icon/Graphic (Optional, but good UX) */}
        <svg
          className="w-16 h-16 text-green-500 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Recipe Submitted Successfully!
        </h1>

        {submitted_recipe_title ? (
          <p className="text-lg text-gray-700 mb-6">
            Your recipe, "{submitted_recipe_title}", has been added to KetoAthlete Eats.
          </p>
        ) : (
          <p className="text-lg text-gray-700 mb-6">
            Your recipe has been added successfully.
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 w-full">
          {/* Only show 'View Recipe' if submitted_recipe_id is valid */}
          {submitted_recipe_id !== undefined && submitted_recipe_id !== null && (
            <button
              onClick={navigateToRecipeView}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out w-full sm:w-auto"
            >
              View Recipe
            </button>
          )}

          <button
            onClick={navigateToSubmitAnother}
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-800 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out w-full sm:w-auto"
          >
            Submit Another Recipe
          </button>

          <button
            onClick={navigateToBrowse}
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-800 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out w-full sm:w-auto"
          >
            Go to Browse Recipes
          </button>
        </div>
      </div>
    </>
  );
};

export default UV_SubmitRecipeConfirmation;