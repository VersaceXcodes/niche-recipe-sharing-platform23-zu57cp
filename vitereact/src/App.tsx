import React, { Suspense, lazy } from 'react';
import {
	BrowserRouter,
	Route,
	Routes,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/*
	Import views : unique views (UV_*) and shared global views (GV_*)
*/
import GV_TopNav from '@/components/views/GV_TopNav.tsx';
import GV_Footer from '@/components/views/GV_Footer.tsx';

// Lazily loaded components for better performance
const UV_Homepage = lazy(() => import('@/components/views/UV_Homepage.tsx'));
const UV_Register = lazy(() => import('@/components/views/UV_Register.tsx'));
const UV_LoginPendingVerification = lazy(() => import('@/components/views/UV_LoginPendingVerification.tsx'));
const UV_RegistrationSuccess = lazy(() => import('@/components/views/UV_RegistrationSuccess.tsx'));
const UV_Login = lazy(() => import('@/components/views/UV_Login.tsx'));
const UV_PasswordResetRequest = lazy(() => import('@/components/views/UV_PasswordResetRequest.tsx'));
const UV_PasswordReset = lazy(() => import('@/components/views/UV_PasswordReset.tsx'));
const UV_UserProfileView = lazy(() => import('@/components/views/UV_UserProfileView.tsx'));
const UV_UserProfileEdit = lazy(() => import('@/components/views/UV_UserProfileEdit.tsx'));
const UV_UserSavedRecipes = lazy(() => import('@/components/views/UV_UserSavedRecipes.tsx'));
const UV_SubmitRecipe = lazy(() => import('@/components/views/UV_SubmitRecipe.tsx'));
const UV_RecipeView = lazy(() => import('@/components/views/UV_RecipeView.tsx'));
const UV_BrowseRecipes = lazy(() => import('@/components/views/UV_BrowseRecipes.tsx'));
const UV_SearchResults = lazy(() => import('@/components/views/UV_SearchResults.tsx'));
const UV_SubmitRecipeConfirmation = lazy(() => import('@/components/views/UV_SubmitRecipeConfirmation.tsx'));

// --- Global Stylesheet ---
// Assuming you have a global CSS file for resets, base styles, etc.
// import '@/styles/globals.css'; // Uncomment and adjust path if you have one

// --- Error Boundary Component ---
// A simple example. You might want a more sophisticated fallback UI.
class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error) {
		// Update state so the next render will show the fallback UI.
		return { hasError: true };
	}

	componentDidCatch(error, errorInfo) {
		// You can also log the error to an error reporting service
		console.error("Uncaught error:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			// You can render any custom fallback UI
			return (
				<div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-red-500">
					<h2 className="text-2xl font-bold mb-4">Something went wrong.</h2>
					<p>We are sorry for the inconvenience. Please try refreshing the page.</p>
					{/* Optionally, add a button to retry or navigate home */}
				</div>);
		}

		return this.props.children;
	}
}

// Instantiate QueryClient
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 minutes
			cacheTime: 1000 * 60 * 10, // 10 minutes
		},
	},
});

// --- Root App Component ---
const App: React.FC = () => {
	return (
		<BrowserRouter> {/* Added BrowserRouter */}
			<QueryClientProvider client={queryClient}>
				<ErrorBoundary> {/* Wrapped with ErrorBoundary */}
					<div className="flex flex-col min-h-screen">
						<GV_TopNav />
						<main className="flex-grow container mx-auto px-4 py-8"> {/* Main content wrapper */}
							<Suspense fallback={<div>Loading...</div>}> {/* Added Suspense for lazy loading */}
								<Routes>
									{/* Public Routes */}
									<Route path="/" element={<UV_Homepage />} />
									<Route path="/register" element={<UV_Register />} />
									<Route path="/verify-email" element={<UV_LoginPendingVerification />} />
									<Route path="/register/success" element={<UV_RegistrationSuccess />} />
									<Route path="/login" element={<UV_Login />} />
									<Route path="/forgot-password" element={<UV_PasswordResetRequest />} />
									{/* Route with dynamic segment for reset token */}
									<Route path="/reset-password" element={<UV_PasswordReset />} />
									<Route path="/reset-password/:reset_token" element={<UV_PasswordReset />} />

									{/* User Profile Routes */}
									{/* Route with dynamic segment for username */}
									<Route path="/profile/:username" element={<UV_UserProfileView />} />

									{/* Protected Routes (Authentication required) */}
									{/* NOTE: Actual authentication check should happen within these components or via a wrapper component */}
									<Route path="/profile/me/edit" element={<UV_UserProfileEdit />} />
									<Route path="/profile/me/saved-recipes" element={<UV_UserSavedRecipes />} />
									<Route path="/recipes/new" element={<UV_SubmitRecipe />} />
									{/* Route with dynamic segment for recipe_id, handled by UV_RecipeView */}
									<Route path="/recipes/:recipe_id" element={<UV_RecipeView />} />
									{/* Protected Route for editing own recipe, recipe_owner check likely within UV_SubmitRecipe */}
									<Route path="/recipes/:recipe_id/edit" element={<UV_SubmitRecipe />} />
									<Route path="/submit-recipe/success" element={<UV_SubmitRecipeConfirmation />} />

									{/* Browse and Search Routes */}
									{/* Query parameters for filtering/sorting handled by UV_BrowseRecipes */}
									<Route path="/browse" element={<UV_BrowseRecipes />} />
									{/* Query parameters for searching/filtering/sorting handled by UV_SearchResults */}
									<Route path="/search" element={<UV_SearchResults />} />

									{/* Optional: Catch-all for 404 Not Found */}
									{/* <Route path="*" element={<NotFoundPage />} /> */}
								</Routes>
							</Suspense>
						</main>
						<GV_Footer />
					</div>
				</ErrorBoundary>
			</QueryClientProvider>
		</BrowserRouter>
	);
};

export default App;