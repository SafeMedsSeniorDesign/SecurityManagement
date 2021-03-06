const assert = require("assert");
const fastify = require("../src/index");
const userHelpers = require("./helpers/user");
const fakeUserDetails = userHelpers.createMockUserObject();
const { signAsync } = require("../src/constants/helpers/jwt");
const config = require("../config");

describe("UserRole API", async function () {
  let token;
  let createdUser;
  beforeEach(async () => {
    createdUser = await userHelpers.createUser(fastify, fakeUserDetails);
    const authTokenRequest = await userHelpers.login(fastify, {
      username: fakeUserDetails.username,
      password: fakeUserDetails.password,
    });
    token = JSON.parse(authTokenRequest.body).accessToken;
  });

  describe("API token validation", async () => {
    it("stops request on no auth token provided", async () => {
      const apiUserID = JSON.parse(createdUser.body).user.id;
      const testRequest = await userHelpers.updateUser(fastify, apiUserID, {
        firstName: "test",
      });
      assert.strictEqual(
        testRequest.statusCode,
        401,
        "API let unauthenticated request through"
      );
    });

    it("stops a request when an invalid auth token is provided", async () => {
      const testRequest = await userHelpers.updateUser(
        fastify,
        0,
        { firstName: "test" },
        "qweqwe"
      );
      assert.strictEqual(
        testRequest.statusCode,
        401,
        "API let invalid token access through"
      );
    });

    it("allows a request through when a token is provided", async () => {
      const testRequest = await userHelpers.updateUser(
        fastify,
        0,
        { firstName: "test" },
        token
      );
      assert.ok(
        testRequest.statusCode !== 401 && testRequest.statusCode !== 403,
        "Valid acess token was not allowed"
      );
    });
  });

  describe("POST /api/user ", async () => {
    let testUser;
    let apiUser;
    before(async () => {
      testUser = userHelpers.createMockUserObject();
      apiUser = await userHelpers.createUser(fastify, testUser);
    });

    it("password gets hashed", async () => {
      const passwordAfterPost = JSON.parse(apiUser.body).password;
      assert.notStrictEqual(
        testUser.password,
        passwordAfterPost,
        "Passwords is not getting hashed"
      );
    });

    it("creates a new user", async () => {
      assert.strictEqual(
        apiUser.statusCode,
        200,
        "User was not succesfully created"
      );
    });

    it("should not allow a duplicate user to be  created", async () => {
      const createdUser = await userHelpers.createUser(fastify, testUser);
      assert.strictEqual(
        createdUser.statusCode,
        500,
        "Duplicate user was allowed to be created"
      );
    });
  });

  describe("PATCH /api/user", async () => {
    let testUser;
    let apiUser;
    before(async () => {
      testUser = userHelpers.createMockUserObject();
      apiUser = await userHelpers.createUser(fastify, testUser);
    });

    it("should update all provided fields", async () => {
      const userID = JSON.parse(apiUser.body).user.id;
      const mockUpdateData = userHelpers.createMockUserObject();
      const updatedUser = await userHelpers.updateUser(
        fastify,
        userID,
        mockUpdateData,
        token
      );
      const parsedUpdatedUser = JSON.parse(updatedUser.body).user;

      const clonedTestUser = Object.assign({}, mockUpdateData);
      const formattedUpdatedUser = {
        username: parsedUpdatedUser.username,
        email: parsedUpdatedUser.email,
        phoneNumber: parsedUpdatedUser.phoneNumber,
        firstName: parsedUpdatedUser.firstName,
        lastName: parsedUpdatedUser.lastName,
        profilePicture: parsedUpdatedUser.profilePicture,
        active: parsedUpdatedUser.active,
      };
      delete clonedTestUser.password;

      //password gets hashed
      assert.deepStrictEqual(
        formattedUpdatedUser,
        clonedTestUser,
        "User is not getting updated"
      );
    });

    it("password hashes on update", async () => {
      const userID = JSON.parse(apiUser.body).user.id;
      const mockUpdateData = userHelpers.createMockUserObject();
      const updatedUser = await userHelpers.updateUser(
        fastify,
        userID,
        mockUpdateData,
        token
      );
      const parsedUpdatedUser = JSON.parse(updatedUser.body).user;
      assert.notStrictEqual(
        parsedUpdatedUser.password,
        mockUpdateData.password,
        "Passwords are not being hashed on update"
      );
    });

    it("returns 404 on no rows updated", async () => {
      const userID = 5000000;
      const mockUpdateData = userHelpers.createMockUserObject();
      const updatedUser = await userHelpers.updateUser(
        fastify,
        userID,
        mockUpdateData,
        token
      );
      assert.strictEqual(
        updatedUser.statusCode,
        404,
        "Rows updated when 404 should have been thrown"
      );
    });
  });

  describe("POST /api/user/login", () => {
    let testUser;
    let apiUser;
    before(async () => {
      testUser = userHelpers.createMockUserObject();
      apiUser = await userHelpers.createUser(fastify, testUser);
    });

    it("grants a token on valid login", async () => {
      const authToken = await userHelpers.login(fastify, {
        username: testUser.username,
        password: testUser.password,
      });
      const parsedToken = JSON.parse(authToken.body).accessToken;
      assert.strictEqual(
        authToken.statusCode,
        200,
        "Login API did not return success"
      );
      assert.notStrictEqual(
        parsedToken,
        undefined,
        "Valid login did not provide token"
      );
    });

    it("returns a 401 on invalid login", async () => {
      const authToken = await userHelpers.login(fastify, {
        username: "qweqwe",
        password: "qweqweqweqweqqweqwe123123123123123123",
      });
      assert.strictEqual(
        authToken.statusCode,
        401,
        "API did not validate login properly"
      );
    });

    it("provides a refresh token when an access token is created", async () => {
      const authToken = await userHelpers.login(fastify, {
        username: testUser.username,
        password: testUser.password,
      });
      const tokens = JSON.parse(authToken.body);
      assert.notEqual(
        tokens.refreshToken,
        undefined,
        "Refresh token was not granted"
      );
    });

    it("returns 500 status code when sent an invalid body", async () => {
      const authToken = await userHelpers.login(fastify, {});
      assert.strictEqual(
        authToken.statusCode,
        400,
        "API schema validation failed"
      );
    });
  });

  describe("GET /api/user", async () => {
    let testUser;
    let apiUser;
    before(async () => {
      testUser = userHelpers.createMockUserObject();
      apiUser = await userHelpers.createUser(fastify, testUser);
    });

    it("shows a newly created user in the results", async () => {
      const apiUserID = JSON.parse(apiUser.body).user.id;
      const user = await userHelpers.getUserWithFilter(
        fastify,
        { id: apiUserID },
        token
      );
      assert.strictEqual(
        JSON.parse(user.body).users[0].id,
        apiUserID,
        "The user was not successfully fetched"
      );
    });

    it("shows no results when an invalid query is provided", async () => {
      const user = await userHelpers.getUserWithFilter(
        fastify,
        { id: 1290123901, active: "N", phoneNumber: "5123123123123123123" },
        token
      );
      assert.strictEqual(
        JSON.parse(user.body).users.length,
        0,
        "The API returned results when it should not have"
      );
    });
  });

  describe("POST /api/user/token/verify", async () => {
    let testUser;
    let apiUser;
    before(async () => {
      testUser = userHelpers.createMockUserObject();
      apiUser = await userHelpers.createUser(fastify, testUser);
    });

    it("verifies valid token", async () => {
      const tokenValidationRequest = await userHelpers.verifyToken(
        fastify,
        token
      );
      const isTokenValid = JSON.parse(tokenValidationRequest.body).valid;
      assert.equal(isTokenValid, true, "Valid token was rejected");
    });

    it("does not allow expired token", async () => {
      const apiUserID = JSON.parse(apiUser.body).user.id;
      const jwtToken = await signAsync({}, config.jwtSecret, {
        expiresIn: "-40s",
      });
      const testRequest = await userHelpers.updateUser(
        fastify,
        apiUserID,
        { firstName: "qweqwe" },
        jwtToken
      );
      assert.ok(
        testRequest.statusCode === 401 || testRequest.statusCode === 403,
        "Expired token was allowed through the API"
      );
    });

    it("rejects invalid token", async () => {
      const tokenValidationRequest = await userHelpers.verifyToken(
        fastify,
        "qweqweqweqweqwe"
      );
      const isTokenValid = JSON.parse(tokenValidationRequest.body).valid;
      assert.equal(isTokenValid, false, "Valid token was rejected");
    });
  });

  describe("POST /api/user/token/refresh", async () => {
    let testUser;
    let apiUser;
    before(async () => {
      testUser = userHelpers.createMockUserObject();
      apiUser = await userHelpers.createUser(fastify, testUser);
    });

    it("refreshes valid refresh token", async () => {
      const tokens = await userHelpers.login(fastify, {
        username: testUser.username,
        password: testUser.password,
      });

      const refreshToken = JSON.parse(tokens.body).refreshToken;
      const refreshTokenRequest = await userHelpers.refreshToken(
        fastify,
        refreshToken
      );
      assert.strictEqual(
        refreshTokenRequest.statusCode,
        200,
        "Valid refresh token was not refreshed"
      );
    });

    it("rejects expired refresh token", async () => {
      const apiUserID = JSON.parse(apiUser.body).user.id;
      const refreshToken = await signAsync({}, config.jwtRefreshTokenSecret, {
        expiresIn: "-40s",
      });
      const testRequest = await userHelpers.updateUser(
        fastify,
        apiUserID,
        {},
        refreshToken
      );
      assert.strictEqual(
        testRequest.statusCode,
        401,
        "Expired refresh token allowed"
      );
    });

    it("rejects invalid refresh token", async () => {
      const apiUserID = JSON.parse(apiUser.body).user.id;
      const testRequest = await userHelpers.updateUser(
        fastify,
        apiUserID,
        {},
        "qweqweqwe"
      );
      assert.strictEqual(
        testRequest.statusCode,
        401,
        "Expired refresh token allowed"
      );
    });
  });
});
