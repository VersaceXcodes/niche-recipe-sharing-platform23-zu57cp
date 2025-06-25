import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main'; // Assuming Zustand store is at '@/store/main'

// Define prop types if necessary, though this is a global component often used without explicit props
// interface GV_TopNavProps {}

const GV_TopNav: React.FC = () => {
  const navigate = useNavigate();
  const [searchInputValue, setSearchInputValue] = useState<string>('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);

  // Accessing global state via Zustand hook
  const isAuthenticated = useAppStore((state) => state.is_authenticated);
  const userProfileSummary = useAppStore((state) => state.user_profile_summary);
  const handleLogout = useAppStore((state) => state.handleLogout);
  const setSearchQueryGlobal = useAppStore((state) => state.setSearchQuery); // Action to update global search query

  // Ref for the user menu dropdown to detect clicks outside
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Handler for closing the user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuRef]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInputValue(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchInputValue.trim()) {
      // Update global search query state
      setSearchQueryGlobal(searchInputValue.trim());
      // Navigate to search results page
      navigate(`/search?q=${encodeURIComponent(searchInputValue.trim())}`);
    }
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen((prev) => !prev);
  };

  const handleNavigationLogout = () => {
    handleLogout();
    // Optionally navigate to home page after logout
    navigate('/');
    setIsUserMenuOpen(false); // Close menu after logout
  };

  const profileUrl = userProfileSummary
    ? `/profile/${userProfileSummary.username}`
    : '/profile/me/edit'; // Fallback if username is somehow null but user is auth'd

  const submitRecipeLink = isAuthenticated ? (
    <Link
      to="/recipes/new"
      className="text-gray-700 hover:text-green-500 px-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
    >
      Submit Recipe
    </Link>
  ) : null;

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section: Logo and primary navigation */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link to="/" className="text-2xl font-bold text-green-600">
                KetoAthlete Eats
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  to="/browse"
                  className="text-gray-700 hover:text-green-500 px-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
                >
                  Browse Recipes
                </Link>
                {submitRecipeLink}
              </div>
            </div>
          </div>

          {/* Center section: Search Bar */}
          <div className="flex-1 flex justify-center px-2 lg:ml-6 lg:justify-center">
            <form
              onSubmit={handleSearchSubmit}
              className="w-full max-w-lg flex items-center"
            >
              <label htmlFor="search-field" className="sr-only">
                Search
              </label>
              <div className="relative w-full">
                <input
                  id="search-field"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm transition duration-150 ease-in-out"
                  placeholder="Search recipes..."
                  type="search"
                  value={searchInputValue}
                  onChange={handleSearchInputChange}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l2.885 2.886a1 1 0 01-1.415 1.415l-2.886-2.885A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              {/* Optional: Add a submit button if Enter key isn't sufficient */}
              {/* <button type="submit" className="ml-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50">
                Search
              </button> */}
            </form>
          </div>

          {/* Right section: Authentication / User Menu */}
          <div className="md:ml-4 md:flex md:items-center">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out mr-3"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <div className="ml-3 relative" ref={userMenuRef}>
                <div>
                  <button
                    type="button"
                    className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    id="user-menu-button"
                    aria-expanded={isUserMenuOpen}
                    onClick={toggleUserMenu}
                  >
                    <span className="sr-only">Open user menu</span>
                    {userProfileSummary?.profile_picture_url ? (
                      <img
                        className="h-8 w-8 rounded-full object-cover"
                        src={userProfileSummary.profile_picture_url}
                        alt="User avatar"
                      />
                    ) : (
                      <span className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-green-600 font-semibold text-sm">
                        {userProfileSummary?.username ? userProfileSummary.username.charAt(0).toUpperCase() : '?'}
                      </span>
                    )}
                    <span className="ml-2 hidden md:inline">{userProfileSummary?.username || 'User'}</span>
                    <svg
                      className="ml-1 h-4 w-4 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>

                {/* Dropdown menu, show/hide based on isUserMenuOpen state */}
                {isUserMenuOpen && (
                  <div
                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                    tabIndex={-1}
                  >
                    <Link
                      to={profileUrl}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                      onClick={() => setIsUserMenuOpen(false)} // Close menu on link click
                    >
                      My Profile
                    </Link>
                    <Link
                      to="/profile/me/saved-recipes"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                      onClick={() => setIsUserMenuOpen(false)} // Close menu on link click
                    >
                      Saved Recipes
                    </Link>
                    <button
                      onClick={handleNavigationLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      role="menuitem"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu button (Hamburger) - Optional: Implement if needed */}
      {/* <div className="md:hidden" id="mobile-menu">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link to="/browse" className="text-gray-700 hover:text-green-500 block px-3 py-2 rounded-md text-base font-medium">
            Browse Recipes
          </Link>
          {submitRecipeLink}
        </div>
      </div> */}
    </nav>
  );
};

export default GV_TopNav;