/** Model id being dragged from the catalogue (dataTransfer isn't readable during dragover). */
let dragging: string | null = null;

export const setDraggingModel = (id: string | null): void => {
  dragging = id;
};
export const getDraggingModel = (): string | null => dragging;
