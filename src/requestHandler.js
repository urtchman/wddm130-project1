const axios = require("axios");
const swapConfig = require('./config/swapConfig');  
const swap = swapConfig.default;


const requestHandler = {
    /**
     * Fetches Naira exchange rates (NGN to CAD, USD, EUR, GBP)
     * @returns {Promise<Object>} Exchange rates or an error message
     */
    async getNairaRates() {
        try {
            const response = await axios.get(`${swap.baseUrl}/live`, {
                params: {
                    access_key: swap.key,
                    source: "NGN",
                    currencies: "CAD,USD,EUR,GBP"
                }
            });

            if (response.data.success) {
                return response.data.quotes;
            } else {
                throw new Error("Failed to fetch exchange rates.");
            }
        } catch (error) {
            console.error("Error fetching Naira exchange rates:", error.message);
            return { error: "Unable to retrieve exchange rates. Please try again later." };
        }
    },

    /**
     * Fetches general exchange rates for all available currencies.
     * @returns {Promise<Object>} Exchange rates or an error message
     */
    async exchangeRates(baseCurrency) {
        try {
            const response = await axios.get(`${swap.baseUrl}/live`, {
                params: {
                    access_key: swap.key,
                    source: baseCurrency
                }
            });

            if (response.data.success) {
                return response.data.quotes;
            } else {
                throw new Error("Failed to fetch exchange rates.");
            }
        } catch (error) {
            console.error("Error fetching exchange rates:", error.message);
            return {};
        }
    },

    /**
     * Converts an amount from one currency to another.
     * @param {number} amount - The amount to convert
     * @param {string} from - The source currency (e.g., "NGN")
     * @param {string} to - The target currency (e.g., "USD")
     * @returns {Promise<number | Object>} Converted amount or an error message
     */
    async convert(amount, from, to) {
        try {
            const response = await axios.get(`${swap.baseUrl}/convert`, {
                params: {
                    access_key: swap.key,
                    from,
                    to,
                    amount
                }
            });

            if (response.data.success) {
                return {status:'success', result:response.data.result, rate:response.data.info.quote};
            } else {
                throw new Error("Failed to convert currency.");
            }
        } catch (error) {
            console.error("Error converting currency:", error.message);
            return {status:'failed', result:0, rate:0, error: "Unable to perform currency conversion. Please try again later." };
        }
    },

    /**
     * Fetches supported currencies
     * @returns {Promise<Object>} currencies or an error message
     */
    async getSupportedCurrencies() {
        try {
            const response = await axios.get(`${swap.baseUrl}/list`, {
                params: {
                    access_key: swap.key
                }
            });

            if (response.data.success) {
                return response.data.currencies;
            } else {
                throw new Error("Failed to fetch supported currencies.");
            }
        } catch (error) {
            console.error("Error fetching supported currencies:", error.message);
            return { error: "Unable to retrieve supported currencies. Please try again later." };
        }
    },
};

module.exports = requestHandler;
