// No Apple Developer account needed for unsigned local/CI builds.
// Once Developer ID certificate and Apple credentials are present, notarize the signed .app.
module.exports = async function notarizeIfConfigured(context) {
  if (process.platform !== 'darwin') return;
  const { APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID, CSC_LINK } = process.env;
  if (!APPLE_ID || !APPLE_APP_SPECIFIC_PASSWORD || !APPLE_TEAM_ID || !CSC_LINK) {
    console.log('DPet: Apple signing/notarization skipped (unsigned beta).');
    return;
  }
  if (!context.appOutDir || !context.packager?.appInfo?.productFilename) throw new Error('App bundle missing.');
  const { notarize } = require('@electron/notarize');
  const appPath = require('node:path').join(context.appOutDir,context.packager.appInfo.productFilename+'.app');
  await notarize({appPath,appleId:APPLE_ID,appleIdPassword:APPLE_APP_SPECIFIC_PASSWORD,teamId:APPLE_TEAM_ID});
};
