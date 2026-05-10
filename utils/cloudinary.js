const CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function upload(file, resourceType) {
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD}/${resourceType}/upload`,
    { method: 'POST', body: form }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Upload failed');
  }
  const data = await res.json();
  return data.secure_url;
}

export const uploadImage = (file) => upload(file, 'image');
export const uploadFile  = (file) => upload(file, file.type.startsWith('image/') ? 'image' : 'raw');
