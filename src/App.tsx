import React from 'react';
import { Button } from '@/components/ui/button';

function App() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">StagePlot</h1>
      <Button variant="default">Add Microphone</Button>
    </div>
  );
}

export default App;
