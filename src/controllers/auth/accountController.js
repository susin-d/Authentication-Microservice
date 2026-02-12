import * as userService from '../../services/userService.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const deleteAccount = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const deletedCount = await userService.deleteUser(userId);
    if (deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'User not found or already deleted' });
    }

    res.status(200).json({
        success: true,
        message: 'Account deleted successfully'
    });
});
