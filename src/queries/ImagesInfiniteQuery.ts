import { z } from 'zod';
import { useInfiniteQuery, QueryKey, InfiniteData } from '@tanstack/react-query';

const _queryDataSchema = z.object({
  images: z.array(z.string()),
  nextToken: z.string().nullable()
});

type QueryData = z.infer<typeof _queryDataSchema>;

const _fetchImages = async (token: string | null) => {
  const response = await fetch(
    'https://7mo5lqvxn8.execute-api.ap-southeast-2.amazonaws.com/Dev/list',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        continuationToken: token,
      }),
    }
  );

  return _queryDataSchema.parse(await response.json());
}

export const useImagesInfiniteQuery = () => useInfiniteQuery<QueryData, Error, InfiniteData<QueryData, QueryData['nextToken']>, QueryKey, QueryData['nextToken']>({
  queryKey: ['images'],
  queryFn: ({ pageParam }) => _fetchImages(pageParam),
  initialPageParam: null,
  getNextPageParam: (lastPage) => lastPage.nextToken,
})
