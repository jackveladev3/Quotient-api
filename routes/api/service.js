const router = require("express").Router();
const {
   BlobServiceClient,
   StorageSharedKeyCredential,
   newPipeline,
   BlobSASPermissions,
   generateBlobSASQueryParameters
} = require('@azure/storage-blob');
const { v1: uuidv1 } = require('uuid');
const getStream = require('into-stream');
const multer = require('multer');
const auth = require("../auth");


const ONE_MEGABYTE = 1024 * 1024;
const uploadOptions = { bufferSize: 4 * ONE_MEGABYTE, maxBuffers: 20 };
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY;
const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
const pipeline = newPipeline(sharedKeyCredential);
const containerName = 'images';
const inMemoryStorage = multer.memoryStorage();
const uploadStrategy = multer({ storage: inMemoryStorage }).single('image');
const blobServiceClient = new BlobServiceClient(
   `https://${accountName}.blob.core.windows.net`,
   pipeline
);
const containerClient = blobServiceClient.getContainerClient(containerName);

const getBlobName = originalName => {
   // Use a random number to generate a unique file name, 
   // removing "0." from the start of the string.
   const identifier = uuidv1();
   return `${identifier}-${originalName}`;
};

const getBlobSasUri = (containerClient, blobName, sharedKeyCredential, storedPolicyName) => {
   const sasOptions = {
      containerName: containerClient.containerName,
      blobName: blobName
   };

   if (storedPolicyName == null) {
      // sasOptions.startsOn = new Date();
      sasOptions.expiresOn = new Date(new Date().valueOf() + 1000 * 3600 * 24 * 200);
      sasOptions.permissions = BlobSASPermissions.parse("r");
   } else {
      sasOptions.identifier = storedPolicyName;
   }
   const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
   console.log(`SAS token for blob is: ${sasToken}`);

   return `${containerClient.getBlockBlobClient(blobName).url}?${sasToken}`;
};

// upload file into Azure storage and get blobSas uri ----------
router.post('/upload-file', auth.optional, uploadStrategy, async (req, res, next) => {
   const blobName = getBlobName(req.file.originalname);
   const stream = getStream(req.file.buffer);

   // Create the container
   // const createContainerResponse = await containerClient.create();
   // console.log("Container was created successfully. requestId: ", createContainerResponse.requestId);

   const blockBlobClient = containerClient.getBlockBlobClient(blobName);

   try {
      await blockBlobClient.uploadStream(stream,
         uploadOptions.bufferSize, uploadOptions.maxBuffers,
         { blobHTTPHeaders: { blobContentType: "image/jpeg" } });

      const blobSas = getBlobSasUri(containerClient, blobName, sharedKeyCredential, null);
      console.log("blobSas --->", blobSas);
      return res.json({ status: 'success', message: 'File uploaded to Azure Blob storage.', image: blobSas });
   } catch (err) {
      return res.json({ status: 'error', message: err.message })
   }
});

// remove file
router.post('/remove-image', auth.optional, async (req, res, next) => {
   console.log(" req.body --->", req.body);
   return res.json({ status: "success" });
});

module.exports = router;