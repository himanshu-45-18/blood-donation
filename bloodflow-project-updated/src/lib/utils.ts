import { clsx, type ClassValue } from './clsx-shim';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
