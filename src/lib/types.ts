export type Page = 'home' | 'pricing' | 'my-creations' | 'billing';

export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'studio';
}

export interface Creation {
  id: string;
  originalImage: string;
  generatedImage: string;
  style: string;
  date: string;
  status?: 'waiting' | 'processing' | 'success' | 'failed';
  prompt?: string;
  errorMessage?: string;
}

export interface StyleTemplate {
  id: string;
  label: string;
  prompt: string;
  icon: string;
}
