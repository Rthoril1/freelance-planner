'use client';

import { useRef, useState } from 'react';
import { Upload, User, Loader2 } from 'lucide-react';
import { uploadToStorage, supabase } from '@/lib/supabase';
import { generateId } from '@/lib/utils';
import { useStore } from '@/store/useStore';

export function ProfilePhotoUploader() {
  const { profile, updateProfile } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const path = `avatars/${user.id}/${generateId()}-${file.name}`;
      const url = await uploadToStorage('profile_assets', path, file);
      
      await updateProfile({ avatarUrl: url });
    } catch (error) {
      console.error('Failed to upload avatar', error);
      alert('Failed to upload image. Did you run the SQL script?');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative group shrink-0">
      <input 
        type="file" 
        accept="image/png, image/jpeg, image/jpg" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-16 h-16 rounded-3xl bg-white border border-slate-100 flex items-center justify-center relative overflow-hidden transition-all shadow-sm group-hover:shadow-md group-hover:border-primary/30"
        title="Upload Profile Photo"
      >
        {isUploading ? (
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        ) : profile?.avatarUrl ? (
          <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <User className="w-6 h-6 text-slate-300 group-hover:text-primary transition-colors" />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Upload className="w-5 h-5 text-white" />
        </div>
      </button>
    </div>
  );
}
