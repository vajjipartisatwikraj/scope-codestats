const User = require('../models/User');
const Profile = require('../models/Profile');

class ScoreAggregator {
  async updateUserTotalScore(userId) {
    try {
      // Get all profiles for the user
      const profiles = await Profile.find({ userId }).lean();
      console.log(`Found ${profiles.length} profiles for user ${userId}`);
      
      // Calculate total score from all platforms with validation
      let totalScore = 0;
      profiles.forEach(profile => {
        // Ensure score is a valid number
        const score = typeof profile.score === 'number' && !isNaN(profile.score) ? profile.score : 0;
        console.log(`Platform ${profile.platform}: Score = ${score}`);
        totalScore += score;
      });

      console.log(`Calculated total score for user ${userId}: ${totalScore}`);

      // Update user's total score and return updated user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { totalScore },
        { new: true, runValidators: true }
      );
      
      if (!updatedUser) {
        console.error(`User ${userId} not found during score update`);
        throw new Error('User not found');
      }
      
      console.log(`Successfully updated total score for user ${userId}`);
      return totalScore;
    } catch (err) {
      console.error('Error updating total score:', err);
      throw err;
    }
  }

  async updateAllUserScores() {
    try {
      const users = await User.find().select('_id').lean();
      console.log(`Updating scores for ${users.length} users`);
      
      // Update scores for all users
      const updates = users.map(user => this.updateUserTotalScore(user._id));
      await Promise.all(updates);
      
      console.log('Successfully updated all user scores');
      return true;
    } catch (err) {
      console.error('Error updating all user scores:', err);
      throw err;
    }
  }
}

module.exports = new ScoreAggregator();
