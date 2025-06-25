import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

// No external state store or API calls are needed for this view.

const UV_RegistrationSuccess: React.FC = () => {
	const navigate = useNavigate();

	// Action to navigate to the login page
	const navigate_to_login = (): void => {
		navigate('/login');
	};

	return (
		<>
			<div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-6">
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="w-16 h-16 mx-auto text-green-500 dark:text-green-400 mb-4"
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fillRule="evenodd"
							d="M16.707 4.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 11.586l7.293-7.293a1 1 0 011.414 0z"
							clipRule="evenodd"
						/>
					</svg>
					<h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
						Registration Successful!
					</h2>
					<p className="text-gray-600 dark:text-gray-300 mb-6">
						Your account has been created and your email has been verified.
						You're all set to explore KetoAthlete Eats!
					</p>
					<button
						onClick={navigate_to_login}
						className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out"
					>
						Go to Login
					</button>

					{/* Optional alternative navigation via Link component */}
					{/*
					<div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
						Or head back to the {' '}
						<Link to="/" className="text-green-600 hover:underline dark:text-green-400">
							Homepage
						</Link>
						.
					</div>
					*/}
				</div>
			</div>
		</>
	);
};

export default UV_RegistrationSuccess;