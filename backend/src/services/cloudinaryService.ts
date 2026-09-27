// backend/src/services/cloudinaryService.ts
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config();

export const uploadToCloudinary = async (
  filePath: string,
  folder: string,
  resourceType: 'raw' | 'auto' | 'image' | 'video' = 'auto'
): Promise<{ publicId: string; secureUrl: string }> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: resourceType,
      access_mode: 'public', // ✅ Rendre le fichier accessible publiquement
    });

    // Supprimer le fichier local après l'upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    console.log(`✅ Fichier uploadé sur Cloudinary (${resourceType}) : ${result.secure_url}`);
    return { publicId: result.public_id, secureUrl: result.secure_url };
  } catch (error) {
    console.error('❌ Erreur upload Cloudinary:', error);
    throw new Error('Échec de l\'upload vers Cloudinary');
  }
};

// ============================================================
// ✅ Upload depuis un Buffer (pour édition)
// ============================================================
export const uploadBufferToCloudinary = async (
  buffer: Buffer,
  folder: string,
  mimeType: string
): Promise<{ publicId: string; secureUrl: string }> => {
  return new Promise((resolve, reject) => {
    const resourceType = mimeType.startsWith('image/') ? 'image'
      : mimeType.startsWith('video/') ? 'video'
      : 'raw';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Upload failed'));
        resolve({ publicId: result.public_id, secureUrl: result.secure_url });
      }
    );

    uploadStream.end(buffer);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️ Fichier supprimé de Cloudinary : ${publicId}`);
  } catch (error) {
    console.error('❌ Erreur suppression Cloudinary:', error);
  }
};
