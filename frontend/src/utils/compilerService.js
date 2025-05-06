import axios from 'axios';

// Piston API endpoint
const PISTON_API_URL = 'https://emkc.org/api/v2/piston';

/**
 * Service for interacting with the Piston API to execute code
 */
const compilerService = {
  /**
   * Fetches available runtimes from the Piston API
   * @returns {Promise<Array>} List of available runtime environments
   */
  getRuntimes: async () => {
    try {
      const response = await axios.get(`${PISTON_API_URL}/runtimes`);
      return response.data;
    } catch (error) {
      console.error('Error fetching runtimes:', error);
      throw error;
    }
  },

  /**
   * Executes code using the Piston API
   * @param {string} language - The programming language
   * @param {string} version - The language version
   * @param {string} code - The code to execute
   * @param {string} stdin - Input to provide to the program (optional)
   * @param {Array} args - Command line arguments (optional)
   * @returns {Promise<Object>} Execution result
   */
  executeCode: async (language, version, code, stdin = '', args = []) => {
    try {
      const payload = {
        language,
        version,
        files: [
          {
            name: `main.${language === 'cpp' ? 'cpp' : language}`,
            content: code
          }
        ],
        stdin,
        args
      };

      const response = await axios.post(`${PISTON_API_URL}/execute`, payload);
      return response.data;
    } catch (error) {
      console.error('Error executing code:', error);
      throw error;
    }
  }
};

export default compilerService; 