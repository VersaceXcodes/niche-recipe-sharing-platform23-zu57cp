import React from 'react';
import { Link } from 'react-router-dom';

/**
 * @description The persistent footer at the bottom of the application. It includes
 *   standard elements such as copyright information and links to static content pages
 *   like 'Privacy Policy', 'Terms of Service', and 'Contact Us'. This provides
 *   essential legal and contact information accessible from anywhere within the
 *   application.
 * @returns {JSX.Element} The rendered footer component.
 */
const GV_Footer: React.FC = () => {
  // Get the current year for the copyright notice
  const current_year = new Date().getFullYear();

  return (
    <footer
      className={`
        bg-gray-800 text-gray-300 py-6 px-4
        flex flex-col md:flex-row md:justify-between md:items-center
        w-full
        mt-auto /* Ensures footer stays at the bottom if content is short */
      `}
    >
      {/* Left side: Copyright Information */}
      <div className="text-center md:text-left mb-4 md:mb-0">
        © {current_year} KetoAthlete Eats. All rights reserved.
      </div>

      {/* Right side: Links to static pages */}
      <div className="flex flex-wrap justify-center md:justify-end space-x-4">
        <Link
          to="/privacy-policy" /* Placeholder route */
          className="hover:text-white transition-colors duration-200"
        >
          Privacy Policy
        </Link>
        <Link
          to="/terms-of-service" /* Placeholder route */
          className="hover:text-white transition-colors duration-200"
        >
          Terms of Service
        </Link>
        <Link
          to="/contact" /* Placeholder route */
          className="hover:text-white transition-colors duration-200"
        >
          Contact Us
        </Link>
      </div>
    </footer>
  );
};

export default GV_Footer;