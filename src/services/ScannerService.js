/**
 * Service for Scanning Submissions
 */

const Joi = require("joi");
const logger = require("../common/logger");
const helper = require("../common/helper");
const config = require("config");


/**
 * Process Scan request event
 * @param {Object} message the message
 */
async function processScan(message, downloadedFile = null) {
  message.timestamp = new Date().toISOString();
  message.payload.status = "scanned";

  if (downloadedFile == null) {
    downloadedFile = await helper.downloadFile(message.payload.url);
  }

  // Scan the file using ClamAV
  const [isZipBomb, errorCode, errorMessage] = helper.isZipBomb(downloadedFile);
  if (isZipBomb) {
    message.payload.isInfected = true;
    logger.warn(
      `File at ${message.payload.url} is a ZipBomb. ${errorCode}: ${errorMessage}`
    );
    await helper.postToBusAPI(message);
    return message;
  }

  const isInfected = await helper.scanWithClamAV(downloadedFile);

  // Update Scanning results
  message.payload.isInfected = isInfected;

  const uploadType = message.payload.uploadType;
  let destinationBucket = config.uploadTypes[uploadType].cleanBucket;
  const fileName = message.payload.fileName;
 
  // Check if the file is clean or infected
  if (!isInfected) {
    // If the file is clean, move it to the clean bucket based on the upload type
    await helper.moveFile(config.get("aws.DMZ_BUCKET"), fileName, destinationBucket, fileName);  
    const movedS3Obj = `https://s3.amazonaws.com/${destinationBucket}/${fileName}`
    logger.debug(`moved file: ${JSON.stringify(movedS3Obj)}`)
    if(uploadType === "submission"){
        logger.info("Update Submission final location using Submission API")
        await helper.reqToSubmissionAPI("PATCH", `${config.SUBMISSION_API_URL}/submissions/${message.payload.submissionId}`,
            { url: movedS3Obj })

        logger.info("Create review using Submission API")
        await helper.reqToSubmissionAPI("POST", `${config.SUBMISSION_API_URL}/reviews`, {
            score: message.payload.isInfected ? 0 : 100,
            reviewerId: uuid(), 
            submissionId: message.payload.submissionId,
            scoreCardId: REVIEW_SCORECARDID,
            typeId: await helper.getreviewTypeId(config.AV_SCAN)
        })
    }
  }else{
    // If the file is infected, move it to the quarantine bucket 
    const quarantineBucket = config.uploadTypes[uploadType].quarantineBucket;
    await helper.moveFile(config.get("aws.DMZ_BUCKET"), fileName, quarantineBucket, fileName);
  }
  
  await helper.postToBusAPI(message);

  return message;
}

processScan.schema = {
  message: Joi.object()
    .keys({
      topic: Joi.string().required(),
      originator: Joi.string().required(),
      timestamp: Joi.date().required(),
      "mime-type": Joi.string().required(),
      payload: Joi.object()
        .keys({
          submissionId: Joi.when("uploadType", {
            is: Joi.string().valid("submission"),
            then: Joi.string().required(),
            otherwise: Joi.string().optional(),
          }),
          url: Joi.string().required(),
          fileName: Joi.string().required(),
          status: Joi.string().required(),
          uploadType: Joi.string().required()
        })
        .unknown(true)
        .required(),
    })
    .required(),
};

// Exports
module.exports = {
  processScan,
};

logger.buildService(module.exports, "ScannerService");
