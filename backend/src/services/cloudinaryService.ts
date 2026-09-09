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
      resource_type: resourceType, // ✅ Utiliser le paramètre passé
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

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️ Fichier supprimé de Cloudinary : ${publicId}`);
  } catch (error) {
    console.error('❌ Erreur suppression Cloudinary:', error);
  }
};
