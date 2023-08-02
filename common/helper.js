/**
 * Contains generic helper methods
 */

global.Promise = require("bluebird");
const _ = require("lodash");
const config = require("config");
const clamav = require("clamav.js");
const streamifier = require("streamifier");
const logger = require("./logger");
const request = require("axios");
const m2mAuth = require("tc-core-library-js").auth.m2m;
const m2m = m2mAuth(
  _.pick(config, [
    "AUTH0_URL",
    "AUTH0_AUDIENCE",
    "TOKEN_CACHE_TIME",
    "AUTH0_PROXY_SERVER_URL",
  ])
);
const AWS = require("aws-sdk");
const AmazonS3URI = require("amazon-s3-uri");
const pure = require("@ronomon/pure");

Promise.promisifyAll(request);

AWS.config.region = config.get("aws.REGION");
const s3 = new AWS.S3();

// Initialize ClamAV
let clamavScanner = null;
const initClamAvScanner = () => {
  setTimeout(() => {
    logger.info(`Checking ClamAV Status.`);
    clamav.version(
      config.CLAMAV_PORT,
      config.CLAMAV_HOST,
      500,
      (error, status) => {
        if (error) {
          logger.info(`ClamAV not live yet. ${JSON.stringify(error)}`);
          initClamAvScanner();
        } else {
          logger.info("ClamAV connection established.", status);
          clamavScanner = clamav.createScanner(
            config.CLAMAV_PORT,
            config.CLAMAV_HOST
          );
        }
      }
    );
  }, 5000);
};

initClamAvScanner();

/**
 * Function to download file from given URL
 * @param{String} fileURL URL of the file to be downloaded
 * @returns {Buffer} Buffer of downloaded file
 */
async function downloadFile(fileURL) {
  let downloadedFile;
  if (/.*amazonaws.*/.test(fileURL)) {
    const { bucket, key } = AmazonS3URI(fileURL);
    logger.info(`downloadFile(): file is on S3 ${bucket} / ${key}`);
    downloadedFile = await s3.getObject({ Bucket: bucket, Key: key }).promise();
    return downloadedFile.Body;
  } else {
    logger.info(
      `downloadFile(): file is (hopefully) a public URL at ${fileURL}`
    );
    downloadedFile = await request.get(fileURL, {
      responseType: "arraybuffer",
    });
    return downloadedFile.data;
  }
}

/**
 * check if the file is a zipbomb
 *
 * @param {string} fileBuffer the file buffer
 * @returns
 */
function isZipBomb(fileBuffer) {
  const error = pure.zip(fileBuffer, 0);

  // we only care about zip bombs
  if (error.code === "PURE_E_OK" || error.code.indexOf("ZIP_BOMB") === -1) {
    return [false];
  } else {
    return [true, error.code, error.message];
  }
}

function scanWithClamAV(file) {
  // Scan
  return new Promise((resolve, reject) => {
    clamav.version(
      config.CLAMAV_PORT,
      config.CLAMAV_HOST,
      500,
      (error, status) => {
        if (error) {
          logger.error("Unable to communicate with ClamAV");
          reject(error);
        } else {
          logger.info("ClamAV is up and running.", status);
          const fileStream = streamifier.createReadStream(file);
          clamavScanner.scan(fileStream, (scanErr, object, malicious) => {
            if (scanErr) {
              logger.info("Scan Error");
              reject(scanErr);
            }
            // Return True / False depending on Scan result
            if (malicious == null) {
              resolve(false);
            } else {
              logger.warn(`Infection detected ${malicious}`);
              resolve(true);
            }
          });
        }
      }
    );
  });
}

/**
 * Move file from one AWS S3 bucket to another bucket.
 * @param {String} sourceBucket the source bucket
 * @param {String} sourceKey the source key
 * @param {String} targetBucket the target bucket
 * @param {String} targetKey the target key
 */
async function moveFile (sourceBucket, sourceKey, targetBucket, targetKey) {
    yield s3p.copyObjectAsync({ Bucket: targetBucket, CopySource: `/${sourceBucket}/${sourceKey}`, Key: targetKey })
    yield s3p.deleteObjectAsync({ Bucket: sourceBucket, Key: sourceKey })
}

/* Function to get M2M token
 * @returns {Promise}
 */
async function getM2Mtoken() {
  return m2m.getMachineToken(
    config.AUTH0_CLIENT_ID,
    config.AUTH0_CLIENT_SECRET
  );
}

/**
 * Function to send request to Submission API
 * @param{String} reqType Type of the request POST / PATCH
 * @param(String) path Complete path of the Submission API URL
 * @param{Object} reqBody Body of the request
 * @returns {Promise}
 */
async function reqToSubmissionAPI (reqType, path, reqBody) {
    // Token necessary to send request to Submission API
    const token = yield getM2Mtoken()
    if (reqType === 'POST') {
      yield axios.post(path, reqBody, { headers: { 'Authorization': `Bearer ${token}` } })
    } else if (reqType === 'PATCH') {
      yield axios.patch(path, reqBody, { headers: { 'Authorization': `Bearer ${token}` } })
    } else if (reqType === 'GET') {
      return yield axios.get(path, { headers: { 'Authorization': `Bearer ${token}` } })
    }
}

/*
 * Function to get reviewTypeId from Name
 * @param{String} reviewTypeName Name of the reviewType
 * @returns{String} reviewTypeId
 */
async function getreviewTypeId (reviewTypeName) {
    if (reviewTypes[reviewTypeName]) {
      return reviewTypes[reviewTypeName]
    } else {
      const response = yield reqToSubmissionAPI('GET',
        `${config.SUBMISSION_API_URL}/reviewTypes?name=${reviewTypeName}`, {})
      if (response.data.length !== 0) {
        reviewTypes[reviewTypeName] = response.data[0].id
        return reviewTypes[reviewTypeName]
      }
      return null
    }
}

/**
 * Function to POST to Bus API
 * @param{Object} reqBody Body of the request to be Posted
 * @returns {Promise}
 */
async function postToBusAPI(reqBody) {
  // M2M token necessary for pushing to Bus API
  const token = await getM2Mtoken();
  // Post the request body to Bus API
  return request.post(config.BUSAPI_EVENTS_URL, reqBody, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

module.exports = {
  isZipBomb,
  scanWithClamAV,
  postToBusAPI,
  downloadFile,
  reqToSubmissionAPI,
  getreviewTypeId,
  moveFile,
  downloadFile,
  scanWithClamAV
};
