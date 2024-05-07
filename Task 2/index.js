require('dotenv').config(); // Load environment variables from .env file

const AWS = require('aws-sdk');

// Set up AWS credentials
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Create an S3 service object
const s3 = new AWS.S3();

// Create a bucket
const createBucketParams = {
  Bucket: process.env.AWS_BUCKET
};

s3.createBucket(createBucketParams, (err, data) => {
    if (err) {
        console.log("Error creating bucket:", err);
    } else {
        console.log("Bucket created successfully:", data.Location);

        // Define the public access block configuration
        const publicAccessBlockConfig = {
            Bucket: process.env.AWS_BUCKET,
            ExpectedBucketOwner: process.env.AWS_ACCOUNT_ID
        };
  
        // Update the public access block configuration
        s3.deletePublicAccessBlock(publicAccessBlockConfig, (err, data) => {
            if(err) {
                console.log("Error updating public access block configuration:", err);
            }else {
                console.log("Public access block configuration updated successfully.");

                // Define the bucket policy
                const bucketPolicyParams = {
                    Bucket: process.env.AWS_BUCKET,
                    Policy: JSON.stringify({
                    Version: "2012-10-17",
                    Statement: [{
                        Sid: "PublicReadGetObject",
                        Effect: "Allow",
                        Principal: "*",
                        Action: ["s3:GetObject"],
                        Resource: [`arn:aws:s3:::${process.env.AWS_BUCKET}/*`]
                    }]
                    })
                };

                // Apply the bucket policy
                s3.putBucketPolicy(bucketPolicyParams, (err, data) => {
                    if (err) {
                    console.log("Error applying bucket policy:", err);
                    } else {
                    console.log("Bucket policy applied successfully.");
                    }
                });
            }
        })    

        // Set up CloudFront
        const cloudfront = new AWS.CloudFront();

        //Create a CloudFront distribution
        const createDistributionParams = {
          DistributionConfig: {
            CallerReference: String(new Date().getTime()),
            Comment: 'CloudFront Distribution',
            DefaultRootObject: 'index.html',
            Origins: {
              Quantity: 1,
              Items: [{
                DomainName: `${process.env.AWS_BUCKET}.s3.amazonaws.com`,
                Id: 'S3Origin',
                S3OriginConfig: {
                  OriginAccessIdentity: ''
                }
              }]
            },
            DefaultCacheBehavior: {
                TargetOriginId: 'S3Origin',
                ForwardedValues: {
                    QueryString: false,
                    Cookies: { Forward: 'none' }
                },
                ViewerProtocolPolicy: 'redirect-to-https',
                MinTTL: 0,
                AllowedMethods: {
                    Quantity: 2,
                    Items: ['GET', 'HEAD']
                },
                DefaultTTL: 86400,
                MaxTTL: 31536000
            },
            Enabled: true
          }
        };

        cloudfront.createDistribution(createDistributionParams, (err, data) => {
          if (err) {
            console.log("Error creating CloudFront distribution:", err);
          } else {
            console.log("CloudFront distribution created successfully:", data.Distribution.DomainName);
          }
        });

        const htmlContent = `
            <h4>Task 2 (Serve SPA in AWS S3 and Cloudfront Services)</h4>
            <h3>Automated Deployment</h3>
        `;

        // Upload index.html file to the S3 bucket
        const uploadParams = {
            Bucket: process.env.AWS_BUCKET,
            Key: 'index.html',
            Body: htmlContent,
            ContentType: 'text/html'
        };

        s3.upload(uploadParams, (err, data) => {
            if (err) {
                console.log("Error uploading index.html file:", err);
            } else {
                console.log("Index.html file uploaded successfully:", data.Location);
            }
        });
    }
});