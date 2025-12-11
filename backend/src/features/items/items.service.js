const Items = require('./items.model');
const UserItems = require('./userItems.model');
const Users = require('../users/user.model');
const CloudinaryService = require('../../services/cloudinary.service');
const mongoose = require('mongoose');

class ItemsService {
    // --- Items Management ---

    static async getAllItems(filters = {}) {
        try {
            // We now rely on ItemsSyncService (Cron) to keep MongoDB up to date.
            // This ensures we always return MongoDB _ids, which are required for purchase/equip operations.

            // Fallback to MongoDB
            console.log('[Items] Fetching items from MongoDB...', filters);
            const docs = await Items.find(filters).lean();
            console.log(`[Items] Returning ${docs.length} items from MongoDB`);
            return docs.map((d) => ({ id: d._id.toString(), ...d }));
        } catch (error) {
            console.error('[Items] ❌ Error fetching items:', error);
            throw error;
        }
    }

    static async getItemsFromCloudinary() {
        const cloudinary = require('cloudinary').v2;

        // List all images in items folder
        const result = await cloudinary.api.resources({
            type: 'upload',
            prefix: 'items/',
            max_results: 500
        });

        const items = result.resources.map((resource, index) => {
            // Extract item type from folder structure: items/profile_pictures/xxx.png
            const pathParts = resource.public_id.split('/');
            const folderName = pathParts[1] || 'other';
            const filename = pathParts[pathParts.length - 1];

            // Map folder names to item types
            let itemType = 'other';
            if (folderName === 'banners') itemType = 'banner';
            else if (folderName === 'avatar_frames') itemType = 'avatar_frame';
            else if (folderName === 'profile_pictures') itemType = 'profile_picture';
            else if (folderName === 'badges') itemType = 'badge';
            else if (folderName === 'backgrounds') itemType = 'background';
            else itemType = 'other';

            // Determine rarity based on filename or index (placeholder)
            const rarities = ['common', 'rare', 'epic', 'legendary'];
            const rarity = rarities[index % 4];

            let description = 'Un objet cosmétique';
            if (itemType === 'banner') description = 'Bannière de profil';
            if (itemType === 'avatar_frame') description = 'Cadre d\'avatar';
            if (itemType === 'profile_picture') description = 'Photo de profil';
            if (itemType === 'badge') description = 'Badge honorifique';
            if (itemType === 'background') description = 'Arrière-plan de profil';

            return {
                id: resource.asset_id || resource.public_id.replace(/\//g, '_'),
                name: filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
                description: `${description} (${rarity})`,
                image_url: resource.secure_url,
                item_type: itemType,
                rarity: rarity,
                // Prices based on rarity and type
                price: (rarity === 'common' ? 100 : rarity === 'rare' ? 250 : rarity === 'epic' ? 500 : 1000) * (itemType === 'banner' ? 2 : 1),
                created_at: resource.created_at,
                cloudinary_id: resource.public_id
            };
        });

        console.log(`[Items] ✅ Found ${items.length} items on Cloudinary`);
        return items;
    }

    static async getItemById(itemId) {
        const doc = await Items.findById(itemId).lean();
        if (!doc) return null;
        return { id: doc._id.toString(), ...doc };
    }

    static async searchItems(query) {
        const regex = new RegExp(query, 'i');
        const docs = await Items.find({ $or: [{ name: regex }, { description: regex }] }).lean();
        return docs.map((d) => ({ id: d._id.toString(), ...d }));
    }

    // --- User Items Management ---

    static async getUserItems(userId) {
        const docs = await UserItems.find({ user_id: userId })
            .populate('item_id')
            .lean();
        return docs.map((d) => {
            const item = d.item_id;
            return {
                id: d._id.toString(),
                item: item ? {
                    id: item._id ? item._id.toString() : item.id,
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    // Utiliser user_image_url si disponible, sinon fallback sur image_url de l'item
                    image_url: d.user_image_url || item.image_url,
                    item_type: item.item_type,
                    rarity: item.rarity
                } : null,
                purchased_at: d.purchased_at,
                is_equipped: d.is_equipped
            };
        }).filter(d => d.item !== null); // Filtrer les items null (si populate a échoué)
    }

    static async getUserItem(userId, itemId) {
        const doc = await UserItems.findOne({ user_id: userId, item_id: itemId })
            .populate('item_id')
            .lean();
        if (!doc) return null;
        return {
            id: doc._id.toString(),
            item: doc.item_id,
            purchased_at: doc.purchased_at,
            is_equipped: doc.is_equipped
        };
    }

    static async addUserItem(userId, itemId, userImageUrl = null) {
        try {
            const doc = await UserItems.create({
                user_id: userId,
                item_id: itemId,
                user_image_url: userImageUrl
            });
            return doc._id.toString();
        } catch (error) {
            if (error.code === 11000) {
                throw new Error('Vous possédez déjà cet item');
            }
            throw error;
        }
    }

    static async equipItem(userId, itemId) {
        // Déséquiper tous les items du même type
        const item = await this.getItemById(itemId);
        if (!item) throw new Error('Item non trouvé');

        // Déséquiper les autres items du même type
        const allUserItems = await UserItems.find({ user_id: userId })
            .populate('item_id')
            .lean();

        for (const userItem of allUserItems) {
            if (userItem.item_id && userItem.item_id.item_type === item.item_type) {
                await UserItems.updateOne(
                    { _id: userItem._id },
                    { $set: { is_equipped: false } }
                );
            }
        }

        // Équiper le nouvel item
        const result = await UserItems.updateOne(
            { user_id: userId, item_id: itemId },
            { $set: { is_equipped: true } }
        );
        return result.modifiedCount > 0;
    }

    static async getEquippedItem(userId, itemType) {
        try {
            // S'assurer que userId est un ObjectId
            const userIdObj = mongoose.Types.ObjectId.isValid(userId)
                ? (userId instanceof mongoose.Types.ObjectId ? userId : new mongoose.Types.ObjectId(userId))
                : null;

            if (!userIdObj) {
                console.warn(`[getEquippedItem] ⚠️ userId invalide: ${userId}`);
                return null;
            }

            const doc = await UserItems.findOne({
                user_id: userIdObj,
                is_equipped: true
            })
                .populate({
                    path: 'item_id',
                    match: { item_type: itemType }
                })
                .lean();

            if (!doc) {
                return null;
            }

            if (!doc.item_id) {
                console.log(`[getEquippedItem] Item équipé trouvé mais item_id est null (populate a échoué)`);
                return null;
            }

            // Retourner l'item avec l'URL personnalisée si disponible
            const item = { ...doc.item_id };
            if (doc.user_image_url) {
                item.image_url = doc.user_image_url;
            }
            return item;
        } catch (error) {
            console.error(`[getEquippedItem] ❌ Erreur:`, error.message);
            return null;
        }
    }

    static async unequipItem(userId, itemId) {
        try {
            const userIdObj = mongoose.Types.ObjectId.isValid(userId)
                ? (userId instanceof mongoose.Types.ObjectId ? userId : new mongoose.Types.ObjectId(userId))
                : null;
            const itemIdObj = mongoose.Types.ObjectId.isValid(itemId)
                ? (itemId instanceof mongoose.Types.ObjectId ? itemId : new mongoose.Types.ObjectId(itemId))
                : null;

            if (!userIdObj || !itemIdObj) {
                throw new Error('ID utilisateur ou item invalide');
            }

            const result = await UserItems.updateOne(
                { user_id: userIdObj, item_id: itemIdObj },
                { $set: { is_equipped: false } }
            );

            return result.modifiedCount > 0;
        } catch (error) {
            console.error(`[unequipItem] ❌ Erreur:`, error.message);
            throw error;
        }
    }

    // --- Business Logic ---

    // Récupérer tous les items (avec info de possession si userId fourni)
    static async getAll(userId = null, filters = {}) {
        try {
            const items = await this.getAllItems(filters);

            // Si un userId est fourni, ajouter les infos de possession
            if (userId) {
                const userItems = await this.getUserItems(userId);
                const ownedItemIds = new Set(userItems.map(ui => ui.item?.id));

                return items.map(item => ({
                    ...item,
                    owned: ownedItemIds.has(item.id),
                    equipped: userItems.find(ui => ui.item?.id === item.id && ui.is_equipped) !== undefined
                }));
            }

            return items;
        } catch (error) {
            console.error('Erreur lors de la récupération de tous les items :', error);
            throw new Error('Erreur lors de la récupération de tous les items.');
        }
    }

    // Acheter un item avec des tokens
    static async purchaseItem(userId, itemId) {
        try {
            // Vérifier si l'utilisateur possède déjà l'item
            const existingItem = await this.getUserItem(userId, itemId);
            if (existingItem) {
                throw new Error('Vous possédez déjà cet item');
            }

            // Récupérer l'item
            const item = await this.getItemById(itemId);
            if (!item) {
                throw new Error('Item non trouvé');
            }

            // Vérifier le solde de tokens
            const user = await Users.getUserById(userId);
            if (!user) {
                throw new Error('Utilisateur non trouvé');
            }

            if (user.tokens < item.price) {
                throw new Error(`Solde insuffisant. Vous avez ${user.tokens} tokens, prix: ${item.price} tokens`);
            }

            // Débiter les tokens
            const newTokens = user.tokens - item.price;
            await Users.updateUserTokens(userId, newTokens);

            // Copier l'image de l'item dans le dossier personnel de l'utilisateur
            let userImageUrl = null;
            if (item.image_url) {
                try {
                    const cloudinaryService = new CloudinaryService();

                    if (cloudinaryService.isEnabled()) {
                        // Télécharger l'image depuis l'URL de l'item
                        const response = await fetch(item.image_url);
                        if (response.ok) {
                            const arrayBuffer = await response.arrayBuffer();
                            const imageBuffer = Buffer.from(arrayBuffer);

                            // Générer un nom de fichier unique basé sur l'ID de l'item
                            const itemIdStr = itemId.toString();
                            const fileName = itemIdStr.replace(/[^a-zA-Z0-9]/g, '_');
                            // Le publicId ne doit contenir que le nom du fichier, le folder sera ajouté automatiquement
                            const publicId = fileName;

                            // Déterminer la transformation selon le type d'item
                            let transformation = [];
                            if (item.item_type === 'background') {
                                // Pas de transformation, garder l'image originale
                                transformation = [];
                            } else if (item.item_type === 'banner') {
                                transformation = [{ width: 1000, crop: 'scale' }];
                            } else {
                                // Avatar, frames, badges
                                transformation = [{ width: 500, height: 500, crop: 'fill', gravity: 'auto' }];
                            }

                            // Uploader dans le dossier inventaire de l'utilisateur
                            const uploadResult = await cloudinaryService.uploadBuffer(imageBuffer, publicId, {
                                folder: `users/${userId}/inventaire`,
                                resource_type: 'image',
                                transformation: transformation
                            });

                            userImageUrl = uploadResult.url;
                            console.log(`[ItemsService] ✅ Item copié dans inventaire utilisateur: ${userImageUrl}`);
                        }
                    }
                } catch (copyError) {
                    console.warn(`[ItemsService] ⚠️ Impossible de copier l'image dans l'inventaire:`, copyError.message);
                    // Continuer même si la copie échoue, on utilisera l'URL originale
                }
            }

            // Ajouter l'item à l'utilisateur avec l'URL personnalisée
            await this.addUserItem(userId, itemId, userImageUrl);

            // Si c'est un item de profil et que l'utilisateur n'en a pas d'équipé, l'équiper automatiquement
            if (item.item_type === 'profile_picture') {
                const equippedPDP = await this.getEquippedItem(userId, 'profile_picture');
                if (!equippedPDP) {
                    await this.equipItem(userId, itemId);
                }
            }

            // Create Blockchain Transaction Record
            const BlockchainTx = require('../library/blockchainTx.model');
            const crypto = require('crypto');

            await BlockchainTx.create({
                transaction_id: `tx_${crypto.randomBytes(8).toString('hex')}`,
                from_address: userId,
                to_address: 'system_store',
                amount: item.price,
                transaction_type: 'item_purchase',
                item_id: itemId,
                timestamp: new Date()
            });

            return {
                success: true,
                remainingTokens: user.tokens - item.price,
                item: item
            };
        } catch (error) {
            console.error('Erreur lors de l\'achat de l\'item :', error);
            throw error;
        }
    }

    // Équiper un item (Wrapper avec logique métier supplémentaire)
    static async equip(userId, itemId) {
        try {
            // Vérifier que l'utilisateur possède l'item
            const userItem = await this.getUserItem(userId, itemId);
            if (!userItem) {
                throw new Error('Vous ne possédez pas cet item');
            }

            await this.equipItem(userId, itemId);

            // Récupérer l'URL de l'item équipé pour mettre à jour la session
            const item = await this.getItemById(itemId);
            const newProfilePicUrl = item && item.item_type === 'profile_picture' ? item.image_url : null;

            if (newProfilePicUrl) {
                await Users.updateUserProfilePic(userId, newProfilePicUrl);
            }

            return {
                success: true,
                profile_pic_url: newProfilePicUrl
            };
        } catch (error) {
            console.error('Erreur lors de l\'équipement de l\'item :', error);
            throw error;
        }
    }

    // Déséquiper un item (Wrapper)
    static async unequip(userId, itemId) {
        try {
            // Vérifier que l'utilisateur possède l'item
            const userItem = await this.getUserItem(userId, itemId);
            if (!userItem) {
                throw new Error('Vous ne possédez pas cet item');
            }

            // Déséquiper l'item via la méthode du modèle
            const success = await this.unequipItem(userId, itemId);

            return { success: success };
        } catch (error) {
            console.error('Erreur lors du déséquipement de l\'item :', error);
            throw error;
        }
    }
}

module.exports = ItemsService;
