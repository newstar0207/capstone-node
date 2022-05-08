const express = require('express');
const Track = require("../schemas/track");
// const EventType = require("../types/EventType");

const router = express.Router();

/**
 * @swagger
 * tags:
 *  - name: users
 *    description: 유저에 관한 API
 */

/**
 * @swagger
 * /api/users/{userId}:
 *    get:
 *      summary: Return 특정한 유저가 만든 트랙을 리턴.
 *      description: 특정한 유저가 만든 트랙을 리턴함.
 *      tags:
 *        - users
 *      parameters:
 *        - in: path
 *          name: userId
 *          required: true
 *          example: 1
 *      responses:
 *        '200':
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/getUserTrack200'
 *        '404':
 *          description: 트랙이 존재하지 않습니다.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/getUserTrack404'
 */
router.get("/:userId", async (req, res, next) => {
  try {
    const tracks = await Track.find({ "user.userId": req.params.userId }).count();
    // if (!tracks) {
    //   return res.status(404).json({ message: "트랙이 존재하지 않습니다."});
    // }
    return res.status(200).json({count: tracks});
  } catch (err) {
    console.log(err);
    next(err);
  }
})


module.exports = router;