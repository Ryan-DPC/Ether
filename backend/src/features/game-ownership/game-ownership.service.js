const GameOwnership = require('./game-ownership.model');
const Users = require('../users/user.model');
const Games = require('../games/games.model');

class GameOwnershipService {
    /**
     * Helper to populate game details from Games collection
     */
    static async _populateGameDetails(ownershipDocs) {
        if (!ownershipDocs || ownershipDocs.length === 0) return [];

        // Extract unique keys and IDs
        const gameKeys = [...new Set(ownershipDocs.map(d => d.game_key).filter(k => k))];
        const gameIds = [...new Set(ownershipDocs.map(d => d.game_id || d.gameId).filter(id => id))];

        console.log('[GameOwnership] Populating details. Keys:', gameKeys, 'IDs:', gameIds);

        // Fetch game details from Games collection
        const games = await Games.getGamesByKeysOrIds(gameKeys, gameIds);

        // Create maps for quick lookup
        const gamesByFolder = {};
        const gamesById = {};

        games.forEach(g => {
            if (g.folder_name) gamesByFolder[g.folder_name] = g;
            if (g._id) gamesById[g._id.toString()] = g;
        });

        // Merge details
        return ownershipDocs.map(doc => {
            const docObj = doc.toObject ? doc.toObject() : doc;

            // Try to find game details by ID first, then by folder name (key)
            const gameId = docObj.game_id || docObj.gameId;
            let gameDetails = null;

            if (gameId && gamesById[gameId.toString()]) {
                gameDetails = gamesById[gameId.toString()];
            } else if (docObj.game_key && gamesByFolder[docObj.game_key]) {
                gameDetails = gamesByFolder[docObj.game_key];
            }

            // Base result with ownership fields preserved
            const result = {
                _id: docObj._id,
                user_id: docObj.user_id,
                game_key: docObj.game_key,
                game_name: docObj.game_name,
                ownership_token: docObj.ownership_token,
                for_sale: docObj.for_sale,
                asking_price: docObj.asking_price,
                listed_at: docObj.listed_at,
                purchase_price: docObj.purchase_price,
                purchase_date: docObj.purchase_date,
                installed: docObj.installed
            };

            if (gameDetails) {
                result.game_name = gameDetails.game_name || docObj.game_name;
                result.genre = gameDetails.genre || 'N/A';
                result.image_url = gameDetails.image_url || '';
                result.description = gameDetails.description || '';
                result.game_id = gameDetails._id.toString();
            } else {
                result.genre = 'N/A';
                result.image_url = '';
            }

            return result;
        });
    }

    /**
     * Get all games owned by a user
     */
    static async getUserGames(userId) {
        const docs = await GameOwnership.find({ user_id: userId }).sort({ purchase_date: -1 });
        return await this._populateGameDetails(docs);
    }

    /**
     * Redeem a game key (manual add)
     */
    static async redeemKey(userId, gameKey, gameName) {
        // Check if user already owns this game
        const existing = await GameOwnership.findOne({ user_id: userId, game_key: gameKey });
        if (existing) {
            throw new Error('You already own this game');
        }

        const ownership = new GameOwnership({
            user_id: userId,
            game_key: gameKey,
            game_name: gameName || `Game ${gameKey}`,
            is_manual_add: true,
            purchase_price: 0
        });

        return await ownership.save();
    }

    /**
     * Mark game as installed
     */
    static async installGame(userId, gameKey) {
        const ownership = await GameOwnership.findOneAndUpdate(
            { user_id: userId, game_key: gameKey },
            { installed: true },
            { new: true }
        );

        if (!ownership) {
            throw new Error('Game not found in your library');
        }

        return ownership;
    }

    /**
     * List a game for sale
     */
    static async listForSale(userId, gameKey, askingPrice) {
        if (askingPrice <= 0) {
            throw new Error('Asking price must be greater than 0');
        }

        const ownership = await GameOwnership.findOne({
            user_id: userId,
            game_key: gameKey
        });

        if (!ownership) {
            throw new Error('Game not found in your library');
        }

        if (ownership.for_sale) {
            throw new Error('Game is already listed for sale');
        }

        ownership.for_sale = true;
        ownership.asking_price = askingPrice;
        ownership.listed_at = new Date();
        ownership.installed = false; // Mark as uninstalled when listed

        return await ownership.save();
    }

    /**
     * Cancel a sale listing
     */
    static async cancelSale(userId, ownershipToken) {
        const ownership = await GameOwnership.findOne({
            user_id: userId,
            ownership_token: ownershipToken
        });

        if (!ownership) {
            throw new Error('Listing not found');
        }

        ownership.for_sale = false;
        ownership.asking_price = null;
        ownership.listed_at = null;

        return await ownership.save();
    }

    /**
     * Get marketplace listings (games for sale)
     */
    static async getMarketplace(filters = {}, userId = null) {
        const query = { for_sale: true };

        // Exclude own listings if userId is provided
        if (userId) {
            query.user_id = { $ne: userId };
        }

        // Filter by price range
        if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
            query.asking_price = {};
            if (filters.minPrice !== undefined) query.asking_price.$gte = parseFloat(filters.minPrice);
            if (filters.maxPrice !== undefined) query.asking_price.$lte = parseFloat(filters.maxPrice);
        }

        const docs = await GameOwnership.find(query)
            .populate('user_id', 'username')
            .sort({ listed_at: -1 })
            .limit(100)
            .lean();

