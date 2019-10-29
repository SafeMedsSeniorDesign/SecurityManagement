module.exports = {
  db: {
    host: process.env.dbHost || 'localhost',
    dialect: 'mssql',
    maxConnectionSockets: 10,
    minConnectionSockets: 5,
    connectionAcquisitionRate: 30000,
    databaseName: process.env.dbName || 'SafeMeds',
    username: process.env.adminUser || 'sa',
    password: process.env.password || '<YourStrong@Passw0rd>',
    connectionIdleRate: 10000,
    port: 1433,
    //DO NOT TURN THIS TO TRUE YOU WILL DROP EVERY TABLE
    forceTableCreation: false,
    shouldLog: false,
  },
  jwtDurationMinutes: '15',
  jwtRefreshDurationHours: '20',
  saltRounds: 8,
  jwtSecret: process.env.jwtSecret || 'qweqweqweqwe',
  jwtRefreshTokenSecret: process.env.jwtRefreshTokenSecret || 'qweqweqweqwe',
  shouldFastifyLog: false,
  serverHost: '0.0.0.0' || process.env.serverAddress,
};
