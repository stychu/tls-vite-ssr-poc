import React from 'react';
import { trpc } from '../../utils/trpc';

export const Page = () => {
  const hello = trpc.useQuery(['getUserById', 'oke'])

  if (!hello.data) return <div>Loading...</div>;

  return (
    <div>
      <p>{hello.data.id} </p>
      <p>{hello.data.name} </p>
      <p>{hello.data.bio} </p>
    </div>
  );
};
