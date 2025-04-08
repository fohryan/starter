import React from 'react';
import Canvas from '@/components/Canvas';
import { usePlanStore } from '@/store/planStore';

function App() {
  const addItem = usePlanStore((state) => state.addItem);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-60 bg-white border-r border-neutral-300 p-4 space-y-2">
        <h2 className="text-lg font-bold mb-4">Stage Items</h2>
        <button
          className="w-full px-3 py-2 bg-black text-white rounded hover:bg-neutral-800"
          onClick={() => addItem('mic', 100, 100)}
        >
          Add Mic
        </button>
        <button
          className="w-full px-3 py-2 bg-neutral-700 text-white rounded hover:bg-neutral-600"
          onClick={() => addItem('monitor', 200, 200)}
        >
          Add Monitor
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-neutral-200 overflow-hidden">
        <Canvas />
      </div>
    </div>
  );
}

export default App;
