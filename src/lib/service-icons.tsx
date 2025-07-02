import React from 'react';
import { 
  Play, 
  Music, 
  Monitor, 
  ShoppingCart, 
  Gamepad2, 
  FileText, 
  Camera, 
  Cloud,
  Palette,
  BookOpen,
  Coffee,
  Car,
  Dumbbell,
  Package
} from 'lucide-react';

// Service-specific icon mappings
const serviceIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  // Streaming & Entertainment
  'netflix': () => (
    <div className="w-6 h-6 bg-red-600 rounded-sm flex items-center justify-center">
      <span className="text-white text-xs font-bold">N</span>
    </div>
  ),
  'disney': () => (
    <div className="w-6 h-6 bg-blue-600 rounded-sm flex items-center justify-center">
      <span className="text-white text-xs font-bold">D+</span>
    </div>
  ),
  'hulu': () => (
    <div className="w-6 h-6 bg-green-500 rounded-sm flex items-center justify-center">
      <span className="text-white text-xs font-bold">H</span>
    </div>
  ),
  'hbo': () => (
    <div className="w-6 h-6 bg-purple-600 rounded-sm flex items-center justify-center">
      <span className="text-white text-xs font-bold">HBO</span>
    </div>
  ),
  'amazon prime': () => (
    <div className="w-6 h-6 bg-blue-500 rounded-sm flex items-center justify-center">
      <span className="text-white text-xs font-bold">P</span>
    </div>
  ),
  'youtube': () => (
    <div className="w-6 h-6 bg-red-500 rounded-sm flex items-center justify-center">
      <Play className="w-4 h-4 text-white" />
    </div>
  ),
  
  // Music
  'spotify': () => (
    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
      <Music className="w-4 h-4 text-white" />
    </div>
  ),
  'apple music': () => (
    <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-purple-600 rounded-sm flex items-center justify-center">
      <Music className="w-4 h-4 text-white" />
    </div>
  ),
  'youtube music': () => (
    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
      <Music className="w-4 h-4 text-white" />
    </div>
  ),
  
  // Adobe Products
  'adobe': () => (
    <div className="w-6 h-6 bg-red-600 rounded-sm flex items-center justify-center">
      <Palette className="w-4 h-4 text-white" />
    </div>
  ),
  'photoshop': () => (
    <div className="w-6 h-6 bg-blue-600 rounded-sm flex items-center justify-center">
      <span className="text-white text-xs font-bold">Ps</span>
    </div>
  ),
  
  // Microsoft
  'microsoft': () => (
    <div className="w-6 h-6 bg-blue-600 rounded-sm flex items-center justify-center">
      <span className="text-white text-xs font-bold">MS</span>
    </div>
  ),
  'office 365': () => (
    <div className="w-6 h-6 bg-orange-500 rounded-sm flex items-center justify-center">
      <FileText className="w-4 h-4 text-white" />
    </div>
  ),
  
  // Cloud Storage
  'dropbox': () => (
    <div className="w-6 h-6 bg-blue-500 rounded-sm flex items-center justify-center">
      <Cloud className="w-4 h-4 text-white" />
    </div>
  ),
  'google drive': () => (
    <div className="w-6 h-6 bg-blue-500 rounded-sm flex items-center justify-center">
      <Cloud className="w-4 h-4 text-white" />
    </div>
  ),
  
  // Gaming
  'xbox': () => (
    <div className="w-6 h-6 bg-green-600 rounded-sm flex items-center justify-center">
      <Gamepad2 className="w-4 h-4 text-white" />
    </div>
  ),
  'playstation': () => (
    <div className="w-6 h-6 bg-blue-600 rounded-sm flex items-center justify-center">
      <Gamepad2 className="w-4 h-4 text-white" />
    </div>
  ),
  
  // Fitness
  'peloton': () => (
    <div className="w-6 h-6 bg-black rounded-sm flex items-center justify-center">
      <Dumbbell className="w-4 h-4 text-white" />
    </div>
  ),
  
  // Default fallback
  'default': Package
};

export function getServiceIcon(serviceName: string): React.ComponentType<{ className?: string }> {
  if (!serviceName || typeof serviceName !== 'string') {
    return serviceIconMap.default;
  }
  
  const normalizedName = serviceName.toLowerCase().trim();
  
  // Try exact matches first
  if (serviceIconMap[normalizedName]) {
    return serviceIconMap[normalizedName];
  }
  
  // Try partial matches - only check if normalized name contains the key
  // Avoid symmetric matching to prevent infinite loops
  for (const [key, icon] of Object.entries(serviceIconMap)) {
    if (key !== 'default' && normalizedName.includes(key)) {
      return icon;
    }
  }
  
  // Return default icon
  return serviceIconMap.default;
}

// Export individual icons for direct use
export const ServiceIcons = serviceIconMap;
