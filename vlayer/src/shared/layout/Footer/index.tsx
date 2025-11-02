import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full px-6 py-4 mt-8 mb-4">
      <div className="flex justify-between items-center max-w-[95vw] mx-auto">
        <div className="text-sm text-slate-400">
          Copyright © 2025 VerinLayer. All rights reserved.
        </div>
        <div className="flex items-center">
          <a
            href="https://twitter.com/verinlayer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-cyan-400 transition-colors duration-300"
            aria-label="Follow VerinLayer on Twitter"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
};

