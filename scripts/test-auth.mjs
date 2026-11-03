import { signSession, verifySession } from "../lib/session.ts";
import { SignJWT, UnsecuredJWT } from "jose";

async function runTests() {
  console.log("=== RUNNING AUTH & SESSION TOKEN TESTS ===\n");

  let failed = false;

  // Use a throwaway secret generated directly inside the test (never from .env)
  const testSecret =
    "test_secret_32_bytes_minimum_length_for_hs256_verification_12345";
  const wrongSecret =
    "different_secret_32_bytes_minimum_length_for_hs256_verif_67890";

  // Test 1: Valid token verifies
  const validToken = await signSession({ admin: true }, testSecret);
  const validResult = await verifySession(validToken, testSecret);
  const passValid = validResult !== null && validResult.admin === true;
  console.log(`PASS: Valid token verifies successfully:          ${passValid}`);
  if (!passValid) {
    console.error("FAILED: Expected valid session payload, got:", validResult);
    failed = true;
  }

  // Test 2: Tampered token is rejected
  const parts = validToken.split(".");
  // Tamper the payload part
  const tamperedPayload = Buffer.from(
    JSON.stringify({ admin: true, tampered: true })
  ).toString("base64url");
  const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
  const tamperedResult = await verifySession(tamperedToken, testSecret);
  const passTampered = tamperedResult === null;
  console.log(`PASS: Tampered token is rejected:                 ${passTampered}`);
  if (!passTampered) {
    console.error("FAILED: Expected null for tampered token, got:", tamperedResult);
    failed = true;
  }

  // Test 3: Expired token is rejected
  const key = new TextEncoder().encode(testSecret);
  const expiredToken = await new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(Math.floor(Date.now() / 1000) - 300)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
    .sign(key);
  const expiredResult = await verifySession(expiredToken, testSecret);
  const passExpired = expiredResult === null;
  console.log(`PASS: Expired token is rejected:                  ${passExpired}`);
  if (!passExpired) {
    console.error("FAILED: Expected null for expired token, got:", expiredResult);
    failed = true;
  }

  // Test 4: Token signed with different secret is rejected
  const wrongSecretToken = await signSession({ admin: true }, wrongSecret);
  const wrongSecretResult = await verifySession(wrongSecretToken, testSecret);
  const passWrongSecret = wrongSecretResult === null;
  console.log(`PASS: Wrong-secret token is rejected:             ${passWrongSecret}`);
  if (!passWrongSecret) {
    console.error(
      "FAILED: Expected null for wrong-secret token, got:",
      wrongSecretResult
    );
    failed = true;
  }

  // Test 5: alg:none token is rejected
  const algNoneToken = new UnsecuredJWT({ admin: true }).encode();
  const algNoneResult = await verifySession(algNoneToken, testSecret);
  const passAlgNone = algNoneResult === null;
  console.log(`PASS: alg:none token is rejected:                 ${passAlgNone}`);
  if (!passAlgNone) {
    console.error("FAILED: Expected null for alg:none token, got:", algNoneResult);
    failed = true;
  }

  // Test 6: Token without admin flag is rejected
  const noAdminToken = await signSession({ user: "guest" }, testSecret);
  const noAdminResult = await verifySession(noAdminToken, testSecret);
  const passNoAdmin = noAdminResult === null;
  console.log(`PASS: Token without admin flag is rejected:        ${passNoAdmin}`);
  if (!passNoAdmin) {
    console.error(
      "FAILED: Expected null for token without admin flag, got:",
      noAdminResult
    );
    failed = true;
  }

  if (failed) {
    console.error("\nONE OR MORE AUTH TESTS FAILED!");
    process.exit(1);
  } else {
    console.log("\nALL AUTH & SESSION TOKEN TESTS PASSED!");
  }
}

runTests().catch((err) => {
  console.error("Test runner threw error:", err);
  process.exit(1);
});

