import React from 'react';

export function Input(props) {
  return (
    <input
      {...props}
      className={`${props.className} border rounded p-2`}
    />
  );
}
