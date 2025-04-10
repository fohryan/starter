import { create } from 'zustand';
import { v4 as uuid } from 'uuid';

export type StageItemType = 'mic' | 'monitor' | 'amp' | 'keyboard';

export interface StageItem {
  id: string;
  type: StageItemType;
  x: number;
  y: number;
  rotation: number;
  label?: string;
}

interface PlanState {
  items: StageItem[];
  selectedItemIds: string[];
  addItem: (type: StageItemType, x: number, y: number, rotation?: number) => void;
  selectItem: (id: string) => void;
  toggleItemSelection: (id: string) => void;
  selectMultipleItems: (ids: string[]) => void;
  clearSelection: () => void;
  updateItemPosition: (id: string, x: number, y: number) => void;
  updateItemRotation: (id: string, angle: number) => void;
  removeItems: (ids: string[]) => void;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  items: [],
  selectedItemIds: [],

  addItem: (type, x, y, rotation = 0) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          id: uuid(),
          type,
          x,
          y,
          rotation, // ✅ use provided rotation or default to 0
          label: undefined,
        },
      ],
    })),

  selectItem: (id) => set(() => ({ selectedItemIds: [id] })),

  toggleItemSelection: (id) =>
    set((state) => {
      const selected = new Set(state.selectedItemIds);
      if (selected.has(id)) {
        selected.delete(id);
      } else {
        selected.add(id);
      }
      return { selectedItemIds: Array.from(selected) };
    }),

  selectMultipleItems: (ids) => set(() => ({ selectedItemIds: [...ids] })),

  clearSelection: () => set(() => ({ selectedItemIds: [] })),

  updateItemPosition: (id, x, y) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, x, y } : item)),
    })),

  updateItemRotation: (id, angle) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, rotation: angle } : item)),
    })),

  removeItems: (ids) =>
    set((state) => ({
      items: state.items.filter((item) => !ids.includes(item.id)),
      selectedItemIds: state.selectedItemIds.filter((id) => !ids.includes(id)),
    })),
}));
