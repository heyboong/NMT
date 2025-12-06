// Netlify Function: Binance P2P Rate Proxy
// This function bypasses CORS restrictions by calling Binance API from server-side

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('🚀 Fetching Binance P2P rate...');

    // Method 1: Binance P2P API
    try {
      const body = {
        page: 1,
        rows: 10,
        payTypes: [],
        asset: 'USDT',
        tradeType: 'SELL',
        fiat: 'VND',
        publisherType: null
      };

      const response = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        const ads = data?.data || [];

        if (ads.length > 0) {
          const prices = ads.slice(0, 5)
            .map(ad => parseFloat(ad?.adv?.price))
            .filter(price => price > 0);

          if (prices.length > 0) {
            const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
            console.log('✅ Binance P2P success:', avgPrice, 'VND');

            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                sellPrice: avgPrice,
                buyPrice: avgPrice,
                source: 'binance-p2p',
                timestamp: new Date().toISOString(),
                prices: prices
              })
            };
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Binance P2P failed:', error.message);
    }

    // Method 2: Binance Spot Ticker (Fallback)
    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=USDTVND');
      if (response.ok) {
        const data = await response.json();
        const price = parseFloat(data.price) || 0;
        if (price > 0) {
          console.log('✅ Binance Ticker success:', price, 'VND');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              sellPrice: price,
              buyPrice: price,
              source: 'binance-ticker',
              timestamp: new Date().toISOString()
            })
          };
        }
      }
    } catch (error) {
      console.warn('⚠️ Binance Ticker failed:', error.message);
    }

    // All methods failed
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'All rate sources unavailable',
        message: 'Unable to fetch P2P rate from any source'
      })
    };

  } catch (error) {
    console.error('❌ Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
