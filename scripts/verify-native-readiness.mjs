import { readFile, access } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const failures = [];
const requiredFiles = [
  "capacitor.config.ts",
  "android/app/build.gradle",
  "android/app/src/main/AndroidManifest.xml",
  "ios/App/App.xcodeproj/project.pbxproj",
  "ios/App/App/Info.plist",
  "ios/App/App/PrivacyInfo.xcprivacy",
  "store/listings.json",
  "store/privacy-data-inventory.json",
  "store/submission-readiness.json",
  "store/reviewer-access.json",
  "store/asset-manifest.json",
  "store/apple-app-privacy.json",
  "store/google-data-safety.json",
  "store/google-policy-declarations.json",
  "docs/NATIVE_SUBMISSION_RUNBOOK.md",
];

for (const file of requiredFiles) {
  try { await access(join(root, file)); } catch { failures.push(`Missing ${file}`); }
}

const read = async (file) => readFile(join(root, file), "utf8");
const config = await read("capacitor.config.ts");
const androidManifest = await read("android/app/src/main/AndroidManifest.xml");
const androidVariables = await read("android/variables.gradle");
const xcodeProject = await read("ios/App/App.xcodeproj/project.pbxproj");
const iosInfo = await read("ios/App/App/Info.plist");
const iosPrivacy = await read("ios/App/App/PrivacyInfo.xcprivacy");
const androidIgnore = await read("android/.gitignore");
const iosIgnore = await read("ios/.gitignore");
const packageJson = JSON.parse(await read("package.json"));
const listings = JSON.parse(await read("store/listings.json"));
const privacyInventory = JSON.parse(await read("store/privacy-data-inventory.json"));
const submission = JSON.parse(await read("store/submission-readiness.json"));
const reviewerAccess = JSON.parse(await read("store/reviewer-access.json"));
const assetManifest = JSON.parse(await read("store/asset-manifest.json"));
const applePrivacy = JSON.parse(await read("store/apple-app-privacy.json"));
const googleSafety = JSON.parse(await read("store/google-data-safety.json"));
const googlePolicy = JSON.parse(await read("store/google-policy-declarations.json"));

const requireText = (source, value, label) => { if (!source.includes(value)) failures.push(`${label} is missing ${value}`); };
requireText(config, 'appId: "com.blossomroyall.app"', "Capacitor configuration");
requireText(config, 'appName: "Blossom Royall"', "Capacitor configuration");
requireText(config, 'webDir: "dist"', "Capacitor configuration");
requireText(androidVariables, "compileSdkVersion = 36", "Android configuration");
requireText(androidVariables, "targetSdkVersion = 36", "Android configuration");
requireText(androidManifest, 'android:allowBackup="false"', "Android manifest");
requireText(androidManifest, 'android:usesCleartextTraffic="false"', "Android manifest");
requireText(androidManifest, 'android:screenOrientation="portrait"', "Android manifest");
requireText(xcodeProject, "PRODUCT_BUNDLE_IDENTIFIER = com.blossomroyall.app", "Xcode project");
requireText(xcodeProject, "PrivacyInfo.xcprivacy in Resources", "Xcode project");
requireText(xcodeProject, "IPHONEOS_DEPLOYMENT_TARGET = 15.0", "Xcode project");
requireText(iosPrivacy, "NSPrivacyTracking", "Apple privacy manifest");
requireText(iosPrivacy, "<false/>", "Apple privacy manifest");
requireText(androidIgnore, "*.jks", "Android signing protection");
requireText(androidIgnore, "*.keystore", "Android signing protection");
requireText(iosIgnore, "*.mobileprovision", "iOS signing protection");
if ((iosInfo.match(/UIInterfaceOrientationLandscape/g) || []).length) failures.push("iOS configuration still enables landscape orientation");

const capacitorVersions = ["@capacitor/core", "@capacitor/android", "@capacitor/ios"].map((name) => packageJson.dependencies[name]);
if (capacitorVersions.some((version) => !version || !version.includes("8.5.0"))) failures.push("Capacitor runtime packages are not aligned at 8.5.0");
if (!packageJson.devDependencies["@capacitor/cli"]?.includes("8.5.0")) failures.push("Capacitor CLI is not aligned at 8.5.0");

