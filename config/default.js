/**
 * The default configuration file.
 */

module.exports = {
  DISABLE_LOGGING: process.env.DISABLE_LOGGING || false, // If true, logging will be disabled
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',

  KAFKA_URL: process.env.KAFKA_URL || 'localhost:9092',
  // below are used for secure Kafka connection, they are optional
  // for the local Kafka, they are not needed
  KAFKA_CLIENT_CERT: process.env.KAFKA_CLIENT_CERT ? process.env.KAFKA_CLIENT_CERT.replace(/\\n/g, '\n') : null,
  KAFKA_CLIENT_CERT_KEY: process.env.KAFKA_CLIENT_CERT_KEY ? process.env.KAFKA_CLIENT_CERT_KEY.replace(/\\n/g, '\n') : null,

  // Kafka group id
  KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID,

  AVSCAN_TOPIC: process.env.AVSCAN_TOPIC || 'avscan.action.scan',
  CLAMAV_HOST: process.env.CLAMAV_HOST || 'localhost',
  CLAMAV_PORT: process.env.CLAMAV_PORT || 3310,
  BUSAPI_EVENTS_URL: process.env.BUSAPI_EVENTS_URL || 'https://api.topcoder-dev.com/v5/bus/events',
  AUTH0_URL: process.env.AUTH0_URL,
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || 'https://m2m.topcoder-dev.com/',
  TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,

  SUBMISSION_API_URL: process.env.SUBMISSION_API_URL || 'http://localhost:3010/api/v5',
  AV_SCAN: 'Virus Scan',
  SCORECARD_ID: '30001850',

  // AWS related parameters
  aws: {
    REGION: process.env.REGION || 'us-east-1',
    DMZ_BUCKET: process.env.DMZ_BUCKET,
    CLEAN_BUCKET: process.env.CLEAN_BUCKET,
    QUARANTINE_BUCKET: process.env.QUARANTINE_BUCKET
  },

  uploadTypes: {
    Submission: {
      CLEAN_BUCKET: 'submission_clean_bucket_name',
      QUARANTINE_BUCKET: '',
      UPDATE_URL: 'https://api.example.com/v5/submissions'
    },
    Asset: {
      CLEAN_BUCKET: 'asset_clean_bucket_name',
      QUARANTINE_BUCKET: '',
      UPDATE_URL: 'https://api.example.com/v5/assets'
    }
  }
}
