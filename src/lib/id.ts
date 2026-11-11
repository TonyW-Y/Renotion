import { nanoid } from 'nanoid';

/** Short, URL-safe unique id for plan elements and projects. */
export const createId = (): string => nanoid(10);
