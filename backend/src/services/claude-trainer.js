/**
 * Claude Personal Trainer Service
 * Generates personalized fitness recommendations using Claude AI
 */

const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

class ClaudeTrainer {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.model = process.env.CLAUDE_MODEL || 'claude-3-opus-20240229';
    this.maxTokens = parseInt(process.env.CLAUDE_MAX_TOKENS || '1024');
  }

  /**
   * Generate personalized daily insights
   */
  async generateDailyInsights(fitnessData, userProfile = {}) {
    try {
      const prompt = this._buildDailyInsightPrompt(fitnessData, userProfile);
      
      logger.info('Generating daily insights from Claude...');
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this._getSystemPrompt('daily_trainer'),
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const insight = response.content[0].type === 'text' ? response.content[0].text : '';
      
      return {
        success: true,
        insight,
        timestamp: new Date().toISOString(),
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      };
    } catch (error) {
      logger.error('Error generating daily insights:', error);
      throw new Error('Failed to generate insights from Claude');
    }
  }

  /**
   * Generate workout recommendations
   */
  async generateWorkoutPlan(fitnessData, preferences = {}) {
    try {
      const prompt = this._buildWorkoutPlanPrompt(fitnessData, preferences);
      
      logger.info('Generating workout plan from Claude...');
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this._getSystemPrompt('workout_coach'),
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const plan = response.content[0].type === 'text' ? response.content[0].text : '';
      
      return {
        success: true,
        plan,
        timestamp: new Date().toISOString(),
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      };
    } catch (error) {
      logger.error('Error generating workout plan:', error);
      throw new Error('Failed to generate workout plan from Claude');
    }
  }

  /**
   * Generate recovery recommendations
   */
  async generateRecoveryAdvice(fitnessData, recentActivities = []) {
    try {
      const prompt = this._buildRecoveryPrompt(fitnessData, recentActivities);
      
      logger.info('Generating recovery advice from Claude...');
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this._getSystemPrompt('recovery_specialist'),
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const advice = response.content[0].type === 'text' ? response.content[0].text : '';
      
      return {
        success: true,
        advice,
        timestamp: new Date().toISOString(),
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      };
    } catch (error) {
      logger.error('Error generating recovery advice:', error);
      throw new Error('Failed to generate recovery advice from Claude');
    }
  }

  /**
   * Analyze fitness trends
   */
  async analyzeFitnessTrends(weeklyData, goals = {}) {
    try {
      const prompt = this._buildTrendAnalysisPrompt(weeklyData, goals);
      
      logger.info('Analyzing fitness trends with Claude...');
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this._getSystemPrompt('fitness_analyst'),
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const analysis = response.content[0].type === 'text' ? response.content[0].text : '';
      
      return {
        success: true,
        analysis,
        timestamp: new Date().toISOString(),
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      };
    } catch (error) {
      logger.error('Error analyzing fitness trends:', error);
      throw new Error('Failed to analyze fitness trends');
    }
  }

  /**
   * Build daily insight prompt
   */
  _buildDailyInsightPrompt(data, profile) {
    return `
Please provide personalized fitness insights based on yesterday's data:

📊 Activity Summary:
- Steps: ${data.activity?.steps || 0} (Goal: ${data.profile?.goal?.dailySteps || 10000})
- Calories Burned: ${data.activity?.calories || 0}
- Active Minutes: ${data.activity?.activeMinutes || 0}
- Distance: ${data.activity?.distance || 0} km

😴 Sleep:
- Duration: ${data.sleep?.duration || 0} hours
- Efficiency: ${data.sleep?.efficiency || 0}%
- Quality Score: ${data.summary?.sleepQuality || 0}/100

❤️ Heart Health:
- Resting Heart Rate: ${data.heartRate?.activities?.[0]?.value?.restingHeartRate || 'N/A'} bpm

⚖️ Weight:
- Current: ${data.weight?.weight || 0} kg
- BMI: ${data.weight?.bmi || 0}

${profile.fitnessLevel ? `Fitness Level: ${profile.fitnessLevel}` : ''}
${profile.goals ? `User Goals: ${profile.goals}` : ''}

Please provide:
1. Performance assessment for yesterday
2. Specific workout recommendation for today
3. Recovery and nutrition tips
4. Any concerns or areas to focus on

Keep it motivating and actionable!
    `.trim();
  }

  /**
   * Build workout plan prompt
   */
  _buildWorkoutPlanPrompt(data, preferences) {
    return `
Create a personalized workout plan based on this fitness data:

Current Fitness Level: ${preferences.fitnessLevel || 'intermediate'}
Available Time: ${preferences.duration || 45} minutes
Preferred Type: ${preferences.type || 'mixed cardio and strength'}

Recent Stats:
- Weekly Steps: ${data.weeklySteps || 0}
- Resting Heart Rate: ${data.restingHR || 0} bpm
- Recovery Status: ${data.recoveryStatus || 'good'}
- Current Energy: ${preferences.energyLevel || 'moderate'}

Please create a detailed workout plan that:
1. Matches the current fitness level
2. Fits in the available time
3. Includes warm-up and cool-down
4. Specifies intensity levels (in RPE or HR zones)
5. Includes form tips for key exercises
6. Provides modifications for different abilities
    `.trim();
  }

  /**
   * Build recovery prompt
   */
  _buildRecoveryPrompt(data, recentActivities) {
    return `
Provide recovery recommendations based on this health data:

Last 24 Hours:
- Sleep: ${data.sleep?.duration || 0} hours (${data.sleep?.efficiency || 0}% efficiency)
- Calories: ${data.calories || 0}
- Heart Rate: ${data.heartRate || 0} bpm (resting)

Recent Activities:
${recentActivities.map(a => `- ${a.type}: ${a.duration} min at ${a.intensity}`).join('\n')}

Please provide:
1. Recovery status assessment
2. Recommended rest vs. active recovery
3. Hydration and nutrition suggestions
4. Sleep optimization tips
5. Any injury prevention advice
    `.trim();
  }

  /**
   * Build trend analysis prompt
   */
  _buildTrendAnalysisPrompt(weeklyData, goals) {
    return `
Analyze fitness trends from the past week and provide insights:

Weekly Summary:
${Object.entries(weeklyData).map(([day, data]) => 
  `${day}: ${data.steps} steps, ${data.activeMinutes} active min, ${data.sleep} hrs sleep`
).join('\n')}

Goals:
${Object.entries(goals).map(([goal, target]) => `- ${goal}: ${target}`).join('\n')}

Progress Analysis:
1. Trend in activity level (↑ improving / → stable / ↓ declining)
2. Sleep consistency
3. Goal achievement rate
4. Areas of strength and improvement
5. Recommended adjustments for next week
    `.trim();
  }

  /**
   * Get system prompt for different roles
   */
  _getSystemPrompt(role) {
    const prompts = {
      daily_trainer: `You are an experienced personal trainer with expertise in fitness science, 
nutrition, and sports psychology. Analyze fitness data and provide personalized, actionable, 
and motivating insights. Always consider context (sleep, stress, recovery) not just activity levels.
Keep responses concise but comprehensive. Use emojis to make content engaging.`,

      workout_coach: `You are a certified strength and conditioning coach with 10+ years of experience. 
Create safe, effective, and engaging workout plans customized to individual fitness levels and goals.
Include specific exercises, sets, reps, rest periods, and form cues. Consider injury prevention.`,

      recovery_specialist: `You are a sports medicine specialist and recovery expert. Provide science-backed 
recovery recommendations focusing on sleep, nutrition, active recovery, and injury prevention.
Explain the "why" behind recommendations to help users understand the science.`,

      fitness_analyst: `You are a data analyst specializing in fitness metrics and health trends. 
Analyze patterns in fitness data, identify trends, and provide evidence-based insights.
Highlight progress, identify plateaus, and suggest strategic adjustments to training and recovery.`
    };

    return prompts[role] || prompts.daily_trainer;
  }
}

module.exports = new ClaudeTrainer();