        return await this._populateGameDetails(docs);
    }

    /**
     * Purchase a used game from marketplace
     */
    static async purchaseUsedGame(buyerId, ownershipToken, sellerId) {
        const session = await GameOwnership.startSession();
        session.startTransaction();

        try {
            // Find the listing
            const listing = await GameOwnership.findOne({
                ownership_token: ownershipToken,
                user_id: sellerId,
                for_sale: true
            }).session(session);

            if (!listing) {
                throw new Error('Listing not found or no longer available');
            }

            // Check if buyer already owns this game
            const alreadyOwns = await GameOwnership.findOne({
                user_id: buyerId,
                game_key: listing.game_key
            }).session(session);

            if (alreadyOwns) {
                throw new Error('You already own this game');
            }

            const salePrice = listing.asking_price;
            const platformFee = salePrice * 0.05; // 5%
            const developerFee = salePrice * 0.02; // 2%
            const sellerReceives = salePrice - platformFee - developerFee;

            // Get buyer and seller
            const buyer = await Users.getUserById(buyerId);
            const seller = await Users.getUserById(sellerId);

            if (!buyer || !seller) {
                throw new Error('User not found');
            }

            // Check buyer has enough balance
            if (buyer.balances.chf < salePrice) {
                throw new Error('Insufficient balance');
            }

            // Transfer funds
            await Users.updateBalances(buyerId, { chf: -salePrice });
            await Users.updateBalances(sellerId, { chf: sellerReceives });

            // Transfer ownership
            listing.user_id = buyerId;
            listing.for_sale = false;
            listing.asking_price = null;
            listing.listed_at = null;
            listing.purchase_price = salePrice;
            listing.purchase_date = new Date();
            listing.installed = false;
            await listing.save({ session });

            await session.commitTransaction();
            session.endSession();

            // Record transaction in Blockchain (outside of Mongo transaction)
            try {
                const etherBlockchain = require('../../services/blockchain.instance');
                const { Transaction } = require('../../services/blockchain.service');

                // 1. Transaction: Buyer -> Seller (Net Amount)
                const txToSeller = new Transaction(buyerId, sellerId, sellerReceives, 'game_sale', listing.game_key);
                etherBlockchain.createTransaction(txToSeller);

                // 2. Transaction: Buyer -> Platform (Fee)
                const txToPlatform = new Transaction(buyerId, 'PLATFORM_WALLET', platformFee, 'commission', listing.game_key);
                etherBlockchain.createTransaction(txToPlatform);

                // 3. Transaction: Buyer -> Developer (Fee)
                const txToDev = new Transaction(buyerId, 'DEVELOPER_WALLET', developerFee, 'commission', listing.game_key);
                etherBlockchain.createTransaction(txToDev);

                // Mine the block immediately for this simulation
                etherBlockchain.minePendingTransactions('MINER_WALLET');

                console.log(`[Blockchain] Recorded sale of ${listing.game_name}`);
            } catch (bcError) {
                console.error('[Blockchain] Failed to record transaction:', bcError);
                // Don't fail the HTTP request if blockchain fails (it's a secondary system for now)
            }

            return {
                success: true,
                game: listing,
                salePrice,
                platformFee,
                developerFee,
                sellerReceives
            };
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }

    /**
     * Get market statistics for a specific game
     */
    static async getGameStats(gameKey) {
        // 1. Average Price (from historical sales)
        const sales = await GameOwnership.find({
            game_key: gameKey,
            purchase_price: { $gt: 0 }, // Only actual sales
            is_manual_add: false
        });

        let averagePrice = 0;
        if (sales.length > 0) {
            const total = sales.reduce((sum, sale) => sum + (sale.purchase_price || 0), 0);
            averagePrice = total / sales.length;
        }

        // 2. Lowest Active Price
        const activeListings = await GameOwnership.find({
            game_key: gameKey,
            for_sale: true
        }).sort({ asking_price: 1 }).limit(1);

        const lowestPrice = activeListings.length > 0 ? activeListings[0].asking_price : null;

        // 3. Total Active Listings
        const totalListings = await GameOwnership.countDocuments({
            game_key: gameKey,
            for_sale: true
        });

        return {
            gameKey,
            averagePrice,
            lowestPrice,
            totalListings,
            totalSales: sales.length
        };
    }

    /**
     * Get user's active sales
     */
    static async getActiveSales(userId) {
        const docs = await GameOwnership.find({
            user_id: userId,
            for_sale: true
        }).sort({ listed_at: -1 });
        return await this._populateGameDetails(docs);
    }

    /**
     * Get transaction history (simplified)
     */
    static async getTransactions(userId) {
        // Get games purchased (not manual adds)
        const purchases = await GameOwnership.find({
            user_id: userId,
            is_manual_add: false
        }).sort({ purchase_date: -1 }).limit(50);

        const populated = await this._populateGameDetails(purchases);

        return populated.map(p => ({
            id: p._id,
            game_name: p.game_name,
            type: 'purchase',
            amount: p.purchase_price,
            created_at: p.purchase_date
        }));
    }

    /**
     * Delete a marketplace listing (Admin or Owner)
     */
    static async deleteListing(userId, ownershipToken) {
        // 1. Get the user to check if admin
        const user = await Users.getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // 2. Find the listing
        const ownership = await GameOwnership.findOne({
            ownership_token: ownershipToken
        });

        if (!ownership) {
            throw new Error('Listing not found');
        }

        // 3. Check permissions (Admin or Owner)
        const isOwner = ownership.user_id.toString() === userId;
        const isAdmin = user.isAdmin === true;

        if (!isOwner && !isAdmin) {
            throw new Error('Unauthorized: You can only delete your own listings unless you are an admin');
        }

        // 4. Remove from sale
        ownership.for_sale = false;
        ownership.asking_price = null;
        ownership.listed_at = null;

        await ownership.save();

        return { success: true, message: 'Listing removed successfully' };
    }
}

module.exports = GameOwnershipService;