for (const locale of ["en-US", "fr-FR", "es-ES"]) {
  const listing = listings.locales[locale];
  if (!listing) { failures.push(`Missing store listing locale ${locale}`); continue; }
  if (listing.apple.name.length > 30) failures.push(`${locale} Apple name exceeds 30 characters`);
  if (listing.apple.subtitle.length > 30) failures.push(`${locale} Apple subtitle exceeds 30 characters`);
  if (listing.google.shortDescription.length > 80) failures.push(`${locale} Google short description exceeds 80 characters`);
}
for (const urlName of ["supportUrl", "privacyPolicyUrl", "accountDeletionUrl", "privacyChoicesUrl"]) {
  if (!String(listings[urlName] || "").startsWith("https://app.blossomroyall.com/")) failures.push(`${urlName} is not on the branded application domain`);
}
if (privacyInventory.tracking !== false || privacyInventory.dataSold !== false) failures.push("Privacy inventory tracking or sale declaration is unsafe");
if (!privacyInventory.reviewRequiredBeforeSubmission) failures.push("Privacy inventory must require final human review");
if (submission.platforms.apple.bundleId !== listings.appId) failures.push("Apple submission identifier does not match listing identifier");
if (submission.platforms.google.applicationId !== listings.appId) failures.push("Google submission identifier does not match listing identifier");
if (submission.platforms.google.targetApi !== 36) failures.push("Google submission target API is not 36");
if (submission.submissionReady !== false) failures.push("Submission readiness must remain false until signed builds and external checks are evidenced");
if (reviewerAccess.containsSecrets !== false) failures.push("Reviewer access artifact must never contain secrets");
for (const role of ["customer", "owner"]) {
  if (!reviewerAccess.accounts.some((account) => account.role === role && account.required)) failures.push(`Missing required ${role} reviewer account plan`);
}
if (assetManifest.apple.iphone69.size !== "1320x2868") failures.push("Apple iPhone screenshot target is not current");
if (assetManifest.apple.ipad13.size !== "2064x2752") failures.push("Apple iPad screenshot target is not current");
if (assetManifest.google.featureGraphic.size !== "1024x500") failures.push("Google feature graphic target is incorrect");
if (applePrivacy.appId !== listings.appId || applePrivacy.tracking !== false) failures.push("Apple privacy answers have an unsafe identity or tracking declaration");
if (!applePrivacy.reviewRequiredBeforeSubmission || !applePrivacy.dataTypes.length) failures.push("Apple privacy answers are incomplete");
if (applePrivacy.dataTypes.some((item) => item.tracking !== false)) failures.push("Apple privacy answers contain tracking");
if (googleSafety.applicationId !== listings.appId || !googleSafety.collectsData) failures.push("Google Data safety answers are incomplete");
if (!googleSafety.dataEncryptedInTransit || !googleSafety.accountDeletionAvailable) failures.push("Google Data safety security answers are incomplete");
if (!googleSafety.reviewRequiredBeforeSubmission || !googleSafety.dataTypes.length) failures.push("Google Data safety answers need review evidence");
if (googlePolicy.applicationId !== listings.appId || googlePolicy.ads !== false) failures.push("Google policy declarations have an unsafe identity or ads declaration");
if (googlePolicy.contentRating.questionnaireComplete !== false || googlePolicy.contentRating.humanReviewRequired !== true) failures.push("Google content rating must remain blocked for human review");

async function pngSize(file) {
  const data = await readFile(join(root, file));
  if (data.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}
const iosIcon = await pngSize("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
if (!iosIcon || iosIcon.width !== 1024 || iosIcon.height !== 1024) failures.push("iOS application icon is not 1024 by 1024 pixels");
for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  const icon = await pngSize(`android/app/src/main/res/mipmap-${density}/ic_launcher.png`);
  if (!icon || icon.width !== size || icon.height !== size) failures.push(`Android ${density} launcher icon has the wrong dimensions`);
}

if (failures.length) {
  console.error("Native readiness verification failed:");
  for (const failure of failures) console.error(`ERROR ${failure}`);
  process.exit(1);
}
console.log("Native structure verified: package identity, platform targets, privacy manifest, launcher assets, localized metadata, and an explicit incomplete submission evidence plan are present.");
