const swaggerUi = require('swagger-ui-express'); 
const swaggereJsdoc = require('swagger-jsdoc');

const options = {
    swaggerDefinition: {
        components: {},
        openapi: "3.0.0",
        info: {
            title: 'mongoDB API',
            version: '1.0.0', 
            description: 'Track, GPSdata with mongo', 
        }, 
        host: 'localhost:3002', 
        basePath: '/api' 
    }, 
    apis: ['./routes/*.js', './swagger/*'] 
}; 

const specs = swaggereJsdoc(options); 

module.exports = { swaggerUi, specs };

