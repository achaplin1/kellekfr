import React from 'react';

export function Button({ children, className = '', ...rest }) {
  return (
    <button
      {...rest}
      className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${className}`}
    >
      {children}
    </button>
  );
}
