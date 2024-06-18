import ImageGallery from './ImageGallery';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="w-full min-h-dvh">
        <ImageGallery />
      </div>
    </QueryClientProvider>
  );
}

export default App;
