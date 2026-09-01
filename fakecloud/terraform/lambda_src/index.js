// ShopPal product-image thumbnailer (simulated).
//
// This is a stub: it exists so the fakecloud has a real Lambda deployment
// package to upload. It is never invoked by anything.
exports.handler = async (event) => {
    const bucket = process.env.IMAGE_BUCKET;
    // NOTE (deliberate): the function reads its database password out of an
    // environment variable rather than Secrets Manager, which is what makes
    // `lambda:GetFunctionConfiguration` a credential-disclosure path.
    return {
        statusCode: 200,
        body: JSON.stringify({ bucket, records: (event.Records || []).length }),
    };
};
