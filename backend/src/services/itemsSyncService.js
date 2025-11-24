const Items = require('../features/items/items.model');
const ItemsService = require('../features/items/items.service');

class ItemsSyncService {
    /**
     * Sync items from Cloudinary to MongoDB
     */
    static async syncCloudinaryToMongoDB() {
        try {
            console.log('\n========== Syncing Items: Cloudinary → MongoDB ==========');

            // Fetch items from Cloudinary
            const cloudinaryItems = await ItemsService.getItemsFromCloudinary();

            if (!cloudinaryItems || cloudinaryItems.length === 0) {
                console.log('[ItemsSync] No items found on Cloudinary');
                return { success: true, synced: 0, updated: 0, created: 0 };
            }

            // Collect all Cloudinary IDs to identify items to remove
            const validCloudinaryIds = cloudinaryItems.map(i => i.cloudinary_id).filter(id => id);

            let created = 0;
            let updated = 0;

            for (const item of cloudinaryItems) {
                try {
                    // Check if item exists in MongoDB by cloudinary_id
                    const existing = await Items.findOne({ cloudinary_id: item.cloudinary_id });

                    if (existing) {
                        // Update existing item
                        await Items.updateOne(
                            { _id: existing._id },
                            {
                                $set: {
                                    name: item.name,
                                    description: item.description,
                                    image_url: item.image_url,
                                    item_type: item.item_type,
                                    rarity: item.rarity,
                                    price: item.price,
                                    updated_at: new Date()
                                }
                            }
                        );
                        updated++;
                        console.log(`  ✓ Updated: ${item.name}`);
                    } else {
                        // Create new item
                        await Items.create({
                            name: item.name,
                            description: item.description,
                            image_url: item.image_url,
                            item_type: item.item_type,
                            rarity: item.rarity,
                            price: item.price,
                            cloudinary_id: item.cloudinary_id,
                            created_at: new Date()
                        });
                        created++;
                        console.log(`  + Created: ${item.name}`);
                    }
                } catch (itemError) {
                    console.error(`  ✗ Failed to sync ${item.name}:`, itemError.message);
                }
            }

            // Cleanup: Remove items that are no longer in Cloudinary
            if (validCloudinaryIds.length > 0) {
                const deleteResult = await Items.deleteMany({
                    cloudinary_id: { $nin: validCloudinaryIds }
                });
                if (deleteResult.deletedCount > 0) {
                    console.log(`  🗑️  Deleted ${deleteResult.deletedCount} obsolete items from MongoDB`);
                }
            }

            console.log('\n========================================');
            console.log('Items Sync Complete!');
            console.log(`Created: ${created}`);
            console.log(`Updated: ${updated}`);
            console.log('========================================\n');

            return {
                success: true,
                synced: cloudinaryItems.length,
                created,
                updated
            };
        } catch (error) {
            console.error('[ItemsSync] ❌ Sync failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = ItemsSyncService;
